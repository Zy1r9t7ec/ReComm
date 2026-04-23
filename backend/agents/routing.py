import json
import os
from .state import ReturnContext
from .communication import CommunicationAgent

# GLEC Framework emission factor: kg CO₂ per tonne-kilometre
GLEC_FACTOR = 0.00021

# Mock: distance (km) from customer city to the central warehouse (Mumbai)
CITY_TO_CENTRAL_WAREHOUSE_KM = {
    "Delhi":     1400,
    "Hyderabad": 700,
    "Bangalore": 980,
    "Chennai":   1330,
    "Mumbai":    0,      # Mumbai IS the central warehouse in this mock
}

# Approximate km from customer to local hub (mock — in prod: pincode lookup + Redis cache)
HUB_DISTANCE_FROM_CUSTOMER_KM = {
    "dark_store":     12,
    "resale_partner": 25,
    "refurb_centre":  35,
    "service_centre": 30,
}

# Value recovery rate by grade (fraction of original purchase price)
VALUE_RECOVERY_RATE = {
    "A":    0.85,
    "B":    0.60,
    "C":    0.40,
    "Scrap": 0.05,
}

MOCK_ORIGINAL_PRICE_INR = 1299  # From the seeded demo order

# Route type mapping by policy outcome and grade
ROUTE_MAP = {
    "approved":            {None: "dark_store"},
    "partial_refund":      {None: "resale_partner"},
    "warranty_escalation": {None: "service_centre"},
    "rejected":            {None: "refurb_centre"},
    "human_escalation":    {None: "refurb_centre"},
}

GRADE_ROUTE_OVERRIDE = {
    "A":    "dark_store",
    "B":    "resale_partner",
    "C":    "refurb_centre",
    "Scrap": "service_centre",
}


class RoutingAgent:
    """
    Selects optimal physical destination based on policy outcome + condition grade.
    Computes CO₂ avoided (GLEC), distance saved, and value recovered.
    """

    def _load_sku_weight(self, sku_id: str) -> float:
        mock_file = os.path.join(os.path.dirname(__file__), '../../data/mock/skus.json')
        try:
            with open(mock_file, 'r') as f:
                data = json.load(f)
            for sku in data.get("skus", []):
                if sku.get("sku_id") == sku_id:
                    return sku.get("weight_kg", 0.3)
        except Exception:
            pass
        return 0.3  # default fallback weight

    def process(self, state: ReturnContext) -> ReturnContext:
        print("[RoutingAgent] Selecting geographic trajectory...")

        customer_city = "Delhi"   # In production: resolved from customer pincode via Redis cache
        mock_file = os.path.join(os.path.dirname(__file__), '../../data/mock/cities_hubs.json')

        # Determine target hub type from policy outcome, with grade override
        target_type = GRADE_ROUTE_OVERRIDE.get(state.condition_grade, "refurb_centre")
        if state.policy_outcome == "warranty_escalation":
            target_type = "service_centre"
        elif state.policy_outcome == "partial_refund":
            target_type = "resale_partner"
        elif state.policy_outcome == "approved" and state.condition_grade == "A":
            target_type = "dark_store"

        try:
            with open(mock_file, 'r') as f:
                data = json.load(f)
            city_hubs = next(
                (c["hubs"] for c in data.get("cities", []) if c["city"] == customer_city),
                []
            )
            candidate_hubs = [h for h in city_hubs if h.get("type") == target_type] or city_hubs
            best_hub = candidate_hubs[0] if candidate_hubs else {"hub_id": "DEFAULT-01"}

        except Exception:
            best_hub = {"hub_id": "DEFAULT-01"}

        state.routed_hub_id = best_hub.get("hub_id", "DEFAULT-01")
        state.route_type = target_type

        # --- Impact Metric Calculations ---
        weight_kg = self._load_sku_weight(state.sku_id)

        # Distance to central warehouse vs local hub
        dist_to_central = CITY_TO_CENTRAL_WAREHOUSE_KM.get(customer_city, 500)
        dist_to_local   = HUB_DISTANCE_FROM_CUSTOMER_KM.get(target_type, 30)
        distance_saved  = max(dist_to_central - dist_to_local, 0)

        # CO₂ formula (GLEC Framework): distance_km × weight_kg × GLEC_FACTOR
        # Note: weight_kg treated as product weight (simplified GLEC application for prototype)
        co2_avoided = round(distance_saved * weight_kg * GLEC_FACTOR, 4)

        # Value recovered estimate
        recovery_rate = VALUE_RECOVERY_RATE.get(state.condition_grade, 0.4)
        value_recovered = round(MOCK_ORIGINAL_PRICE_INR * recovery_rate, 2)

        state.distance_saved_km  = distance_saved
        state.carbon_offset_kg   = co2_avoided
        state.value_recovered_inr = value_recovered

        print(f"[RoutingAgent] Hub: {state.routed_hub_id} ({target_type})")
        print(f"[RoutingAgent] Distance saved: {distance_saved} km | CO₂ avoided: {co2_avoided} kg | Value: ₹{value_recovered}")
        print(f"[RoutingAgent] → Handoff to CommunicationAgent")
        return CommunicationAgent().process(state)
