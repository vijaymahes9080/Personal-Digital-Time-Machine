from neo4j import GraphDatabase, Driver
from loguru import logger
from typing import List, Dict, Any, Optional
import sqlite3
import json
import os

from backend.app.core.config import settings

class KnowledgeGraphClient:
    def __init__(self):
        self.use_fallback = False
        self.driver: Optional[Driver] = None
        self.sqlite_db_path = os.path.join(settings.DATA_DIR, "graph_fallback.db")
        
        # Ensure data folder exists
        os.makedirs(settings.DATA_DIR, exist_ok=True)
        
        try:
            logger.info(f"Connecting to Neo4j database at {settings.NEO4J_URI}...")
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # Verify connectivity
            self.driver.verify_connectivity()
            logger.info("Successfully connected to Neo4j Knowledge Graph.")
        except Exception as e:
            if settings.NEO4J_PREFER_FALLBACK:
                logger.warning(
                    f"Failed to connect to Neo4j ({e}). "
                    f"Falling back to local SQLite graph store at {self.sqlite_db_path}."
                )
                self.use_fallback = True
                self._initialize_sqlite_fallback()
            else:
                logger.error(f"Failed to connect to Neo4j: {e}")
                raise e

    def _initialize_sqlite_fallback(self) -> None:
        """Sets up relational tables for node/edge representations in SQLite."""
        try:
            with sqlite3.connect(self.sqlite_db_path) as conn:
                cursor = conn.cursor()
                # Create Nodes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS graph_nodes (
                        id TEXT PRIMARY KEY,
                        label TEXT NOT NULL,
                        properties TEXT NOT NULL
                    )
                """)
                # Create Edges/Relationships table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS graph_edges (
                        source_id TEXT,
                        target_id TEXT,
                        relationship TEXT NOT NULL,
                        properties TEXT NOT NULL,
                        PRIMARY KEY (source_id, target_id, relationship),
                        FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
                        FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
                    )
                """)
                conn.commit()
            logger.info("Initialized local SQLite graph tables successfully.")
        except Exception as e:
            logger.critical(f"Failed to initialize SQLite fallback: {e}")

    def close(self) -> None:
        if self.driver:
            self.driver.close()

    def add_node(self, node_id: str, label: str, properties: Dict[str, Any]) -> bool:
        """Upsert a node into Neo4j or fallback SQLite database."""
        if self.use_fallback:
            return self._sqlite_add_node(node_id, label, properties)
        
        # Neo4j Cypher Implementation
        cypher = (
            f"MERGE (n:{label} {{id: $node_id}}) "
            "SET n += $properties "
            "RETURN n"
        )
        try:
            with self.driver.session() as session:
                session.run(cypher, node_id=node_id, properties=properties)
            return True
        except Exception as e:
            logger.error(f"Failed to add node {node_id} to Neo4j: {e}")
            return False

    def add_edge(self, source_id: str, target_id: str, relationship: str, properties: Dict[str, Any]) -> bool:
        """Upsert an edge relationship between two nodes."""
        if self.use_fallback:
            return self._sqlite_add_edge(source_id, target_id, relationship, properties)
        
        # Neo4j Cypher Implementation
        # MATCH the source and target and relate them
        cypher = (
            "MATCH (a {id: $source_id}), (b {id: $target_id}) "
            f"MERGE (a)-[r:{relationship}]->(b) "
            "SET r += $properties "
            "RETURN r"
        )
        try:
            with self.driver.session() as session:
                session.run(cypher, source_id=source_id, target_id=target_id, properties=properties)
            return True
        except Exception as e:
            logger.error(f"Failed to create relationship {relationship} in Neo4j: {e}")
            return False

    # SQLite Fallback Helper implementations
    def _sqlite_add_node(self, node_id: str, label: str, properties: Dict[str, Any]) -> bool:
        try:
            props_str = json.dumps(properties)
            with sqlite3.connect(self.sqlite_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO graph_nodes (id, label, properties) VALUES (?, ?, ?)",
                    (node_id, label, props_str)
                )
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"SQLite graph node creation failed: {e}")
            return False

    def _sqlite_add_edge(self, source_id: str, target_id: str, relationship: str, properties: Dict[str, Any]) -> bool:
        try:
            props_str = json.dumps(properties)
            with sqlite3.connect(self.sqlite_db_path) as conn:
                cursor = conn.cursor()
                # Ensure source/target node exist in fallback
                cursor.execute("SELECT 1 FROM graph_nodes WHERE id = ?", (source_id,))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO graph_nodes (id, label, properties) VALUES (?, 'Node', '{}')", (source_id,))
                
                cursor.execute("SELECT 1 FROM graph_nodes WHERE id = ?", (target_id,))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO graph_nodes (id, label, properties) VALUES (?, 'Node', '{}')", (target_id,))

                cursor.execute(
                    "INSERT OR REPLACE INTO graph_edges (source_id, target_id, relationship, properties) VALUES (?, ?, ?, ?)",
                    (source_id, target_id, relationship, props_str)
                )
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"SQLite graph edge creation failed: {e}")
            return False

    def get_nodes(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve nodes list."""
        if self.use_fallback:
            try:
                with sqlite3.connect(self.sqlite_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, label, properties FROM graph_nodes LIMIT ?", (limit,))
                    rows = cursor.fetchall()
                    return [{"id": r[0], "label": r[1], "properties": json.loads(r[2])} for r in rows]
            except Exception as e:
                logger.error(f"Failed to fetch SQLite nodes: {e}")
                return []
        
        # Neo4j implementation
        cypher = "MATCH (n) RETURN n LIMIT $limit"
        try:
            with self.driver.session() as session:
                result = session.run(cypher, limit=limit)
                return [{"id": r['n']['id'], "label": list(r['n'].labels)[0] if r['n'].labels else "Node", "properties": dict(r['n'])} for r in result]
        except Exception as e:
            logger.error(f"Failed to fetch Neo4j nodes: {e}")
            return []

# Singleton Graph Client
graph_client = KnowledgeGraphClient()
