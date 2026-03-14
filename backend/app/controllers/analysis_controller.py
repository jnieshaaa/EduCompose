"""
Analysis Controller
Handles essay analysis endpoints
"""
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from ..models import User, Essay
from ..schemas import (
    AnalysisRequest, AnalysisResponse, BatchAnalysisRequest,
    TextAnalysisRequest, TextAnalysisResponse, PlagiarismCheckRequest, 
    PlagiarismCheckResponse, PlagiarismMatch
)
from ..schemas.comparison import ComparisonAnalysisRequest, ComparisonAnalysisResponse
from ..database import get_db
from ..services import auth_service, essay_analysis_service, copyscape_service

analysis_router = APIRouter()
logger = logging.getLogger(__name__)

@analysis_router.post("/analyze", response_model=AnalysisResponse)
async def analyze_essay(
    analysis_request: AnalysisRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze a single essay"""
    # Get essay
    essay = db.query(Essay).filter(
        Essay.id == analysis_request.essay_id,
        Essay.teacher_id == current_user.id
    ).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Perform analysis
    analysis_result = await essay_analysis_service.analyze_essay(essay, analysis_request.analysis_type)
    
    # Check for errors
    if "error" in analysis_result:
        raise HTTPException(status_code=400, detail=analysis_result.get("message", "Analysis failed"))
    
    # Update essay with analysis results
    # Handle None grammar score (when LLM fails)
    grammar_score = analysis_result["scores"].get("grammar")
    essay.grammar_score = grammar_score if grammar_score is not None else None
    essay.readability_score = analysis_result["scores"].get("readability", 0)
    essay.coherence_score = analysis_result["scores"].get("coherence", 0)
    essay.argument_strength_score = analysis_result["scores"].get("argument_strength", 0)
    essay.overall_score = analysis_result["scores"].get("overall", 0)
    
    # Store detailed analysis in JSON fields
    detailed = analysis_result["detailed_analysis"]
    essay.grammar_errors = detailed.get("grammar", {}).get("errors", [])
    essay.style_issues = detailed.get("readability", {}).get("issues", [])
    essay.argument_analysis = {
        "argumentation": detailed.get("argumentation", {}),
        "knowledge_graph": detailed.get("knowledge_graph", {}),
        "coherence": detailed.get("coherence", {})
    }
    essay.recommendations = analysis_result["recommendations"]
    essay.status = "analyzed"
    
    db.commit()
    
    return AnalysisResponse(
        essay_id=essay.id,
        analysis_type=analysis_request.analysis_type,
        scores=analysis_result["scores"],
        detailed_analysis=analysis_result["detailed_analysis"],
        recommendations=analysis_result["recommendations"],
        diagnostic_summary=analysis_result.get("diagnostic_summary"),
        word_count=analysis_result.get("word_count"),
        generated_at=datetime.utcnow()
    )

@analysis_router.post("/batch-analyze")
async def batch_analyze_essays(
    request: BatchAnalysisRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Batch analyze multiple essays for efficient teacher workflow"""
    # Get essays belonging to current user
    essays = db.query(Essay).filter(
        Essay.id.in_(request.essay_ids),
        Essay.teacher_id == current_user.id
    ).all()
    
    if not essays:
        raise HTTPException(status_code=404, detail="No essays found")
    
    # Perform batch analysis
    results = await essay_analysis_service.batch_analyze(essays, request.analysis_type)
    
    # Update essays in database
    for result in results:
        if "error" not in result:
            essay_id = result["essay_id"]
            essay = next((e for e in essays if e.id == essay_id), None)
            if essay:
                analysis = result["analysis"]
                essay.grammar_score = analysis["scores"].get("grammar", 0)
                essay.readability_score = analysis["scores"].get("readability", 0)
                essay.coherence_score = analysis["scores"].get("coherence", 0)
                essay.argument_strength_score = analysis["scores"].get("argument_strength", 0)
                essay.overall_score = analysis["scores"].get("overall", 0)
                essay.status = "analyzed"
    
    db.commit()
    
    return {
        "total_analyzed": len(essays),
        "results": results
    }

@analysis_router.post("/analyze-text", response_model=TextAnalysisResponse)
async def analyze_text(
    request: TextAnalysisRequest
):
    """
    Analyze raw essay text directly without requiring authentication or database entry.
    Useful for landing page and quick analysis.
    """
    start_time = time.time()
    
    try:
        # Perform analysis
        analysis_result = await essay_analysis_service.analyze_text(
            request.text, 
            request.title, 
            request.analysis_type,
            request.rubric_id
        )
        
        processing_time = time.time() - start_time
        
        # Check for errors
        if "error" in analysis_result:
            raise HTTPException(
                status_code=400, 
                detail=analysis_result.get("message", "Analysis failed")
            )
        
        # Log processing time
        word_count = analysis_result.get("word_count", 0)
        rubric_info = f", Rubric: {request.rubric_id}" if request.rubric_id else ""
        logger.info(
            f"Analysis completed - Type: {request.analysis_type}, "
            f"Words: {word_count}, Time: {processing_time:.2f}s "
            f"({processing_time/60:.2f} min){rubric_info}"
        )
        
        return TextAnalysisResponse(
            analysis_type=request.analysis_type,
            scores=analysis_result["scores"],
            detailed_analysis=analysis_result["detailed_analysis"],
            recommendations=analysis_result["recommendations"],
            diagnostic_summary=analysis_result.get("diagnostic_summary"),
            word_count=word_count,
            generated_at=datetime.utcnow(),
            processing_time_seconds=round(processing_time, 2),
            rubric_scores=analysis_result.get("rubric_scores")
        )
    except HTTPException:
        # Re-raise HTTP exceptions (they already have proper status codes)
        raise
    except Exception as e:
        # Log the full exception for debugging
        logger.error(f"Error in analyze_text endpoint: {e}", exc_info=True)
        # Return a proper error response with CORS headers
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during analysis: {str(e)}"
        )

@analysis_router.post("/comparison", response_model=ComparisonAnalysisResponse)
async def analyze_comparison(
    request: ComparisonAnalysisRequest
):
    """
    Analyze similarity between multiple essays using LLM
    Returns insights and highlights showing similar sections
    """
    import os
    import json
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Prepare prompt for LLM
        essay_texts_formatted = "\n\n---\n\n".join([
            f"Essay {i+1} (Student: {request.student_names[i]}):\n{text}"
            for i, text in enumerate(request.essay_texts)
        ])
        
        prompt = f"""Analyze the following {len(request.essay_texts)} essays for similarity and potential plagiarism.

{essay_texts_formatted}

Please provide:
1. A similarity score (0-100) indicating how similar these essays are (where 100 = nearly identical, 0 = completely different)
2. A brief professional explanation (2-3 sentences) explaining the key similarities
3. Specific text segments that are suspiciously similar or identical between essays

Return your response as a JSON object with this exact structure:
{{
    "similarity_score": <number between 0 and 100>,
    "explanation": "<brief explanation>",
    "highlights": [
        {{
            "text": "<the similar text segment from essay 1>",
            "student_index": 0,
            "start": <character position where this text starts in essay 1>,
            "end": <character position where this text ends in essay 1>
        }},
        {{
            "text": "<the matching similar text segment from essay 2>",
            "student_index": 1,
            "start": <character position where this text starts in essay 2>,
            "end": <character position where this text ends in essay 2>
        }}
    ]
}}

CRITICAL INSTRUCTIONS:
- For EACH similar text segment, you MUST include a highlight entry for EACH essay where it appears
- If text appears in both essays, include TWO highlight entries (one with student_index: 0, one with student_index: 1)
- The "text" field should contain the actual text segment from that specific essay (it may have minor differences like spacing)
- The start/end positions are 0-based character indices in the ORIGINAL essay text
- Be thorough - highlight ALL significant similar passages, not just a few
- Focus on identifying identical or nearly-identical passages between essays"""

        # Try Gemini first, then OpenAI, then fallback
        llm_response = None
        llm_provider = None
        
        # Try Gemini
        if os.getenv("GEMINI_API_KEY"):
            try:
                from google import genai
                client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
                
                # Use model from env or try standard ones
                model_name = os.getenv("GEMINI_MODEL_NAME")
                if not model_name:
                    # Try to find a standard model
                    for m in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]:
                        try:
                            client.models.get(model=m)
                            model_name = m
                            break
                        except:
                            continue
                
                if model_name:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    llm_response = response.text
                    llm_provider = "gemini"
                    logger.info(f"Using Gemini ({model_name}) for comparison analysis")
            except Exception as e:
                logger.warning(f"Gemini analysis failed: {e}")
        
        # Try OpenAI if Gemini failed
        if not llm_response and os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                
                response = client.chat.completions.create(
                    model=os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini"),
                    messages=[
                        {"role": "system", "content": "You are an expert essay analysis assistant. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                llm_response = response.choices[0].message.content
                llm_provider = "openai"
                logger.info("Using OpenAI for comparison analysis")
            except Exception as e:
                logger.warning(f"OpenAI analysis failed: {e}")
        
        # Parse LLM response
        if llm_response:
            try:
                # Extract JSON from response (handle markdown code blocks)
                json_text = llm_response.strip()
                if "```json" in json_text:
                    json_text = json_text.split("```json")[1].split("```")[0].strip()
                elif "```" in json_text:
                    json_text = json_text.split("```")[1].split("```")[0].strip()
                
                result = json.loads(json_text)
                
                # Extract and validate data
                similarity_score = float(result.get("similarity_score", 0))
                explanation = result.get("explanation", "Analysis completed.")
                highlights_data = result.get("highlights", [])
                
                # Convert highlights to the expected format
                highlights = []
                for h in highlights_data:
                    highlights.append({
                        "start": int(h.get("start", 0)),
                        "end": int(h.get("end", 0)),
                        "text": str(h.get("text", "")),
                        "student_index": int(h.get("student_index", 0))
                    })
                
                return ComparisonAnalysisResponse(
                    insights=explanation,
                    highlights=highlights,
                    similarity_score=similarity_score / 100.0  # Convert 0-100 to 0-1
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.debug(f"LLM response was: {llm_response[:500]}")
        
        # Fallback: Basic analysis without LLM
        logger.warning("No LLM available for comparison analysis, using fallback")
        return ComparisonAnalysisResponse(
            insights="Similarity analysis requires LLM configuration (GEMINI_API_KEY or OPENAI_API_KEY). Please configure one of these API keys to enable detailed analysis.",
            highlights=[],
            similarity_score=0.5
        )
        
    except Exception as e:
        logger.error(f"Error in comparison analysis: {e}", exc_info=True)
        return ComparisonAnalysisResponse(
            insights=f"Error during analysis: {str(e)}",
            highlights=[],
            similarity_score=0.0
        )

@analysis_router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for current user"""
    from ..models import Class, Student
    
    # Get basic statistics
    total_essays = db.query(Essay).filter(Essay.teacher_id == current_user.id).count()
    total_classes = db.query(Class).filter(Class.teacher_id == current_user.id).count()
    total_students = db.query(Student).join(Class).filter(Class.teacher_id == current_user.id).count()
    
    # Get recent essays
    recent_essays = db.query(Essay).filter(
        Essay.teacher_id == current_user.id
    ).order_by(Essay.submitted_at.desc()).limit(5).all()
    
    # Get class statistics
    classes = db.query(Class).filter(Class.teacher_id == current_user.id).all()
    class_stats = []
    for class_obj in classes:
        essay_count = db.query(Essay).filter(Essay.class_id == class_obj.id).count()
        student_count = db.query(Student).filter(Student.class_id == class_obj.id).count()
        class_stats.append({
            "id": class_obj.id,
            "name": class_obj.name,
            "essay_count": essay_count,
            "student_count": student_count
        })
    
    return {
        "total_essays": total_essays,
        "total_classes": total_classes,
        "total_students": total_students,
        "recent_essays": recent_essays,
        "class_stats": class_stats
    }

@analysis_router.get("/check-plagiarism-status")
async def check_plagiarism_status():
    """
    Check if Copyscape API is configured and test credentials.
    Useful for debugging connection issues.
    """
    if not copyscape_service.is_configured():
        return {
            "configured": False,
            "message": "Copyscape API credentials not configured. Please set COPYSCAPE_USERNAME and COPYSCAPE_API_KEY environment variables."
        }
    
    # Try to validate credentials
    validation_result = await copyscape_service.validate_credentials()
    
    return {
        "configured": True,
        "credentials_valid": validation_result.get("valid", False),
        "message": validation_result.get("message", "Unknown status")
    }

@analysis_router.post("/check-plagiarism", response_model=PlagiarismCheckResponse)
async def check_plagiarism(
    request: PlagiarismCheckRequest
):
    """
    Check essay text for plagiarism using Copyscape API.
    This endpoint does not require authentication to allow use from the landing page.
    """
    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text must be at least 10 characters long"
        )
    
    # Check if Copyscape is configured
    if not copyscape_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Plagiarism checking service is not configured. Please set COPYSCAPE_USERNAME and COPYSCAPE_API_KEY environment variables."
        )
    
    # Perform plagiarism check
    result = await copyscape_service.check_plagiarism(request.text)
    
    # Check for errors
    if "error" in result:
        error_message = result.get("message", "Plagiarism check failed")
        # Provide more helpful error message for timeouts
        if "timeout" in error_message.lower():
            error_message += (
                "\n\nTroubleshooting:\n"
                "1. Verify COPYSCAPE_USERNAME and COPYSCAPE_API_KEY are correct\n"
                "2. Check your Copyscape account has active credits\n"
                "3. Test connection: GET /api/analysis/check-plagiarism-status\n"
                "4. Check network/firewall settings"
            )
        raise HTTPException(
            status_code=400,
            detail=error_message
        )
    
    # Convert matches to PlagiarismMatch objects
    matches = []
    for match_data in result.get("matches", []):
        matches.append(PlagiarismMatch(
            url=match_data.get("url", ""),
            title=match_data.get("title"),
            minwords=match_data.get("minwords"),
            maxwords=match_data.get("maxwords"),
            words=match_data.get("words"),
            percent=match_data.get("percent", 0.0)
        ))
    
    return PlagiarismCheckResponse(
        is_plagiarized=result.get("is_plagiarized", False),
        plagiarism_percentage=result.get("plagiarism_percentage", 0.0),
        match_count=result.get("match_count", 0),
        matches=matches,
        text_length=result.get("text_length", len(request.text)),
        checked=True,
        error=result.get("error"),
        message=result.get("message")
    )

