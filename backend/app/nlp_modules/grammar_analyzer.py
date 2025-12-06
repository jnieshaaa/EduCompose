"""
Grammar and Syntactic Analysis Module
Analyzes grammatical correctness, syntax patterns, and mechanical errors
Supports LLM-based grammar checking (OpenAI/Gemini) with fallback to LanguageTool
"""
import re
import os
import json
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Lazy import spaCy to avoid Python 3.12 compatibility issues at startup
from .spacy_utils import get_spacy, load_spacy_model

class GrammarAnalyzer:
    """Analyzes grammatical correctness and syntactic patterns in essays"""
    
    def __init__(
        self,
        use_llm: bool = True,
        llm_provider: str = "auto",  # "auto", "openai", "gemini", or "none"
        prefer_llm: bool = True  # If True, use LLM when available; otherwise use LanguageTool first
    ):
        """
        Initialize grammar analyzer with spaCy, LanguageTool, and optional LLM support
        
        Args:
            use_llm: Whether to attempt using LLM for grammar checking
            llm_provider: Which LLM to use ("auto" detects available, "openai", "gemini", or "none")
            prefer_llm: If True, use LLM when available; otherwise use LanguageTool first
        """
        self.nlp = None
        self.language_tool = None
        self.use_llm = use_llm
        self.llm_provider = llm_provider
        self.prefer_llm = prefer_llm
        self.llm_client = None
        self.available_llm = None  # "openai", "gemini", or None
        # Don't initialize here - wait until first use to avoid import errors at startup
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_md")
    
    def _ensure_language_tool_loaded(self):
        """Ensure LanguageTool is loaded (lazy loading)"""
        if self.language_tool is None:
            try:
                from language_tool_python import LanguageTool
                # Initialize LanguageTool for grammar checking
                self.language_tool = LanguageTool('en-US')
            except Exception as e:
                logger.warning(f"LanguageTool initialization failed: {e}")
                self.language_tool = None
    
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
        Comprehensive grammar analysis
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing grammar scores, errors, and patterns
        """
        results = {
            "score": 100.0,
            "errors": [],
            "syntax_patterns": {},
            "error_count": 0,
            "sentence_count": 0,
            "avg_sentence_length": 0.0,
            "syntax_complexity": 0.0
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Basic sentence segmentation
        sentences = self._segment_sentences(text)
        results["sentence_count"] = len(sentences)
        
        if results["sentence_count"] == 0:
            return results
        
        # Calculate average sentence length
        total_words = sum(len(s.split()) for s in sentences)
        results["avg_sentence_length"] = total_words / results["sentence_count"]
        
        # Grammar checking - try LLM first if preferred, otherwise LanguageTool
        grammar_errors = []
        
        if self.prefer_llm:
            # Try LLM first
            llm_client = self._ensure_llm_loaded()
            if llm_client:
                try:
                    grammar_errors = self._check_with_llm(text, sentences)
                    if grammar_errors:
                        logger.info(f"LLM found {len(grammar_errors)} grammar errors")
                except Exception as e:
                    logger.warning(f"LLM grammar check failed: {e}, falling back to LanguageTool")
                    grammar_errors = []
            
            # Fallback to LanguageTool if LLM didn't work or wasn't available
            if not grammar_errors:
                self._ensure_language_tool_loaded()
                if self.language_tool:
                    grammar_errors = self._check_with_languagetool(text)
        else:
            # Use LanguageTool first, then LLM as enhancement
            self._ensure_language_tool_loaded()
            if self.language_tool:
                grammar_errors = self._check_with_languagetool(text)
            
            # Enhance with LLM if available
            llm_client = self._ensure_llm_loaded()
            if llm_client and grammar_errors:
                try:
                    llm_errors = self._check_with_llm(text, sentences)
                    # Merge and deduplicate errors
                    grammar_errors = self._merge_grammar_errors(grammar_errors, llm_errors)
                except Exception as e:
                    logger.debug(f"LLM enhancement failed: {e}")
        
        results["errors"].extend(grammar_errors)
        results["error_count"] = len(grammar_errors)
        
        # spaCy-based syntactic analysis (lazy load)
        self._ensure_nlp_loaded()
        if self.nlp:
            syntax_analysis = self._analyze_syntax(text)
            results["syntax_patterns"] = syntax_analysis
            results["syntax_complexity"] = syntax_analysis.get("complexity_score", 0.0)
        
        # Basic rule-based checks
        basic_errors = self._check_basic_rules(text, sentences)
        results["errors"].extend(basic_errors)
        results["error_count"] += len(basic_errors)
        
        # Calculate grammar score (0-100)
        # Penalize based on error density
        total_words = len(text.split())
        if total_words > 0:
            error_density = results["error_count"] / total_words
            results["score"] = max(0.0, 100.0 - (error_density * 1000))
        else:
            results["score"] = 0.0
        
        return results
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences"""
        self._ensure_nlp_loaded()
        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            # Fallback: simple sentence segmentation
            sentences = re.split(r'[.!?]+', text)
            return [s.strip() for s in sentences if s.strip()]
    
    def _check_with_languagetool(self, text: str) -> List[Dict[str, Any]]:
        """Check grammar using LanguageTool"""
        errors = []
        
        try:
            matches = self.language_tool.check(text)
            
            for match in matches[:50]:  # Limit to first 50 errors
                # Handle both errorLength (old) and error_length (new) attribute names
                error_length = getattr(match, 'errorLength', None) or getattr(match, 'error_length', 1)
                errors.append({
                    "type": "grammar",
                    "message": match.message,
                    "category": match.category,
                    "offset": match.offset,
                    "errorLength": error_length,
                    "replacements": match.replacements[:5] if match.replacements else [],
                    "context": match.context[:100] if hasattr(match, 'context') else ""
                })
        except Exception as e:
            logger.error(f"LanguageTool error: {e}")
        
        return errors
    
    def _check_with_llm(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """
        Check grammar using LLM (OpenAI or Gemini)
        
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
                        "content": "You are an expert grammar checker for academic essays. Analyze the text and identify all grammatical errors, including spelling, punctuation, grammar, and style issues. Return your findings as a JSON array."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent results
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            return self._parse_llm_response(result_text, text)
            
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
            
            response = self.llm_client.generate_content(full_prompt)
            result_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            return self._parse_llm_response(result_text, text)
            
        except Exception as e:
            logger.error(f"Gemini grammar check error: {e}")
            return []
    
    def _build_grammar_prompt(self, text: str, sentences: List[str]) -> str:
        """Build prompt for LLM grammar checking"""
        # Limit text length to avoid token limits (keep it reasonable)
        max_chars = 4000
        if len(text) > max_chars:
            text = text[:max_chars] + "... [text truncated]"
        
        prompt = f"""Analyze the following essay text for grammatical errors, spelling mistakes, punctuation issues, and style problems.

Text to analyze:
{text}

Instructions:
1. Identify all grammatical errors, spelling mistakes, punctuation issues, and style problems
2. For each error, provide:
   - The exact position (offset) in the text where the error starts (character position, starting from 0)
   - The length of the error (number of characters)
   - A clear message explaining the error
   - A suggested correction (ONLY if the error is real and the suggestion is accurate)
   - Context (surrounding text, ~20 characters before and after)

3. CRITICAL: For word choice errors:
   - Only flag genuine word choice issues (e.g., "affect" vs "effect", "their" vs "there")
   - DO NOT suggest incorrect replacements (e.g., don't suggest "too" for "to" when "to" is correct)
   - Consider the full sentence context before suggesting word changes
   - If unsure, do not flag it as an error
   - Provide accurate, contextually appropriate suggestions

4. Focus on:
   - Subject-verb agreement
   - Tense consistency
   - Pronoun usage
   - Punctuation (commas, periods, apostrophes)
   - Spelling errors
   - Word choice and style (ONLY when clearly incorrect)
   - Sentence structure issues

5. Return results as a JSON array of error objects with these fields:
   - type: "grammar" | "spelling" | "punctuation" | "style" | "word_choice"
   - message: string (brief description explaining WHY it's an error)
   - offset: number (EXACT character position in text - count carefully from the start)
   - errorLength: number (EXACT length of the problematic word/phrase in characters)
   - suggestion: string (corrected text - must be accurate and contextually appropriate)
   - context: string (surrounding text showing the error in context)

6. IMPORTANT: 
   - Double-check that the offset points to the EXACT start of the problematic word
   - Verify that errorLength matches the actual length of the word/phrase
   - Only suggest corrections that are definitively correct in the given context
   - If a word is used correctly, do NOT flag it as an error

Return only the JSON array, no additional text."""
        
        return prompt
    
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
            
            # Convert to standard format
            for error in error_list:
                if not isinstance(error, dict):
                    continue
                
                offset = error.get("offset", 0)
                error_length = error.get("errorLength", 1)
                suggestion = error.get("suggestion", "").strip()
                error_message = error.get("message", "").strip()
                
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
                
                # For word choice errors, validate the suggestion makes sense
                error_type = error.get("type", "grammar")
                if error_type == "word_choice" or "word" in error_type.lower() or error_type == "style":
                    # If suggestion is provided, validate it's reasonable
                    if suggestion:
                        actual_lower = actual_text.lower().strip()
                        suggestion_lower = suggestion.lower().strip()
                        
                        # Check context around "to" to see if it's part of infinitive
                        if actual_lower == "to" and suggestion_lower in ["too", "two"]:
                            # Check if "to" is followed by a verb (infinitive construction)
                            # Look at the next 20 characters after "to"
                            next_text = original_text[offset + error_length:offset + error_length + 20].strip()
                            # Check if it starts with a space followed by a lowercase letter (likely a verb)
                            # or if it's part of common infinitive patterns
                            if next_text:
                                # Pattern: "to " followed by lowercase word (likely infinitive)
                                infinitive_pattern = r'^\s+[a-z]'
                                if re.match(infinitive_pattern, next_text):
                                    # This is likely an infinitive - skip this false positive
                                    logger.debug(f"Skipping false positive: 'to' -> '{suggestion}' (infinitive construction: 'to {next_text[:10]}...')")
                                    continue
                                # Also check if it's "to be", "to have", "to do" etc. (common infinitives)
                                next_word = next_text.split()[0].lower() if next_text.split() else ""
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
                                                     "draw", "choose", "harmonize", "manage", "build", "create"]
                                if next_word in common_infinitives:
                                    logger.debug(f"Skipping false positive: 'to' -> '{suggestion}' (infinitive: 'to {next_word}')")
                                    continue
                        
                        # Additional validation: if suggestion is very short or same as actual, skip
                        if len(suggestion_lower) < 2 or suggestion_lower == actual_lower:
                            logger.debug(f"Skipping invalid suggestion: '{suggestion}' same as or too short")
                            continue
                
                # Validate offset using spaCy if available - find the actual word token
                try:
                    self._ensure_nlp_loaded()
                    if self.nlp:
                        doc = self.nlp(original_text)
                        # Find which token contains this offset
                        token_at_offset = None
                        for token in doc:
                            if token.idx <= offset < token.idx + len(token.text):
                                token_at_offset = token
                                break
                        
                        if token_at_offset:
                            # Check if the actual text matches the token
                            if actual_text.lower().strip() != token_at_offset.text.lower():
                                # Offset might be slightly off - use token position
                                logger.debug(f"Adjusting offset from {offset} to {token_at_offset.idx} for token '{token_at_offset.text}'")
                                offset = token_at_offset.idx
                                actual_text = token_at_offset.text
                                error_length = len(token_at_offset.text)
                except Exception as e:
                    logger.debug(f"Could not validate offset with spaCy: {e}")
                
                # Get context
                context_start = max(0, offset - 20)
                context_end = min(len(original_text), offset + error_length + 20)
                context = original_text[context_start:context_end]
                
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

    def _analyze_syntax(self, text: str) -> Dict[str, Any]:
        """Analyze syntactic patterns using spaCy"""
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        
        # Count different sentence structures
        sentence_types = {
            "simple": 0,
            "compound": 0,
            "complex": 0,
            "compound_complex": 0
        }
        
        # Analyze dependency patterns
        dependency_tags = {}
        pos_tags = {}
        
        for sent in doc.sents:
            # Count clauses
            num_verbs = len([token for token in sent if token.pos_ == "VERB"])
            num_conjunctions = len([token for token in sent if token.dep_ == "cc"])
            
            if num_verbs == 1 and num_conjunctions == 0:
                sentence_types["simple"] += 1
            elif num_verbs > 1 and num_conjunctions > 0:
                sentence_types["compound_complex"] += 1
            elif num_verbs > 1:
                sentence_types["complex"] += 1
            elif num_conjunctions > 0:
                sentence_types["compound"] += 1
            
            # Count dependency tags
            for token in sent:
                dep = token.dep_
                pos = token.pos_
                dependency_tags[dep] = dependency_tags.get(dep, 0) + 1
                pos_tags[pos] = pos_tags.get(pos, 0) + 1
        
        # Calculate syntax complexity score
        total_sentences = len(list(doc.sents))
        if total_sentences > 0:
            complexity_score = (
                sentence_types["complex"] * 2 +
                sentence_types["compound_complex"] * 3 +
                sentence_types["compound"] * 1
            ) / total_sentences * 100
        else:
            complexity_score = 0.0
        
        return {
            "sentence_types": sentence_types,
            "dependency_tags": dependency_tags,
            "pos_tags": pos_tags,
            "complexity_score": complexity_score,
            "avg_dependency_depth": self._calculate_avg_dependency_depth(doc)
        }
    
    def _calculate_avg_dependency_depth(self, doc) -> float:
        """Calculate average dependency tree depth"""
        depths = []
        for sent in doc.sents:
            for token in sent:
                depth = 0
                current = token
                while current.head != current:
                    depth += 1
                    current = current.head
                    if depth > 20:  # Prevent infinite loops
                        break
                depths.append(depth)
        
        return sum(depths) / len(depths) if depths else 0.0
    
    def _check_basic_rules(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Check basic grammar rules"""
        errors = []
        
        # Check capitalization
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
        
        # Check for common word errors
        common_errors = {
            r'\bthere\b': "their/they're",
            r'\byour\b': "you're",
            r'\bits\b': "it's",
            r'\bto\b': "too",
            r'\bthen\b': "than"
        }
        
        for pattern, suggestion in common_errors.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in list(matches)[:5]:  # Limit matches
                errors.append({
                    "type": "word_choice",
                    "offset": match.start(),
                    "errorLength": len(match.group()),  # Add errorLength for highlighting
                    "message": f"Consider using '{suggestion}' instead",
                    "context": text[max(0, match.start()-20):match.end()+20]
                })
        
        return errors

