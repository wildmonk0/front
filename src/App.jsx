import React, { useState, useEffect, useContext } from "react";
import axios from 'axios';
import './App.css';

const API_URL = "https://rnsebackend.onrender.com";

// ============================================================================
// Authentication Context
// ============================================================================

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) setAuth(JSON.parse(saved));
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });

    const authData = res.data;
    localStorage.setItem("auth", JSON.stringify(authData));
    setAuth(authData);
    return authData;
  };

  const signup = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/signup`, {
      email,
      password
    });

    const authData = res.data;
    localStorage.setItem("auth", JSON.stringify(authData));
    setAuth(authData);
    return authData;
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setAuth(null);
  };

  const value = {
    auth,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ============================================================================
// Landing Page
// ============================================================================

function LandingPage({ onSignUp, onUpload }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="container">
          <h1 className="logo">RNSE Anomaly</h1>
          <div className="nav">
            <button className="btn btn-primary" onClick={onSignUp}>Sign Up</button>
            <button className="btn btn-secondary" onClick={onSignUp}>Log In</button>
          </div>
        </div>
      </header>
      
      <section className="hero">
        <div className="container">
          <h2 className="hero-title">Zero-training anomaly detection for complex data</h2>
          <p className="hero-subtitle">
            Detect anomalies in time-series data instantly. No training required. No tuning needed.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onSignUp}>
            Get Started
          </button>
        </div>
      </section>
      
      <section className="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Simple Upload</h3>
              <p>Upload any CSV time-series data in seconds</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Analysis</h3>
              <p>Get results immediately without configuration</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Visual Results</h3>
              <p>See anomalies plotted with confidence scores</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⬇️</div>
              <h3>Download Results</h3>
              <p>Export analyzed data as CSV for further use</p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="landing-footer">
        <p>© 2025 RNSE Anomaly Detection. UK Patent Pending.</p>
      </footer>
    </div>
  );
}

// ============================================================================
// Auth Modal
// ============================================================================

function AuthModal({ mode, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (mode === 'signup') {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>{mode === 'signup' ? 'Create Account' : 'Log In'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        
        <p className="auth-toggle">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard
// ============================================================================

function Dashboard({ onLogout }) {
  const { auth } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/results`, {
        headers: { Authorization: `Bearer ${auth.session_token}` }
      });
      setHistory(res.data.results);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };
  
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          Authorization: `Bearer ${auth.session_token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResults(res.data);
      setFile(null);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };
  
const downloadResults = async () => {
  try {
    if (!results) {
      alert("No results to download.");
      return;
    }

    // ✅ use the same token the rest of the app uses
    if (!auth || !auth.session_token) {
      alert("You need to be logged in to download results.");
      return;
    }

    const token = auth.session_token;

    const res = await axios.get(
      `${API_URL}/api/results/${results.result_id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // expecting a file
      }
    );

    const blob = new Blob([res.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rnse_results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(
      err.response?.data?.detail ||
      "Failed to download results. Check console for details."
    );
  }
};


    // Create a file blob and auto-download
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rnse_results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("Failed to download results. Check console for details.");
  }
};

  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container flex justify-between">
          <h1 className="logo">RNSE Anomaly</h1>
          <div className="header-actions">
            <span className="user-email">{auth.email}</span>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>
      
      <main className="container dashboard-main">
        <div className="dashboard-grid">
          {/* Upload Section */}
          <section className="upload-section">
            <h2>Upload Data</h2>
            <form onSubmit={handleUpload}>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
                <span className="file-input-label">
                  {file ? file.name : 'Choose CSV file...'}
                </span>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={!file || loading}
              >
                {loading ? 'Analyzing...' : 'Upload & Analyze'}
              </button>
            </form>
            
            {error && <div className="error-message">{error}</div>}
          </section>
          
          {/* Results Section */}
          {results && (
            <section className="results-section">
              <h2>Results</h2>
              <div className="results-card">
                <div className="result-stat">
                  <span className="stat-label">Anomalies Detected</span>
                  <span className="stat-value">{results.anomaly_count}</span>
                </div>
                <div className="result-stat">
                  <span className="stat-label">File</span>
                  <span className="stat-value">{results.filename}</span>
                </div>
                
                <div className="chart-placeholder">
                  <svg viewBox="0 0 400 200" style={{ width: '100%', height: '200px' }}>
                    {/* Simple line plot of anomalies */}
                    {results.anomaly_indices.map((idx, i) => {
                      const x = (idx / (results.anomaly_indices[results.anomaly_indices.length - 1] || 1)) * 350 + 25;
                      const y = 150 - (results.confidence_scores[i] * 100);
                      return (
                        <circle key={i} cx={x} cy={y} r="4" fill="var(--error)" />
                      );
                    })}
                    <line x1="25" y1="150" x2="375" y2="150" stroke="#ccc" strokeWidth="1" />
                    <line x1="25" y1="50" x2="25" y2="150" stroke="#ccc" strokeWidth="1" />
                  </svg>
                </div>
                
                <button className="btn btn-primary btn-full" onClick={downloadResults}>
                  📥 Download Results CSV
                </button>
              </div>
            </section>
          )}
          
          {/* History Section */}
          <section className="history-section">
            <h2>Recent Uploads</h2>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-state">No uploads yet. Start by uploading a CSV file.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div>
                      <strong>{item.filename}</strong>
                      <p>{item.anomaly_count} anomalies detected</p>
                    </div>
                    <small>{new Date(item.uploaded_at).toLocaleDateString()}</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================

export default function App() {
  const { auth, logout } = useAuth();
  const [authMode, setAuthMode] = useState(null);
  
  if (!auth) {
    return (
      <>
        <LandingPage
          onSignUp={() => setAuthMode('signup')}
          onUpload={() => setAuthMode('login')}
        />
        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() => setAuthMode(null)}
            onSuccess={() => setAuthMode(null)}
          />
        )}
      </>
    );
  }
  
  return <Dashboard onLogout={logout} />;
}
