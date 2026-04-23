import google.generativeai as genai
from pydantic import BaseModel
import os
import json
from typing import Type, TypeVar

T = TypeVar('T', bound=BaseModel)

class LLMService:
    @staticmethod
    def generate_structured(system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("\n[CRITICAL ERROR] GEMINI_API_KEY environment variable is MISSING. Ensure you load your API key!\n")
            
        genai.configure(api_key=api_key)
        
        # Using Gemini 1.5 Flash for rapid A2A cognitive chaining
        model = genai.GenerativeModel("gemini-1.5-flash",
                                      system_instruction=system_prompt)
        
        print(f"[LLM Service] Requesting Cloud Inference for {response_model.__name__}...")
        
        response = model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=response_model,
                temperature=0.1
            ),
        )
        
        data = json.loads(response.text)
        return response_model(**data)
