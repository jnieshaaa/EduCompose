"""
Analysis Controller
Handles essay analysis endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..models import User, Essay
from ..schemas import AnalysisRequest, AnalysisResponse, BatchAnalysisRequest
from ..services import auth_service, essay_analysis_service

analysis_router = APIRouter()

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
    essay.grammar_score = analysis_result["scores"].get("grammar", 0)
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

