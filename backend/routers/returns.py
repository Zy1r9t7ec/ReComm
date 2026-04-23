from fastapi import APIRouter, BackgroundTasks
from models.returns import InitiateReturnRequest, InitiateReturnResponse, TroubleshooterRequest, TroubleshooterResponse
from services.troubleshooter import get_troubleshooter_step
from agents.inspection import InspectionAgent
from agents.state import ReturnContext as SDKReturnContext
from models.store import get_session, save_session
import uuid

router = APIRouter(
    prefix="/api/v1/returns",
    tags=["returns"]
)

@router.post("/initiate", response_model=InitiateReturnResponse)
def initiate_return(request: InitiateReturnRequest):
    return_id = f"RTN-{str(uuid.uuid4())[:8].upper()}"
    
    # Check if there is a troubleshooter for this Reason + SKU combination
    troubleshooter_step = get_troubleshooter_step(request.sku_id, request.return_reason_code)
    next_step = "troubleshooter" if troubleshooter_step else "recording"
    
    save_session(return_id, {
        "return_id": return_id,
        "customer_id": request.customer_id,
        "order_id": request.order_id,
        "sku_id": request.sku_id,
        "return_reason_code": request.return_reason_code,
        "pre_return_resolved": False
    })
    
    return InitiateReturnResponse(
        return_id=return_id,
        troubleshooter_step=troubleshooter_step,
        next_step=next_step
    )

@router.post("/{return_id}/troubleshooter", response_model=TroubleshooterResponse)
def resolve_troubleshooter(return_id: str, request: TroubleshooterRequest):
    context = get_session(return_id)
    if context:
        context["pre_return_resolved"] = request.resolved
        save_session(return_id, context)
        
    if request.resolved:
        return TroubleshooterResponse(next_step="closed")
    else:
        return TroubleshooterResponse(next_step="recording")

@router.post("/{return_id}/inspect")
def start_inspection(return_id: str, background_tasks: BackgroundTasks):
    """
    Simulates the Cloud Tasks / PubSub hook where the media upload completion
    triggers the multi-modal agent orchestrator asynchronously.
    """
    if not get_session(return_id):
        return {"error": "Return session not found."}
        
    def async_orchestrator(rid):
        context = get_session(rid)
        
        # Hydrate the raw dictionary into ADK Stateful object
        state = SDKReturnContext(
            return_id=context["return_id"],
            customer_id=context.get("customer_id", "CUST-000"),
            order_id=context.get("order_id", "ORD-000"),
            sku_id=context.get("sku_id", "UNKNOWN"),
            return_reason_code=context.get("return_reason_code", "UNKNOWN"),
            video_uri=context.get("video_uri", f"gs://mock/{rid}.mp4")
        )
        
        # Fire first node in the A2A Domino Chain
        finished_state = InspectionAgent().process(state)
        
        # Deflate ADK object back to Persistent Session
        save_session(rid, finished_state.model_dump())
        
    background_tasks.add_task(async_orchestrator, return_id)
    return {"status": "A2A Agentic Chain Started", "return_id": return_id}

@router.get("/{return_id}")
def get_return_context(return_id: str):
    """Debug endpoint to check the context progression"""
    return get_session(return_id) or {"error": "Not Found"}
