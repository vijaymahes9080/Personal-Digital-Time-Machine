import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.domain.events import WindowSwitchedEvent, ClipboardCopiedEvent
from backend.app.infrastructure.database.event_store import event_store_repo
from backend.app.infrastructure.database.models import StoredEvent, ActivityLog
# Ensure projections is imported to wire subscribers
import backend.app.infrastructure.database.projections

def test_event_store_append_and_load(db_session: Session):
    # 1. Arrange - Construct domain events
    event1 = WindowSwitchedEvent(
        app_name="VSCode",
        window_title="main.py - ChronaAI",
        process_path="/bin/vscode",
        pid=1234
    )
    event2 = ClipboardCopiedEvent(
        text_content="import fastapi",
        app_name="VSCode",
        window_title="main.py - ChronaAI"
    )

    # 2. Act - Append events to Event Store
    stream_id = "test_stream_1"
    event_store_repo.append(db_session, stream_id, [event1, event2], expected_version=0)
    db_session.commit()

    # 3. Assert - Check raw stored events in database
    db_events = db_session.query(StoredEvent).filter(StoredEvent.stream_id == stream_id).all()
    assert len(db_events) == 2
    assert db_events[0].event_type == "WindowSwitchedEvent"
    assert db_events[0].version == 1
    assert db_events[1].event_type == "ClipboardCopiedEvent"
    assert db_events[1].version == 2

    # Verify event hydration / load_stream function
    hydrated_events = event_store_repo.load_stream(db_session, stream_id)
    assert len(hydrated_events) == 2
    assert isinstance(hydrated_events[0], WindowSwitchedEvent)
    assert hydrated_events[0].app_name == "VSCode"
    assert hydrated_events[0].details["pid"] == 1234
    assert isinstance(hydrated_events[1], ClipboardCopiedEvent)
    assert hydrated_events[1].details["text_content"] == "import fastapi"

def test_cqrs_projections_saved_activity_log(db_session: Session):
    # Arrange - Construct window focus event
    event = WindowSwitchedEvent(
        app_name="Chrome",
        window_title="Google Search - Pytest",
        process_path="/bin/chrome",
        pid=9876
    )

    # Act - Append will trigger projections (project_event_to_read_db is subscribed)
    stream_id = "test_timeline_stream"
    event_store_repo.append(db_session, stream_id, [event], expected_version=0)
    db_session.commit()

    # Assert - Verify that the projection updated the read DB table
    log_entry = db_session.query(ActivityLog).filter(ActivityLog.event_id == event.event_id).first()
    assert log_entry is not None
    assert log_entry.activity_type == "window_switch"
    assert log_entry.app_name == "Chrome"
    assert log_entry.window_title == "Google Search - Pytest"
    assert log_entry.details["process_path"] == "/bin/chrome"
