import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional

from ..schemas import RubricGenerateRequest, RubricGenerateResponse, GeneratedRubric
from ..models import User
from ..services import auth_service

rubrics_router = APIRouter()
logger = logging.getLogger(__name__)

@rubrics_router.post("/generate", response_model=RubricGenerateResponse)
async def generate_rubrics(
    request: RubricGenerateRequest,
    current_user: User = Depends(auth_service.get_current_user)
):
    """
    Generate suggested rubrics based on the activity title using Gemini AI
    """
    if not request.title:
        raise HTTPException(status_code=400, detail="Activity title is required")

    logger.info(f"Generating rubrics for activity: {request.title}")

    prompt = f"""Generate 2 professional academic rubrics for an essay activity titled: "{request.title}"
    {f"Activity description: {request.description}" if request.description else ""}
    
    Each rubric must be suitable for college-level grading and include:
    1. A name (e.g., "Analytical Rubric for {request.title}")
    2. A brief description
    3. Grading intensity (Basic, Professional, Advanced, or Technical)
    4. 4-5 grading criteria (e.g., Content, Organization, Mechanics, Analysis)
    5. For each criterion, provide exactly 4 score levels:
       - id 1: "Excellent" (4 pts)
       - id 2: "Proficient" (3 pts)
       - id 3: "Developing" (2 pts)
       - id 4: "Beginning" (1 pt)
    
    Return the response as a valid JSON object with a "suggestions" array.
    Each suggestion should follow this exact structure:
    {{
      "name": "string",
      "description": "string",
      "grading_intensity": "Basic" | "Professional" | "Advanced" | "Technical",
      "criteria": [
        {{
          "id": 1,
          "title": "Criterion Title",
          "scores": [
            {{
              "id": 1,
              "title": "Excellent",
              "points": 4,
              "description": "Detailed description for this level"
            }},
            {{
              "id": 2,
              "title": "Proficient",
              "points": 3,
              "description": "Detailed description for this level"
            }},
            {{
              "id": 3,
              "title": "Developing",
              "points": 2,
              "description": "Detailed description for this level"
            }},
            {{
              "id": 4,
              "title": "Beginning",
              "points": 1,
              "description": "Detailed description for this level"
            }}
          ]
        }}
      ]
    }}
    
    Ensure the rubrics are distinct and relevant to the specific topic.
    """

    llm_response = None
    
    # Try Gemini models sequentially
    if os.getenv("GEMINI_API_KEY"):
        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            
            # Build prioritized list of stable models
            env_model = os.getenv("GEMINI_MODEL_NAME")
            if env_model:
                env_model = env_model.replace("models/", "")
            
            target_models = []
            if env_model:
                target_models.append(env_model)
            
            stable_fallbacks = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest"]
            for m in stable_fallbacks:
                if m not in target_models:
                    target_models.append(m)
            
            for model_id in target_models:
                try:
                    # Verify model availability
                    client.models.get(model=model_id)
                    logger.info(f"Attempting rubric generation with verified model: {model_id}")
                    response = client.models.generate_content(
                        model=model_id,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.7,
                            response_mime_type="application/json"
                        )
                    )
                    
                    if response and response.text:
                        llm_response = response.text
                        logger.info(f"Rubric generation success using Gemini ({model_id})")
                        break
                except Exception as model_err:
                    logger.warning(f"Gemini model {model_id} failed: {model_err}")
                    continue
        except Exception as sdk_err:
            logger.error(f"Failed to use google-genai SDK: {sdk_err}")
            # Fallback to old SDK if possible
            try:
                import google.generativeai as old_genai
                old_genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                model = old_genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                if response and response.text:
                    llm_response = response.text
            except Exception as old_sdk_err:
                logger.error(f"Old SDK fallback also failed: {old_sdk_err}")


    # Fallback to OpenAI if Gemini failed and OpenAI is available
    if not llm_response and os.getenv("OPENAI_API_KEY"):
        try:
            import openai
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": "You are an expert educational consultant. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            llm_response = response.choices[0].message.content
            logger.info("Rubric generation success using OpenAI")
        except Exception as e:
            logger.error(f"OpenAI rubric generation failed: {e}")

    # If both AI services failed, provide a hardcoded fallback from PLATFORM_RUBRICS
    # to avoid 503 Service Unavailable errors.
    if not llm_response:
        logger.warning("AI generation failed or keys missing. Providing hardcoded fallback from PLATFORM_RUBRICS.")
        from ..platform_rubrics import PLATFORM_RUBRICS
        # Select first 2 rubrics as fallback
        fallback_suggestions = []
        for r in PLATFORM_RUBRICS[:2]:
            fallback_suggestions.append({
                "name": r["name"],
                "description": r["description"],
                "grading_intensity": r["grading_intensity"],
                "criteria": r["criteria"]
            })
        return RubricGenerateResponse(suggestions=fallback_suggestions)

    try:
        # Clean JSON markdown if any
        json_text = llm_response.strip()
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()
        
        data = json.loads(json_text)
        suggestions = data.get("suggestions", [])
        
        # Basic validation of suggestions
        if not isinstance(suggestions, list) or len(suggestions) == 0:
            logger.warning(f"AI returned empty or invalid suggestions: {llm_response[:200]}")
            raise ValueError("Invalid AI response format")

        return RubricGenerateResponse(suggestions=suggestions)
        
    except Exception as e:
        logger.error(f"Failed to parse AI rubric response: {e}")
        logger.debug(f"Raw response: {llm_response}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to generate valid rubrics. The AI response was in an unexpected format."
        )
