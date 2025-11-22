"""
Domain Configuration System
Supports domain-specific essay analysis and knowledge graph enrichment.

Enables:
- Domain-specific concept extraction
- Domain ontologies
- Domain-specific patterns and rules
- Customized analysis for different subject areas
"""
import logging
from typing import Dict, List, Any, Optional, Set
from enum import Enum
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class EssayDomain(str, Enum):
    """Essay domains/subject areas"""
    GENERAL = "general"  # General purpose
    SCIENCE = "science"  # Science topics
    HISTORY = "history"  # Historical topics
    LITERATURE = "literature"  # Literary analysis
    SOCIAL_STUDIES = "social_studies"  # Social studies
    TECHNOLOGY = "technology"  # Technology topics
    ENVIRONMENT = "environment"  # Environmental topics
    ARGUMENTATIVE = "argumentative"  # General argumentation


class DomainConfig:
    """
    Configuration for domain-specific analysis.
    
    Supports:
    - Domain-specific concept keywords
    - Domain ontologies
    - Custom extraction patterns
    - Domain-specific relationships
    """
    
    def __init__(self, domain: EssayDomain = EssayDomain.GENERAL):
        """
        Initialize domain configuration.
        
        Args:
            domain: Essay domain
        """
        self.domain = domain
        self.config = self._load_default_config()
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration for the domain"""
        base_config = {
            "domain": self.domain.value,
            "concept_keywords": [],
            "ontology_path": None,
            "extraction_patterns": [],
            "relationship_patterns": [],
            "enrichment_enabled": True,
            "domain_specific_enrichers": []
        }
        
        # Load domain-specific configurations
        if self.domain == EssayDomain.SCIENCE:
            base_config.update(self._get_science_config())
        elif self.domain == EssayDomain.HISTORY:
            base_config.update(self._get_history_config())
        elif self.domain == EssayDomain.LITERATURE:
            base_config.update(self._get_literature_config())
        
        return base_config
    
    def _get_science_config(self) -> Dict[str, Any]:
        """Get science domain configuration"""
        return {
            "concept_keywords": [
                "hypothesis", "experiment", "theory", "data", "evidence",
                "observation", "conclusion", "methodology", "results",
                "variable", "control", "analysis", "phenomenon"
            ],
            "extraction_patterns": [
                {"pattern": r"\b(scientific|empirical|experimental)\s+(evidence|data|method)",
                 "type": "evidence"},
                {"pattern": r"\b(hypothesis|theory|claim)\s+(that|states?)",
                 "type": "claim"},
            ],
            "relationship_patterns": [
                {"pattern": "supports", "relation": "SUPPORTS"},
                {"pattern": "contradicts", "relation": "CONTRADICTS"},
                {"pattern": "demonstrates", "relation": "DEMONSTRATES"},
            ]
        }
    
    def _get_history_config(self) -> Dict[str, Any]:
        """Get history domain configuration"""
        return {
            "concept_keywords": [
                "event", "period", "cause", "effect", "consequence",
                "historical", "timeline", "context", "source", "document",
                "evidence", "interpretation", "perspective"
            ],
            "extraction_patterns": [
                {"pattern": r"\b(historical|primary|secondary)\s+(source|document|evidence)",
                 "type": "evidence"},
                {"pattern": r"\b(caused|led to|resulted in)",
                 "type": "causal_relationship"},
            ],
            "relationship_patterns": [
                {"pattern": "led to", "relation": "CAUSES"},
                {"pattern": "resulted from", "relation": "CAUSED_BY"},
                {"pattern": "occurred during", "relation": "TEMPORAL"},
            ]
        }
    
    def _get_literature_config(self) -> Dict[str, Any]:
        """Get literature domain configuration"""
        return {
            "concept_keywords": [
                "theme", "character", "plot", "symbolism", "metaphor",
                "narrator", "setting", "conflict", "resolution", "tone",
                "literary device", "foreshadowing", "irony"
            ],
            "extraction_patterns": [
                {"pattern": r"\b(represents|symbolizes|signifies)",
                 "type": "symbolism"},
                {"pattern": r"\b(character|protagonist|antagonist)",
                 "type": "character"},
            ],
            "relationship_patterns": [
                {"pattern": "represents", "relation": "REPRESENTS"},
                {"pattern": "symbolizes", "relation": "SYMBOLIZES"},
                {"pattern": "develops", "relation": "DEVELOPS"},
            ]
        }
    
    def get_concept_keywords(self) -> List[str]:
        """Get domain-specific concept keywords"""
        return self.config.get("concept_keywords", [])
    
    def get_extraction_patterns(self) -> List[Dict[str, Any]]:
        """Get domain-specific extraction patterns"""
        return self.config.get("extraction_patterns", [])
    
    def get_relationship_patterns(self) -> List[Dict[str, Any]]:
        """Get domain-specific relationship patterns"""
        return self.config.get("relationship_patterns", [])
    
    def load_ontology(self, ontology_path: str) -> Dict[str, Any]:
        """
        Load domain ontology from file.
        
        Args:
            ontology_path: Path to ontology JSON file
            
        Returns:
            Ontology dictionary
        """
        try:
            with open(ontology_path, 'r', encoding='utf-8') as f:
                ontology = json.load(f)
            
            self.config["ontology_path"] = ontology_path
            self.config["ontology"] = ontology
            
            logger.info(f"Loaded ontology from {ontology_path}")
            return ontology
        except Exception as e:
            logger.error(f"Error loading ontology from {ontology_path}: {e}")
            return {}
    
    def get_ontology_concepts(self) -> List[str]:
        """Get concepts from loaded ontology"""
        ontology = self.config.get("ontology", {})
        return ontology.get("concepts", [])
    
    def get_ontology_relationships(self) -> List[Dict[str, Any]]:
        """Get relationships from loaded ontology"""
        ontology = self.config.get("ontology", {})
        return ontology.get("relationships", [])
    
    def is_domain_concept(self, concept: str) -> bool:
        """
        Check if a concept is domain-specific.
        
        Args:
            concept: Concept to check
            
        Returns:
            True if concept is domain-specific
        """
        concept_lower = concept.lower()
        keywords = self.get_concept_keywords()
        ontology_concepts = self.get_ontology_concepts()
        
        # Check keywords
        for keyword in keywords:
            if keyword.lower() in concept_lower or concept_lower in keyword.lower():
                return True
        
        # Check ontology
        for ont_concept in ontology_concepts:
            if ont_concept.lower() == concept_lower:
                return True
        
        return False
    
    def save_config(self, filepath: str):
        """
        Save domain configuration to file.
        
        Args:
            filepath: Path to save configuration JSON
        """
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved domain configuration to {filepath}")
    
    @staticmethod
    def load_config(filepath: str) -> 'DomainConfig':
        """
        Load domain configuration from file.
        
        Args:
            filepath: Path to configuration JSON file
            
        Returns:
            DomainConfig instance
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        domain = EssayDomain(config_data.get("domain", "general"))
        domain_config = DomainConfig(domain)
        domain_config.config = config_data
        
        logger.info(f"Loaded domain configuration from {filepath}")
        return domain_config


def get_domain_config(domain: EssayDomain = EssayDomain.GENERAL) -> DomainConfig:
    """
    Factory function to get domain configuration.
    
    Args:
        domain: Essay domain
        
    Returns:
        DomainConfig instance
    """
    return DomainConfig(domain)

