"""
Knowledge Graph Schema Definition
Defines node types, edge types, and relationship structures for the essay KG
"""
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional as Opt


class NodeType(str, Enum):
    """Node types in the knowledge graph"""
    CONCEPT = "Concept"
    CLAIM = "Claim"
    EVIDENCE = "Evidence"
    ESSAY = "Essay"
    TEACHER_NOTE = "TeacherNote"
    WARRANT = "Warrant"
    REBUTTAL = "Rebuttal"
    THESIS = "Thesis"


class EdgeType(str, Enum):
    """Edge/relation types in the knowledge graph"""
    SUPPORTS = "SUPPORTS"  # Evidence → Claim
    CONTRADICTS = "CONTRADICTS"  # Claim → Claim
    RELATED_TO = "RELATED_TO"  # Concept ↔ Concept
    MENTIONS = "MENTIONS"  # Essay → Concept
    CLAIM_OF = "CLAIM_OF"  # Claim → Essay
    HAS_NOTE = "HAS_NOTE"  # Essay/Claim → TeacherNote
    EXPANDS = "EXPANDS"  # Concept → Concept
    ELABORATES = "ELABORATES"  # Evidence → Claim
    REBUTS = "REBUTS"  # Rebuttal → Claim
    WARRANTS = "WARRANTS"  # Warrant → Claim


@dataclass
class ConceptNode:
    """Concept node in the knowledge graph"""
    node_id: str
    label: str
    lemma: str
    canonical_form: str
    frequency: int = 1
    importance: float = 0.0
    type: str = NodeType.CONCEPT.value
    sentence_indices: List[int] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ClaimNode:
    """Claim node in the knowledge graph"""
    node_id: str
    text: str
    claim_id: str
    stance: str = "support"  # "support", "oppose", "neutral"
    sentence_index: int = 0
    confidence: float = 0.0
    type: str = NodeType.CLAIM.value
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceNode:
    """Evidence node in the knowledge graph"""
    node_id: str
    text: str
    source_sentence: int
    confidence: float = 0.0
    evidence_type: str = "general"  # "statistic", "example", "quote", "research", "general"
    type: str = NodeType.EVIDENCE.value
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EssayNode:
    """Essay node in the knowledge graph"""
    node_id: str
    essay_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    type: str = NodeType.ESSAY.value


@dataclass
class TeacherNoteNode:
    """Teacher annotation node"""
    node_id: str
    annotation_id: str
    teacher_id: str
    comment: str
    type: str = NodeType.TEACHER_NOTE.value
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KGEdge:
    """Edge/relationship in the knowledge graph"""
    edge_id: str
    source_id: str
    target_id: str
    relation_type: str  # EdgeType enum value
    weight: float = 1.0
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class KGSchema:
    """Knowledge Graph Schema Manager"""
    
    # Node type definitions
    NODE_TYPES = {
        NodeType.CONCEPT: {
            "required_fields": ["node_id", "label", "lemma", "canonical_form"],
            "optional_fields": ["frequency", "importance", "sentence_indices", "metadata"]
        },
        NodeType.CLAIM: {
            "required_fields": ["node_id", "text", "claim_id"],
            "optional_fields": ["stance", "sentence_index", "confidence", "metadata"]
        },
        NodeType.EVIDENCE: {
            "required_fields": ["node_id", "text", "source_sentence"],
            "optional_fields": ["confidence", "evidence_type", "metadata"]
        },
        NodeType.ESSAY: {
            "required_fields": ["node_id", "essay_id"],
            "optional_fields": ["metadata"]
        },
        NodeType.TEACHER_NOTE: {
            "required_fields": ["node_id", "annotation_id", "teacher_id", "comment"],
            "optional_fields": ["metadata"]
        }
    }
    
    # Edge type definitions with allowed source/target combinations
    EDGE_RULES = {
        EdgeType.SUPPORTS: {
            "allowed_sources": [NodeType.EVIDENCE, NodeType.CONCEPT],
            "allowed_targets": [NodeType.CLAIM, NodeType.THESIS],
            "description": "Evidence or concept supports a claim"
        },
        EdgeType.CONTRADICTS: {
            "allowed_sources": [NodeType.CLAIM, NodeType.REBUTTAL],
            "allowed_targets": [NodeType.CLAIM],
            "description": "One claim contradicts another"
        },
        EdgeType.RELATED_TO: {
            "allowed_sources": [NodeType.CONCEPT],
            "allowed_targets": [NodeType.CONCEPT],
            "description": "Concepts are semantically related"
        },
        EdgeType.MENTIONS: {
            "allowed_sources": [NodeType.ESSAY],
            "allowed_targets": [NodeType.CONCEPT],
            "description": "Essay mentions a concept"
        },
        EdgeType.CLAIM_OF: {
            "allowed_sources": [NodeType.CLAIM],
            "allowed_targets": [NodeType.ESSAY],
            "description": "Claim belongs to essay"
        },
        EdgeType.EXPANDS: {
            "allowed_sources": [NodeType.CONCEPT],
            "allowed_targets": [NodeType.CONCEPT],
            "description": "One concept expands or elaborates on another"
        },
        EdgeType.ELABORATES: {
            "allowed_sources": [NodeType.EVIDENCE, NodeType.WARRANT],
            "allowed_targets": [NodeType.CLAIM],
            "description": "Evidence or warrant elaborates on a claim"
        },
        EdgeType.REBUTS: {
            "allowed_sources": [NodeType.REBUTTAL],
            "allowed_targets": [NodeType.CLAIM, NodeType.THESIS],
            "description": "Rebuttal counters a claim or thesis"
        }
    }
    
    @staticmethod
    def validate_edge(source_type: str, target_type: str, relation_type: str) -> bool:
        """Validate if an edge type is allowed between source and target node types"""
        if relation_type not in KGSchema.EDGE_RULES:
            return False
        
        rule = KGSchema.EDGE_RULES[relation_type]
        source_enum = NodeType(source_type) if source_type in [e.value for e in NodeType] else None
        target_enum = NodeType(target_type) if target_type in [e.value for e in NodeType] else None
        
        if not source_enum or not target_enum:
            return False
        
        return (source_enum in rule["allowed_sources"] and 
                target_enum in rule["allowed_targets"])
    
    @staticmethod
    def get_node_schema(node_type: NodeType) -> Dict[str, Any]:
        """Get schema definition for a node type"""
        return KGSchema.NODE_TYPES.get(node_type, {})
    
    @staticmethod
    def get_edge_description(edge_type: EdgeType) -> str:
        """Get description for an edge type"""
        return KGSchema.EDGE_RULES.get(edge_type, {}).get("description", "")

