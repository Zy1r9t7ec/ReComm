import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CameraConsent({ onAccept, onDecline }) {
  return (
    <div className="glass-card animate-fade-in text-center">
      <ShieldAlert size={48} className="mb-4 text-primary" style={{ margin: '0 auto' }} />
      <h2>Video Consent Required</h2>
      
      <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <p style={{ color: 'var(--text)' }}>
          To process this return efficiently without an immediate warehouse inspection, we require a short video of the product's condition.
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          By continuing, you agree to allow ReComm to temporarily access your camera and microphone. The recording will be kept in a private secure vault and automatically deleted after 90 days in compliance with the DPDP Act 2023.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button className="btn primary" onClick={onAccept}>
          I understand and agree to record
        </button>
        <button className="btn" onClick={onDecline}>
          Cancel return / Upload photo fallback instead
        </button>
      </div>
    </div>
  );
}
