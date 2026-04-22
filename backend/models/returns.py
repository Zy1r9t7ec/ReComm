from pydantic import BaseModel
from typing import Optional, Dict, Any

class InitiateReturnRequest(BaseModel):
    order_id: str
    sku_id: str
    return_reason_code: str
    customer_id: str

class InitiateReturnResponse(BaseModel):
    return_id: str
    troubleshooter_step: Optional[Dict[str, Any]] = None
    next_step: str  # "troubleshooter" | "recording"

class TroubleshooterRequest(BaseModel):
    resolved: bool

class TroubleshooterResponse(BaseModel):
    next_step: str  # "closed" | "recording"
