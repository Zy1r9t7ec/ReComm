from .state import ReturnContext
from .routing import RoutingAgent
from .communication import CommunicationAgent

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
            
        state.fraud_score = score
        state.requires_manual_review = score > 0.8
        
        if state.requires_manual_review:
            print(f"[A2A] FraudAgent -> ANOMALY DETECTED. Handoff to CommunicationAgent (Abort Route).")
            state.final_outcome = "Manual Review"
            state.route_type = "Pending"
            return CommunicationAgent().process(state)
        
        print(f"[A2A] FraudAgent -> Integrity check passed. Handoff to RoutingAgent.")
        return RoutingAgent().process(state)
