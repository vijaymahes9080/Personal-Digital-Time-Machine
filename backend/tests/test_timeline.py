import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from backend.app.main import app
from backend.app.infrastructure.database.models import ActivityLog

client = TestClient(app)

def test_grouped_timeline_endpoint():
    # 1. Arrange - Use clean session directly to bypass transaction isolation
    from backend.app.infrastructure.database.postgres import db_manager
    db = db_manager.SessionLocal()
    try:
        # Clear residues
        db.query(ActivityLog).delete()
        db.commit()

        now = datetime.now(timezone.utc)
        
        events = [
            # Today
            ActivityLog(
                id=str(uuid.uuid4()),
                event_id=str(uuid.uuid4()),
                timestamp=now,
                activity_type="window_switch",
                app_name="VSCode",
                window_title="Timeline coding"
            ),
            # Yesterday
            ActivityLog(
                id=str(uuid.uuid4()),
                event_id=str(uuid.uuid4()),
                timestamp=now - timedelta(days=1),
                activity_type="clipboard",
                app_name="Chrome",
                window_title="Chrome Copy"
            ),
            # Last Week
            ActivityLog(
                id=str(uuid.uuid4()),
                event_id=str(uuid.uuid4()),
                timestamp=now - timedelta(days=5),
                activity_type="file_edit",
                app_name="File Explorer",
                window_title="Modified main.py"
            ),
            # Career / History (older than 30 days)
            ActivityLog(
                id=str(uuid.uuid4()),
                event_id=str(uuid.uuid4()),
                timestamp=now - timedelta(days=40),
                activity_type="screenshot",
                app_name="Terminal",
                window_title="Legacy shell log"
            )
        ]
        
        for event in events:
            db.add(event)
        db.commit()

        # 2. Act - Query flat timeline
        response_flat = client.get("/api/v1/timeline?grouped=false")
        assert response_flat.status_code == 200
        data_flat = response_flat.json()
        assert len(data_flat) == 4
        
        # 3. Act - Query grouped timeline
        response_grouped = client.get("/api/v1/timeline?grouped=true")
        assert response_grouped.status_code == 200
        data_grouped = response_grouped.json()
        
        # Assert structural grouping
        assert len(data_grouped) == 4 # Today, Yesterday, Last Week, Career & History (Last Month is empty and filtered out)
        
        epochs_present = [group["epoch"] for group in data_grouped]
        assert "Today" in epochs_present
        assert "Yesterday" in epochs_present
        assert "Last Week" in epochs_present
        assert "Career & History" in epochs_present
        assert "Last Month" not in epochs_present # Empty group filtered out

        # Assert content maps correctly
        today_group = next(g for g in data_grouped if g["epoch"] == "Today")
        assert len(today_group["events"]) == 1
        assert today_group["events"][0]["app_name"] == "VSCode"

        history_group = next(g for g in data_grouped if g["epoch"] == "Career & History")
        assert len(history_group["events"]) == 1
        assert history_group["events"][0]["app_name"] == "Terminal"
    finally:
        # Clean up database table residues
        db.query(ActivityLog).delete()
        db.commit()
        db.close()
