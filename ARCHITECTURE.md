# RNSE SaaS Architecture

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     RNSE Anomaly SaaS                       │
└─────────────────────────────────────────────────────────────┘

Frontend (React)                  Backend (FastAPI)
├─ Landing page                   ├─ Auth endpoints
├─ Sign up/Login modal            ├─ Upload handler
├─ Dashboard                      ├─ Analysis engine
│  ├─ CSV upload                  ├─ Results storage
│  ├─ Plot visualization          └─ API docs
│  └─ Download results
│
└─ LocalStorage (session)         SQLite (persistent)
   (session_token)                ├─ users table
                                  └─ results table

        ↓ API (HTTP/JSON) ↓

               RNSE Core
          (rnse_core.py)
         [Proprietary Algorithm]
```

## Data Flow

### 1. User Registration
```
User enters email/password
         ↓
POST /api/auth/signup
         ↓
Hash password (PBKDF2)
         ↓
Store in users table
         ↓
Return session_token
         ↓
Client stores in LocalStorage
```

### 2. File Upload & Analysis
```
User selects CSV
         ↓
POST /api/upload (with Bearer token)
         ↓
Parse CSV → extract values
         ↓
Call rnse_run(T=len(values), params)
         ↓
Extract divergence scores from logs
         ↓
Flag indices where D > threshold as anomalies
         ↓
Store results in results table
         ↓
Return JSON (anomaly_indices, confidence_scores)
         ↓
Frontend plots and displays
```

### 3. Results Download
```
User clicks "Download Results"
         ↓
GET /api/results/{result_id}/download (Bearer token)
         ↓
Fetch from results table
         ↓
Build CSV: [Index, Value, Is_Anomaly, Confidence]
         ↓
Return as downloadable file
```

## Authentication Model

**Session-based (stateless tokens)**

```python
session_token = f"{user_id}:{random_hex}"

# On request:
Authorization: Bearer <session_token>

# Server extracts user_id from token prefix
# Validates format (simple, not cryptographic)
```

**Upgrade Path:**
- Replace with JWT (signed, expiring tokens)
- Add refresh token mechanism
- Implement logout tracking

## Database Schema

### users
```sql
id (PK)
email (UNIQUE)
password_hash (PBKDF2)
created_at (timestamp)
```

### results
```sql
id (PK)
user_id (FK → users.id)
filename
anomaly_indices (JSON array)
confidence_scores (JSON array)
original_data (JSON array)
uploaded_at (timestamp)
```

**Index:** `results.user_id` for fast user query

## RNSE Algorithm Integration

### Input
```python
rnse_run(
    seed64=0x5EEDBEEFCAFE1234,  # Fixed seed for reproducibility
    T=len(time_series),          # Number of ticks
    params=RNSEParams(
        tau=0.25,          # Divergence threshold
        q=4,               # Reweight interval
        alpha=None         # Smoothing (optional)
    )
)
```

### Output
```python
{
    "beta": float,            # Acceptance rate
    "var_tail": float,        # Variance of final window
    "digest": str,            # SHA256 hash of logs
    "roots": List[str],       # Merkle roots (if merkle_R)
    "lines": List[bytes]      # Per-tick JSON logs
}
```

### Anomaly Detection Logic
```python
# For each log line:
for line_bytes in result["lines"]:
    line = json.loads(line_bytes.decode("utf-8"))
    divergence = line["D"]  # L2 divergence
    confidence = min(1.0, divergence / 1.0)  # Normalize
    
    if confidence > 0.3:  # Threshold
        flag_as_anomaly(index, confidence)
```

**Key Points:**
- Divergence (D) is continuous, not binary
- Threshold (0.3) is tunable via API
- Confidence scores reflect divergence magnitude

## Security Considerations

### Current (Prototype)

✅ Password hashing (PBKDF2)
✅ CORS validation
✅ Bearer token format validation
✅ SQL injection prevention (parameterized queries)
✅ File upload validation (CSV only, size limit)

### Gaps (For Production)

❌ Rate limiting (add fastapi-limiter)
❌ Token expiration (add JWT expiry)
❌ HTTPS enforcement (use Render's auto-SSL)
❌ Input validation (add Pydantic validators)
❌ Audit logging (log auth events)
❌ IP rate limiting

### Roadmap

```python
# Add to main.py:

from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/api/upload")
@limiter.limit("10/hour")  # Rate limit by user tier
async def upload_csv(...):
    pass
```

## Deployment Architecture

### Local
```
Frontend (npm start)      → http://localhost:3000
Backend (uvicorn)        → http://localhost:8000
SQLite database          → app.db
```

### Render.com
```
Web Service (Backend)
├─ Python environment
├─ Start command: gunicorn -k uvicorn ...
├─ Env: SECRET_KEY, CORS_ORIGINS
└─ Database: SQLite on persistent volume

Static Site (Frontend)
├─ Build: npm run build
├─ Publish: frontend/build
└─ Env: REACT_APP_API_URL=https://rnse-api.onrender.com

Database Backup
├─ Download via Render shell
└─ Store in .gitignore'd location
```

### Cost Analysis (Free Tier)

| Service | Compute | Cost |
|---------|---------|------|
| Web Service | 750 hrs/mo | $0 |
| Static Site | 100 GB/mo | $0 |
| Data | SQLite | $0 |
| **Total** | | **$0** |

**Upgrade Path:**
- Pro Web Service: $7/mo (multi-region)
- PostgreSQL: $15/mo (managed)
- Custom domain: $10/yr

## Scaling Strategy

### Phase 1: Local Prototype (Now)
- SQLite
- Free tier Render
- Bearer tokens
- Max 10 MB uploads

### Phase 2: Beta (100–1K users)
- Add PostgreSQL ($15/mo)
- Implement rate limiting
- Add JWT with expiry
- Max 50 MB uploads

### Phase 3: Production (1K–10K users)
- Add Redis for caching
- Implement billing (Stripe)
- Add email verification
- Multi-tier usage limits
- AWS S3 for results storage

### Phase 4: Enterprise (10K+ users)
- API key authentication
- Webhook notifications
- Batch processing queue (Celery)
- Custom RNSE parameters per user
- Advanced analytics dashboard

## Extensibility Points

### 1. Billing Integration
```python
# backend/routes/billing.py

@router.post("/api/checkout")
async def create_checkout(user_id: int, tier: str):
    # Call Stripe API
    # Store subscription in DB
    pass

@router.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    # Handle payment events
    pass
```

### 2. Advanced Analysis
```python
@router.post("/api/upload")
async def upload_csv(
    file: UploadFile,
    tau: float = 0.25,           # Override default
    q: int = 4,
    alpha: Optional[float] = None
):
    # Allow user-configured parameters
    pass
```

### 3. Batch Processing
```python
# Use Celery for long-running jobs

@app.post("/api/batch-upload")
async def batch_upload(files: List[UploadFile]):
    for file in files:
        celery_task.delay(file.filename)
    return {"status": "processing"}
```

### 4. Export Formats
```python
# Support multiple output formats

@app.get("/api/results/{id}/export")
async def export_results(id: int, format: str = "csv"):
    if format == "csv":
        return csv_response
    elif format == "json":
        return json_response
    elif format == "excel":
        return excel_response
```

## Testing Strategy

### Unit Tests
```bash
cd backend
pytest tests/test_auth.py
pytest tests/test_upload.py
```

### Integration Tests
```bash
# Full flow: signup → upload → download
pytest tests/integration/test_workflow.py
```

### Load Tests
```bash
# Simulate 100 concurrent users
locust -f tests/load/locustfile.py
```

### E2E Tests (Frontend)
```bash
cd frontend
npm test  # Jest + React Testing Library
```

## Monitoring & Observability

### Logs
```bash
# Backend
tail -f backend/logs/app.log

# Frontend (browser console)
F12 → Console tab
```

### Metrics
- Uploads per user
- Average analysis time
- Storage usage
- Error rates

### Error Tracking
```python
# Future: Integrate Sentry

import sentry_sdk

sentry_sdk.init("https://...@sentry.io/...")
```

---

**Created:** December 2025  
**Status:** Prototype (working, deployable)  
**Next:** Beta testing + billing integration
