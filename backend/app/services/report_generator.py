"""
Teacher Report Generator
Generates comprehensive, teacher-friendly reports from analysis results
"""
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class TeacherReportGenerator:
    """
    Generates structured reports for teachers with:
    - Grammar errors with sentence links
    - Style metrics
    - KG-based argumentation analysis
    - Visual graph snapshots
    - Actionable recommendations
    """
    
    def __init__(self):
        """Initialize report generator"""
        pass
    
    def generate_report(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive teacher report
        
        Args:
            analysis_results: Complete analysis results from EssayAnalysisService
            
        Returns:
            Structured report dictionary
        """
        report = {
            "summary": self._generate_summary(analysis_results),
            "grammar_section": self._generate_grammar_section(analysis_results),
            "style_section": self._generate_style_section(analysis_results),
            "argumentation_section": self._generate_argumentation_section(analysis_results),
            "knowledge_graph_section": self._generate_kg_section(analysis_results),
            "recommendations": analysis_results.get("recommendations", []),
            "visualizations": self._generate_visualization_data(analysis_results)
        }
        
        return report
    
    def _generate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate executive summary"""
        scores = results.get("scores", {})
        diagnostic = results.get("diagnostic_summary", {})
        
        return {
            "overall_score": scores.get("overall", 0.0),
            "dimension_scores": {
                "Grammar": scores.get("grammar", 0.0),
                "Readability": scores.get("readability", 0.0),
                "Coherence": scores.get("coherence", 0.0),
                "Argument Strength": scores.get("argument_strength", 0.0),
                "Knowledge Graph": scores.get("knowledge_graph", 0.0)
            },
            "strengths": diagnostic.get("strengths", []),
            "weaknesses": diagnostic.get("weaknesses", []),
            "critical_issues": diagnostic.get("critical_issues", []),
            "word_count": results.get("word_count", 0)
        }
    
    def _generate_grammar_section(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate grammar section with top errors"""
        grammar = results.get("detailed_analysis", {}).get("grammar", {})
        errors = grammar.get("errors", [])
        
        # Get top 5 errors
        top_errors = sorted(
            errors,
            key=lambda e: e.get("offset", 0)
        )[:5]
        
        # Format errors with sentence context
        formatted_errors = []
        for error in top_errors:
            formatted_errors.append({
                "type": error.get("type", "grammar"),
                "message": error.get("message", ""),
                "suggestion": error.get("replacements", [""])[0] if error.get("replacements") else "",
                "context": error.get("context", "")[:100]
            })
        
        return {
            "score": grammar.get("score", 0.0),
            "error_count": grammar.get("error_count", 0),
            "top_errors": formatted_errors,
            "syntax_complexity": grammar.get("syntax_patterns", {}).get("complexity_score", 0.0)
        }
    
    def _generate_style_section(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate style/readability section"""
        readability = results.get("detailed_analysis", {}).get("readability", {})
        
        return {
            "score": readability.get("score", 0.0),
            "flesch_reading_ease": readability.get("flesch_reading_ease", 0.0),
            "flesch_kincaid_grade": readability.get("flesch_kincaid_grade", 0.0),
            "avg_sentence_length": readability.get("avg_sentence_length", 0.0),
            "lexical_diversity": readability.get("lexical_diversity", 0.0),
            "issues": readability.get("issues", [])
        }
    
    def _generate_argumentation_section(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate KG-based argumentation section"""
        argumentation = results.get("detailed_analysis", {}).get("argumentation", {})
        kg = results.get("detailed_analysis", {}).get("knowledge_graph", {})
        metrics = argumentation.get("metrics", {})
        
        # Extract claim summary
        claims = argumentation.get("claims", [])
        top_claim = claims[0] if claims else None
        
        # Argument strength per claim
        argument_strength = metrics.get("argument_strength", [])
        
        # Coherence explanation
        coherence_score = metrics.get("coherence", 0.0)
        coherence_explanation = self._generate_coherence_explanation(
            coherence_score, argument_strength, argumentation
        )
        
        return {
            "overall_score": argumentation.get("score", 0.0),
            "top_claim": {
                "text": top_claim.get("sentence", "") if top_claim else "",
                "confidence": top_claim.get("confidence", "") if top_claim else ""
            } if top_claim else None,
            "claim_count": len(claims),
            "evidence_count": len(argumentation.get("grounds", [])),
            "argument_strength_by_claim": argument_strength[:5],  # Top 5
            "coherence_score": coherence_score,
            "coherence_explanation": coherence_explanation,
            "structure_issues": argumentation.get("argument_issues", [])
        }
    
    def _generate_coherence_explanation(self, score: float,
                                       argument_strength: List[Dict],
                                       argumentation: Dict) -> str:
        """Generate human-readable coherence explanation"""
        if score >= 80:
            return f"Excellent coherence (score: {score:.1f}). Main claims are well-supported with clear evidence connections."
        elif score >= 60:
            support_count = sum(c.get("evidence", 0) for c in argument_strength)
            return f"Moderate coherence (score: {score:.1f}). Main claim has {support_count} supporting evidence nodes. Consider strengthening connections between ideas."
        else:
            return f"Coherence needs improvement (score: {score:.1f}). Claims may lack sufficient supporting evidence or clear connections. Review argument structure."
    
    def _generate_kg_section(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate knowledge graph section"""
        kg = results.get("detailed_analysis", {}).get("knowledge_graph", {})
        metrics = kg.get("metrics", {}) if isinstance(kg.get("metrics"), dict) else {}
        
        return {
            "score": kg.get("score", 0.0),
            "concept_count": len(kg.get("concepts", [])),
            "relationship_count": len(kg.get("relationships", [])),
            "coherence_metrics": metrics.get("concept_coherence", {}),
            "central_concepts": metrics.get("centrality_metrics", {}).get("central_concepts", [])[:5],
            "conceptual_gaps": kg.get("conceptual_gaps", [])
        }
    
    def _generate_visualization_data(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate data for graph visualization"""
        argumentation = results.get("detailed_analysis", {}).get("argumentation", {})
        kg_graph = argumentation.get("graph", {})
        
        # Extract nodes and edges for visualization
        nodes = kg_graph.get("nodes", [])
        edges = kg_graph.get("edges", [])
        
        # Limit for visualization (top nodes)
        if len(nodes) > 20:
            # Prioritize: thesis, claims, then evidence
            thesis_nodes = [n for n in nodes if n.get("type") == "thesis"]
            claim_nodes = [n for n in nodes if n.get("type") == "claim"][:5]
            evidence_nodes = [n for n in nodes if n.get("type") == "evidence"][:10]
            
            top_nodes = thesis_nodes + claim_nodes + evidence_nodes
            top_node_ids = {n["id"] for n in top_nodes}
            
            # Filter edges to only include top nodes
            top_edges = [
                e for e in edges
                if e.get("source") in top_node_ids and e.get("target") in top_node_ids
            ]
            
            nodes = top_nodes
            edges = top_edges
        
        return {
            "nodes": nodes,
            "edges": edges,
            "legend": kg_graph.get("legend", [])
        }
    
    def generate_plain_text_report(self, report: Dict[str, Any]) -> str:
        """Generate plain text version of report for easy reading"""
        lines = []
        
        # Summary
        summary = report.get("summary", {})
        lines.append("=" * 60)
        lines.append("ESSAY ANALYSIS REPORT")
        lines.append("=" * 60)
        lines.append(f"\nOverall Score: {summary.get('overall_score', 0.0):.1f}/100")
        lines.append(f"Word Count: {summary.get('word_count', 0)}")
        
        # Dimension scores
        lines.append("\nDimension Scores:")
        for dim, score in summary.get("dimension_scores", {}).items():
            lines.append(f"  {dim}: {score:.1f}/100")
        
        # Critical issues
        if summary.get("critical_issues"):
            lines.append("\nCritical Issues:")
            for issue in summary.get("critical_issues", []):
                lines.append(f"  - {issue}")
        
        # Grammar
        grammar = report.get("grammar_section", {})
        lines.append(f"\nGrammar Score: {grammar.get('score', 0.0):.1f}/100")
        lines.append(f"Total Errors: {grammar.get('error_count', 0)}")
        
        if grammar.get("top_errors"):
            lines.append("\nTop Grammar Errors:")
            for i, error in enumerate(grammar.get("top_errors", [])[:5], 1):
                lines.append(f"  {i}. {error.get('message', '')}")
                if error.get("suggestion"):
                    lines.append(f"     Suggestion: {error.get('suggestion')}")
        
        # Argumentation
        arg = report.get("argumentation_section", {})
        lines.append(f"\nArgumentation Score: {arg.get('overall_score', 0.0):.1f}/100")
        lines.append(f"Claims Found: {arg.get('claim_count', 0)}")
        lines.append(f"Evidence Found: {arg.get('evidence_count', 0)}")
        
        if arg.get("coherence_explanation"):
            lines.append(f"\nCoherence: {arg.get('coherence_explanation')}")
        
        # Recommendations
        recommendations = report.get("recommendations", [])
        if recommendations:
            lines.append("\nRecommendations:")
            for i, rec in enumerate(recommendations[:5], 1):
                lines.append(f"\n  {i}. [{rec.get('priority', 'medium').upper()}] {rec.get('dimension', 'general')}")
                lines.append(f"     {rec.get('message', '')}")
                lines.append(f"     Suggestion: {rec.get('suggestion', '')}")
        
        return "\n".join(lines)

