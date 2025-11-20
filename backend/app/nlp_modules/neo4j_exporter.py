"""
Neo4j Integration Module
Exports NetworkX knowledge graphs to Neo4j database for production use.
Provides persistent storage, advanced querying with Cypher, and visualization capabilities.

Supports both Neo4j Aura (cloud) and Neo4j Desktop (local).
Configuration via environment variables or direct parameters.
"""
import networkx as nx
import logging
import os
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict

logger = logging.getLogger(__name__)

# Lazy import to avoid startup errors
_neo4j_available = None
_driver = None


def _check_neo4j_available() -> bool:
    """Check if Neo4j library is available"""
    global _neo4j_available
    if _neo4j_available is None:
        try:
            import neo4j
            _neo4j_available = True
            logger.info("Neo4j library available")
        except ImportError:
            _neo4j_available = False
            logger.debug(
                "Neo4j library not available. "
                "Install with: pip install neo4j"
            )
    return _neo4j_available


class Neo4jExporter:
    """
    Exports NetworkX knowledge graphs to Neo4j database.
    
    Neo4j provides:
    - Persistent storage
    - Advanced querying with Cypher
    - Built-in visualization tools
    - Production-ready scalability
    """
    
    def __init__(self, 
                 uri: str = None,
                 user: str = None,
                 password: str = None,
                 database: str = None):
        """
        Initialize Neo4j exporter
        
        Args:
            uri: Neo4j database URI. If None, reads from NEO4J_URI env var.
                 For Aura: neo4j+s://xxxxx.databases.neo4j.io
                 For Desktop: bolt://localhost:7687
            user: Neo4j username. If None, reads from NEO4J_USER env var (default: neo4j)
            password: Neo4j password. If None, reads from NEO4J_PASSWORD env var
            database: Database name. If None, reads from NEO4J_DATABASE env var (default: neo4j)
        """
        # Load from environment variables if not provided
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD")
        self.database = database or os.getenv("NEO4J_DATABASE", "neo4j")
        
        self.driver = None
        self._available = False
        
        if _check_neo4j_available():
            self._connect()
    
    def _connect(self):
        """Connect to Neo4j database"""
        if not _check_neo4j_available():
            return
        
        try:
            from neo4j import GraphDatabase
            
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
            # Test connection
            with self.driver.session(database=self.database) as session:
                result = session.run("RETURN 1 as test")
                result.single()
            self._available = True
            logger.info(f"Connected to Neo4j at {self.uri}")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            self._available = False
            self.driver = None
    
    def is_available(self) -> bool:
        """Check if Neo4j connection is available"""
        return self._available and self.driver is not None
    
    def export_graph(self,
                     graph: nx.Graph,
                     essay_id: str = None,
                     clear_existing: bool = False) -> Dict[str, Any]:
        """
        Export NetworkX graph to Neo4j
        
        Args:
            graph: NetworkX graph to export
            essay_id: Optional essay ID (used as namespace)
            clear_existing: If True, clear existing nodes/edges for this essay
            
        Returns:
            Dictionary with export statistics
        """
        if not self.is_available():
            raise RuntimeError(
                "Neo4j not available. Install with: pip install neo4j "
                "and ensure Neo4j server is running."
            )
        
        if not graph or graph.number_of_nodes() == 0:
            return {
                "nodes_created": 0,
                "edges_created": 0,
                "status": "skipped",
                "message": "Empty graph"
            }
        
        try:
            with self.driver.session(database=self.database) as session:
                if clear_existing and essay_id:
                    # Clear existing data for this essay
                    session.run(
                        """
                        MATCH (n:Essay {essay_id: $essay_id})
                        DETACH DELETE n
                        """,
                        essay_id=essay_id
                    )
                
                # Create constraint/indexes (idempotent)
                self._create_constraints(session)
                
                # Export nodes
                nodes_created = self._export_nodes(session, graph, essay_id)
                
                # Export edges
                edges_created = self._export_edges(session, graph, essay_id)
                
                # Create essay node if essay_id provided
                if essay_id:
                    self._create_essay_node(session, essay_id, nodes_created, edges_created)
                
                return {
                    "nodes_created": nodes_created,
                    "edges_created": edges_created,
                    "status": "success",
                    "essay_id": essay_id
                }
        except Exception as e:
            logger.error(f"Failed to export graph to Neo4j: {e}")
            return {
                "nodes_created": 0,
                "edges_created": 0,
                "status": "error",
                "error": str(e)
            }
    
    def _create_constraints(self, session):
        """Create constraints and indexes in Neo4j"""
        constraints = [
            # Unique constraint on node IDs
            "CREATE CONSTRAINT node_id_unique IF NOT EXISTS "
            "FOR (n:KGNode) REQUIRE n.id IS UNIQUE",
            
            # Index on essay_id for faster lookups
            "CREATE INDEX essay_id_index IF NOT EXISTS "
            "FOR (n:Essay) ON (n.essay_id)",
            
            # Index on node type for filtering
            "CREATE INDEX node_type_index IF NOT EXISTS "
            "FOR (n:KGNode) ON (n.type)"
        ]
        
        for constraint in constraints:
            try:
                session.run(constraint)
            except Exception as e:
                # Constraint might already exist, ignore
                logger.debug(f"Constraint creation (may already exist): {e}")
    
    def _export_nodes(self, session, graph: nx.Graph, essay_id: str = None) -> int:
        """Export nodes from NetworkX graph to Neo4j"""
        nodes_created = 0
        
        for node_id, node_data in graph.nodes(data=True):
            # Extract node type (default to KGNode)
            node_type = node_data.get("type", "KGNode")
            
            # Build properties
            properties = {
                "id": str(node_id),
                **{k: v for k, v in node_data.items() if k != "type"}
            }
            
            if essay_id:
                properties["essay_id"] = essay_id
            
            # Create node with type as label
            cypher = f"""
            MERGE (n:KGNode:{{id: $id}})
            SET n = $properties
            """
            
            if node_type and node_type != "KGNode":
                # Add specific label (Concept, Claim, Evidence, etc.)
                labels = f"KGNode:{node_type}"
                cypher = f"""
                MERGE (n:KGNode {{id: $id}})
                SET n:{labels}
                SET n = $properties
                """
            
            session.run(cypher, id=str(node_id), properties=properties)
            nodes_created += 1
        
        return nodes_created
    
    def _export_edges(self, session, graph: nx.Graph, essay_id: str = None) -> int:
        """Export edges from NetworkX graph to Neo4j"""
        edges_created = 0
        
        for source, target, edge_data in graph.edges(data=True):
            # Get relation type (default to RELATED_TO)
            relation_type = edge_data.get("type", "RELATED_TO")
            
            # Build properties
            properties = {
                **{k: v for k, v in edge_data.items() if k != "type"}
            }
            
            if essay_id:
                properties["essay_id"] = essay_id
            
            # Create relationship
            cypher = f"""
            MATCH (a:KGNode {{id: $source_id}})
            MATCH (b:KGNode {{id: $target_id}})
            MERGE (a)-[r:{relation_type}]->(b)
            SET r = $properties
            """
            
            session.run(
                cypher,
                source_id=str(source),
                target_id=str(target),
                properties=properties
            )
            edges_created += 1
        
        return edges_created
    
    def _create_essay_node(self, session, essay_id: str, node_count: int, edge_count: int):
        """Create or update essay node with metadata"""
        cypher = """
        MERGE (e:Essay {essay_id: $essay_id})
        SET e.node_count = $node_count
        SET e.edge_count = $edge_count
        SET e.updated_at = datetime()
        """
        
        session.run(cypher, essay_id=essay_id, node_count=node_count, edge_count=edge_count)
        
        # Connect essay to all its nodes
        session.run("""
        MATCH (e:Essay {essay_id: $essay_id})
        MATCH (n:KGNode {essay_id: $essay_id})
        MERGE (e)-[:CONTAINS]->(n)
        """, essay_id=essay_id)
    
    def query(self, cypher_query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a Cypher query on Neo4j
        
        Args:
            cypher_query: Cypher query string
            parameters: Query parameters
            
        Returns:
            List of result records
        """
        if not self.is_available():
            raise RuntimeError("Neo4j not available")
        
        parameters = parameters or {}
        results = []
        
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run(cypher_query, parameters)
                for record in result:
                    results.append(dict(record))
        except Exception as e:
            logger.error(f"Cypher query failed: {e}")
            raise
        
        return results
    
    def get_essay_graph(self, essay_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve knowledge graph for a specific essay
        
        Args:
            essay_id: Essay identifier
            
        Returns:
            Dictionary with nodes and edges, or None if not found
        """
        if not self.is_available():
            return None
        
        cypher = """
        MATCH (e:Essay {essay_id: $essay_id})-[:CONTAINS]->(n:KGNode)
        OPTIONAL MATCH (n)-[r]->(m:KGNode)
        WHERE m.essay_id = $essay_id
        RETURN collect(DISTINCT n) as nodes, collect(r) as edges
        """
        
        results = self.query(cypher, {"essay_id": essay_id})
        if not results:
            return None
        
        record = results[0]
        return {
            "nodes": [dict(node) for node in record.get("nodes", [])],
            "edges": [dict(edge) for edge in record.get("edges", [])]
        }
    
    def find_similar_concepts(self, concept_text: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Find similar concepts across all essays using text similarity
        
        Args:
            concept_text: Concept text to search for
            limit: Maximum number of results
            
        Returns:
            List of similar concepts with their essay IDs
        """
        if not self.is_available():
            return []
        
        cypher = """
        MATCH (n:KGNode:Concept)
        WHERE toLower(n.label) CONTAINS toLower($concept_text)
           OR toLower(n.text) CONTAINS toLower($concept_text)
        RETURN n, n.essay_id as essay_id
        LIMIT $limit
        """
        
        return self.query(cypher, {"concept_text": concept_text, "limit": limit})
    
    def get_claim_evidence_graph(self, essay_id: str) -> Optional[Dict[str, Any]]:
        """
        Get claim-evidence relationships for an essay
        
        Args:
            essay_id: Essay identifier
            
        Returns:
            Dictionary with claims, evidence, and their relationships
        """
        if not self.is_available():
            return None
        
        cypher = """
        MATCH (c:KGNode:Claim {essay_id: $essay_id})
        OPTIONAL MATCH (c)<-[:SUPPORTS]-(e:KGNode:Evidence {essay_id: $essay_id})
        RETURN c as claim, collect(e) as evidence
        """
        
        results = self.query(cypher, {"essay_id": essay_id})
        return [{"claim": dict(r["claim"]), "evidence": [dict(e) for e in r["evidence"]]} 
                for r in results]
    
    def close(self):
        """Close Neo4j driver connection"""
        if self.driver:
            self.driver.close()
            self._available = False
            logger.info("Neo4j connection closed")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Convenience function
def export_to_neo4j(graph: nx.Graph,
                    uri: str = "bolt://localhost:7687",
                    user: str = "neo4j",
                    password: str = "password",
                    essay_id: str = None,
                    database: str = "neo4j") -> Dict[str, Any]:
    """
    Convenience function to export a NetworkX graph to Neo4j
    
    Args:
        graph: NetworkX graph to export
        uri: Neo4j URI
        user: Neo4j username
        password: Neo4j password
        essay_id: Optional essay ID
        database: Database name
        
    Returns:
        Export statistics
    """
    exporter = Neo4jExporter(uri=uri, user=user, password=password, database=database)
    try:
        return exporter.export_graph(graph, essay_id=essay_id)
    finally:
        exporter.close()

