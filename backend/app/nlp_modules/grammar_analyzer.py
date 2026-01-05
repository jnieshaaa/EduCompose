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
            import google.generativeai as genai
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return
            
            genai.configure(api_key=api_key)
            
            # Get model name from environment variable, or use fallback list
            env_model_name = os.getenv("GEMINI_MODEL_NAME")
            if env_model_name:
                # Use the model name from environment variable
                try:
                    self.llm_client = genai.GenerativeModel(env_model_name)
                    logger.info(f"Gemini client initialized with model from env: {env_model_name}")
                except Exception as model_error:
                    logger.warning(f"Failed to initialize Gemini model '{env_model_name}' from env: {model_error}")
                    logger.info("Falling back to default model list...")
                    env_model_name = None  # Trigger fallback
            
            if not env_model_name:
                # Try different model names in order of preference
                # Updated for Gemini 2.5 models (newer API versions)
                model_names = [
                    'models/gemini-2.5-flash',   # Latest 2.5 flash (fastest)
                    'gemini-2.5-flash',          # Without models/ prefix
                    'models/gemini-flash-latest', # Latest flash (fallback)
                    'gemini-flash-latest',        # Without models/ prefix
                    'models/gemini-2.5-pro',     # Pro version (more capable)
                    'gemini-2.5-pro',            # Without models/ prefix
                    'models/gemini-pro-latest',  # Legacy latest
                    'gemini-pro-latest',         # Without models/ prefix
                ]
                
                self.llm_client = None
                last_error = None
                for model_name in model_names:
                    try:
                        self.llm_client = genai.GenerativeModel(model_name)
                        logger.info(f"Gemini client initialized with model: {model_name}")
                        break
                    except Exception as model_error:
                        last_error = model_error
                        logger.debug(f"Model {model_name} failed: {model_error}")
                        continue
                
                if not self.llm_client:
                    logger.warning(f"Failed to initialize any Gemini model. Last error: {last_error}")
                
        except ImportError:
            logger.debug("google-generativeai package not installed")
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
            "analyzer_version": "2.0-pure-llm",  # Debug signature - verify new code is running
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
        
        # Grammar checking - use LLM with retry mechanism (NO LanguageTool)
        grammar_errors = []
        llm_success = False  # Track if LLM call succeeded (even with 0 errors)
        
        logger.info("Attempting LLM-based grammar checking (LanguageTool completely removed)")
        
        # Try LLM with retry mechanism (up to 3 attempts)
        llm_client = self._ensure_llm_loaded()
        if llm_client:
            try:
                logger.info(f"LLM client available: {self.available_llm}")
                grammar_errors, llm_success = self._check_with_llm_with_retry(text, sentences)
                if llm_success:
                    logger.info(f"✓ LLM SUCCESS: Found {len(grammar_errors)} grammar errors (V2 PURE LLM)")
                else:
                    logger.warning("✗ LLM check failed after all retries - NO LanguageTool fallback")
            except Exception as e:
                logger.warning(f"✗ LLM grammar check failed after all retries: {e} - NO LanguageTool fallback")
                llm_success = False
                grammar_errors = []
        else:
            logger.warning("✗ No LLM client available - NO LanguageTool fallback (using basic rules only)")
        
        # If LLM failed, we'll only use basic rules (capitalization checks)
        # IMPORTANT: LanguageTool has been completely removed - no fallback
        if not llm_success:
            logger.info("LLM unavailable or failed - using only basic rule checks (NO LanguageTool)")
        
        # Deduplicate errors before adding (same offset + errorLength = same error)
        # This prevents duplicate highlights if the analysis runs multiple times
        seen_errors = set()
        unique_grammar_errors = []
        for error in grammar_errors:
            error_key = (error.get("offset"), error.get("errorLength"))
            if error_key not in seen_errors:
                seen_errors.add(error_key)
                unique_grammar_errors.append(error)
        
        if len(unique_grammar_errors) < len(grammar_errors):
            logger.info(f"Deduplicated {len(grammar_errors) - len(unique_grammar_errors)} duplicate errors")
        
        results["errors"].extend(unique_grammar_errors)
        results["error_count"] = len(unique_grammar_errors)
        
        # Basic rule-based checks
        basic_errors = self._check_basic_rules(text, sentences)
        
        # Deduplicate basic errors against grammar errors
        for error in basic_errors:
            error_key = (error.get("offset"), error.get("errorLength"))
            if error_key not in seen_errors:
                seen_errors.add(error_key)
                results["errors"].append(error)
                results["error_count"] += 1
        
        # Calculate grammar score (0-100)
        # Penalize based on error density
        total_words = len(text.split())
        if total_words > 0:
            error_density = results["error_count"] / total_words
            results["score"] = max(0.0, 100.0 - (error_density * 1000))
        else:
            results["score"] = 0.0
        
        # Final debug log
        logger.info(f"--- COMPLETED GRAMMAR ANALYSIS (V2 PURE LLM) ---")
        logger.info(f"Total errors found: {results['error_count']} | Score: {results['score']}")
        logger.info("=" * 60)
        
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
        max_retries: int = 3,
        initial_delay: float = 1.0
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Check grammar using LLM with retry mechanism and exponential backoff
        
        Args:
            text: Full text to check
            sentences: List of sentences for context
            max_retries: Maximum number of retry attempts (default: 3)
            initial_delay: Initial delay in seconds before first retry (default: 1.0)
            
        Returns:
            Tuple of (error_list, success_flag)
            - error_list: List of grammar error dictionaries (empty list if no errors found)
            - success_flag: True if LLM call succeeded (even with 0 errors), False if it failed
        """
        if not self.llm_client or not self.available_llm:
            return [], False
        
        last_exception = None
        delay = initial_delay
        
        for attempt in range(max_retries):
            try:
                if self.available_llm == "openai":
                    errors = self._check_with_openai(text, sentences)
                    # Success - return errors (could be empty list if no errors found)
                    return errors, True
                elif self.available_llm == "gemini":
                    errors = self._check_with_gemini(text, sentences)
                    # Success - return errors (could be empty list if no errors found)
                    return errors, True
            except Exception as e:
                error_msg = str(e)
                # Don't retry quota errors - they won't succeed immediately
                if "429" in error_msg or "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
                    logger.error(f"❌ {self.available_llm.upper()} API quota exceeded. Error: {e}")
                    logger.warning("💡 Consider using OpenAI API or wait for quota reset. Falling back to basic rules only.")
                    return [], False
                
                last_exception = e
                if attempt < max_retries - 1:
                    # Exponential backoff: delay * 2^attempt
                    wait_time = delay * (2 ** attempt)
                    logger.warning(
                        f"LLM grammar check attempt {attempt + 1}/{max_retries} failed: {e}. "
                        f"Retrying in {wait_time:.2f} seconds..."
                    )
                    time.sleep(wait_time)
                else:
                    logger.error(f"LLM grammar check failed after {max_retries} attempts: {e}")
        
        # All retries failed
        return [], False
    
    def _check_with_llm(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """
        Check grammar using LLM (OpenAI or Gemini) - single attempt
        DEPRECATED: Use _check_with_llm_with_retry instead for retry logic
        
        Args:
            text: Full text to check
            sentences: List of sentences for context
            
        Returns:
            List of grammar error dictionaries
        """
        if not self.llm_client or not self.available_llm:
            return []
        
        try:
            if self.available_llm == "openai":
                return self._check_with_openai(text, sentences)
            elif self.available_llm == "gemini":
                return self._check_with_gemini(text, sentences)
        except Exception as e:
            logger.error(f"LLM grammar check error: {e}")
            return []
        
        return []
    
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
                "max_output_tokens": 8192,  # Maximum for Gemini 2.5 models
            }
            
            response = self.llm_client.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            # Check if response was truncated by examining finish_reason
            finish_reason = None
            if response.candidates and len(response.candidates) > 0:
                finish_reason = response.candidates[0].finish_reason
                if finish_reason == "MAX_OUTPUT_TOKENS":
                    logger.warning(f"⚠️ Gemini response was TRUNCATED (max_output_tokens limit reached). "
                                 f"Some errors may be missing. Response length: {len(response.text)} chars.")
            
            result_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            # Check if JSON looks incomplete (common signs: missing closing brackets, truncated last error)
            # This check is still useful even if finish_reason doesn't indicate truncation
            json_incomplete = result_text and not result_text.rstrip().endswith("]") and not result_text.rstrip().endswith("}")
            if json_incomplete or finish_reason == "MAX_OUTPUT_TOKENS":
                if json_incomplete:
                    logger.warning(f"⚠️ Gemini response may be incomplete (doesn't end with ] or }}). "
                                 f"Response length: {len(result_text)} chars. Attempting to repair JSON...")
                # Try to repair incomplete JSON
                result_text = self._repair_incomplete_json(result_text)
            
            errors = self._parse_llm_response(result_text, text)
            return errors
            
        except Exception as e:
            error_msg = str(e)
            # Check for quota exceeded error - raise it so retry logic can handle it properly
            if "429" in error_msg or "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
                # Don't log here - let the retry logic handle the logging to avoid duplicates
                raise  # Re-raise so retry logic can detect and skip retries
            else:
                logger.error(f"Gemini grammar check error: {e}")
                return []
    
    def _build_grammar_prompt(self, text: str, sentences: List[str]) -> str:
        """Build prompt for LLM grammar checking with enhanced paragraph splitting and context-aware spelling"""
        # Limit text length to avoid token limits (keep it reasonable)
        max_chars = 4000
        if len(text) > max_chars:
            text = text[:max_chars] + "... [text truncated]"
        
        prompt = f"""Analyze the following essay text for grammatical errors, spelling mistakes, punctuation issues, and structural problems.

Text to analyze:
{text}

Instructions:
1. Identify all grammatical errors, spelling mistakes, punctuation issues, and structural problems
2. For each error, provide:
   - The exact position (offset) in the text where the error starts (character position, starting from 0)
   - The length of the error (number of characters)
   - A clear message explaining the error
   - A suggested correction (ONLY if the error is real and the suggestion is accurate)
   - Context (surrounding text, ~20 characters before and after)

3. CRITICAL PARAGRAPH SPLITTING (type: "structure"):
   - This text appears to be a "wall of text" with multiple topics combined into one long paragraph
   - STRICTLY identify and split into 3 logical sections:
     a) Introduction/Personal Background: First section about personal interests, passions, cooking
     b) Income/Selling Business: Middle section about selling food, earning money, mini waffles, hash browns, etc.
     c) Freshman Year Events: Final section starting with "My Freshman year" and describing college events
   - Look for clear transition phrases:
     * "My Freshman year started" or "My Freshman year" - marks start of section 3
     * "I sell", "I earn", "I built regular customer" - marks section 2
     * Topic shifts from background/intro to business activities
   - For EACH transition point:
     * Find the period (.) at the end of the sentence BEFORE the new section starts
     * Set offset to the position of that period
     * Set errorLength to 1 (just the period)
     * Set suggestion to: ".\n\n" (period followed by two newlines to create paragraph break)
     * Set message to: "New section: [describe the transition, e.g., 'transitioning from personal background to business activities']"
   - You should find at least 2 paragraph breaks (creating 3 sections total)

4. CONTEXT-AWARE SPELLING (type: "spelling"):
   - CRITICAL: Flag ALL invalid words, random character sequences, and gibberish text:
     * Random character strings that don't form valid words (e.g., "asds", "dsds", "dsd", "asd", "sdg", "mana sd ging", "consumpsd", etc.)
     * Nonsensical character sequences that are clearly not English words
     * Words with random letters inserted (e.g., "mana sd ging" should be "managing", "consumpsd" should be "consumption")
     * Any sequence of letters separated by spaces that doesn't form valid words (e.g., "asds dsds dsd")
   - Pay special attention to PHONETIC TYPOS that are common in fast typing:
     * "mot" -> "not" (e.g., "this program is mot my passion" -> "this program is not my passion")
     * "weed" -> "need" (e.g., "I don't weed to sell" -> "I don't need to sell", "what I weed" -> "what I need")
     * "momy" -> "money" (e.g., "I earn momy" -> "I earn money", "get momy" -> "get money")
     * "bod" -> "food" (e.g., "my bod taste great" -> "my food taste great")
     * "buns" -> "bought" or context-dependent (e.g., "professors buns to me" -> "professors bought to me" or "professors came to me")
     * "atleast" -> "at least" (space needed)
     * "finaly" -> "finally"
     * "noone" -> "no one" (space needed)
   - These are REAL spelling errors that change meaning - flag them even if frequency is low
   - For gibberish/random character sequences: Flag them even if you can't determine the exact intended word - you can suggest "[remove]" or "[replace with contextually appropriate word]" or leave the suggestion field empty
   - For regular spelling errors: Only flag if you're confident about the correction based on context
   - Common misspellings: "recieve" -> "receive", "definately" -> "definitely", "seperate" -> "separate"
   - Do NOT flag: Proper nouns, brand names, technical terms, regional variations

5. REDUCED FALSE POSITIVES:
   - Word Choice: Be VERY lenient - only flag if the meaning is completely lost or the word makes no sense
     * DO NOT flag stylistic variations (e.g., "backward" vs "backwards" - both are acceptable)
     * DO NOT flag informal abbreviations if they're intentional style (e.g., "&" for "and" is acceptable in casual writing)
     * DO NOT flag correct uses of "to", "then", "your", "there", "its" - only flag when clearly wrong
   - Repeated Content: IGNORE repetition unless it's EXACT duplication (same sentence/phrase repeated word-for-word)
     * Do NOT flag similar ideas expressed differently
     * Do NOT flag thematic repetition or emphasis
     * Only flag if identical text appears multiple times consecutively
   - Style Issues: Be lenient on:
     * Informal language in personal narratives (acceptable)
     * Contractions (acceptable)
     * Abbreviations in context (e.g., "U" for University - flag only if context is unclear)

6. Focus on REAL errors:
   - Subject-verb agreement (e.g., "the program are" -> "the program is")
   - Tense consistency within paragraphs
   - Punctuation errors (missing commas, periods, apostrophes)
   - Spelling errors (especially phonetic typos and gibberish/random character sequences - see section 4)
   - Invalid words, random character strings, and nonsensical text (CRITICAL - flag all gibberish)
   - Excessive whitespace (multiple consecutive spaces or tabs, e.g., "word          word" -> "word word")
   - Missing words or grammar that makes sentences unreadable
   - Paragraph structure (long paragraphs that need splitting - see section 3)

7. Return results as a JSON object with an "errors" array containing error objects. Each error object must have these fields:
   - type: "grammar" | "spelling" | "punctuation" | "structure" | "word_choice" | "style"
   - message: string (brief description explaining WHY it's an error)
   - offset: number (EXACT character position in text - count carefully from the start, counting every character including spaces and newlines)
   - errorLength: number (EXACT length of the problematic word/phrase in characters)
   - text: string (the ACTUAL text at this offset - include this for verification)
   - suggestion: string (corrected text - must be accurate and contextually appropriate)
   - context: string (surrounding text showing the error in context)

8. CRITICAL OFFSET ACCURACY:
   - Count characters VERY carefully - every character counts (letters, spaces, punctuation, newlines)
   - Test your offset by extracting text[offset:offset+errorLength] - it MUST match the "text" field exactly
   - The offset is the position of the FIRST character of the error
   - Verify your offset is correct by checking what text appears at that position

9. IMPORTANT: 
   - Double-check that the offset points to the EXACT start of the problematic word
   - Include the "text" field so we can verify the offset is correct
   - Verify that errorLength matches the actual length of the word/phrase
   - Only suggest corrections that are definitively correct in the given context
   - If a word is used correctly or the meaning is clear, do NOT flag it as an error
   - Prioritize structural paragraph breaks and phonetic spelling errors

Return ONLY a valid JSON object with this exact structure:
{
  "errors": [
    {
      "type": "spelling",
      "message": "Misspelled word",
      "offset": 0,
      "errorLength": 5,
      "text": "impo rtant",
      "suggestion": "important",
      "context": "Time management is very important"
    }
  ]
}

Do not include any text before or after the JSON object."""
        
        return prompt
    
    def _repair_incomplete_json(self, json_text: str) -> str:
        """Attempt to repair incomplete JSON by closing brackets and fixing syntax"""
        if not json_text:
            return json_text
        
        # Remove trailing incomplete content
        json_text = json_text.strip()
        
        # Try to find the last complete error object
        # Look for patterns like "}, {" or "}]" to identify where truncation happened
        if json_text.startswith("{"):
            # JSON object format: {"errors": [...]}
            if '"errors"' in json_text:
                # Try to find last complete error object by looking for complete patterns
                # Find all positions where we have complete error objects: "},"
                last_complete_pos = -1
                i = 0
                while i < len(json_text):
                    # Look for "},\n" or "}," patterns that indicate complete objects
                    if json_text[i:i+2] == '},':
                        # Check if this looks like end of an error object
                        # Look backwards to see if we have a complete structure
                        test_pos = i + 1
                        # Count backwards to see if this is balanced
                        brace_count = 0
                        bracket_count = 0
                        for j in range(test_pos, -1, -1):
                            if json_text[j] == '}':
                                brace_count += 1
                            elif json_text[j] == '{':
                                brace_count -= 1
                            elif json_text[j] == ']':
                                bracket_count += 1
                            elif json_text[j] == '[':
                                bracket_count -= 1
                            if brace_count == 0 and bracket_count >= 0:
                                last_complete_pos = test_pos
                                break
                    i += 1
                
                # If we found a complete position, extract up to there
                if last_complete_pos > 100:  # Make sure we got something substantial
                    potential_json = json_text[:last_complete_pos]
                    # Close brackets/braces
                    open_braces = potential_json.count("{")
                    close_braces = potential_json.count("}")
                    open_brackets = potential_json.count("[")
                    close_brackets = potential_json.count("]")
                    
                    # If we're in an errors array, close it first
                    if open_brackets > close_brackets:
                        potential_json += "]"
                    # Then close the main object
                    if open_braces > close_braces:
                        potential_json += "}"
                    
                    return potential_json
        elif json_text.startswith("["):
            # Array format: [...]
            # Find last complete error object
            last_complete_pos = json_text.rfind('},')
            if last_complete_pos > 0:
                potential_json = json_text[:last_complete_pos + 1] + ']'
                return potential_json
        
        # Fallback: try to close incomplete strings and then brackets
        # Look for unterminated strings (odd number of quotes at the end)
        result = json_text
        # Count unescaped quotes
        quote_count = 0
        escaped = False
        for char in result:
            if char == '\\' and not escaped:
                escaped = True
                continue
            if char == '"' and not escaped:
                quote_count += 1
            escaped = False
        
        # If odd number of quotes, we likely have an unterminated string
        # Try to find the last complete property/value pair
        if quote_count % 2 != 0:
            # Find last complete property by looking for ": " followed by value then ","
            last_comma = result.rfind(',')
            if last_comma > 0:
                # Check if before this comma we have a complete property
                before_comma = result[:last_comma]
                if ': ' in before_comma:
                    # Try to extract up to last complete property
                    result = before_comma
        
        # Close brackets and braces
        open_braces = result.count("{")
        close_braces = result.count("}")
        open_brackets = result.count("[")
        close_brackets = result.count("]")
        
        if open_brackets > close_brackets:
            result += "]" * (open_brackets - close_brackets)
        if open_braces > close_braces:
            result += "}" * (open_braces - close_braces)
        
        return result
    
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
        
        # Removed aggressive word checking - LLM handles word choice with context
        # The previous implementation was flagging correct uses of "to", "then", "your", etc.
        # LLM can distinguish between correct and incorrect usage based on context
        
        return errors

