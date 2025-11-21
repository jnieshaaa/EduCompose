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
from ..nlp_modules.neo4j_exporter import Neo4jExporter
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
    
    exporter = Neo4jExporter()
    
    if not exporter.is_available():
        # If Neo4j not available, build graph from essay text
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
            "source": "in_memory",  # Built from text, not stored in Neo4j
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
        }
    
    # Get from Neo4j
    try:
        # Query nodes and edges for this essay
        nodes_query = """
        MATCH (n:KGNode {essay_id: $essay_id})
        RETURN n
        """
        
        edges_query = """
        MATCH (n:KGNode {essay_id: $essay_id})-[r]->(m:KGNode {essay_id: $essay_id})
        RETURN n, r, m
        """
        
        nodes_result = exporter.query(nodes_query, {"essay_id": str(essay_id)})
        edges_result = exporter.query(edges_query, {"essay_id": str(essay_id)})
        
        # Format nodes for frontend (react-force-graph format)
        nodes = []
        node_id_map = {}  # Map Neo4j internal IDs to our IDs
        
        for record in nodes_result:
            node = record.get("n", {})
            if isinstance(node, dict):
                # Extract node properties
                node_id = node.get("id") or str(node.get("__id__", ""))
                node_id_map[id(node)] = node_id
                
                nodes.append({
                    "id": node_id,
                    "label": node.get("label") or node.get("text") or node_id,
                    "type": node.get("type") or "KGNode",
                    "properties": {
                        k: v for k, v in node.items() 
                        if k not in ["id", "type", "label"] 
                        and not isinstance(v, dict) 
                        and not isinstance(v, list)
                        and v is not None
                    }
                })
        
        # Format edges for frontend
        edges = []
        
        for record in edges_result:
            source_node = record.get("n", {})
            target_node = record.get("m", {})
            relationship = record.get("r", {})
            
            if isinstance(source_node, dict) and isinstance(target_node, dict):
                source_id = source_node.get("id") or str(source_node.get("__id__", ""))
                target_id = target_node.get("id") or str(target_node.get("__id__", ""))
                rel_type = relationship.get("type") if isinstance(relationship, dict) else str(relationship) if relationship else "RELATED_TO"
                
                edges.append({
                    "source": source_id,
                    "target": target_id,
                    "type": rel_type,
                    "properties": {
                        k: v for k, v in (relationship if isinstance(relationship, dict) else {}).items()
                        if k != "type" and not isinstance(v, dict) and not isinstance(v, list)
                    }
                })
        
        return {
            "essay_id": essay_id,
            "nodes": nodes,
            "edges": edges,
            "source": "neo4j",
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
        }
        
    except Exception as e:
        # Fallback to building from text if Neo4j query fails
        builder = EnhancedKnowledgeGraphBuilder()
        kg_result = builder.build(text=essay.content, essay_id=str(essay_id))
        
        nodes = []
        edges = []
        
        graph = kg_result.get('graph', None)
        if graph:
            for node_id, node_data in graph.nodes(data=True):
                nodes.append({
                    "id": str(node_id),
                    "label": node_data.get("label", str(node_id)),
                    "type": node_data.get("type", "KGNode"),
                    "properties": {k: v for k, v in node_data.items() if k not in ["type"] and not isinstance(v, dict)}
                })
            
            for source, target, edge_data in graph.edges(data=True):
                edges.append({
                    "source": str(source),
                    "target": str(target),
                    "type": edge_data.get("type", "RELATED_TO"),
                    "properties": {k: v for k, v in edge_data.items() if k != "type" and not isinstance(v, dict)}
                })
        
        return {
            "essay_id": essay_id,
            "nodes": nodes,
            "edges": edges,
            "source": "in_memory_fallback",
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
        }


@kg_router.post("/essay/{essay_id}/build-and-export")
async def build_and_export_knowledge_graph(
    essay_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Build knowledge graph from essay and export to Neo4j
    Returns the graph data after export
    """
    # Get essay
    essay = db.query(Essay).filter(
        Essay.id == essay_id,
        Essay.teacher_id == current_user.id
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Build knowledge graph
    builder = EnhancedKnowledgeGraphBuilder()
    kg_result = builder.build(text=essay.content, essay_id=str(essay_id))
    
    # Export to Neo4j
    export_stats = builder.export_to_neo4j(kg_result)
    
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
        "export_stats": export_stats,
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes_exported": export_stats.get("nodes_created", 0),
            "edges_exported": export_stats.get("edges_created", 0)
        }
    }

