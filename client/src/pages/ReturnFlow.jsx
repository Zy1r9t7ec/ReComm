import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Wrench, CheckCircle2, ChevronLeft, Camera, UploadCloud, RefreshCcw } from 'lucide-react';
import { api } from '../api';
import CameraConsent from '../components/CameraConsent';
import CameraCapture from '../components/CameraCapture';
import { storeOfflineVideo, clearOfflineVideo } from '../utils/indexedDB';

const RETURN_REASONS = [
  { id: 'not_charging', label: 'Not charging / Battery issue' },
  { id: 'damaged', label: 'Damaged physical condition' },
  { id: 'wrong_item', label: 'Received wrong item' },
  { id: 'defective', label: 'Defective / Not turning on' }
];

export default function ReturnFlow() {
  const { state: productData } = useLocation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('REASON_SELECTION');
  const [selectedReason, setSelectedReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [returnContext, setReturnContext] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // If directly navigated without state
  if (!productData) {
    return (
      <div className="container text-center">
        <h2>No Product Selected</h2>
        <button className="btn mt-4" onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const handleInitiate = async () => {
    if (!selectedReason) return;
    setLoading(true);
    try {
      const res = await api.returns.initiate({
        order_id: productData.order_id,
        sku_id: productData.sku_id,
        return_reason_code: selectedReason,
        customer_id: productData.customer_id
      });
      setReturnContext(res);
      if (res.next_step === 'troubleshooter') {
        setStep('TROUBLESHOOTER');
      } else {
        setStep('RECORDING'); // Or skipped straight to camera
      }
    } catch (e) {
      console.error(e);
      alert("Failed to initiate return. Please check server.");
    } finally {
      setLoading(false);
    }
  };

  const handleTroubleshootResult = async (resolved) => {
    setLoading(true);
    try {
      const res = await api.returns.resolveTroubleshooter(returnContext.return_id, resolved);
      if (res.next_step === 'closed') {
        setStep('SUCCESS');
      } else {
        setStep('RECORDING');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        
        // Trigger the backend A2A Autonomous Agents Pipeline asynchronously
        await api.returns.startInspection(returnContext.return_id);
        
        setStep('INSPECTION');
      } catch (e) {
        // Fallback: Save to IndexedDB if network fails
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
        <div className="glass-card">
          <UploadCloud size={48} className="mb-4 text-primary" style={{ animation: 'slideUp 1s infinite alternate' }} />
          <h2>Uploading securely...</h2>
          
          <div style={{ background: 'var(--bg)', borderRadius: '8px', height: '12px', marginTop: '1.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{uploadProgress}% Complete</p>
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
          <p>We lost connection, but your evidence was safely stored on this device securely.</p>
          <button className="btn primary mt-4" onClick={() => setStep('UPLOADING')}>Retry Upload</button>
        </div>
      </div>
    );
  }

  if (step === 'INSPECTION') {
    return (
      <div className="container animate-fade-in text-center" style={{ paddingTop: '4rem' }}>
        <div className="glass-card">
          <CheckCircle2 size={48} className="mb-4 text-success" />
          <h2>Video Received!</h2>
          <p>The AI Engine (Stage 3) is now running multimodal analysis on your submission. Due to architecture specs, this would trigger our backend Vertex orchestration logic.</p>
          <button className="btn primary mt-4" onClick={() => navigate('/')}>Done for now</button>
        </div>
      </div>
    );
  }

  if (step === 'TROUBLESHOOTER') {
    const tStep = returnContext?.troubleshooter_step;
    return (
      <div className="container animate-fade-in">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Wrench className="text-primary" />
            <h2>Quick Fix Available</h2>
          </div>
          
          <p>Before you ship this back, try this {productData.brand} recommended step:</p>
          
          <div className="product-snippet" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)' }}>
            <h3 style={{margin:0, fontSize: '1.2rem'}}>{tStep?.step}</h3>
            {tStep?.resolution_rate && (
              <span className="badge">
                💡 This resolved the issue for {Math.round(tStep.resolution_rate * 100)}% of customers!
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexDirection: 'column' }}>
            <button 
              className="btn primary" 
              onClick={() => handleTroubleshootResult(true)}
              disabled={loading}
            >
              <CheckCircle2 size={18} /> Yes, this fixed it! Cancel Return
            </button>
            <button 
              className="btn" 
              onClick={() => handleTroubleshootResult(false)}
              disabled={loading}
            >
              No, it's still broken. Continue Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div className="glass-card">
        <button className="btn" style={{width: 'auto', background: 'transparent', padding: '0.5rem 0', marginBottom: '1rem', border: 'none'}} onClick={() => navigate('/')}>
          <ChevronLeft size={18}/> Back
        </button>
        
        <h2>Why are you returning this?</h2>
        <p>Select the reason below for {productData.name}</p>

        <div className="option-list">
          {RETURN_REASONS.map(reason => (
            <button 
              key={reason.id}
              className={`option-item ${selectedReason === reason.id ? 'selected' : ''}`}
              onClick={() => setSelectedReason(reason.id)}
            >
              {reason.label}
              <ChevronRight size={18} style={{ opacity: selectedReason === reason.id ? 1 : 0.3 }}/>
            </button>
          ))}
        </div>

        <button 
          className="btn primary" 
          disabled={!selectedReason || loading} 
          onClick={handleInitiate}
        >
          {loading ? 'Thinking...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
