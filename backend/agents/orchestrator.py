import os
import google.generativeai as genai
from typing import Dict, Any

from .inspection import run_inspection
from .policy import run_policy_check

def execute_return_orchestration(return_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    The orchestrator manages the state of the return context, farming tasks
    out to specific agents based on the pipeline stage.
    """
    sku_id = return_context.get("sku_id", "Unknown")
    reason = return_context.get("return_reason_code", "Unknown")
    # For now, mock video URL
    video_uri = f"gs://recomm-mock-bucket/{return_context.get('return_id')}/video.mp4"
    
    # --- PHASE 1: INSPECTION ---
    print(f"[Orchestrator] Running Inspection Agent for {return_context['return_id']}...")
    inspection_result = run_inspection(sku_id, reason, video_uri)
    return_context["condition_grade"] = inspection_result.get("grade")
    return_context["inspection_reasoning"] = inspection_result.get("reasoning")
    
    # --- PHASE 2: POLICY ---
    # For prototype mapping, assume category is electronics unless specified
    sku_category = "Electronics" 
    print(f"[Orchestrator] Running Policy Agent...")
    policy_result = run_policy_check(sku_category, return_context["condition_grade"])
    return_context["resellable"] = policy_result.get("resellable")
    return_context["policy_flag"] = policy_result.get("policy_flag")
    
    # Note: Fraud Agent & Routing Agent run linearly downstream (Phase 5)
    
    return return_context
