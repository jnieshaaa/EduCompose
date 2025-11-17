"""
NLP Analysis Modules for EduCompose
Provides comprehensive essay analysis across multiple dimensions
"""

from .grammar_analyzer import GrammarAnalyzer
from .readability_analyzer import ReadabilityAnalyzer
from .coherence_analyzer import CoherenceAnalyzer
from .argument_miner import ArgumentMiner
from .knowledge_graph_builder import KnowledgeGraphBuilder

__all__ = [
    "GrammarAnalyzer",
    "ReadabilityAnalyzer",
    "CoherenceAnalyzer",
    "ArgumentMiner",
    "KnowledgeGraphBuilder"
]

