"""
Grammar and Syntactic Analysis Module
Analyzes grammatical correctness, syntax patterns, and mechanical errors
Uses LLM-based grammar checking (OpenAI/Gemini) with retry logic
"""
import re
import os
import json
import time
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GrammarAnalyzer:
    """Analyzes grammatical correctness and syntactic patterns in essays"""
    
    def __init__(
        self,
        use_llm: bool = True,
        llm_provider: str = "auto",  # "auto", "openai", "gemini", or "none"
    ):
        """
        Initialize grammar analyzer with LLM support
        
        Args:
            use_llm: Whether to attempt using LLM for grammar checking
            llm_provider: Which LLM to use ("auto" detects available, "openai", "gemini", or "none")
        """
        self.use_llm = use_llm
        self.llm_provider = llm_provider
        self.llm_client = None
        self.available_llm = None  # "openai", "gemini", or None
        self.gemini_model = None  # Store model name for Gemini
        self.lt_tool = None  # LanguageTool for local checking
        self.hf_model = None # Hugging Face model for local checking
        self.hf_tokenizer = None
        self.hf_api_token = os.getenv("HF_API_TOKEN") # For lightweight Inference API
        self.use_hf = True if self.hf_api_token else False # Auto-enable if token exists
        self.use_lt = True    # Enable LanguageTool by default if possible
        # Don't initialize here - wait until first use to avoid import errors at startup
    
    def _ensure_llm_loaded(self):
        """Ensure LLM client is loaded (lazy loading)"""
        if not self.use_llm:
            return None
        
        if self.available_llm is None and self.llm_client is None:
            # Auto-detect available LLM provider
            if self.llm_provider == "auto":
                # Check for OpenAI
                if os.getenv("OPENAI_API_KEY"):
                    try:
                        self._init_openai()
                        if self.llm_client:
                            self.available_llm = "openai"
                            logger.info("Using OpenAI for grammar checking")
                            return self.llm_client
                    except Exception as e:
                        logger.debug(f"OpenAI initialization failed: {e}")
                
                # Check for Gemini
                if os.getenv("GEMINI_API_KEY"):
                    try:
                        self._init_gemini()
                        if self.llm_client:
                            self.available_llm = "gemini"
                            logger.info("Using Gemini for grammar checking")
                            return self.llm_client
                    except Exception as e:
                        logger.debug(f"Gemini initialization failed: {e}")
            elif self.llm_provider == "openai":
                self._init_openai()
                if self.llm_client:
                    self.available_llm = "openai"
            elif self.llm_provider == "gemini":
                self._init_gemini()
                if self.llm_client:
                    self.available_llm = "gemini"
        
        return self.llm_client if self.available_llm else None
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        try:
            import openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                return
            
            self.llm_client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized for grammar checking")
        except ImportError:
            logger.debug("openai package not installed")
        except Exception as e:
            logger.warning(f"OpenAI initialization failed: {e}")
            self.llm_client = None
    
    def _init_gemini(self):
        """Initialize Gemini client"""
        try:
            from google import genai
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return
            
            client = genai.Client(api_key=api_key)
            self.llm_client = client
            
            # Get model name from environment variable, or use fallback list
            env_model = os.getenv("GEMINI_MODEL_NAME")
            if env_model:
                env_model = env_model.replace("models/", "")
            
            # Build prioritized list of stable models for May 2026
            model_candidates = []
            if env_model:
                model_candidates.append(env_model)
            
            # Use verified stable models for May 2026
            stable_fallbacks = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest', 'gemini-3.1-pro-preview']
            for m in stable_fallbacks:
                if m not in model_candidates:
                    model_candidates.append(m)
            
            self.gemini_model = None
            last_error = None
            for model_name in model_candidates:
                try:
                    # Verify model availability
                    client.models.get(model=model_name)
                    self.gemini_model = model_name
                    logger.info(f"Gemini client verified with model: {model_name}")
                    break
                except Exception as model_error:
                    last_error = model_error
                    logger.debug(f"Model {model_name} verification failed: {model_error}")
            
            if not self.gemini_model:
                # Use first candidate as default (likely gemini-3.1-flash)
                self.gemini_model = model_candidates[0] if model_candidates else "gemini-3.1-flash"
                logger.warning(f"Failed to verify any Gemini model. Using default '{self.gemini_model}'. Last error: {last_error}")
                
        except ImportError:
            logger.debug("google-genai package not installed")
        except Exception as e:
            logger.warning(f"Gemini initialization failed: {e}")
            self.llm_client = None
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive grammar analysis (V2 - Pure LLM, No LanguageTool)
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing grammar scores, errors, and patterns
        """
        # DEBUG SIGNATURE: Verify this version is running
        logger.info("=" * 60)
        logger.info("--- STARTING GRAMMAR ANALYSIS (V2 PURE LLM) ---")
        logger.info("=" * 60)
        logger.info(f"Analyzing text of length: {len(text)} characters")
        
        # Generate unique request ID for tracking (helps debug duplicate analyses)
        import uuid
        request_id = str(uuid.uuid4())[:8]
        
        results = {
            "score": 100.0,
            "errors": [],
            "syntax_patterns": {},
            "error_count": 0,
            "sentence_count": 0,
            "avg_sentence_length": 0.0,
            "syntax_complexity": 0.0,
            "analyzer_version": "2.1-hybrid",  # Hybrid: Local GEC + LLM Support
            "request_id": request_id  # Track this specific analysis request
        }
        
        logger.info(f"Request ID: {request_id} | Text hash: {hash(text[:100])}")
        
        if not text or len(text.strip()) < 50:
            logger.info("Text too short, returning empty results")
            return results
        
        # Basic sentence segmentation
        sentences = self._segment_sentences(text)
        results["sentence_count"] = len(sentences)
        
        if results["sentence_count"] == 0:
            return results
        
        # Calculate average sentence length
        total_words = sum(len(s.split()) for s in sentences)
        results["avg_sentence_length"] = total_words / results["sentence_count"]
        
        # 1. Local/API Hugging Face check (Saves tokens for basic errors)
        local_errors = []
        if self.use_hf:
            if self.hf_api_token:
                local_errors = self._check_with_huggingface_api(text, sentences)
                if local_errors:
                    logger.info(f"✓ Hugging Face (API) found {len(local_errors)} errors")
            else:
                local_errors = self._check_with_huggingface(text, sentences)
                if local_errors:
                    logger.info(f"✓ Hugging Face (Local) found {len(local_errors)} errors")
        elif self.use_lt:
            local_errors = self._check_with_languagetool(text)
            if local_errors:
                logger.info(f"✓ LanguageTool (Local) found {len(local_errors)} errors")
        
        # 2. Grammar checking - use LLM for complex issues
        grammar_errors = []
        llm_success = False
        
        # Determine if we need LLM (if local results are empty or for high-level logic)
        llm_client = self._ensure_llm_loaded()
        if llm_client:
            try:
                grammar_errors, llm_success = self._check_with_llm_with_retry(text, sentences)
                if llm_success:
                    logger.info(f"✓ LLM SUCCESS: Found {len(grammar_errors)} complex issues")
                else:
                    logger.warning("✗ LLM check failed - using local results only")
            except Exception as e:
                logger.warning(f"✗ LLM grammar check failed: {e}")
                llm_success = False
        
        # Combine and deduplicate errors
        final_errors = self._merge_grammar_errors(grammar_errors, local_errors)
        
        # 3. Basic rule-based checks (Local Regex)
        basic_errors = self._check_basic_rules(text, sentences)
        final_errors = self._merge_grammar_errors(final_errors, basic_errors)
        
        results["errors"] = final_errors
        results["error_count"] = len(final_errors)
        
        # Calculate grammar score (0-100)
        total_words = len(text.split())
        if total_words > 0:
            error_density = results["error_count"] / total_words
            results["score"] = max(0.0, 100.0 - (error_density * 1000))
        else:
            results["score"] = 100.0
        
        return results
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences using regex-based splitting"""
        # Use regex-based sentence splitting (no spaCy dependency)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s) > 1]
        # Fallback to simpler splitting if needed
        if not sentences:
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip() and len(s) > 1]
        return sentences
    
    
    def _check_with_llm_with_retry(
        self, 
        text: str, 
        sentences: List[str], 
        max_retries: int = 5,
        initial_delay: float = 1.5
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Check grammar using LLM with retry mechanism, model rotation, and ultimate fallback to Groq
        """
        if not self.llm_client or not self.available_llm:
            # If no Gemini/OpenAI, check if Groq is available as a last resort
            if os.getenv("GROQ_API_KEY"):
                logger.info("🚀 Gemini/OpenAI unavailable. Jumping straight to Groq fallback.")
                return self._check_with_groq(text, sentences), True
            return [], False
        
        last_exception = None
        delay = initial_delay
        
        # Prepare model rotation if using Gemini
        model_rotation = []
        if self.available_llm == "gemini":
            env_model = os.getenv("GEMINI_MODEL_NAME", "gemini-flash-latest").replace("models/", "")
            model_rotation = [env_model, 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest', 'gemini-3.1-pro-preview']
            model_rotation = list(dict.fromkeys(model_rotation))
        
        for attempt in range(max_retries):
            try:
                if self.available_llm == "openai":
                    errors = self._check_with_openai(text, sentences)
                    return errors, True
                elif self.available_llm == "gemini":
                    current_model = model_rotation[attempt % len(model_rotation)]
                    if current_model != self.gemini_model:
                        logger.info(f"🔄 Rotating Gemini model to: {current_model} (Attempt {attempt + 1})")
                        self.gemini_model = current_model
                    
                    errors = self._check_with_gemini(text, sentences)
                    return errors, True
            except Exception as e:
                error_msg = str(e).lower()
                # If it's a quota error, don't keep retrying Gemini - switch to Groq if possible
                is_quota = any(q in error_msg for q in ["429", "quota", "exceeded"])
                
                if is_quota and os.getenv("GROQ_API_KEY"):
                    logger.warning(f"⚠️ Gemini Quota Exceeded. Switching to GROQ Fallback...")
                    return self._check_with_groq(text, sentences), True
                
                last_exception = e
                if attempt < max_retries - 1:
                    wait_time = delay * (1.5 ** attempt)
                    logger.warning(
                        f"LLM attempt {attempt + 1} failed: {e}. Retrying in {wait_time:.2f}s..."
                    )
                    time.sleep(wait_time)
                else:
                    # Final attempt failed - check for Groq fallback
                    if os.getenv("GROQ_API_KEY"):
                        logger.info("🚨 All Gemini attempts failed. Triggering ULTIMATE GROQ FALLBACK...")
                        return self._check_with_groq(text, sentences), True
                    logger.error(f"LLM grammar check failed after {max_retries} attempts: {e}")
        
        return [], False
    
    
    def _check_with_openai(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Check grammar using OpenAI"""
        try:
            prompt = self._build_grammar_prompt(text, sentences)
            
            response = self.llm_client.chat.completions.create(
                model="gpt-4o-mini",  # Use cheaper model for grammar checking
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert grammar checker for academic essays. Analyze the text and identify all grammatical errors, including spelling, punctuation, grammar, and style issues. Return your findings as a JSON object with an 'errors' array containing all error objects."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent results
                max_tokens=6000,  # Increased from 2000 to prevent truncation with many errors
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            
            # Check if response was truncated (OpenAI sets finish_reason to "length" if truncated)
            finish_reason = response.choices[0].finish_reason
            if finish_reason == "length":
                logger.warning(f"⚠️ LLM response was TRUNCATED (max_tokens limit reached). "
                             f"Some errors may be missing. Consider increasing max_tokens or splitting the text.")
            
            errors = self._parse_llm_response(result_text, text)
            
            if finish_reason == "length" and errors:
                logger.warning(f"⚠️ Found {len(errors)} errors but response was truncated. "
                             f"More errors likely exist but were cut off.")
            
            return errors
            
        except Exception as e:
            logger.error(f"OpenAI grammar check error: {e}")
            return []
    
    def _check_with_gemini(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Check grammar using Gemini"""
        try:
            prompt = self._build_grammar_prompt(text, sentences)
            
            # Gemini doesn't support JSON mode in the same way, so we'll use structured output
            full_prompt = f"""{prompt}

Please return your response as a valid JSON object with this structure:
{{
  "errors": [
    {{
      "type": "grammar|spelling|punctuation|style",
      "message": "Brief description of the error",
      "offset": 0,
      "errorLength": 5,
      "suggestion": "corrected text",
      "context": "surrounding text"
    }}
  ]
}}
"""
            
            # Configure generation config with higher token limit
            generation_config = {
                "temperature": 0.1,  # Low temperature for consistent results
                "max_output_tokens": 16384,  # Increased to prevent truncation for long essays
            }
            
            # Gemini response
            response = self.llm_client.models.generate_content(
                model=self.gemini_model,
                contents=full_prompt,
                config=generation_config
            )
            
            # Check for completion
            if not response or not response.text:
                raise Exception("Empty response from Gemini")

            # Check if response was truncated by examining finish_reason
            finish_reason = None
            if response.candidates and len(response.candidates) > 0:
                finish_reason = response.candidates[0].finish_reason
                if finish_reason == "MAX_OUTPUT_TOKENS":
                    logger.warning(f"⚠️ Gemini response was TRUNCATED (max_output_tokens limit reached).")
            
            result_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            elif result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            # JSON repair logic
            json_incomplete = result_text and not result_text.rstrip().endswith("]") and not result_text.rstrip().endswith("}")
            if json_incomplete or finish_reason == "MAX_OUTPUT_TOKENS":
                result_text = self._repair_incomplete_json(result_text)
            
            errors = self._parse_llm_response(result_text, text)
            return errors
            
        except Exception as e:
            error_msg = str(e)
            # Re-raise specific errors so retry logic can handle them
            # 429: Quota, 503: Unavailable, 500: Server Error, 504: Timeout
            retryable_errors = ["503", "504", "500", "unavailable", "deadline exceeded", "timeout"]
            quota_errors = ["429", "quota", "exceeded"]
            
            if any(q in error_msg.lower() for q in quota_errors):
                # Raise to indicate quota (retry logic will stop)
                raise
            elif any(r in error_msg.lower() for r in retryable_errors):
                # Raise to indicate retryable error
                raise
            else:
                logger.error(f"Gemini grammar check error: {e}")
                return []

    def _check_with_groq(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Ultimate fallback using Groq API (Llama 3)"""
        try:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                return []
            
            import httpx
            prompt = self._build_grammar_prompt(text, sentences)
            
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.1-70b-versatile", # Modern stable Groq model
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert grammar checker. Return ONLY a JSON object with an 'errors' array."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }
            
            # Synchronous call since the analyzer is sync
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                result = response.json()
                result_text = result['choices'][0]['message']['content']
                return self._parse_llm_response(result_text, text)
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Groq fallback failed: {e}")
            return []
    
    def _build_grammar_prompt(self, text: str, sentences: List[str]) -> str:
        """Build prompt for LLM grammar checking with enhanced paragraph splitting and context-aware spelling"""
        # Limit text length to avoid token limits (keep it reasonable for Flash models)
        max_chars = 8000 
        if len(text) > max_chars:
            text = text[:max_chars] + "... [text truncated for analysis]"
        
        prompt = f"""Analyze the following essay for structural organization, style, logical flow, and complex grammatical issues.

Text to analyze:
{text}

Instructions:
1. Identify structural, stylistic, and complex grammatical errors.
2. For each issue, provide:
   - type: "grammar" | "spelling" | "punctuation" | "structure" | "style"
   - message: A brief, professional explanation.
   - offset: Exact character position (0-based) from the start.
   - errorLength: Number of characters the issue spans.
   - text: The actual text at that position.
   - suggestion: A corrected version.
   - context: ~20 characters surrounding the issue.

3. LOGICAL PARAGRAPHING (type: "structure"):
   - If the text is a single "wall of text," suggest paragraph breaks at logical transition points.
   - For each break: Set offset to the end of the sentence, errorLength to 1, and suggestion to ".\\n\\n".

4. RETURN FORMAT:
Return ONLY a valid JSON object with an "errors" array. Do not include markdown formatting or extra text.
{{
  "errors": [
    {{
      "type": "grammar",
      "message": "...",
      "offset": 0,
      "errorLength": 0,
      "text": "...",
      "suggestion": "...",
      "context": "..."
    }}
  ]
}}
"""
        return prompt
    
    def _repair_incomplete_json(self, json_text: str) -> str:
        """Attempt to repair incomplete JSON by closing brackets and fixing syntax"""
        if not json_text:
            return "{ \"errors\": [] }"
        
        # Remove trailing incomplete content
        json_text = json_text.strip()
        
        # If it doesn't start with { or [, it's likely gibberish
        if not (json_text.startswith("{") or json_text.startswith("[")):
            # Try to find the first { or [
            first_brace = json_text.find("{")
            first_bracket = json_text.find("[")
            start = -1
            if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
                start = first_brace
            elif first_bracket != -1:
                start = first_bracket
            
            if start != -1:
                json_text = json_text[start:]
            else:
                return "{ \"errors\": [] }"

        # If it looks like it was cut off in the middle of a property name or value
        # we need to find the last complete object
        if "}," in json_text:
            last_obj_end = json_text.rfind("}")
            # If the last character isn't }, we might have truncated at , or in middle of next obj
            potential = json_text[:last_obj_end+1]
            # Verify if it's the end of an array or object
            if "]" not in json_text[last_obj_end:]:
                # We need to close the array and the main object
                if potential.count("[") > potential.count("]"):
                    potential += "]"
                if potential.count("{") > potential.count("}"):
                    potential += "}"
                return potential

        # Robust counter-based repair
        result = json_text
        open_braces = 0
        open_brackets = 0
        in_string = False
        escaped = False
        
        clean_result = ""
        for i, char in enumerate(result):
            if char == '"' and not escaped:
                in_string = not in_string
            
            if not in_string:
                if char == '{': open_braces += 1
                elif char == '}': open_braces -= 1
                elif char == '[': open_brackets += 1
                elif char == ']': open_brackets -= 1
            
            escaped = (char == '\\' and not escaped)
            clean_result += char
            
            # If we've balanced the main structure, we can stop
            if not in_string and open_braces == 0 and open_brackets == 0 and i > 10:
                break
        
        # If still in string, close it
        if in_string:
            clean_result += '"'
            in_string = False
        
        # Close all open structures in reverse order
        if not in_string:
            # Remove trailing commas and garbage
            clean_result = clean_result.rstrip().rstrip(',').rstrip(':').rstrip('{').rstrip('[')
            
            # If we are inside an object in an array, we need to close that object first
            # But only if we have unbalanced braces inside the array
            while open_braces > 0:
                # Add dummy values for potentially truncated properties
                if clean_result.endswith('"'):
                    clean_result += ': "..."}'
                elif clean_result.endswith(':'):
                    clean_result += ' "..."}'
                else:
                    clean_result += '}'
                open_braces -= 1
                
            while open_brackets > 0:
                clean_result += ']'
                open_brackets -= 1
                
        return clean_result
    
    def _parse_llm_response(self, response_text: str, original_text: str) -> List[Dict[str, Any]]:
        """Parse LLM response into error format"""
        errors = []
        
        try:
            # Try to parse as JSON
            if response_text.startswith("{"):
                data = json.loads(response_text)
                if "errors" in data:
                    error_list = data["errors"]
                else:
                    error_list = data if isinstance(data, list) else []
            elif response_text.startswith("["):
                error_list = json.loads(response_text)
            else:
                # Try to extract JSON from text
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    error_list = data.get("errors", [])
                else:
                    logger.warning("Could not parse LLM response as JSON")
                    return []
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}")
            logger.debug(f"Response text (first 500 chars): {response_text[:500]}")
            # Try one more repair attempt
            try:
                repaired = self._repair_incomplete_json(response_text)
                if repaired != response_text:
                    logger.info("Attempting to parse repaired JSON...")
                    return self._parse_llm_response(repaired, original_text)
            except Exception as repair_error:
                logger.error(f"Failed to repair JSON: {repair_error}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error parsing LLM response: {e}")
            return []
        
        try:
            # Convert to standard format
            for error in error_list:
                if not isinstance(error, dict):
                    continue
                
                offset = error.get("offset", 0)
                error_length = error.get("errorLength", 1)
                suggestion = error.get("suggestion", "").strip()
                error_message = error.get("message", "").strip()
                error_type = error.get("type", "grammar")  # Define early so it can be used in validation
                
                # Validate offset is within text bounds
                if offset < 0 or offset >= len(original_text):
                    logger.debug(f"Skipping error with invalid offset: {offset}")
                    continue
                
                # Validate error length
                if error_length <= 0 or offset + error_length > len(original_text):
                    logger.debug(f"Skipping error with invalid errorLength: {error_length} at offset {offset}")
                    continue
                
                # Extract the actual text at the reported offset
                actual_text = original_text[offset:offset + error_length]
                
                # Validate that the text at the offset matches what the error describes
                # If not, try to find the actual location in the text
                expected_text = error.get("text", "").strip()
                
                # Also try to extract what text should be based on suggestion/error message
                # Look for patterns in the error message that might indicate what text is being flagged
                error_msg_lower = error_message.lower() if error_message else ""
                
                if expected_text:
                    # Check if actual text matches expected
                    actual_stripped = actual_text.strip().lower()
                    expected_stripped = expected_text.strip().lower()
                    
                    if actual_stripped != expected_stripped:
                        # Offset mismatch - try to find the text in a wider area
                        search_radius = 200  # Search 200 chars before and after
                        search_start = max(0, offset - search_radius)
                        search_end = min(len(original_text), offset + search_radius)
                        search_area = original_text[search_start:search_end]
                        
                        # Try exact match first
                        found_pos = search_area.lower().find(expected_stripped)
                        if found_pos >= 0:
                            corrected_offset = search_start + found_pos
                            actual_text = original_text[corrected_offset:corrected_offset + error_length]
                            logger.debug(f"Corrected offset from {offset} to {corrected_offset} for text '{expected_text}'")
                            offset = corrected_offset
                        else:
                            # Try to find individual words from expected text
                            # Sometimes LLM provides wrong offset but correct words
                            expected_words = expected_text.split()
                            if expected_words:
                                # Try to find the first word of the expected text
                                first_word = expected_words[0].strip().lower().rstrip('.,;:!?')
                                word_pos = search_area.lower().find(first_word)
                                if word_pos >= 0:
                                    # Found first word - use that as offset
                                    corrected_offset = search_start + word_pos
                                    # Recalculate error_length based on full expected text
                                    if len(expected_words) > 1:
                                        # Try to find full phrase
                                        remaining_text = original_text[corrected_offset:min(len(original_text), corrected_offset + 100)]
                                        # Find where the phrase ends
                                        full_match = remaining_text.lower().find(expected_stripped)
                                        if full_match == 0:
                                            # Found full match
                                            error_length = len(expected_text)
                                    else:
                                        error_length = len(first_word)
                                    actual_text = original_text[corrected_offset:corrected_offset + error_length]
                                    logger.debug(f"Corrected offset from {offset} to {corrected_offset} using word '{first_word}'")
                                    offset = corrected_offset
                                else:
                                    # Can't find the text - likely wrong offset, skip this error
                                    logger.debug(f"Skipping error: could not find expected text '{expected_text}' near offset {offset}")
                                    continue
                else:
                    # No expected text provided - validate that actual_text makes sense
                    # Extract clues from error message to verify
                    if error_type in ["style", "word_choice"] and actual_text.strip():
                        # For style/word choice, check if we're pointing at actual words
                        words_in_actual = re.findall(r'\b\w+\b', actual_text)
                        if not words_in_actual:
                            logger.debug(f"Skipping {error_type} error: not pointing at words at offset {offset}")
                            continue
                
                # For word choice errors, validate the suggestion makes sense
                if error_type == "word_choice" or "word" in error_type.lower() or error_type == "style":
                    # If suggestion is provided, validate it's reasonable
                    if suggestion:
                        actual_lower = actual_text.lower().strip()
                        suggestion_lower = suggestion.lower().strip()
                        
                        # Check context around "to" to see if it's part of infinitive
                        if actual_lower == "to" and suggestion_lower in ["too", "two"]:
                            # Check if "to" is followed by a verb (infinitive construction)
                            # Look at the next 30 characters after "to" to capture more context
                            next_text_raw = original_text[offset + error_length:offset + error_length + 30]
                            next_text = next_text_raw.strip()
                            
                            # Check if it starts with a space or directly with a lowercase letter (likely a verb)
                            # Pattern 1: "to " followed by lowercase word (infinitive with space)
                            # Pattern 2: "to[letter]" (word starting with "to" - not our case, but check anyway)
                            infinitive_with_space = re.match(r'^\s+[a-z]', next_text_raw)
                            infinitive_direct = re.match(r'^[a-z]', next_text_raw)
                            
                            if infinitive_with_space or infinitive_direct:
                                # Extract the next word(s) after "to"
                                next_word = ""
                                if next_text:
                                    words = next_text.split()
                                    if words:
                                        next_word = words[0].lower()
                                
                                # Check if it's a common infinitive verb
                                common_infinitives = ["be", "have", "do", "get", "make", "go", "see", "know", 
                                                     "take", "come", "think", "look", "want", "use", "find",
                                                     "give", "tell", "work", "call", "try", "ask", "need",
                                                     "feel", "become", "leave", "put", "mean", "keep", "let",
                                                     "begin", "seem", "help", "show", "hear", "play", "run",
                                                     "move", "like", "live", "believe", "bring", "happen",
                                                     "write", "sit", "stand", "lose", "pay", "meet", "include",
                                                     "continue", "set", "learn", "change", "lead", "understand",
                                                     "watch", "follow", "stop", "create", "speak", "read",
                                                     "spend", "grow", "open", "walk", "win", "teach", "offer",
                                                     "remember", "love", "consider", "appear", "buy", "serve",
                                                     "die", "send", "build", "stay", "fall", "cut", "reach",
                                                     "kill", "raise", "pass", "sell", "decide", "return",
                                                     "explain", "develop", "carry", "break", "receive", "agree",
                                                     "support", "hit", "produce", "eat", "cover", "catch",
                                                     "draw", "choose", "harmonize", "manage", "pursue", "study",
                                                     "apply", "provide", "design", "tinker", "fuel", "inspire"]
                                
                                # If the next word is a verb (in common infinitives list), it's likely an infinitive
                                # OR if it starts with lowercase letter after space, likely an infinitive
                                if next_word in common_infinitives or (infinitive_with_space and next_word):
                                    logger.debug(f"Skipping false positive: 'to' -> '{suggestion}' (infinitive construction: 'to {next_word if next_word else next_text[:15]}...')")
                                    continue
                                
                                # Also check broader context - if "to" is preceded by noun/article patterns
                                # like "fundamentals to", "way to", "opportunity to", etc.
                                context_before = original_text[max(0, offset - 30):offset].strip().lower()
                                infinitive_indicators = ["fundamentals", "way", "opportunity", "ability", "chance",
                                                        "time", "need", "right", "reason", "method", "means",
                                                        "desire", "wish", "hope", "attempt", "effort", "decision",
                                                        "plan", "goal", "aim", "intention", "promise", "refusal",
                                                        "agreement", "preparation", "determination", "willingness",
                                                        "ability", "capacity", "tendency", "inclination"]
                                # Check if word before "to" suggests infinitive construction
                                words_before = context_before.split()
                                if words_before:
                                    word_before_to = words_before[-1].rstrip('.,;:!?')
                                    if word_before_to in infinitive_indicators or infinitive_with_space:
                                        logger.debug(f"Skipping false positive: 'to' -> '{suggestion}' (infinitive context: '...{word_before_to} to {next_word if next_word else next_text[:10]}...')")
                                        continue
                        
                        # Additional validation: if suggestion is very short or same as actual, skip
                        if len(suggestion_lower) < 2 or suggestion_lower == actual_lower:
                            logger.debug(f"Skipping invalid suggestion: '{suggestion}' same as or too short")
                            continue
                
                # Additional validation: Verify the text at offset makes sense with the error type
                # For style/word choice/spelling errors, verify we're actually pointing at a word
                if error_type in ["style", "word_choice", "spelling"] and actual_text.strip():
                    # Check if actual_text is actually a word (contains letters)
                    if not re.search(r'[a-zA-Z]', actual_text):
                        # Not pointing at a word - likely wrong offset
                        logger.debug(f"Skipping {error_type} error at offset {offset}: not pointing at a word (found '{actual_text}')")
                        continue
                
                # For structure errors, validate that we're pointing at punctuation (period, etc.)
                if error_type == "structure":
                    # Structure errors should point at punctuation (usually a period) where paragraph break should occur
                    if not re.search(r'[.!?]', actual_text):
                        logger.debug(f"Skipping structure error at offset {offset}: not pointing at punctuation (found '{actual_text}')")
                        continue
                    # Validate suggestion format - should be period + newlines for paragraph break
                    if suggestion and not re.search(r'\.\s*\n', suggestion):
                        # If suggestion doesn't match expected format, log but don't skip (LLM might have different format)
                        logger.debug(f"Structure error suggestion format: '{suggestion}' (expected period + newlines)")
                
                # For spelling errors, validate suggestion if provided (but allow empty suggestions for gibberish/invalid words)
                if error_type == "spelling":
                    # If a suggestion is provided, ensure it's different from actual text
                    if suggestion and suggestion.lower().strip() == actual_text.lower().strip():
                        logger.debug(f"Skipping spelling error: suggestion same as actual text")
                        continue
                    # Allow empty suggestions for gibberish/random character sequences that can't be easily corrected
                    # The error will still be flagged and highlighted even without a suggestion
                
                # Final validation: Ensure offset and length are still valid after corrections
                if offset < 0 or offset >= len(original_text):
                    logger.debug(f"Skipping error with invalid offset after correction: {offset}")
                    continue
                if offset + error_length > len(original_text):
                    # Adjust error_length to fit
                    error_length = len(original_text) - offset
                    if error_length <= 0:
                        logger.debug(f"Skipping error: adjusted length is {error_length}")
                        continue
                
                # Re-extract actual text with corrected offset/length
                actual_text = original_text[offset:offset + error_length]
                
                # Get context
                context_start = max(0, offset - 20)
                context_end = min(len(original_text), offset + error_length + 20)
                context = original_text[context_start:context_end]
                
                # Verify the error is still reasonable after all validations
                if not actual_text.strip():
                    logger.debug(f"Skipping error: no text at offset {offset}")
                    continue
                
                errors.append({
                    "type": error_type,
                    "message": error_message or "Grammar error detected",
                    "category": error.get("category", "LLM Detected"),
                    "offset": offset,
                    "errorLength": error_length,
                    "replacements": [suggestion] if suggestion else [],
                    "suggestion": suggestion,
                    "context": context,
                    "source": self.available_llm  # Track which LLM found this
                })
        
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}")
            logger.debug(f"Response text: {response_text[:500]}")
        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
        
        return errors
    
    def _check_with_huggingface_api(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """
        Lightweight check using Hugging Face Inference API (Ideal for Railway)
        """
        import requests
        import difflib
        import time
        
        if not self.hf_api_token:
            return []
            
        api_url = "https://api-inference.huggingface.co/models/vennify/t5-base-grammar-correction"
        headers = {"Authorization": f"Bearer {self.hf_api_token}"}
        
        errors = []
        text_offset = 0
        
        for sentence in sentences:
            sent_start = text.find(sentence, text_offset)
            if sent_start == -1: sent_start = text_offset
            
            payload = {"inputs": f"gec: {sentence}"}
            
            try:
                # Call HF API
                response = requests.post(api_url, headers=headers, json=payload, timeout=10)
                
                # Handle model loading (503 error)
                if response.status_code == 503:
                    logger.warning("HF Model is loading, skipping local GEC for this sentence")
                    continue
                    
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        corrected_sentence = result[0].get("generated_text", sentence)
                    elif isinstance(result, dict):
                        corrected_sentence = result.get("generated_text", sentence)
                    else:
                        corrected_sentence = sentence

                    if corrected_sentence != sentence:
                        s = difflib.SequenceMatcher(None, sentence, corrected_sentence)
                        for tag, i1, i2, j1, j2 in s.get_opcodes():
                            if tag != 'equal':
                                original_segment = sentence[i1:i2]
                                replacement = corrected_sentence[j1:j2]
                                errors.append({
                                    "type": "grammar",
                                    "message": f"Replace '{original_segment}' with '{replacement}'" if replacement else f"Remove '{original_segment}'",
                                    "offset": sent_start + i1,
                                    "errorLength": i2 - i1,
                                    "suggestion": replacement,
                                    "context": sentence[max(0, i1-15):min(len(sentence), i2+15)],
                                    "source": "hf-api"
                                })
                
            except Exception as e:
                logger.warning(f"HF API error: {e}")
                
            text_offset = sent_start + len(sentence)
            
        return errors

    def _merge_grammar_errors(
        self, 
        errors1: List[Dict[str, Any]], 
        errors2: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Merge and deduplicate grammar errors from multiple sources"""
        # Use a set to track seen errors by (offset, errorLength)
        seen = set()
        merged = []
        
        # Add errors from first list
        for error in errors1:
            key = (error.get("offset", 0), error.get("errorLength", 0))
            if key not in seen:
                seen.add(key)
                merged.append(error)
        
        # Add errors from second list that don't overlap
        for error in errors2:
            key = (error.get("offset", 0), error.get("errorLength", 0))
            if key not in seen:
                # Check for overlapping errors
                offset = error.get("offset", 0)
                length = error.get("errorLength", 0)
                overlaps = False
                
                for existing in merged:
                    existing_offset = existing.get("offset", 0)
                    existing_length = existing.get("errorLength", 0)
                    
                    # Check if errors overlap
                    if not (offset + length <= existing_offset or offset >= existing_offset + existing_length):
                        overlaps = True
                        break
                
                if not overlaps:
                    seen.add(key)
                    merged.append(error)
        
        # Sort by offset
        merged.sort(key=lambda x: x.get("offset", 0))
        
        return merged

    def _check_with_huggingface(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """
        Local check using Hugging Face GEC models (e.g. T5)
        Note: Slow on CPU, requires torch and transformers
        """
        try:
            import torch
            try:
                from transformers import T5ForConditionalGeneration, T5Tokenizer
            except ImportError:
                logger.warning("Transformers not found, skipping local HF GEC")
                return []
            import difflib
            
            if not self.hf_model:
                model_name = "vennify/t5-base-grammar-correction"
                logger.info(f"Loading Hugging Face model {model_name}...")
                self.hf_tokenizer = T5Tokenizer.from_pretrained(model_name)
                self.hf_model = T5ForConditionalGeneration.from_pretrained(model_name)
                device = "cuda" if torch.cuda.is_available() else "cpu"
                self.hf_model.to(device)
            
            errors = []
            text_offset = 0
            
            # Process sentence by sentence for best results
            for sentence in sentences:
                sent_start = text.find(sentence, text_offset)
                if sent_start == -1: 
                    sent_start = text_offset
                
                input_text = f"gec: {sentence}"
                inputs = self.hf_tokenizer(input_text, return_tensors="pt").to(self.hf_model.device)
                
                with torch.no_grad():
                    output = self.hf_model.generate(**inputs, max_length=len(sentence) + 20)
                
                corrected_sentence = self.hf_tokenizer.decode(output[0], skip_special_tokens=True)
                
                if corrected_sentence != sentence:
                    # Diff and find exact changes
                    s = difflib.SequenceMatcher(None, sentence, corrected_sentence)
                    for tag, i1, i2, j1, j2 in s.get_opcodes():
                        if tag != 'equal':
                            original_segment = sentence[i1:i2]
                            replacement = corrected_sentence[j1:j2]
                            
                            errors.append({
                                "type": "grammar",
                                "message": f"Replace '{original_segment}' with '{replacement}'" if replacement else f"Remove '{original_segment}'",
                                "offset": sent_start + i1,
                                "errorLength": i2 - i1,
                                "suggestion": replacement,
                                "context": sentence[max(0, i1-15):min(len(sentence), i2+15)],
                                "source": "local-hf"
                            })
                
                text_offset = sent_start + len(sentence)
                
            return errors
        except Exception as e:
            logger.warning(f"HF GEC models not available or error: {e}")
            self.use_hf = False
            return []

    def _check_with_languagetool(self, text: str) -> List[Dict[str, Any]]:
        """Optional local check using LanguageTool (requires Java)"""
        try:
            if not self.lt_tool:
                import language_tool_python
                self.lt_tool = language_tool_python.LanguageTool('en-US')
            
            matches = self.lt_tool.check(text)
            errors = []
            for match in matches:
                # Map LanguageTool types to our format
                category = match.category.lower()
                error_type = "grammar"
                if "spelling" in category:
                    error_type = "spelling"
                elif "punctuation" in category or "typographical" in category:
                    error_type = "punctuation"
                
                errors.append({
                    "type": error_type,
                    "message": match.message,
                    "offset": match.offset,
                    "errorLength": match.errorLength,
                    "suggestion": match.replacements[0] if match.replacements else "",
                    "context": text[max(0, match.offset-20):min(len(text), match.offset+match.errorLength+20)],
                    "source": "local-lt"
                })
            return errors
        except Exception:
            # Silently fail if LT or Java is not available
            self.use_lt = False
            return []

    def _check_basic_rules(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """
        Check basic grammar rules (conservative - only obvious errors)
        Note: Word choice errors are handled by LLM with better context awareness
        """
        errors = []
        
        # Check capitalization - word choice should be handled by LLM with context
        for i, sentence in enumerate(sentences):
            if sentence and not sentence[0].isupper():
                # Find the offset of this sentence in the original text
                sentence_start = text.find(sentence)
                if sentence_start == -1:
                    # Fallback: approximate position
                    sentence_start = sum(len(s) for s in sentences[:i])
                
                errors.append({
                    "type": "capitalization",
                    "sentence_index": i,
                    "message": "Sentence should start with a capital letter",
                    "suggestion": sentence[0].upper() + sentence[1:] if len(sentence) > 1 else sentence.upper(),
                    "offset": sentence_start,
                    "errorLength": 1  # Just the first character
                })
        
        # Check for excessive whitespace (multiple consecutive spaces, tabs, etc.)
        # Pattern matches 2 or more consecutive whitespace characters (spaces, tabs)
        whitespace_pattern = re.compile(r'[ \t]{2,}')
        
        for match in whitespace_pattern.finditer(text):
            start_pos = match.start()
            whitespace_text = match.group()
            whitespace_length = len(whitespace_text)
            
            # Determine what the correction should be
            # If it's between words, use single space; if at start/end, remove
            before_char = text[start_pos - 1] if start_pos > 0 else ''
            after_char = text[start_pos + whitespace_length] if start_pos + whitespace_length < len(text) else ''
            
            # Check if whitespace is at start or end of text/line
            if start_pos == 0 or before_char == '\n':
                # Leading whitespace - remove it
                suggestion = ""
            elif start_pos + whitespace_length == len(text) or after_char == '\n':
                # Trailing whitespace - remove it
                suggestion = ""
            else:
                # Between words - replace with single space
                suggestion = " "
            
            errors.append({
                "type": "punctuation",
                "message": f"Excessive whitespace ({whitespace_length} spaces/tabs) - use single space",
                "suggestion": suggestion,
                "offset": start_pos,
                "errorLength": whitespace_length
            })

        # Conservative gibberish/spelling fallback:
        # When LLM is unavailable or misses malformed tokens, we still flag obvious noise
        # (e.g., "ssdsd", "prodassdssducts", "crsdseates") without being too aggressive.
        consonants = "bcdfghjklmnpqrstvwxyz"
        # Increase cluster requirement to 6 to avoid common words like 'lengths', 'strengths', 'knights'
        hard_consonant_cluster = re.compile(rf"[{consonants}]{{6,}}", re.IGNORECASE)
        no_vowel_token = re.compile(rf"^[{consonants}]{{5,}}$", re.IGNORECASE)
        suspicious_keyboard_pattern = re.compile(r"(sdsd|dsds|asas|sasa|asds|dsas)", re.IGNORECASE)
        likely_valid_edge_cases = {
            "strengths", "rhythms", "schtschurowskia", "assess", "asset", "sads", "bads",
            "lengths", "knights", "strong", "strongly", "bright", "brightly", "through",
            "brought", "thought", "caught", "taught", "weight", "height", "straight",
            "strength", "length", "breadth", "depth"
        }

        for match in re.finditer(r"\b[a-zA-Z]{4,}\b", text):
            token = match.group(0)
            token_lower = token.lower()
            if token_lower in likely_valid_edge_cases:
                continue

            # Count vowels, including 'y' if it's not the first letter
            vowels = "aeiouy"
            vowel_count = 0
            for k, char in enumerate(token_lower):
                if char in "aeiou":
                    vowel_count += 1
                elif char == 'y' and k > 0:
                    vowel_count += 1
            
            vowel_ratio = vowel_count / max(1, len(token_lower))

            # "ngly" etc. matches 4-consonant regex because final y is treated as a consonant,
            # which wrongly flags normal words like "increasingly". Only use that rule when
            # the word has very few real vowels (actual gibberish like "xqxqfrm").
            has_hard_consonant_run = hard_consonant_cluster.search(token) is not None
            consonant_cluster_suspicious = has_hard_consonant_run and vowel_count <= 2

            is_obvious_gibberish = (
                no_vowel_token.match(token) is not None
                or (
                    consonant_cluster_suspicious
                    and vowel_ratio < 0.45
                )
                or (
                    suspicious_keyboard_pattern.search(token) is not None
                    and vowel_ratio < 0.5
                )
            )

            if not is_obvious_gibberish:
                continue

            errors.append({
                "type": "spelling",
                "message": f"Possible misspelled or gibberish word: '{token}'",
                "suggestion": "",
                "offset": match.start(),
                "errorLength": len(token),
            })
        
        return errors

