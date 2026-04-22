import React from 'react';
import { LayoutDashboard, BarChart3, AlertTriangle, Settings, Box } from 'lucide-react';
import './index.css';

export default function App() {
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>ReComm Merchant</h2>
        <div style={{marginTop: '2rem'}}>
          <div className="nav-item"><LayoutDashboard size={20}/> Overview</div>
          <div className="nav-item active"><Box size={20}/> Returns Queue</div>
          <div className="nav-item"><AlertTriangle size={20}/> Fraud Alerts</div>
          <div className="nav-item"><BarChart3 size={20}/> Quality Reports</div>
          <div className="nav-item" style={{marginTop: 'auto'}}><Settings size={20}/> Policy Settings</div>
        </div>
      </div>
      <div className="main-content">
        <h1>Welcome to ReComm</h1>
        <p style={{color: 'var(--text-muted)'}}>The Merchant Dashboard is currently in development (Phase 6).</p>
        
        <div className="glass-card" style={{marginTop: '2rem'}}>
          <h3>Return Rates & Analytics</h3>
          <p style={{color: 'var(--text-muted)'}}>Check back later to see aggregated models and human-over-queue interfaces once we initiate the backend AI Inspection flows.</p>
        </div>
      </div>
    </div>
  );
}
