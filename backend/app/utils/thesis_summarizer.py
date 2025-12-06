"""
Thesis Statement Summarizer
Generates brief explanations and summaries for thesis statements using NLP analysis
Can optionally use Gemini API for more sophisticated summaries
"""
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ThesisSummarizer:
    """
    Generates brief explanations and summaries for thesis statements
    """
    
    def __init__(self):
        """Initialize thesis summarizer"""
        self.gemini_client = None
    
    def generate_summary(
        self,
        thesis_statement: Dict[str, Any],
        argument_analysis: Dict[str, Any],
        scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Generate a brief summary/explanation for the thesis statement
        
        Args:
            thesis_statement: Thesis statement dict with 'sentence' and 'confidence'
            argument_analysis: Full argument analysis results
            scores: Dimension scores including argument_strength
            
        Returns:
            Dict with 'title', 'explanation', and optionally 'gemini_summary'
        """
        thesis_text = thesis_statement.get("sentence", "")
        confidence = thesis_statement.get("confidence", "").lower()
        
        # Get supporting structure
        argument_structure = argument_analysis.get("argument_structure", {})
        claims_count = argument_structure.get("total_claims", 0)
        evidence_count = argument_structure.get("total_grounds", 0)
        warrants_count = argument_structure.get("total_warrants", 0)
        rebuttals_count = argument_structure.get("total_rebuttals", 0)
        
        argument_score = scores.get("argument_strength", 0)
        
        # Generate title
        title = "Thesis statement identified"
        if claims_count > 0 or evidence_count > 0:
            title = f"Thesis statement identified ({claims_count} claims, {evidence_count} evidence pieces)"
        
        # Generate explanation using template-based approach
        explanation = self._generate_template_explanation(
            confidence=confidence,
            claims_count=claims_count,
            evidence_count=evidence_count,
            warrants_count=warrants_count,
            rebuttals_count=rebuttals_count,
            argument_score=argument_score
        )
        
        return {
            "title": title,
            "explanation": explanation,
            "thesis_text": thesis_text
        }
    
    def _generate_template_explanation(
        self,
        confidence: str,
        claims_count: int,
        evidence_count: int,
        warrants_count: int,
        rebuttals_count: int,
        argument_score: float
    ) -> str:
        """
        Generate explanation using template-based rules (no API needed)
        """
        parts = []
        
        # Confidence assessment
        if "high" in confidence:
            parts.append("The thesis statement is clearly identifiable and")
        elif "medium" in confidence:
            parts.append("A thesis statement has been identified, though")
        else:
            parts.append("A potential thesis statement was found,")
        
        # Support assessment
        total_support = claims_count + evidence_count
        if total_support > 6:
            parts.append("is well-supported with multiple claims and evidence.")
        elif total_support > 3:
            parts.append("has adequate supporting claims and evidence.")
        elif total_support > 0:
            parts.append("has some supporting claims and evidence.")
        else:
            parts.append("may need more supporting elements.")
        
        # Argument quality assessment
        if argument_score >= 80:
            parts.append("The argument structure is strong and well-developed.")
        elif argument_score >= 60:
            parts.append("Consider strengthening the argument structure and supporting evidence.")
        else:
            parts.append("The argument structure could benefit from additional development and support.")
        
        # Additional notes
        if warrants_count == 0 and rebuttals_count == 0:
            parts.append("Consider adding warrants (reasoning) and addressing counterarguments.")
        elif warrants_count == 0:
            parts.append("The argument would benefit from more explicit reasoning (warrants).")
        elif rebuttals_count == 0:
            parts.append("Consider addressing potential counterarguments to strengthen the argument.")
        
        return " ".join(parts)
    
    async def generate_with_gemini(
        self,
        thesis_statement: Dict[str, Any],
        argument_analysis: Dict[str, Any],
        scores: Dict[str, float],
        essay_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate summary using Gemini API (optional, more sophisticated)
        
        Requires: pip install google-generativeai
        Requires: GEMINI_API_KEY environment variable
        
        Args:
            thesis_statement: Thesis statement dict
            argument_analysis: Full argument analysis
            scores: Dimension scores
            essay_text: Optional full essay text for context
            
        Returns:
            Enhanced summary dict with gemini_summary field
        """
        try:
            import google.generativeai as genai
            import os
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not set, falling back to template-based summary")
                return self.generate_summary(thesis_statement, argument_analysis, scores)
            
            genai.configure(api_key=api_key)
            
            # Get model name from environment variable, or use fallback list
            env_model_name = os.getenv("GEMINI_MODEL_NAME")
            if env_model_name:
                # Use the model name from environment variable
                try:
                    model = genai.GenerativeModel(env_model_name)
                    logger.info(f"Using Gemini model from env: {env_model_name}")
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
                
                model = None
                last_error = None
                for model_name in model_names:
                    try:
                        model = genai.GenerativeModel(model_name)
                        logger.info(f"Using Gemini model: {model_name}")
                        break
                    except Exception as e:
                        last_error = e
                        continue
                
                if not model:
                    raise Exception(f"No working Gemini model found. Last error: {last_error}")
            
            # Build prompt
            prompt = self._build_gemini_prompt(
                thesis_statement, argument_analysis, scores, essay_text
            )
            
            # Generate response
            response = await model.generate_content_async(prompt)
            gemini_summary = response.text.strip()
            
            # Get base summary
            base_summary = self.generate_summary(thesis_statement, argument_analysis, scores)
            
            return {
                **base_summary,
                "gemini_summary": gemini_summary,
                "explanation": gemini_summary  # Use Gemini's explanation as primary
            }
            
        except ImportError:
            logger.warning("google-generativeai not installed, falling back to template-based summary")
            return self.generate_summary(thesis_statement, argument_analysis, scores)
        except Exception as e:
            logger.error(f"Error generating Gemini summary: {e}", exc_info=True)
            return self.generate_summary(thesis_statement, argument_analysis, scores)
    
    def _build_gemini_prompt(
        self,
        thesis_statement: Dict[str, Any],
        argument_analysis: Dict[str, Any],
        scores: Dict[str, float],
        essay_text: Optional[str] = None
    ) -> str:
        """
        Build prompt for Gemini API
        """
        thesis_text = thesis_statement.get("sentence", "")
        confidence = thesis_statement.get("confidence", "")
        
        argument_structure = argument_analysis.get("argument_structure", {})
        
        prompt = f"""As an educational writing assessment tool, provide a brief, teacher-friendly explanation of this thesis statement.

Thesis Statement: "{thesis_text}"
Confidence Level: {confidence}

Argument Structure:
- Claims: {argument_structure.get('total_claims', 0)}
- Evidence: {argument_structure.get('total_grounds', 0)}
- Warrants: {argument_structure.get('total_warrants', 0)}
- Rebuttals: {argument_structure.get('total_rebuttals', 0)}
- Argument Strength Score: {scores.get('argument_strength', 0):.1f}/100

Provide a concise 2-3 sentence explanation that:
1. Assesses the thesis statement's clarity and identifiability
2. Evaluates the level of support (claims and evidence)
3. Provides brief, actionable guidance for improvement

Keep it brief, professional, and focused on helping teachers provide targeted feedback.
"""
        
        if essay_text:
            prompt += f"\nEssay Context (first 500 chars): {essay_text[:500]}..."
        
        return prompt


# Global instance
thesis_summarizer = ThesisSummarizer()

