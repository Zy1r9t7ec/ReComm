import google.generativeai as genai
import json

def run_policy_check(sku_category: str, condition_grade: str) -> dict:
    """
    Evaluates business rules and hygiene policies against the inspected condition.
    """
    
    prompt = f"""
    You are the ReComm Policy Validation Agent.
    The item is a {sku_category} and was graded as Condition {condition_grade}.
    
    Rules:
    1. If a Hygiene item (e.g., Earbuds, Used Cosmetics) is strictly opened (Grade B or C), 
       it CANNOT be resold and must be marked as 'reject_resale'.
    2. If Grade is Scrap, it is an automatic 'reject_resale'.
    3. All Grade A items bypass hygiene restrictions.
    4. General Electronics at Grade B or C are acceptable for resale/refurbishment.
    
    Respond STRICTLY in JSON format:
    {{
        "resellable": boolean,
        "policy_flag": "string describing the applied policy"
    }}
    """
    
    try:
        # Real call:
        # model = genai.GenerativeModel('gemini-1.5-flash')
        # response = model.generate_content(prompt)
        # return json.loads(response.text)
        
        # MOCK LOGIC mapping direct to rules
        is_resellable = True
        flag = "Standard Electronics Condition Approved."
        
        if sku_category.lower() in ["hygiene", "earbuds"] and condition_grade in ["B", "C"]:
            is_resellable = False
            flag = "Hygiene violation. Opened personal item cannot be resold."
            
        if condition_grade == "Scrap":
            is_resellable = False
            flag = "Item graded as Scrap. Marked for recycling."
            
        return {
            "resellable": is_resellable,
            "policy_flag": flag
        }
        
    except Exception as e:
        print(f"Policy Agent Error: {e}")
        return {"resellable": False, "policy_flag": "System Error"}
