import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Wrench, CheckCircle2, ChevronLeft, Camera, UploadCloud,
  RefreshCcw, BatteryWarning, PackageMinus, Box, Zap, BoxSelect, ThumbsDown,
  UserX, Leaf, Navigation, BadgeDollarSign, ShieldAlert, Loader2
} from 'lucide-react';
import { api } from '../api';
import CameraConsent from '../components/CameraConsent';
import CameraCapture from '../components/CameraCapture';
import { storeOfflineVideo, clearOfflineVideo } from '../utils/indexedDB';

const RETURN_REASONS = [
  { id: 'not_charging',   label: 'Not charging / Battery issue',         icon: Zap },
  { id: 'battery_drain',  label: 'Battery drains too fast',              icon: BatteryWarning },
  { id: 'damaged',        label: 'Damaged physical condition',           icon: PackageMinus },
  { id: 'wrong_item',     label: 'Received wrong item',                  icon: Box },
  { id: 'defective',      label: 'Defective / Not turning on',           icon: BoxSelect },
  { id: 'looks_different',label: 'Item looks different from listing',    icon: ThumbsDown },
  { id: 'changed_mind',   label: 'Changed my mind / No longer needed',  icon: UserX },
];

const LOCAL_TROUBLESHOOTERS = {
  not_charging:  { step: "Try holding the 'Reset' side-button for 15 seconds while plugged in.", resolution_rate: 0.31 },
  defective:     { step: "Did you use a 20W PD Certified adapter for the first charge?",        resolution_rate: 0.22 },
  battery_drain: { step: "Drain the battery completely to 0%, then charge it to 100%.",         resolution_rate: 0.41 },
};

const OUTCOME_CONFIG = {
  approved:            { color: 'var(--success)',   label: '✅ Approved — Full Refund'          },
  partial_refund:      { color: '#f59e0b',          label: '🟡 Partial Refund Approved'         },
  warranty_escalation: { color: 'var(--primary)',   label: '🔧 Warranty Claim Raised'           },
  rejected:            { color: 'var(--danger)',    label: '❌ Return Declined'                 },
  human_escalation:    { color: '#f59e0b',          label: '👁 Under Manual Review'            },
  'Manual Review':     { color: '#f59e0b',          label: '👁 Under Manual Review'            },
};

export default function ReturnFlow() {
  const { state: productData } = useLocation();
  const navigate = useNavigate();

  const [step, setStep]                   = useState('REASON_SELECTION');
  const [selectedReason, setSelectedReason] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [returnContext, setReturnContext]  = useState(null);
  const [consentGiven, setConsentGiven]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult]               = useState(null);

  const [troubleshooterStart, setTroubleshooterStart] = useState(0);
  const [countdown, setCountdown]         = useState(8);
  const [localTroubleshooter, setLocalTroubleshooter] = useState(null);
  const [waitState, setWaitState]         = useState(false);

  const pollRef = useRef(null);

  // Countdown for troubleshooter
  useEffect(() => {
    if (step === 'TROUBLESHOOTER' && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, countdown]);

  // Poll for AI result once INSPECTING
  useEffect(() => {
    if (step !== 'INSPECTING' || !returnContext?.return_id) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await api.returns.getReturn(returnContext.return_id);
        if (data && data.final_outcome && data.final_outcome !== 'Pending') {
          clearInterval(pollRef.current);
          setResult(data);
          setStep('RESULT');
        }
      } catch (_) { /* network hiccup — keep polling */ }
    }, 2500);

    return () => clearInterval(pollRef.current);
  }, [step, returnContext]);

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
        order_id:            productData.order_id,
        sku_id:              productData.sku_id,
        return_reason_code:  reason,
        customer_id:         productData.customer_id,
        troubleshooter_time_ms: timeElapsedMs,
      });
      setReturnContext(res);
      setStep('RECORDING');
    } catch (e) {
      console.error(e);
      alert('Failed to initiate return. Please check the server.');
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
      setTimeout(() => setWaitState(false), 5000);
    } else {
      if (elapsed < 3000) console.warn('Suspiciously fast troubleshooter exit');
      proceedToAPI(selectedReason, elapsed);
    }
  };

  // ─── VIEWS ────────────────────────────────────────────────────────────────

  if (step === 'SUCCESS') {
    return (
      <div className="container text-center animate-fade-in">
        <div className="glass-card">
          <CheckCircle2 size={48} className="mb-4" style={{ color: 'var(--success)' }} />
          <h2>Issue Resolved!</h2>
          <p>We're glad we could help fix your {productData.name}. Your return has been cancelled.</p>
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
            onDecline={() => { alert('Proceeding to photo fallback...'); navigate('/'); }}
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
        setStep('INSPECTING');
      } catch (e) {
        await storeOfflineVideo(returnContext.return_id, blob);
        setStep('OFFLINE_SAVED');
      }
    };

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <CameraCapture productData={productData} onComplete={handleVideoComplete} />
      </div>
    );
  }

  if (step === 'UPLOADING') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
          <UploadCloud size={48} className="mb-4 text-primary" />
          <h2>Uploading securely...</h2>
          <div style={{ background: 'var(--bg)', borderRadius: '8px', height: '12px', marginTop: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.3s ease-in-out' }} />
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{uploadProgress}% Complete</p>
        </div>
      </div>
    );
  }

  if (step === 'OFFLINE_SAVED') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card">
          <RefreshCcw size={48} className="mb-4 text-danger" />
          <h2>Offline Mode Enabled</h2>
          <p>Connection lost. Evidence safely stored locally.</p>
          <button className="btn primary mt-4" onClick={() => setStep('UPLOADING')}>Retry Upload</button>
        </div>
      </div>
    );
  }

  if (step === 'INSPECTING') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Loader2 size={52} color="var(--primary)" style={{ animation: 'spin 1.2s linear infinite' }} />
          </div>
          <h2>AI Verification Running</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Our agentic pipeline is inspecting your product using Gemini Vision,
            evaluating policy rules, and computing your routing impact metrics.
            <br /><strong style={{ color: 'var(--text)' }}>This typically takes 15–30 seconds.</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 8 }}>
            {['InspectionAgent: Analysing condition & defects', 'FraudAgent: Verifying integrity signals', 'PolicyAgent: Applying return policy', 'RoutingAgent: Computing optimal destination'].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'RESULT' && result) {
    const outcomeKey = result.policy_outcome || result.final_outcome || 'approved';
    const oc = OUTCOME_CONFIG[outcomeKey] || OUTCOME_CONFIG['approved'];
    const gradeColors = { A: 'var(--success)', B: '#f59e0b', C: 'var(--primary)', Scrap: 'var(--danger)' };

    return (
      <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
        <div className="glass-card">

          {/* Outcome header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: 20, background: `${oc.color}22`, border: `1px solid ${oc.color}`, color: oc.color, fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
              {oc.label}
            </div>
            <h2 style={{ margin: 0 }}>{productData.name}</h2>
          </div>

          {/* Customer message */}
          {result.customer_message && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #333', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {result.customer_message}
            </div>
          )}

          {/* Condition + Refund row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Condition Grade</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: gradeColors[result.condition_grade] || 'white' }}>{result.condition_grade || '—'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Refund Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                {result.refund_amount_inr > 0 ? `₹${result.refund_amount_inr.toLocaleString('en-IN')}` : '—'}
              </div>
            </div>
          </div>

          {/* Impact metrics */}
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>🌱 SDG IMPACT METRICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
              <div>
                <BadgeDollarSign size={20} color="var(--success)" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{(result.value_recovered_inr || 0).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Value Recovered</div>
              </div>
              <div>
                <Navigation size={20} color="var(--primary)" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{result.distance_saved_km || 0} km</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Distance Saved</div>
              </div>
              <div>
                <Leaf size={20} color="#10b981" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(result.carbon_offset_kg || 0).toFixed(3)} kg</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CO₂ Avoided</div>
              </div>
            </div>
          </div>

          {/* Routing info */}
          {result.routed_hub_id && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Routed to</span>
              <span style={{ fontWeight: 600 }}>{result.routed_hub_id} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({result.route_type})</span></span>
            </div>
          )}

          {/* Warranty badge */}
          {result.policy_outcome === 'warranty_escalation' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary)', borderRadius: 8, padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <ShieldAlert size={18} color="var(--primary)" />
              <span>A warranty claim has been filed with the manufacturer. You will be contacted within 48 hours.</span>
            </div>
          )}

          <button className="btn primary" onClick={() => navigate('/')} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            Back to Orders
          </button>
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
            <h2 style={{ margin: 0 }}>Recommended Fix</h2>
          </div>
          <p style={{ textAlign: 'center' }}>Before shipping back, try this step:</p>
          <div className="product-snippet" style={{ flexDirection: 'column', alignItems: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid var(--primary)', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{localTroubleshooter?.step}</h3>
            {localTroubleshooter?.resolution_rate && (
              <span className="badge" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} fill="currentColor" /> Resolved for {Math.round(localTroubleshooter.resolution_rate * 100)}% of customers!
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

  // Default: REASON_SELECTION
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
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 20px', alignItems: 'center', padding: '1rem', gap: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', width: 40, height: 40, borderRadius: 8 }}>
                  <Icon size={18} color={selectedReason === reason.id ? 'var(--primary)' : 'var(--text-muted)'} />
                </div>
                <span style={{ fontWeight: selectedReason === reason.id ? 600 : 400 }}>{reason.label}</span>
                <ChevronRight size={18} style={{ opacity: selectedReason === reason.id ? 1 : 0.3 }} />
              </button>
            );
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
