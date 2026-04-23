import json
import os
from typing import Dict, Any

STORE_PATH = os.path.join(os.path.dirname(__file__), '../../data/mock/sessions.json')

def _read_store() -> Dict[str, Any]:
    if not os.path.exists(STORE_PATH):
        os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
        with open(STORE_PATH, 'w') as f:
            json.dump({}, f)
        return {}
    try:
        with open(STORE_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def _write_store(data: Dict[str, Any]):
    with open(STORE_PATH, 'w') as f:
        json.dump(data, f, indent=4)

def get_session(return_id: str) -> Dict[str, Any]:
    store = _read_store()
    return store.get(return_id)

def save_session(return_id: str, context: Dict[str, Any]):
    store = _read_store()
    store[return_id] = context
    _write_store(store)
