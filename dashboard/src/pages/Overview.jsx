import React from 'react';
import { AlertCircle, TrendingUp, RefreshCcw } from 'lucide-react';

export default function Overview() {
  return (
    <div>
      <h1 style={{marginBottom: '2rem'}}>Network Overview</h1>
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>Returns Processed</h3>
            <RefreshCcw size={20} color="var(--primary)" />
          </div>
          <div className="stat-value">1,248</div>
          <div className="stat-trend">+14% vs last week</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>Fraud Deflections</h3>
            <AlertCircle size={20} color="var(--danger)" />
          </div>
          <div className="stat-value">42</div>
          <div className="stat-trend danger">Anomaly Spike Detected</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>Revenue Recovered</h3>
            <TrendingUp size={20} color="var(--secondary)" />
          </div>
          <div className="stat-value">$14,290</div>
          <div className="stat-trend">Refurbishment Routing</div>
        </div>
      </div>
      
      <div className="glass-card" style={{marginTop: '2rem', padding: '1.5rem'}}>
        <h3>Recent Return Cluster</h3>
        <p style={{color: 'grey', fontSize: '0.9rem'}}>Live map visualization simulation placeholder. Most routing pointing to Dark Store 01.</p>
        <div style={{width: '100%', height: '200px', background: '#ffffff05', borderRadius: '8px', marginTop: '1rem', border: '1px dashed #ffffff20', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          [Geographic Cluster Map]
        </div>
      </div>
    </div>
  );
}
