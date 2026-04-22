import json
import os
from typing import Optional, Dict, Any

def get_troubleshooter_step(sku_id: str, reason_code: str) -> Optional[Dict[str, Any]]:
    """Loads the mock SKU catalog and determines if there is a troubleshooter step."""
    
    mock_file = os.path.join(os.path.dirname(__file__), '../../data/mock/skus.json')
    if not os.path.exists(mock_file):
        return None
        
    try:
        with open(mock_file, 'r') as f:
            data = json.load(f)
            
        for sku in data.get("skus", []):
            if sku.get("sku_id") == sku_id:
                for step in sku.get("troubleshooter_steps", []):
                    if step.get("reason") == reason_code:
                        return step
                        
    except Exception as e:
        print(f"Error reading troubleshooter mock: {e}")
        
    return None
