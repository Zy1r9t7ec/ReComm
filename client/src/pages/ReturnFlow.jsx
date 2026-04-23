import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Wrench, CheckCircle2, ChevronLeft, Camera, UploadCloud, RefreshCcw, BatteryWarning, PackageMinus, Box, Zap, BoxSelect, ThumbsDown, UserX } from 'lucide-react';
import { api } from '../api';
import CameraConsent from '../components/CameraConsent';
import CameraCapture from '../components/CameraCapture';
import { storeOfflineVideo, clearOfflineVideo } from '../utils/indexedDB';

const RETURN_REASONS = [
  { id: 'not_charging', label: 'Not charging / Battery issue', icon: Zap },
  { id: 'battery_drain', label: 'Battery drains too fast', icon: BatteryWarning },
  { id: 'damaged', label: 'Damaged physical condition', icon: PackageMinus },
  { id: 'wrong_item', label: 'Received wrong item', icon: Box },
  { id: 'defective', label: 'Defective / Not turning on', icon: BoxSelect },
  { id: 'looks_different', label: 'Item looks different from listing photos', icon: ThumbsDown },
  { id: 'changed_mind', label: 'Changed my mind / No longer needed', icon: UserX }
];

const LOCAL_TROUBLESHOOTERS = {
  'not_charging': { step: "Try holding the 'Reset' side-button for 15 seconds while plugged in.", resolution_rate: 0.31 },
  'defective': { step: "Did you use a 20W PD Certified adapter for the first charge?", resolution_rate: 0.22 },
  'battery_drain': { step: "Drain the battery completely to 0%, then charge it uninterrupted to 100%.", resolution_rate: 0.41 }
};

export default function ReturnFlow() {
  const { state: productData } = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState('REASON_SELECTION');
  const [selectedReason, setSelectedReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [returnContext, setReturnContext] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [troubleshooterStart, setTroubleshooterStart] = useState(0);
  const [countdown, setCountdown] = useState(8);
  const [localTroubleshooter, setLocalTroubleshooter] = useState(null);
  const [waitState, setWaitState] = useState(false);

  useEffect(() => {
    if (step === 'TROUBLESHOOTER' && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, countdown]);

  if (!productData) {
    return (
      <div className="container text-center">
        <h2>No Product Selected</h2>
        <button className="btn mt-4" onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const proceedToAPI = async (reason, timeElapsedMs = 0) => {
    setLoading(true);
    try {
      const res = await api.returns.initiate({
        order_id: productData.order_id,
        sku_id: productData.sku_id,
        return_reason_code: reason,
        customer_id: productData.customer_id,
        troubleshooter_time_ms: timeElapsedMs
      });
      setReturnContext(res);
      setStep('RECORDING');
    } catch (e) {
      console.error(e);
      alert("Failed to initiate return. Please check server.");
    } finally {
      setLoading(false);
    }
  };

  const handleReasonSubmit = () => {
    if (!selectedReason) return;
    const ts = LOCAL_TROUBLESHOOTERS[selectedReason];
    if (ts) {
      setLocalTroubleshooter(ts);
      setTroubleshooterStart(Date.now());
      setStep('TROUBLESHOOTER');
    } else {
      proceedToAPI(selectedReason, 0);
    }
  };

  const handleTroubleshootResult = (action) => {
    const elapsed = Date.now() - troubleshooterStart;

    if (action === 'RESOLVED') {
      setStep('SUCCESS');
    } else if (action === 'TRYING') {
      setWaitState(true);
      setTimeout(() => setWaitState(false), 5000); // 5 sec soft wait
    } else if (action === 'FAILED') {
      if (elapsed < 3000) {
        // Fast click heuristic
        console.warn("Suspiciously fast troubleshooter exit");
      }
      proceedToAPI(selectedReason, elapsed);
    }
  };

  // VIEWS
  if (step === 'SUCCESS') {
    return (
      <div className="container text-center animate-fade-in">
        <div className="glass-card">
          <CheckCircle2 size={48} className="mb-4" style={{ color: 'var(--success)' }} />
          <h2>Issue Resolved!</h2>
          <p>We're glad we could help fix your {productData.name}. Your return request has been cancelled.</p>
          <button className="btn mt-4" onClick={() => navigate('/')}>Back to Orders</button>
        </div>
      </div>
    );
  }

  if (step === 'RECORDING') {
    if (!consentGiven) {
      return (
        <div className="container" style={{ paddingTop: '4rem' }}>
          <CameraConsent
            onAccept={() => setConsentGiven(true)}
            onDecline={() => { alert('Proceeding to photo fallback review...'); navigate('/'); }}
          />
        </div>
      );
    }

    const handleVideoComplete = async (blob) => {
      setStep('UPLOADING');
      try {
        await api.returns.uploadMedia(returnContext.return_id, blob, setUploadProgress);
        await clearOfflineVideo(returnContext.return_id);
        await api.returns.startInspection(returnContext.return_id);
        setStep('INSPECTION');
      } catch (e) {
        await storeOfflineVideo(returnContext.return_id, blob);
        setStep('OFFLINE_SAVED');
      }
    };

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <CameraCapture onComplete={handleVideoComplete} />
      </div>
    );
  }

  if (step === 'UPLOADING') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
          <UploadCloud size={48} className="mb-4 text-primary" style={{ animation: 'slideUp 1s infinite alternate' }} />
          <h2>Uploading securely...</h2>
          <div style={{ background: 'var(--bg)', borderRadius: '8px', height: '12px', marginTop: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.3s ease-in-out' }} />
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{uploadProgress}% Complete</p>
        </div>
      </div>
    );
  }

  if (step === 'OFFLINE_SAVED') { ... } // Reusing below

  if (step === 'INSPECTION') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card">
          <CheckCircle2 size={48} className="mb-4 text-success" />
          <h2>Automated Verification Running!</h2>
          <p>Our agentic AI pipeline operates efficiently over your clip using Gemini Vision logic to authenticate conditions instantly.</p>
          <button className="btn primary mt-4" onClick={() => navigate('/')}>Done for now</button>
        </div>
      </div>
    );
  }

  if (step === 'TROUBLESHOOTER') {
    return (
      <div className="container animate-fade-in">
        <div className="glass-card">
          {countdown > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', border: '4px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{countdown}</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#333' }}>
              <img src="https://m.media-amazon.com/images/I/41Dq74X9yQL._SX300_SY300_QL70_FMwebp_.jpg" alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 style={{ margin: 0 }}>Portronics Recommended Fix</h2>
          </div>

          <p style={{ textAlign: 'center' }}>Before you ship this back, try this step:</p>

          <div className="product-snippet" style={{ flexDirection: 'column', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{localTroubleshooter?.step}</h3>
            {localTroubleshooter?.resolution_rate && (
              <span className="badge" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <Zap size={14} fill="currentColor" /> Resolved the issue for {Math.round(localTroubleshooter.resolution_rate * 100)}% of customers!
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexDirection: 'column' }}>
            <button className="btn primary" onClick={() => handleTroubleshootResult('RESOLVED')} disabled={loading}>
              <CheckCircle2 size={18} /> Yes, this fixed it! Cancel Return
            </button>
            <button className="btn" onClick={() => handleTroubleshootResult('TRYING')} disabled={loading || waitState}>
              <Wrench size={18} /> {waitState ? 'Trying...' : 'Let me try this'}
            </button>
            <button className="btn danger-outline" onClick={() => handleTroubleshootResult('FAILED')} disabled={loading || waitState}>
              No, it's still broken. Return it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '3rem' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <button className="icon-btn" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', color: 'white' }} onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0 }}>Why are you returning this?</h2>
        </div>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Select the reason below for {productData.name}</p>

        <div className="option-list">
          {RETURN_REASONS.map(reason => {
            const Icon = reason.icon;
            return (
              <button
                key={reason.id}
                className={`option-item ${selectedReason === reason.id ? 'selected' : ''}`}
                onClick={() => setSelectedReason(reason.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 20px',
                  alignItems: 'center',
                  padding: '1rem',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', width: 40, height: 40, borderRadius: 8 }}>
                  <Icon size={18} color={selectedReason === reason.id ? "var(--primary)" : "var(--text-muted)"} />
                </div>
                <span style={{ fontWeight: selectedReason === reason.id ? 600 : 400 }}>{reason.label}</span>
                <ChevronRight size={18} style={{ opacity: selectedReason === reason.id ? 1 : 0.3 }} />
              </button>
            )
          })}
        </div>

        <button
          className="btn primary"
          disabled={!selectedReason || loading}
          onClick={handleReasonSubmit}
          style={{ padding: '1.25rem', fontSize: '1.1rem' }}
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
