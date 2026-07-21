import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import uuid

from backend.app.main import app
from backend.app.infrastructure.database.models import ActivityLog
from backend.app.infrastructure.database.postgres import db_manager

client = TestClient(app)

def test_rag_memory_assistant_ask():
    # 1. Arrange - Seed database with clear target activity
    from backend.app.infrastructure.database.postgres import db_manager
    db = db_manager.SessionLocal()
    
    from backend.app.domain.events import WindowSwitchedEvent
    from backend.app.infrastructure.database.event_store import event_store_repo
    
    try:
        # Clear residues
        db.query(ActivityLog).delete()
        db.commit()

        event_id = str(uuid.uuid4())
        event = WindowSwitchedEvent(
            event_id=event_id,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=2),
            app_name="VSCode",
            window_title="Editing config.py details"
        )
        
        stream_id = "test_search_stream"
        # Publish event which synchronously indexes it in sqlite, tantivy, and qdrant
        event_store_repo.append(db, stream_id, [event], expected_version=0)
        db.commit()

        # 2. Act - Call local RAG ask endpoint
        response = client.post("/api/v1/search/ask", json={
            "question": "When did I edit config.py?"
        })

        # 3. Assert
        assert response.status_code == 200
        data = response.json()
        
        assert "answer" in data
        assert "sources" in data
        assert "used_fallback" in data
        
        # Verify context sources returned
        sources = data["sources"]
        assert len(sources) >= 1
        assert sources[0]["app_name"] == "VSCode"
        assert "config.py" in sources[0]["window_title"]

    finally:
        # Clean up database table residues
        db.query(ActivityLog).delete()
        db.commit()
        db.close()
