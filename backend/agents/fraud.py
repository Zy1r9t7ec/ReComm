from .state import ReturnContext
from .policy import PolicyAgent
from .communication import CommunicationAgent
import json
import os

class FraudAgent:
    """
    Calculates anomalies and historical metrics.
    Acts as a router: IF manual review is required, bounds to the terminal CommunicationAgent
    ELSE cascades correctly into the RoutingAgent.
    """
    def process(self, state: ReturnContext) -> ReturnContext:
        print(f"[A2A] FraudAgent: Running anomaly scan on customer {state.customer_id}...")
        
        score = 0.1
        if state.condition_grade == "Scrap":
            score = 0.6
            
        threshold = 0.8
        try:
            mock_file = os.path.join(os.path.dirname(__file__), '../../data/mock/merchants.json')
            with open(mock_file, 'r') as f:
                data = json.load(f)
                # Hardcoded MCH-01 for prototype test
                threshold = data.get("MCH-01", {}).get("fraud_escalation_threshold", 0.8)
        except Exception as e:
            print(f"[A2A] FraudAgent config load error: {e}")
            
        state.requires_manual_review = score > threshold
        
        if state.requires_manual_review:
            print(f"[A2A] FraudAgent -> ANOMALY DETECTED (Score {score} > {threshold}). Handoff to CommunicationAgent (Abort Route).")
            state.final_outcome = "Manual Review"
            state.route_type = "Pending"
            return CommunicationAgent().process(state)
        
        print(f"[A2A] FraudAgent -> Integrity check passed. Handoff to PolicyAgent.")
        return PolicyAgent().process(state)
