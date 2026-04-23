from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
    inspection_confidence: Optional[float] = None
    identity_confidence: Optional[float] = None
    defects: Optional[List[str]] = None          # e.g. ["USB_PORT_LOOSE"]

    # Policy payload
    resellable: Optional[bool] = None
    policy_flag: Optional[str] = None
    policy_outcome: Optional[str] = None          # approved | partial_refund | warranty_escalation | rejected | human_escalation
    refund_amount_inr: Optional[float] = None

    # Fraud payload
    fraud_score: Optional[float] = None
    requires_manual_review: Optional[bool] = None
    fraud_signals: Optional[Dict[str, Any]] = None

    # Routing payload
    routed_hub_id: Optional[str] = None
    route_type: Optional[str] = None
    distance_saved_km: Optional[float] = None
    carbon_offset_kg: Optional[float] = None
    value_recovered_inr: Optional[float] = None
    warranty_claim_payload: Optional[Dict[str, Any]] = None

    # Final states
    final_outcome: Optional[str] = "Pending"
    customer_message: Optional[str] = None
    orchestrator_log: Optional[List[Dict[str, Any]]] = None
