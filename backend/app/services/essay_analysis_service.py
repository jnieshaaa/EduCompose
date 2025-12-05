"""
Essay Analysis Service
Comprehensive multi-dimensional essay analysis service
"""
import nltk
import logging
import time
import re
from typing import Dict, List, Any, Tuple, Optional

from ..models import Essay
from ..nlp_modules import (
    GrammarAnalyzer,
    ReadabilityAnalyzer,
    CoherenceAnalyzer,
    ArgumentMiner,
    KnowledgeGraphBuilder
)

logger = logging.getLogger(__name__)

class EssayAnalysisService:
    """
    Comprehensive essay analysis service integrating all NLP modules
    Implements teacher-centered diagnostic approach as per Chapter 1 requirements
    """
    def __init__(self):
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger')
        except LookupError:
            nltk.download('averaged_perceptron_tagger')
        
        # Initialize NLP analyzers
        self.grammar_analyzer = GrammarAnalyzer()
        self.readability_analyzer = ReadabilityAnalyzer()
        self.coherence_analyzer = CoherenceAnalyzer()
        self.argument_miner = ArgumentMiner()
        self.knowledge_graph_builder = KnowledgeGraphBuilder()
    
    async def analyze_text(self, text: str, title: str = "Untitled Essay", analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """
        Analyze raw text directly without requiring an essay in the database
        
        Args:
            text: Essay content as string
            title: Optional essay title
            analysis_type: Type of analysis (grammar, readability, coherence, argument, comprehensive)
        
        Returns:
            Dictionary containing scores, detailed analysis, and recommendations
        """
        content = text
        return await self._perform_analysis(content, analysis_type)
    
    async def analyze_essay(self, essay: Essay, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """
        Comprehensive essay analysis across all dimensions
        
        Args:
            essay: Essay model object
            analysis_type: Type of analysis (grammar, readability, coherence, argument, comprehensive)
        
        Returns:
            Dictionary containing scores, detailed analysis, and recommendations
        """
        content = essay.content
        return await self._perform_analysis(content, analysis_type)
    
    async def _perform_analysis(self, content: str, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """
        Internal method to perform the actual analysis on content
        """
        analysis_start = time.time()
        
        # Validate essay length (150-1000 words as per scope)
        word_count = len(content.split())
        if word_count < 150:
            return {
                "error": "Essay too short",
                "message": "Essays must be at least 150 words for meaningful analysis",
                "word_count": word_count
            }

        quality_metrics = self._compute_content_quality_metrics(content)
        quality_issue = self._validate_content_quality(quality_metrics)
        if quality_issue:
            return {
                "error": "low_quality_content",
                "message": quality_issue,
                "word_count": word_count,
                "quality_metrics": quality_metrics
            }
        
        if word_count > 1000:
            # Warn but still analyze
            logger.warning(f"Essay exceeds 1000 words ({word_count}). Processing may be slower.")
        
        # Perform analysis based on type
        grammar_analysis = {}
        readability_analysis = {}
        coherence_analysis = {}
        argument_analysis = {}
        knowledge_graph = {}
        timing_info = {}
        
        if analysis_type in ["grammar", "comprehensive"]:
            start = time.time()
            grammar_analysis = self.grammar_analyzer.analyze(content)
            timing_info["grammar"] = round(time.time() - start, 2)
        
        if analysis_type in ["readability", "comprehensive"]:
            start = time.time()
            readability_analysis = self.readability_analyzer.analyze(content)
            timing_info["readability"] = round(time.time() - start, 2)
        
        if analysis_type in ["coherence", "comprehensive"]:
            start = time.time()
            coherence_analysis = self.coherence_analyzer.analyze(content)
            timing_info["coherence"] = round(time.time() - start, 2)
        
        if analysis_type in ["argument", "comprehensive"]:
            start = time.time()
            argument_analysis = self.argument_miner.analyze(content)
            timing_info["argument"] = round(time.time() - start, 2)
        
        if analysis_type == "comprehensive":
            # Knowledge graph analysis only for comprehensive analysis
            start = time.time()
            knowledge_graph = self.knowledge_graph_builder.build(content)
            timing_info["knowledge_graph"] = round(time.time() - start, 2)

        argument_graph, argument_support_stats = self._build_argument_graph(argument_analysis)
        argument_metrics = self._calculate_argument_metrics(argument_analysis, argument_support_stats)
        
        # Calculate dimension scores
        argument_coherence = argument_metrics.get("coherence") if argument_metrics else 0.0
        coherence_score = argument_coherence if argument_coherence else coherence_analysis.get("score", 0.0)

        scores = {
            "grammar": grammar_analysis.get("score", 0.0),
            "readability": readability_analysis.get("score", 0.0),
            "coherence": coherence_score,
            "argument_strength": argument_analysis.get("score", 0.0),
            "knowledge_graph": knowledge_graph.get("score", 0.0)
        }

        if argument_metrics is not None:
            argument_metrics["coherence"] = coherence_score

        if coherence_analysis is None or not isinstance(coherence_analysis, dict):
            coherence_analysis = {}
        coherence_analysis["score"] = coherence_score
        
        # Calculate overall score (weighted average)
        weights = {
            "grammar": 0.20,
            "readability": 0.20,
            "coherence": 0.25,
            "argument_strength": 0.25,
            "knowledge_graph": 0.10
        }
        
        overall_score = sum(scores[dim] * weights[dim] for dim in scores.keys())
        scores["overall"] = round(overall_score, 2)
        
        # Generate teacher-centered diagnostic recommendations
        recommendations = self._generate_diagnostic_recommendations(
            grammar_analysis, readability_analysis, coherence_analysis, 
            argument_analysis, knowledge_graph
        )
        
        # Compile detailed analysis for teacher review
        detailed_analysis = {
            "grammar": {
                "score": grammar_analysis.get("score", 0.0),
                "errors": grammar_analysis.get("errors", []),
                "error_count": grammar_analysis.get("error_count", 0),
                "syntax_patterns": grammar_analysis.get("syntax_patterns", {})
            },
            "readability": {
                "score": readability_analysis.get("score", 0.0),
                "flesch_reading_ease": readability_analysis.get("flesch_reading_ease", 0.0),
                "flesch_kincaid_grade": readability_analysis.get("flesch_kincaid_grade", 0.0),
                "smog_index": readability_analysis.get("smog_index", 0.0),
                "coleman_liau_index": readability_analysis.get("coleman_liau_index", 0.0),
                "lexical_diversity": readability_analysis.get("lexical_diversity", 0.0),
                "issues": readability_analysis.get("issues", [])
            },
            "coherence": {
                "score": coherence_analysis.get("score", 0.0),
                "entity_grid_score": coherence_analysis.get("entity_grid_score", 0.0),
                "semantic_similarity_score": coherence_analysis.get("semantic_similarity_score", 0.0),
                "transition_score": coherence_analysis.get("transition_score", 0.0),
                "paragraph_unity": coherence_analysis.get("paragraph_unity", 0.0),
                "topic_sentences": coherence_analysis.get("topic_sentences", []),
                "transitional_elements": coherence_analysis.get("transitional_elements", []),
                "coherence_issues": coherence_analysis.get("coherence_issues", []),
                "structure_analysis": coherence_analysis.get("structure_analysis", {})
            },
            "argumentation": {
                "score": argument_analysis.get("score", 0.0),
                "claim_score": argument_analysis.get("claim_score", 0.0),
                "evidence_score": argument_analysis.get("evidence_score", 0.0),
                "warrant_score": argument_analysis.get("warrant_score", 0.0),
                "rebuttal_score": argument_analysis.get("rebuttal_score", 0.0),
                "thesis_statement": argument_analysis.get("thesis_statement"),
                "claims": argument_analysis.get("claims", []),
                "grounds": argument_analysis.get("grounds", []),
                "warrants": argument_analysis.get("warrants", []),
                "rebuttals": argument_analysis.get("rebuttals", []),
                "argument_structure": argument_analysis.get("argument_structure", {}),
                "toulmin_analysis": argument_analysis.get("toulmin_analysis", {}),
                "argument_issues": argument_analysis.get("argument_issues", []),
                "graph": argument_graph,
                "metrics": argument_metrics
            },
            "knowledge_graph": {
                "score": knowledge_graph.get("score", 0.0) if knowledge_graph else 0.0,
                "concepts": knowledge_graph.get("concepts", [])[:10] if knowledge_graph else [],  # Top 10 concepts
                "relationships": knowledge_graph.get("relationships", [])[:15] if knowledge_graph else [],  # Top 15 relationships
                "graph_structure": knowledge_graph.get("graph_structure", {}) if knowledge_graph else {},
                "concept_coverage": knowledge_graph.get("concept_coverage", {}) if knowledge_graph else {},
                "conceptual_gaps": knowledge_graph.get("conceptual_gaps", []) if knowledge_graph else [],
                "connectivity_score": knowledge_graph.get("connectivity_score", 0.0) if knowledge_graph else 0.0,
                "depth_score": knowledge_graph.get("depth_score", 0.0) if knowledge_graph else 0.0
            }
        }
        
        # Generate diagnostic summary for teachers
        diagnostic_summary = self._generate_diagnostic_summary(scores, detailed_analysis)
        
        # Calculate total processing time
        total_time = time.time() - analysis_start
        timing_info["total"] = round(total_time, 2)
        
        # Log timing breakdown
        logger.info(
            f"Analysis timing breakdown - "
            f"Total: {timing_info.get('total', 0):.2f}s, "
            f"Grammar: {timing_info.get('grammar', 0):.2f}s, "
            f"Readability: {timing_info.get('readability', 0):.2f}s, "
            f"Coherence: {timing_info.get('coherence', 0):.2f}s, "
            f"Argument: {timing_info.get('argument', 0):.2f}s, "
            f"KG: {timing_info.get('knowledge_graph', 0):.2f}s"
        )
        
        return {
            "scores": scores,
            "detailed_analysis": detailed_analysis,
            "recommendations": recommendations,
            "diagnostic_summary": diagnostic_summary,
            "word_count": word_count,
            "timing_info": timing_info,
            "analysis_type": analysis_type
        }

    def _compute_content_quality_metrics(self, content: str) -> Dict[str, Any]:
        """Generate lightweight heuristics to detect nonsensical submissions."""
        tokens = content.split()
        alpha_tokens = [tok for tok in tokens if any(ch.isalpha() for ch in tok)]
        alpha_word_count = len(alpha_tokens)
        unique_words = set(tok.lower() for tok in alpha_tokens if tok.strip())
        total_alpha_chars = sum(len(tok) for tok in alpha_tokens)

        raw_segments = re.split(r"[.!?]+|\n+", content)
        sentences = [
            seg.strip()
            for seg in raw_segments
            if len(re.sub(r"[^a-zA-Z]", "", seg)) >= 3
        ]

        distinct_alpha_chars = len(
            {
                ch.lower()
                for tok in alpha_tokens
                for ch in tok
                if ch.isalpha()
            }
        )

        return {
            "token_count": len(tokens),
            "alpha_token_ratio": (alpha_word_count / len(tokens)) if tokens else 0.0,
            "lexical_diversity": (len(unique_words) / alpha_word_count) if alpha_word_count else 0.0,
            "avg_word_length": (total_alpha_chars / alpha_word_count) if alpha_word_count else 0.0,
            "sentence_count": len(sentences),
            "distinct_alpha_chars": distinct_alpha_chars,
        }

    def _validate_content_quality(self, metrics: Dict[str, Any]) -> Optional[str]:
        """Return error text when we detect gibberish content instead of an essay."""
        if metrics["sentence_count"] < 2:
            return (
                "Essay content should contain at least two complete sentences with standard punctuation before it can be analyzed."
            )
        if metrics["lexical_diversity"] < 0.15:
            return (
                "Essay content appears to repeat the same word(s). Please provide a complete paragraph with varied vocabulary."
            )
        if metrics["avg_word_length"] < 2.5:
            return (
                "Essay content is mostly made of extremely short fragments. Use full words and sentences so we can score the writing."
            )
        if metrics["distinct_alpha_chars"] < 5:
            return (
                "Essay content does not include enough unique letters to be considered meaningful text."
            )
        return None

    def _build_argument_graph(self, argument_analysis: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Construct argument knowledge graph from argument analysis results"""
        graph = {
            "nodes": [],
            "edges": [],
            "legend": [
                {"type": "thesis", "label": "Thesis"},
                {"type": "claim", "label": "Claim"},
                {"type": "evidence", "label": "Evidence"},
                {"type": "warrant", "label": "Warrant"},
                {"type": "rebuttal", "label": "Rebuttal"}
            ]
        }
        support_stats: Dict[str, Dict[str, Any]] = {}

        if not argument_analysis or not isinstance(argument_analysis, dict):
            return graph, support_stats

        thesis = argument_analysis.get("thesis_statement")
        if thesis and isinstance(thesis, dict) and thesis.get("sentence"):
            graph["nodes"].append({
                "id": "thesis",
                "type": "thesis",
                "text": thesis.get("sentence", ""),
                "confidence": thesis.get("confidence", "")
            })

        # Ensure claims is a list
        claims_list = argument_analysis.get("claims", [])
        if not isinstance(claims_list, list):
            claims_list = []
            
        claims = sorted(
            claims_list,
            key=lambda c: c.get("sentence_index", 0) if isinstance(c, dict) else 0
        )

        claim_nodes: List[Dict[str, Any]] = []
        for idx, claim in enumerate(claims, start=1):
            if not isinstance(claim, dict):
                continue
                
            # Get sentence text from multiple possible fields
            sentence_text = claim.get("sentence", claim.get("text", ""))
            if not sentence_text:
                continue  # Skip claims without text
                
            claim_id = f"claim_{idx}"
            claim_node = {
                "id": claim_id,
                "type": "claim",
                "text": sentence_text,
                "sentence_index": claim.get("sentence_index", idx),
                "indicator": claim.get("indicator")
            }
            graph["nodes"].append(claim_node)
            claim_with_id = dict(claim)
            claim_with_id["id"] = claim_id
            claim_nodes.append(claim_with_id)
            support_stats[claim_id] = {
                "claim_id": claim_id,
                "claim": sentence_text,
                "evidence": 0,
                "warrants": 0,
                "rebuttals": 0
            }
            if thesis and isinstance(thesis, dict) and thesis.get("sentence"):
                graph["edges"].append({
                    "source": "thesis",
                    "target": claim_id,
                    "type": "supports"
                })

        def find_supporting_claim(sentence_index: int) -> Optional[str]:
            ordered = sorted(
                claim_nodes,
                key=lambda c: c.get("sentence_index", 0)
            )
            for claim in reversed(ordered):
                if sentence_index >= claim.get("sentence_index", 0):
                    return claim["id"]
            return ordered[0]["id"] if ordered else None

        def add_node_with_edge(items: List[Dict[str, Any]], node_type: str, edge_type: str) -> None:
            if not isinstance(items, list):
                return
            # Filter out invalid items
            valid_items = [item for item in items if isinstance(item, dict)]
            ordered_items = sorted(valid_items, key=lambda item: item.get("sentence_index", 0) if isinstance(item, dict) else 0)
            for idx, item in enumerate(ordered_items, start=1):
                if not isinstance(item, dict):
                    continue
                node_id = f"{node_type}_{idx}"
                # Ensure we have sentence text - check multiple possible fields
                sentence_text = item.get("sentence", item.get("text", ""))
                if not sentence_text or not isinstance(sentence_text, str):
                    continue  # Skip if no text
                    
                graph["nodes"].append({
                    "id": node_id,
                    "type": node_type,
                    "text": sentence_text,
                    "sentence_index": item.get("sentence_index", idx)
                })
                claim_id = find_supporting_claim(item.get("sentence_index", 0))
                if claim_id:
                    # Fix edge direction: evidence/warrant should point TO claim (evidence supports claim)
                    if node_type == "evidence":
                        graph["edges"].append({
                            "source": node_id,  # Evidence points to claim
                            "target": claim_id,
                            "type": edge_type
                        })
                        support_stats[claim_id]["evidence"] += 1
                    elif node_type == "warrant":
                        graph["edges"].append({
                            "source": node_id,  # Warrant points to claim
                            "target": claim_id,
                            "type": edge_type
                        })
                        support_stats[claim_id]["warrants"] += 1
                    else:
                        # For other types, use original direction
                        graph["edges"].append({
                            "source": claim_id,
                            "target": node_id,
                            "type": edge_type
                        })
                elif thesis and thesis.get("sentence"):
                    # If no claim found, connect to thesis
                    if node_type == "evidence":
                        graph["edges"].append({
                            "source": node_id,  # Evidence points to thesis
                            "target": "thesis",
                            "type": edge_type
                        })
                    else:
                        graph["edges"].append({
                            "source": "thesis",
                            "target": node_id,
                            "type": edge_type
                        })

        # Get grounds/evidence - check multiple possible field names
        grounds = argument_analysis.get("grounds", argument_analysis.get("evidence", []))
        if not isinstance(grounds, list):
            grounds = []
        add_node_with_edge(grounds, "evidence", "supports")
        
        warrants_list = argument_analysis.get("warrants", [])
        if not isinstance(warrants_list, list):
            warrants_list = []
        add_node_with_edge(warrants_list, "warrant", "elaborates")

        rebuttals_list = argument_analysis.get("rebuttals", [])
        if not isinstance(rebuttals_list, list):
            rebuttals_list = []
        rebuttals = sorted(
            rebuttals_list,
            key=lambda r: r.get("sentence_index", 0) if isinstance(r, dict) else 0
        )
        for idx, rebuttal in enumerate(rebuttals, start=1):
            if not isinstance(rebuttal, dict):
                continue
            sentence_text = rebuttal.get("sentence", rebuttal.get("text", ""))
            if not sentence_text:
                continue
                
            node_id = f"rebuttal_{idx}"
            graph["nodes"].append({
                "id": node_id,
                "type": "rebuttal",
                "text": sentence_text,
                "sentence_index": rebuttal.get("sentence_index", idx)
            })
            claim_id = find_supporting_claim(rebuttal.get("sentence_index", 0))
            if claim_id:
                graph["edges"].append({
                    "source": node_id,
                    "target": claim_id,
                    "type": "rebuts"
                })
                support_stats[claim_id]["rebuttals"] += 1
            elif thesis and isinstance(thesis, dict) and thesis.get("sentence"):
                graph["edges"].append({
                    "source": node_id,
                    "target": "thesis",
                    "type": "rebuts"
                })

        return graph, support_stats

    def _calculate_argument_metrics(self, argument_analysis: Dict[str, Any], support_stats: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize argument strength and verification metrics for visualization"""
        metrics = {
            "argument_strength": [],
            "coherence": 0.0,
            "verification": [],
            "overall_score": round(argument_analysis.get("score", 0.0), 2)
        }

        strength_entries = []
        for claim_id, stats in support_stats.items():
            raw_score = stats["evidence"] * 3 + stats["warrants"] * 2 - stats["rebuttals"]
            score = max(0.0, min(10.0, raw_score))
            strength_entries.append({
                "claim_id": claim_id,
                "claim": stats["claim"],
                "evidence": stats["evidence"],
                "warrants": stats["warrants"],
                "rebuttals": stats["rebuttals"],
                "score": round(score, 2)
            })

        metrics["argument_strength"] = sorted(
            strength_entries,
            key=lambda entry: entry["score"],
            reverse=True
        )

        coherence_components = [
            argument_analysis.get("claim_score"),
            argument_analysis.get("evidence_score"),
            argument_analysis.get("warrant_score")
        ]
        valid_components = [comp for comp in coherence_components if comp is not None]
        if valid_components:
            metrics["coherence"] = round(sum(valid_components) / len(valid_components), 2)

        verification_entries = []
        for ground in argument_analysis.get("grounds", [])[:5]:
            verification_entries.append({
                "statement": ground.get("sentence", ""),
                "status": "Verified" if ground.get("indicator") else "Pending Review"
            })
        metrics["verification"] = verification_entries

        return metrics

    def _generate_diagnostic_recommendations(
        self, grammar_analysis: Dict, readability_analysis: Dict,
        coherence_analysis: Dict, argument_analysis: Dict, knowledge_graph: Dict
    ) -> List[Dict[str, Any]]:
        """
        Generate prioritized, actionable recommendations for teachers
        Returns recommendations sorted by priority (high to low)
        """
        recommendations = []
        
        # Grammar recommendations (high priority if many errors)
        grammar_errors = grammar_analysis.get("error_count", 0)
        grammar_score = grammar_analysis.get("score", 100)
        if grammar_score < 70 or grammar_errors > 10:
            recommendations.append({
                "priority": "high",
                "dimension": "grammar",
                "message": f"Multiple grammar errors detected ({grammar_errors} errors, score: {grammar_score:.1f})",
                "suggestion": "Focus on grammatical correctness. Review common error patterns and provide targeted instruction.",
                "action_items": [
                    "Review grammar errors with student",
                    "Provide examples of correct usage",
                    "Encourage proofreading practice"
                ]
            })
        
        # Readability recommendations
        readability_score = readability_analysis.get("score", 100)
        readability_issues = readability_analysis.get("issues", [])
        if readability_score < 70 or len(readability_issues) > 2:
            recommendations.append({
                "priority": "medium",
                "dimension": "readability",
                "message": f"Readability concerns identified (score: {readability_score:.1f})",
                "suggestion": "Address readability issues through vocabulary and sentence structure instruction.",
                "action_items": [
                    "Discuss appropriate academic vocabulary level",
                    "Review sentence length and complexity",
                    "Encourage varied sentence structures"
                ]
            })
        
        # Coherence recommendations
        coherence_score = coherence_analysis.get("score", 100)
        coherence_issues = coherence_analysis.get("coherence_issues", [])
        if coherence_score < 70 or len(coherence_issues) > 2:
            recommendations.append({
                "priority": "high",
                "dimension": "coherence",
                "message": f"Coherence and organization need improvement (score: {coherence_score:.1f})",
                "suggestion": "Focus on improving logical flow, transitions, and paragraph unity.",
                "action_items": [
                    "Review essay structure and organization",
                    "Discuss use of transitional elements",
                    "Ensure each paragraph has clear topic sentences"
                ]
            })
        
        # Argumentation recommendations
        argument_score = argument_analysis.get("score", 100)
        argument_issues = argument_analysis.get("argument_issues", [])
        if argument_score < 70 or len(argument_issues) > 2:
            recommendations.append({
                "priority": "high",
                "dimension": "argumentation",
                "message": f"Argument structure needs strengthening (score: {argument_score:.1f})",
                "suggestion": "Help student develop stronger thesis, provide more evidence, and improve reasoning.",
                "action_items": [
                    "Review thesis statement clarity",
                    "Discuss evidence selection and integration",
                    "Explain Toulmin model components (claims, evidence, warrants)"
                ]
            })
        
        # Knowledge graph recommendations
        kg_score = knowledge_graph.get("score", 100)
        conceptual_gaps = knowledge_graph.get("conceptual_gaps", [])
        if kg_score < 60 or len(conceptual_gaps) > 0:
            recommendations.append({
                "priority": "medium",
                "dimension": "conceptual_understanding",
                "message": f"Conceptual connections could be strengthened (score: {kg_score:.1f})",
                "suggestion": "Help student connect ideas more explicitly and develop conceptual relationships.",
                "action_items": [
                    "Review how concepts relate to each other",
                    "Discuss connections between ideas",
                    "Encourage explicit linking of concepts"
                ]
            })
        
        # Sort by priority (high > medium > low)
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        # If no specific issues, provide general feedback
        if not recommendations:
            recommendations.append({
                "priority": "low",
                "dimension": "general",
                "message": "Overall writing quality is good",
                "suggestion": "Continue practicing and refining writing skills.",
                "action_items": ["Acknowledge strengths", "Encourage continued practice"]
            })
        
        return recommendations
    
    def _generate_diagnostic_summary(self, scores: Dict[str, float], 
                                    detailed_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate diagnostic summary for teacher quick reference
        """
        # Identify strengths and weaknesses
        strengths = []
        weaknesses = []
        
        for dimension, score in scores.items():
            if dimension == "overall":
                continue
            if score >= 80:
                strengths.append(dimension)
            elif score < 60:
                weaknesses.append(dimension)
        
        # Identify most critical issues
        critical_issues = []
        
        # Grammar issues
        grammar_errors = detailed_analysis.get("grammar", {}).get("error_count", 0)
        if grammar_errors > 10:
            critical_issues.append(f"{grammar_errors} grammar errors detected")
        
        # Argument issues
        argument_issues = detailed_analysis.get("argumentation", {}).get("argument_issues", [])
        high_severity_issues = [i for i in argument_issues if i.get("severity") == "high"]
        if len(high_severity_issues) > 0:
            critical_issues.append(f"{len(high_severity_issues)} critical argumentation issues")
        
        # Coherence issues
        coherence_issues = detailed_analysis.get("coherence", {}).get("coherence_issues", [])
        high_severity_coherence = [i for i in coherence_issues if i.get("severity") == "high"]
        if len(high_severity_coherence) > 0:
            critical_issues.append(f"{len(high_severity_coherence)} critical coherence issues")
        
        return {
            "overall_score": scores.get("overall", 0.0),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "critical_issues": critical_issues,
            "dimension_scores": {
                k: v for k, v in scores.items() if k != "overall"
            }
        }
    
    async def batch_analyze(self, essays: List[Essay], 
                           analysis_type: str = "comprehensive") -> List[Dict[str, Any]]:
        """
        Batch analyze multiple essays (for teacher workflow efficiency)
        
        Args:
            essays: List of essay model objects
            analysis_type: Type of analysis to perform
        
        Returns:
            List of analysis results
        """
        results = []
        for essay in essays:
            try:
                analysis = await self.analyze_essay(essay, analysis_type)
                results.append({
                    "essay_id": essay.id,
                    "essay_title": essay.title,
                    "student_id": essay.student_id,
                    "analysis": analysis
                })
            except Exception as e:
                logger.error(f"Error analyzing essay {essay.id}: {e}")
                results.append({
                    "essay_id": essay.id,
                    "error": str(e)
                })
        
        return results

# Singleton instance
essay_analysis_service = EssayAnalysisService()

