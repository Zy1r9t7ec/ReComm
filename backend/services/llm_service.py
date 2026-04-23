from google import genai
from google.genai import types
from pydantic import BaseModel
import os
import json
from typing import Type, TypeVar

T = TypeVar('T', bound=BaseModel)

# Gemini 2.0 Flash — latest stable, aligned with Google AI Studio
MODEL_NAME = "gemini-2.0-flash"


class LLMService:
    @staticmethod
    def generate_structured(system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "[CRITICAL] GEMINI_API_KEY environment variable is MISSING. "
                "Run: export GEMINI_API_KEY=your_key"
            )

        client = genai.Client(api_key=api_key)

        print(f"[LLMService] {MODEL_NAME} → structured output for {response_model.__name__}")

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=response_model,
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )

        data = json.loads(response.text)
        return response_model(**data)
