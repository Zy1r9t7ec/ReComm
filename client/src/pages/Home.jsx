import { useNavigate } from 'react-router-dom';
import { Package, RotateCcw, User, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const handleReturn = () => {
    // Navigate with mock order context
    navigate('/return', { 
      state: { 
        order_id: "ORD-99921", 
        sku_id: "PB-200", 
        brand: "Portronics",
        name: "Powerbank PB-200",
        customer_id: "CUST-00123" 
      } 
    });
  };

  return (
    <div className="container" style={{paddingTop: '3rem'}}>
      {/* Brand Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0, fontSize: '1.5rem', color: 'var(--text)'}}>Hi, Priya 👋</h1>
          <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)'}}>Manage your recent orders</p>
        </div>
        <div style={{width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', border: '2px solid var(--primary)', overflow: 'hidden'}}>
           <img src="https://i.pravatar.cc/150?u=priya" alt="Priya avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package className="text-primary" size={20} />
            <h2 style={{margin: 0, fontSize: '1.2rem'}}>Recent Order</h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>#ORD-99921</span>
        </div>
        
        <div className="product-snippet" style={{background: 'rgba(255,255,255,0.02)', padding: '1.25rem'}}>
          <div className="product-img" style={{background: 'transparent', width: '70px', height: '70px'}}>
            <img src="https://m.media-amazon.com/images/I/41Dq74X9yQL._SX300_SY300_QL70_FMwebp_.jpg" alt="Portronics PB-200" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'}} />
          </div>
          <div>
            <h3 style={{margin: 0, fontSize: '1.1rem', marginBottom: '0.25rem'}}>Portronics Powerbank PB-200</h3>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem'}}>
               <CheckCircle2 size={14} color="var(--success)" fill="rgba(16, 185, 129, 0.2)" />
               <span style={{fontSize: '0.9rem', color: 'var(--success)', fontWeight: '600'}}>Delivered</span>
            </div>
            <p style={{margin:0, fontSize: '0.8.5rem'}}>Delivered 12 days ago</p>
          </div>
        </div>

        <button className="btn primary" onClick={handleReturn} style={{marginTop: '1rem', padding: '1rem', fontSize: '1rem'}}>
          <RotateCcw size={18} />
          Return this item
        </button>
      </div>
    </div>
  );
}
