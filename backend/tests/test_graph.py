import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import sqlite3

from backend.app.main import app
from backend.app.infrastructure.agents.graph_agent import graph_builder_agent
from backend.app.domain.events import FileEditedEvent, ClipboardCopiedEvent
from backend.app.infrastructure.database.postgres import db_manager

client = TestClient(app)

def test_graph_builder_agent_extraction():
    # 1. Arrange - Construct events
    event_file = FileEditedEvent(
        file_path="d:/open source projects/Personal Digital Time Machine/backend/main.py",
        change_type="modified",
        extension="py"
    )

    # 2. Act - Extract entities from File Event
    nodes, edges = graph_builder_agent.analyze_event(event_file, "import fastapi, postgresql, SyntaxError")

    # 3. Assert - Check nodes extracted
    node_ids = [n["id"] for n in nodes]
    node_labels = [n["label"] for n in nodes]
    
    assert "user_1" in node_ids
    assert "tech_fastapi" in node_ids
    assert "tech_postgresql" in node_ids
    assert "error_syntaxerror" in node_ids
    assert "project_backend" in node_ids
    assert "File" in node_labels
    assert "Project" in node_labels
    assert "Error" in node_labels

    # Check edges
    relationships = [e[2] for e in edges]
    assert "USES" in relationships
    assert "MODIFIED" in relationships
    assert "BELONGS_TO" in relationships
    assert "ENCOUNTERED" in relationships


def test_graph_api_endpoints():
    # 1. Arrange - Connect directly to graph client fallback to clear table
    from backend.app.core.container import app_container
    g_client = app_container.graph_client()
    
    if g_client.use_fallback:
        with sqlite3.connect(g_client.sqlite_db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM graph_edges")
            cursor.execute("DELETE FROM graph_nodes")
            conn.commit()

    # 2. Act - Create nodes manually via POST
    response_node1 = client.post("/api/v1/graph/nodes", json={
        "id": "node_test_1",
        "label": "Technology",
        "properties": {"name": "Test Python", "desc": "API Unit testing"}
    })
    assert response_node1.status_code == 200

    response_node2 = client.post("/api/v1/graph/nodes", json={
        "id": "node_test_2",
        "label": "Project",
        "properties": {"name": "ChronaAI test"}
    })
    assert response_node2.status_code == 200

    # 3. Act - Create relationship edge manually via POST
    response_edge = client.post("/api/v1/graph/edges", json={
        "source": "node_test_1",
        "target": "node_test_2",
        "relationship": "BELONGS_TO",
        "properties": {"strength": "high"}
    })
    assert response_edge.status_code == 200

    # 4. Act - Query unfiltered graph
    response_get = client.get("/api/v1/graph")
    assert response_get.status_code == 200
    data = response_get.json()
    assert len(data["nodes"]) >= 2
    assert len(data["edges"]) >= 1

    # Query filtered by type
    response_type = client.get("/api/v1/graph?type=Technology")
    assert response_type.status_code == 200
    data_type = response_type.json()
    assert len(data_type["nodes"]) == 1
    assert data_type["nodes"][0]["id"] == "node_test_1"

    # Query filtered by keyword search
    response_search = client.get("/api/v1/graph?q=Chrona")
    assert response_search.status_code == 200
    data_search = response_search.json()
    assert len(data_search["nodes"]) == 1
    assert data_search["nodes"][0]["id"] == "node_test_2"
