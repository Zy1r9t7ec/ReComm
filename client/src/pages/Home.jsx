import { useNavigate } from 'react-router-dom';
import { Package, RotateCcw } from 'lucide-react';

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
    <div className="container">
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Package className="text-primary" />
          <h2>Your Recent Order</h2>
        </div>
        
        <div className="product-snippet">
          <div className="product-img">🔋</div>
          <div>
            <h3 style={{margin:0, fontSize: '1.1rem'}}>Portronics Powerbank PB-200</h3>
            <p style={{margin:0}}>Delivered 12 days ago • Order #ORD-99921</p>
          </div>
        </div>

        <button className="btn" onClick={handleReturn}>
          <RotateCcw size={18} />
          Return this item
        </button>
      </div>
    </div>
  );
}
