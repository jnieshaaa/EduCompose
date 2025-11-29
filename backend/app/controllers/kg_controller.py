"""
Knowledge Graph Controller
Handles knowledge graph visualization endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional

from ..models import User, Essay
from ..database import get_db
from ..services import auth_service
from ..nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder

kg_router = APIRouter()


@kg_router.get("/essay/{essay_id}/knowledge-graph")
async def get_essay_knowledge_graph(
    essay_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get knowledge graph data (nodes and edges) for an essay
    Returns data formatted for graph visualization libraries
    """
    # Get essay
    essay = db.query(Essay).filter(
        Essay.id == essay_id,
        Essay.teacher_id == current_user.id
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Build graph from essay text using NetworkX (in-memory)
    builder = EnhancedKnowledgeGraphBuilder()
    kg_result = builder.build(text=essay.content, essay_id=str(essay_id))
    
    # Format for frontend
    nodes = []
    edges = []
    
    graph = kg_result.get('graph', None)
    if graph:
        # Convert NetworkX graph to frontend format
        for node_id, node_data in graph.nodes(data=True):
            nodes.append({
                "id": str(node_id),
                "label": node_data.get("label", str(node_id)),
                "type": node_data.get("type", "KGNode"),
                "properties": {k: v for k, v in node_data.items() if k not in ["type"] and not isinstance(v, dict) and not isinstance(v, list)}
            })
        
        for source, target, edge_data in graph.edges(data=True):
            edges.append({
                "source": str(source),
                "target": str(target),
                "type": edge_data.get("type", "RELATED_TO"),
                "properties": {k: v for k, v in edge_data.items() if k != "type" and not isinstance(v, dict) and not isinstance(v, list)}
            })
    
    return {
        "essay_id": essay_id,
        "nodes": nodes,
        "edges": edges,
        "source": "in_memory",  # Built from text using NetworkX
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges)
        }
    }


@kg_router.post("/essay/{essay_id}/build")
async def build_knowledge_graph(
    essay_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Build knowledge graph from essay using NetworkX
    Returns the graph data for visualization
    """
    # Get essay
    essay = db.query(Essay).filter(
        Essay.id == essay_id,
        Essay.teacher_id == current_user.id
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Build knowledge graph using NetworkX (in-memory)
    builder = EnhancedKnowledgeGraphBuilder()
    kg_result = builder.build(text=essay.content, essay_id=str(essay_id))
    
    # Format for frontend
    nodes = []
    edges = []
    
    graph = kg_result.get('graph', None)
    if graph:
        for node_id, node_data in graph.nodes(data=True):
            nodes.append({
                "id": str(node_id),
                "label": node_data.get("label", str(node_id)),
                "type": node_data.get("type", "KGNode"),
                "properties": {k: v for k, v in node_data.items() 
                              if k not in ["type"] 
                              and not isinstance(v, dict) 
                              and not isinstance(v, list)
                              and v is not None}
            })
        
        for source, target, edge_data in graph.edges(data=True):
            edges.append({
                "source": str(source),
                "target": str(target),
                "type": edge_data.get("type", "RELATED_TO"),
                "properties": {k: v for k, v in edge_data.items() 
                              if k != "type" 
                              and not isinstance(v, dict) 
                              and not isinstance(v, list)
                              and v is not None}
            })
    
    return {
        "essay_id": essay_id,
        "nodes": nodes,
        "edges": edges,
        "source": "in_memory",  # Built using NetworkX
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges)
        }
    }

