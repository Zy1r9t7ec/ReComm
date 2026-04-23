from .state import ReturnContext
from .fraud import FraudAgent

class PolicyAgent:
    """
    Checks internal rules engines. Next step in the A2A Domino Chain.
    """
    def process(self, state: ReturnContext) -> ReturnContext:
        print(f"[A2A] PolicyAgent: Reviewing grade '{state.condition_grade}' against business rules...")
        
        # MOCK API Implementation
        # Validate Hygiene restrictions for Grade B elements
        
        is_resellable = True
        flag = "Standard Electronics Condition Approved."
        
        if state.condition_grade == "Scrap":
            is_resellable = False
            flag = "Item graded as Scrap. Marked for recycling."
            
        state.resellable = is_resellable
        state.policy_flag = flag
        
        print(f"[A2A] PolicyAgent -> Handoff to FraudAgent")
        
        # A2A Direct Event Hook
        return FraudAgent().process(state)
