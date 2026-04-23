import json
import os
from .state import ReturnContext
from .communication import CommunicationAgent

class RoutingAgent:
    def process(self, state: ReturnContext) -> ReturnContext:
        print("[A2A] RoutingAgent: Selecting geographic trajectory...")
        
        customer_city = "Delhi"  # Mock default
        mock_file = os.path.join(os.path.dirname(__file__), '../../data/mock/cities_hubs.json')
        
        target_type = "dark_store"
        if state.condition_grade == "Scrap":
            target_type = "service_centre"
        elif not state.resellable or state.condition_grade in ["B", "C"]:
            target_type = "refurb_centre"
            
        try:
            with open(mock_file, 'r') as f:
                data = json.load(f)
            city_hubs = next((c["hubs"] for c in data.get("cities", []) if c["city"] == customer_city), [])
            candidate_hubs = [h for h in city_hubs if h.get("type") == target_type] or city_hubs
            
            best_hub = candidate_hubs[0] if candidate_hubs else {"hub_id": "DEFAULT-01"}
            
            state.routed_hub_id = best_hub.get("hub_id", "DEFAULT-01")
            state.route_type = target_type
            state.carbon_offset_kg = 0.025
            state.final_outcome = "Approved"
            
        except Exception:
            state.routed_hub_id = "DEFAULT-01"
            state.route_type = target_type
            state.final_outcome = "Approved"

        print(f"[A2A] RoutingAgent -> Geographic mapping succeeded. Handoff to CommunicationAgent.")
        
        return CommunicationAgent().process(state)
