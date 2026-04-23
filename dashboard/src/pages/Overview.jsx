import React from 'react';
import { Leaf, Navigation, Map as MapIcon, RefreshCcw, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const mockFraudData = [
  { day: 'Mon', rate: 1.2 }, { day: 'Tue', rate: 1.4 }, { day: 'Wed', rate: 1.1 },
  { day: 'Thu', rate: 2.5 }, { day: 'Fri', rate: 8.8 }, { day: 'Sat', rate: 5.2 }, { day: 'Sun', rate: 3.1 }
];

export default function Overview() {
  return (
    <div style={{animation: 'fadeIn 0.5s'}}>
      <div style={{marginBottom: '2rem'}}>
        <h1 style={{marginBottom: '0.5rem'}}>Network Overview & SDG Impact</h1>
        <p style={{color: 'var(--text-muted)'}}>Value recovery and emissions tracing explicitly derived via the GLEC framework.</p>
      </div>

      <div className="stats-grid" style={{marginBottom: '2rem'}}>
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>Value Recovered (₹)</h3>
            <RefreshCcw size={20} color="var(--primary)" />
          </div>
          <div className="stat-value">₹12,48,290</div>
          <div className="stat-trend" style={{color: 'var(--success)'}}>Refurbishment Routing Maximization</div>
        </div>
        
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>Logistics Distance Saved (km)</h3>
            <Navigation size={20} color="var(--secondary)" />
          </div>
          <div className="stat-value">4,192 km</div>
          <div className="stat-trend">Optimized Edge-Node Deflection</div>
        </div>
        
        <div className="stat-card glass-card">
          <div className="stat-header">
            <h3>CO₂ Avoided (kg)</h3>
            <Leaf size={20} color="var(--success)" />
          </div>
          <div className="stat-value">1,180 kg</div>
          <div className="stat-trend">GLEC Methodology Alignment</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem' }}>
        
        <div className="glass-card" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
             <h3 style={{margin: 0}}>Geographic Routing Interpolation</h3>
             <MapIcon size={18} color="var(--text-muted)" />
           </div>
           <div style={{ flex: 1, minHeight: '350px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
             <MapContainer center={[21.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%', background: '#0a0a0a' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                
                <Marker position={[19.0760, 72.8777]}><Popup>Mumbai Dark Store</Popup></Marker>
                <Marker position={[28.7041, 77.1025]}><Popup>Delhi Refurb Center</Popup></Marker>
                <Marker position={[12.9716, 77.5946]}><Popup>Bangalore Liquidation</Popup></Marker>
                <Marker position={[17.3850, 78.4867]}><Popup>Hyderabad Core</Popup></Marker>
                <Marker position={[23.0225, 72.5714]}><Popup>Ahmedabad Local</Popup></Marker>
                
                <Polyline positions={[[17.3850, 78.4867], [12.9716, 77.5946]]} color="var(--primary)" dashArray="4, 8" weight={3} />
                <Polyline positions={[[23.0225, 72.5714], [19.0760, 72.8777]]} color="var(--secondary)" dashArray="4, 8" weight={3} />
                <Polyline positions={[[28.7041, 77.1025], [19.0760, 72.8777]]} color="var(--danger)" dashArray="4, 8" weight={3} />
             </MapContainer>
           </div>
        </div>

        <div className="glass-card" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem'}}>
             <div>
               <h3 style={{margin: 0, marginBottom: '0.25rem'}}>Fraud Escalations</h3>
               <span style={{fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4}}>Anomaly Spike Detected (Friday)</span>
             </div>
             <Activity size={18} color="var(--danger)" />
           </div>
           <div style={{ flex: 1, minHeight: '350px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={mockFraudData}>
                 <XAxis dataKey="day" stroke="#666" tick={{fontSize: 12}} dy={10} />
                 <YAxis stroke="#666" tick={{fontSize: 12}} dx={-10} />
                 <Tooltip 
                   contentStyle={{background: '#111', border: '1px solid #333', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.5)'}}
                   itemStyle={{color: 'var(--text)'}}
                 />
                 <Line type="monotone" dataKey="rate" stroke="var(--danger)" strokeWidth={4} dot={{r: 4, fill: '#111', strokeWidth: 2}} activeDot={{r: 8, fill: 'var(--danger)'}} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
}
