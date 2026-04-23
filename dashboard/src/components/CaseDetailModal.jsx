import React, { useState } from 'react';
import { X, Play, ShieldAlert, CheckCircle, Cpu } from 'lucide-react';

export default function CaseDetailModal({ caseData, onClose, onRefresh }) {
  const [decision, setDecision] = useState('Approved');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`http://localhost:8000/api/v1/dashboard/cases/${caseData.return_id}/override`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({decision, notes})
      });
      onRefresh();
      onClose();
    } catch(err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal glass-card animate-scale-up">
        <div className="modal-header">
          <h2>Case {caseData.return_id}</h2>
          <button className="icon-btn" onClick={onClose} style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer'}}><X size={20}/></button>
        </div>

        <div className="modal-body">
          <div className="video-section" style={{background: '#000', height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8}}>
            <Play size={48} color="white" style={{opacity: 0.5}} />
            <p style={{fontSize: '0.8rem', opacity: 0.7}}>Signed GCS URL</p>
            <p style={{fontSize: '0.7rem', color: 'var(--primary)'}}>{caseData.video_uri}</p>
          </div>

          <div className="ai-traces" style={{marginTop: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Cpu size={16}/> AI Reasoning Traces</h3>
            
            <div className="trace-box">
              <strong>InspectionAgent (Condition: {caseData.condition_grade})</strong>
              <p>{caseData.inspection_reasoning}</p>
            </div>
            
            <div className="trace-box" style={{borderLeftColor: caseData.resellable ? 'var(--secondary)' : 'var(--danger)'}}>
              <strong>PolicyAgent (Resellable: {caseData.resellable ? 'Yes' : 'No'})</strong>
              <p>{caseData.policy_flag}</p>
            </div>
            
            {caseData.fraud_score > 0.5 && (
              <div className="trace-box" style={{borderLeftColor: 'var(--danger)', background: '#ef444410'}}>
                <strong style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)'}}><ShieldAlert size={14}/> FraudAgent Anomaly</strong>
                <p>System flagged high risk ({(caseData.fraud_score * 100).toFixed(0)}%). Manual override mandated.</p>
              </div>
            )}
            
            <div className="trace-box">
              <strong>RoutingAgent Target</strong>
              <p>{caseData.route_type} ({caseData.routed_hub_id})</p>
            </div>
          </div>

          <div className="override-panel" style={{marginTop: '2rem', padding: '1rem', background: '#ffffff05', border: '1px solid #ffffff10', borderRadius: 8}}>
            <h3 style={{marginBottom: '1rem'}}>Human Override</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label>Decision Override</label>
                <select value={decision} onChange={e => setDecision(e.target.value)} style={{padding: '0.75rem', borderRadius: 8, background: '#111', color: 'white', border: '1px solid #333'}}>
                  <option value="Approved">Approve Return</option>
                  <option value="Partial Refund">Partial Refund</option>
                  <option value="Rejected">Reject Return</option>
                  <option value="Escalated to Warranty">Escalate to Warranty</option>
                </select>
              </div>
              <div className="form-group" style={{marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label>Review Notes (Required)</label>
                <textarea 
                  required 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Justify your decision here..."
                  style={{padding: '0.75rem', borderRadius: 8, background: '#111', color: 'white', border: '1px solid #333', minHeight: 80}}
                />
              </div>
              <button disabled={submitting} type="submit" style={{width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer'}}>
                <CheckCircle size={18}/> {submitting ? 'Committing...' : 'Commit Override'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
