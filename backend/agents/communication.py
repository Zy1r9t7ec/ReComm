from .state import ReturnContext

class CommunicationAgent:
    """
    Terminal Node in the ADK structure. Binds string responses and returns
    the fully processed ADK state to the core request queue. 
    """
    def process(self, state: ReturnContext) -> ReturnContext:
        print("[A2A] CommunicationAgent: Establishing linguistic mappings...")
        
        if state.final_outcome == "Manual Review":
            state.customer_message = "Thank you for the upload. Our team is manually reviewing the footage due to condition anomalies. You will hear back in 4 hours."
            print("[A2A] A2A Chain Completed -> TERMINATED TO HUMAN QUEUE.")
            return state
            
        base_msg = f"Your return has been approved instantly! Because of system logic: [{state.policy_flag}], "
        
        if state.route_type == "refurb_centre":
            base_msg += "your electronics will be routed for refurbishment, helping promote a circular economy."
        elif state.route_type == "service_centre":
            base_msg += "your unit is marked for safe e-waste recycling."
        else:
            base_msg += "your item is routed safely for resale."
            
        state.customer_message = base_msg
        
        print("[A2A] A2A Chain Completed -> RETURN APPROVED & ROUTED.")
        return state
