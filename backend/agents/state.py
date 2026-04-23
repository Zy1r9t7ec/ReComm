from pydantic import BaseModel
from typing import Optional

class ReturnContext(BaseModel):
    return_id: str
    customer_id: str
    order_id: str
    sku_id: str
    return_reason_code: str
    video_uri: str
    
    # Inspection payload
    condition_grade: Optional[str] = None
    inspection_reasoning: Optional[str] = None
    
    # Policy payload
    resellable: Optional[bool] = None
    policy_flag: Optional[str] = None
    
    # Fraud payload
    fraud_score: Optional[float] = None
    requires_manual_review: Optional[bool] = None
    
    # Routing payload
    routed_hub_id: Optional[str] = None
    route_type: Optional[str] = None
    carbon_offset_kg: Optional[float] = None
    
    # Final states
    final_outcome: Optional[str] = "Pending"
    customer_message: Optional[str] = None
