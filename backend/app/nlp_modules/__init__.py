"""
NLP Analysis Modules for EduCompose
Provides comprehensive essay analysis across multiple dimensions
"""

from .grammar_analyzer import GrammarAnalyzer
from .readability_analyzer import ReadabilityAnalyzer
from .coherence_analyzer import CoherenceAnalyzer
from .argument_miner import ArgumentMiner
from .knowledge_graph_builder import KnowledgeGraphBuilder

# Enhanced KG modules
from .kg_schema import (
    NodeType,
    EdgeType,
    KGSchema,
    ConceptNode,
    ClaimNode,
    EvidenceNode,
    EssayNode,
    TeacherNoteNode,
    KGEdge
)
from .openie_extractor import OpenIEExtractor
from .kg_metrics import KGMetricsCalculator
from .enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
from .preprocessing import PreprocessingPipeline

# Transformer-based claim classifier
from .claim_classifier import (
    TransformerClaimClassifier,
    ArgumentComponent,
    get_claim_classifier
)

# Neo4j integration (optional)
try:
    from .neo4j_exporter import Neo4jExporter, export_to_neo4j
except ImportError:
    # Neo4j not available, define dummy exports
    Neo4jExporter = None
    export_to_neo4j = None

__all__ = [
    "GrammarAnalyzer",
    "ReadabilityAnalyzer",
    "CoherenceAnalyzer",
    "ArgumentMiner",
    "KnowledgeGraphBuilder",
    # Enhanced KG modules
    "NodeType",
    "EdgeType",
    "KGSchema",
    "ConceptNode",
    "ClaimNode",
    "EvidenceNode",
    "EssayNode",
    "TeacherNoteNode",
    "KGEdge",
    "OpenIEExtractor",
    "KGMetricsCalculator",
    "EnhancedKnowledgeGraphBuilder",
    "PreprocessingPipeline",
    # Transformer-based claim classifier
    "TransformerClaimClassifier",
    "ArgumentComponent",
    "get_claim_classifier",
    # Neo4j integration (optional)
    "Neo4jExporter",
    "export_to_neo4j"
]

