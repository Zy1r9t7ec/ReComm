from fastapi import APIRouter
from pydantic import BaseModel
from models.store import get_session, _read_store, save_session

class OverridePayload(BaseModel):
    decision: str
    notes: str

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"]
)

@router.get("/cases")
def list_cases():
    """Returns all active items present in the persistent store."""
    store = _read_store()
    return {"cases": list(store.values())}

@router.post("/cases/{return_id}/override")
def override_case(return_id: str, payload: OverridePayload):
    """Admin endpoint to forcefully mutate the automated pipeline response."""
    context = get_session(return_id)
    if not context:
        return {"error": "Session Not Found"}
        
    context["final_outcome"] = payload.decision
    context["human_override_notes"] = payload.notes
    context["requires_manual_review"] = False # Unlock
    
    save_session(return_id, context)
    return {"status": "Override Recorded", "context": context}
