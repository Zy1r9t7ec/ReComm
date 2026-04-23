import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks, BarChart3, ShieldAlert, BadgeDollarSign, Sparkles, Settings2 } from 'lucide-react';
import Overview from './pages/Overview';
import ReviewQueue from './pages/ReviewQueue';
import './App.css';

function Sidebar() {
  const location = useLocation();
  return (
    <div className="sidebar glass-card">
      <div className="brand" style={{fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem'}}>
        <span style={{color: 'var(--primary)'}}>ReComm</span> Admin
      </div>
      <nav style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <LayoutDashboard size={18} /> Overview
        </Link>
        <Link to="/queue" className={location.pathname === '/queue' ? 'active' : ''}>
          <ListChecks size={18} /> Review Queue
        </Link>
        
        <div style={{height: 1, background: '#222', margin: '0.5rem 0'}}></div>
        
        <div style={{opacity: 0.4, cursor: 'not-allowed'}} className="sidebar-phantom">
          <div style={{padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem'}} title="Coming Soon">
             <BarChart3 size={18} /> Return Analytics
          </div>
          <div style={{padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem'}} title="Coming Soon">
             <ShieldAlert size={18} /> Fraud Feed
          </div>
          <div style={{padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem'}} title="Coming Soon">
             <BadgeDollarSign size={18} /> Revenue Recovery
          </div>
          <div style={{padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem'}} title="Coming Soon">
             <Sparkles size={18} /> Product Quality
          </div>
          <div style={{padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem'}} title="Coming Soon">
             <Settings2 size={18} /> Policy Manager
          </div>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="content animate-fade-in">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/queue" element={<ReviewQueue />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
