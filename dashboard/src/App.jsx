import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks } from 'lucide-react';
import Overview from './pages/Overview';
import ReviewQueue from './pages/ReviewQueue';
import './App.css';

function Sidebar() {
  const location = useLocation();
  return (
    <div className="sidebar glass-card">
      <div className="brand" style={{fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '1rem'}}>
        <span style={{color: 'var(--primary)'}}>ReComm</span> Merchant
      </div>
      <nav style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <LayoutDashboard size={18} /> Overview
        </Link>
        <Link to="/queue" className={location.pathname === '/queue' ? 'active' : ''}>
          <ListChecks size={18} /> Review Queue
        </Link>
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
