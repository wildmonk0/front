# RNSE Anomaly Detection SaaS

Zero-training anomaly detection for complex time-series data.

## Quick Start (Local)

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Setup

```bash
# 1. Clone/extract project
cd rnse-saas

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/init_db.py
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm start
```

Visit `http://localhost:3000`

---

## Project Structure

```
rnse-saas/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── app.db                   # SQLite database (created on first run)
│   └── scripts/
│       └── init_db.py          # Database initialization
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── App.css             # Styling
│   │   └── index.js            # Entry point
│   ├── package.json            # NPM dependencies
│   └── public/
│       └── index.html          # HTML template
│
├── rnse_core.py                # Proprietary algorithm (not modified)
├── .env.example                # Environment variables
└── README.md                   # This file
```

---

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "session_token": "1:abc123..."
}
```

### Upload & Analysis

**POST /api/upload** (requires Bearer token)

Multipart form with CSV file.

Expected CSV format:
```
timestamp,value
1,10.5
2,11.3
3,10.8
...
```

Response:
```json
{
  "result_id": 1,
  "filename": "data.csv",
  "anomaly_count": 3,
  "anomaly_indices": [15, 42, 87],
  "confidence_scores": [0.85, 0.92, 0.78]
}
```

### Results

**GET /api/results** (requires Bearer token)

Returns user's upload history.

**GET /api/results/{result_id}/download** (requires Bearer token)

Download results as CSV.

---

## Environment Variables

### Backend (.env)

```bash
SECRET_KEY=your-secret-key-here
DATABASE_URL=                    # Leave empty for SQLite
DEBUG=false
CORS_ORIGINS=http://localhost:3000,https://your-frontend.onrender.com
MAX_UPLOAD_SIZE_MB=50
```

### Frontend (.env)

```bash
REACT_APP_API_URL=http://localhost:8000
```

---

## Deployment to Render

See `DEPLOYMENT_GUIDE.md` for step-by-step instructions.

**Cost:** Free tier ($0/month)

---

## Key Features

✅ **User Authentication** – Email/password with SQLite  
✅ **CSV Upload** – Handle time-series data  
✅ **Anomaly Detection** – Integrated RNSE algorithm  
✅ **Visualization** – Simple SVG plot of anomalies  
✅ **Results Export** – Download as CSV  
✅ **Upload History** – Track all analyses  

---

## Architecture Decisions

### Frontend
- **React** for simplicity and component reuse
- **Axios** for HTTP requests
- **Inline CSS** to minimize build complexity
- **LocalStorage** for session persistence

### Backend
- **FastAPI** for async performance and auto-documentation
- **SQLite** for simplicity (migrate to PostgreSQL for scale)
- **PBKDF2** for password hashing
- **Bearer tokens** for stateless auth

### Algorithm Integration
- **rnse_core.py** imported as-is, not modified
- Divergence (D) from RNSE logs used as anomaly confidence
- Threshold of 0.3 flags anomalies (tunable)

---

## Scaling & Future Work

### 1. Billing (Stripe/LemonSqueezy)

Add `billing_tier` to users table:

```python
@router.post("/api/checkout")
async def create_checkout(user_id: int):
    # Stripe integration
    pass
```

### 2. Usage Limits

Rate limit uploads by tier:

```python
from fastapi_limiter import FastAPILimiter

@limiter.limit("10/hour")  # Free tier
@router.post("/api/upload")
async def upload_csv(...):
    pass
```

### 3. Database Upgrade

Replace SQLite with PostgreSQL for production:

```bash
# On Render, add PostgreSQL service
# Update DATABASE_URL to: postgresql://user:pass@host/dbname
```

### 4. Advanced Analysis

Extend RNSE parameters as API arguments:

```python
@router.post("/api/upload")
async def upload_csv(
    file: UploadFile,
    tau: float = 0.25,  # Divergence threshold
    q: int = 4          # Reweight interval
):
    pass
```

### 5. Email & Notifications

Send results via email:

```python
from sendgrid import SendGridAPIClient

def send_results_email(email, result_id):
    pass
```

---

## Testing

### Local Workflow

1. Sign up with `test@example.com` / `password123`
2. Create sample CSV:
   ```
   index,value
   1,1.0
   2,1.1
   3,1.05
   ...
   ```
3. Upload and verify anomalies detected
4. Download results CSV

### Sample Data

Generate with Python:

```python
import csv
import random

with open('sample.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['index', 'value'])
    for i in range(100):
        # Normal distribution + occasional spike
        value = 10 + random.gauss(0, 0.5)
        if i in [15, 42, 87]:
            value += 5  # Anomaly
        writer.writerow([i, round(value, 2)])
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `CORS_ORIGINS` env matches frontend URL |
| 401 Unauthorized | Verify Bearer token in requests |
| Upload fails | Ensure CSV has 2+ columns, numeric values |
| Database locked | Stop processes, delete `.db-wal` files |

---

## License & IP

**⚠️ PROPRIETARY:** The RNSE core algorithm (`rnse_core.py`) is protected under UK patent pending. Do not share, modify, or distribute without authorization.

This SaaS prototype is for internal use only.

---

## Support

For issues or questions:
1. Check logs: `tail -f backend/logs/app.log`
2. Review API docs: `http://localhost:8000/docs`
3. Inspect frontend console: `F12 → Console`

---

**Last Updated:** December 2025
