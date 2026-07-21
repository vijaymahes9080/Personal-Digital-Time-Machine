from sqlalchemy.orm import Session
from loguru import logger
import os
from datetime import datetime, timezone
import json

from backend.app.domain.base import DomainEvent
from backend.app.domain.events import (
    WindowSwitchedEvent,
    ClipboardCopiedEvent,
    FileEditedEvent,
    ScreenshotCapturedEvent
)
from backend.app.infrastructure.database.models import ActivityLog
from backend.app.infrastructure.database.postgres import db_manager
from backend.app.infrastructure.database.event_store import event_store_repo
from backend.app.infrastructure.search.qdrant_client import vector_store
from backend.app.infrastructure.search.tantivy_client import search_index
from backend.app.infrastructure.graph.neo4j_client import graph_client
from backend.app.core.container import app_container

def project_event_to_read_db(event: DomainEvent) -> None:
    """Subscriber function that updates the SQL read-model database."""
    logger.debug(f"Projecting event {event.event_id} ({event.__class__.__name__}) to SQL Read Model.")
    
    # Open a new database session
    db: Session = next(db_manager.get_db())
    
    try:
        # 1. Map Domain Event to ActivityLog read-side model
        app_name = "Unknown"
        window_title = ""
        activity_type = "general"
        details = {}
        
        if hasattr(event, "app_name"):
            app_name = event.app_name
        if hasattr(event, "window_title"):
            window_title = event.window_title
        if hasattr(event, "activity_type"):
            activity_type = event.activity_type
        if hasattr(event, "details"):
            details = event.details

        log_entry = ActivityLog(
            event_id=event.event_id,
            timestamp=event.timestamp,
            activity_type=activity_type,
            app_name=app_name,
            window_title=window_title,
            details=details
        )
        
        db.add(log_entry)
        db.commit()
        logger.debug(f"Saved ActivityLog for event {event.event_id}.")
        
        # 2. Trigger asynchronous/deferred indexing (Vector, Graph, Keyword)
        project_event_to_search_and_graph(event, log_entry)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to project event {event.event_id} to read db: {e}")
    finally:
        db.close()

def project_event_to_search_and_graph(event: DomainEvent, log_entry: ActivityLog) -> None:
    """Updates external indexes (Vector store, Text search, Knowledge Graph) based on the event payload."""
    db: Session = next(db_manager.get_db())
    try:
        # Load wrappers from DI container
        ocr_agent = app_container.ocr_agent()
        embedding_agent = app_container.embedding_agent()

        # Text body content to index
        body_content = ""
        
        # --- Handle Screenshot Processing (OCR & Vector) ---
        if isinstance(event, ScreenshotCapturedEvent):
            screenshots_dir = settings.SCREENSHOTS_DIR
            image_path = os.path.join(screenshots_dir, event.details.get("file_name", ""))
            
            # Execute OCR extract
            ocr_text = ocr_agent.process_screenshot(image_path)
            if ocr_text:
                # Update SQL record with OCR results
                log_entry_db = db.query(ActivityLog).filter(ActivityLog.event_id == event.event_id).first()
                if log_entry_db:
                    log_entry_db.ocr_extracted = ocr_text
                    db.commit()
                body_content = ocr_text
            else:
                body_content = "Screenshot image captured."
        
        # --- Handle Clipboard Content ---
        elif isinstance(event, ClipboardCopiedEvent):
            body_content = event.details.get("text_content", "")
            
        # --- Handle File System Changes ---
        elif isinstance(event, FileEditedEvent):
            body_content = f"Path: {event.details.get('file_path')}, Change: {event.details.get('change_type')}"

        # Default text body
        if not body_content:
            body_content = f"{event.app_name} - {event.window_title}"

        # Mask credentials and sensitive details prior to indexing
        from backend.app.infrastructure.agents.privacy_agent import privacy_agent
        body_content = privacy_agent.mask_text(body_content)
        log_entry.window_title = privacy_agent.mask_text(log_entry.window_title or "")
        log_entry.body = body_content
        db.commit()

        # 1. Update Tantivy Full Text Search Index
        search_ok = search_index.add_document(
            event_id=str(event.event_id),
            timestamp=event.timestamp.isoformat(),
            activity_type=log_entry.activity_type,
            app_name=log_entry.app_name,
            window_title=log_entry.window_title or "",
            body=body_content
        )
        if search_ok:
            log_entry_db = db.query(ActivityLog).filter(ActivityLog.event_id == event.event_id).first()
            if log_entry_db:
                log_entry_db.search_indexed = True
                db.commit()

        # 2. Generate Vector Embeddings and Index in Qdrant
        combined_text = f"Activity: {log_entry.activity_type} in {log_entry.app_name}. Title: {log_entry.window_title}. Content: {body_content}"
        vector = embedding_agent.get_embeddings(combined_text)
        
        payload = {
            "event_id": str(event.event_id),
            "timestamp": event.timestamp.isoformat(),
            "activity_type": log_entry.activity_type,
            "app_name": log_entry.app_name,
            "window_title": log_entry.window_title or "",
            "text": combined_text
        }
        
        vector_ok = vector_store.upsert_event(str(event.event_id), vector, payload)
        if vector_ok:
            log_entry_db = db.query(ActivityLog).filter(ActivityLog.event_id == event.event_id).first()
            if log_entry_db:
                log_entry_db.embedding_indexed = True
                db.commit()

        # 3. Project Nodes and Relationships to Knowledge Graph using Graph Builder Agent
        from backend.app.infrastructure.agents.graph_agent import graph_builder_agent
        
        nodes, edges = graph_builder_agent.analyze_event(event, body_content)
        
        # Upsert nodes
        for node in nodes:
            graph_client.add_node(node["id"], node["label"], node["properties"])
            
        # Upsert edges
        for src, dst, rel, props in edges:
            graph_client.add_edge(src, dst, rel, props)

        # Mark as projected in graph
        log_entry_db = db.query(ActivityLog).filter(ActivityLog.event_id == event.event_id).first()
        if log_entry_db:
            log_entry_db.graph_indexed = True
            db.commit()

    except Exception as e:
        logger.error(f"Error in search/graph projections for event {event.event_id}: {e}")
    finally:
        db.close()

# Subscribe read database project helper to the event store
event_store_repo.subscribe(project_event_to_read_db)
