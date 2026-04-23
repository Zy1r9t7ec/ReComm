import React, { useState, useEffect } from 'react';
import CaseDetailModal from '../components/CaseDetailModal';

export default function ReviewQueue() {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  const fetchCases = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/dashboard/cases');
      const data = await res.json();
      setCases(data.cases || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 3000); // Poll for real-time simulation
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <h1 style={{ marginBottom: '2rem' }}>Human Review Queue</h1>
      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table className="queue-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ borderBottom: '1px solid #333' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Return ID</th>
              <th>SKU</th>
              <th>Condition</th>
              <th>Fraud Score</th>
              <th>Outcome</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No cases in system.</td></tr>
            )}
            {cases.map(c => (
              <tr key={c.return_id} style={{ borderBottom: '1px solid #222', background: c.requires_manual_review ? '#ef444415' : 'transparent' }}>
                <td style={{ padding: '1rem' }}><strong>{c.return_id}</strong></td>
                <td>{c.sku_id}</td>
                <td><span className={`badge grade-${c.condition_grade || 'Pending'}`}>{c.condition_grade || 'Pending'}</span></td>
                <td>
                  <span style={{ color: (c.fraud_score ?? 0) > 0.5 ? 'var(--danger)' : 'inherit' }}>
                    {c.fraud_score != null ? `${(c.fraud_score * 100).toFixed(0)}%` : '--'}
                  </span>
                </td>
                <td style={{ fontWeight: c.requires_manual_review ? 'bold' : 'normal', color: c.requires_manual_review ? 'var(--danger)' : 'white' }}>{c.final_outcome || 'Pending'}</td>
                <td>
                  <button onClick={() => setSelectedCase(c)} style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}>
                    View AI Trace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={fetchCases}
        />
      )}
    </div>
  );
}
