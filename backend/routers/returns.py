from fastapi import APIRouter
from models.returns import InitiateReturnRequest, InitiateReturnResponse, TroubleshooterRequest, TroubleshooterResponse
from services.troubleshooter import get_troubleshooter_step
import uuid

router = APIRouter(
    prefix="/api/v1/returns",
    tags=["returns"]
)

# In-memory session store (Mocking Firestore for now)
MOCK_RETURN_CONTEXT = {}

@router.post("/initiate", response_model=InitiateReturnResponse)
def initiate_return(request: InitiateReturnRequest):
    return_id = f"RTN-{str(uuid.uuid4())[:8].upper()}"
    
    # Check if there is a troubleshooter for this Reason + SKU combination
    troubleshooter_step = get_troubleshooter_step(request.sku_id, request.return_reason_code)
    next_step = "troubleshooter" if troubleshooter_step else "recording"
    
    MOCK_RETURN_CONTEXT[return_id] = {
        "return_id": return_id,
        "customer_id": request.customer_id,
        "order_id": request.order_id,
        "sku_id": request.sku_id,
        "return_reason_code": request.return_reason_code,
        "pre_return_resolved": False
    }
    
    return InitiateReturnResponse(
        return_id=return_id,
        troubleshooter_step=troubleshooter_step,
        next_step=next_step
    )

@router.post("/{return_id}/troubleshooter", response_model=TroubleshooterResponse)
def resolve_troubleshooter(return_id: str, request: TroubleshooterRequest):
    if return_id in MOCK_RETURN_CONTEXT:
        MOCK_RETURN_CONTEXT[return_id]["pre_return_resolved"] = request.resolved
        
    if request.resolved:
        return TroubleshooterResponse(next_step="closed")
    else:
        return TroubleshooterResponse(next_step="recording")

@router.get("/{return_id}")
def get_return_context(return_id: str):
    """Debug endpoint to check the context progression"""
    return MOCK_RETURN_CONTEXT.get(return_id, {"error": "Not Found"})
