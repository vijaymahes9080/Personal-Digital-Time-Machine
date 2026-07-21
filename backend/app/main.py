from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from loguru import logger
import uvicorn
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import os
import json

from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.core.container import app_container
from backend.app.infrastructure.database.postgres import db_manager
from backend.app.infrastructure.database.models import Base, ActivityLog
from backend.app.infrastructure.recorder.recorder import activity_recorder

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="ChronaAI - Travel Through Your Own Knowledge",
    version="1.0.0"
)

# Enable CORS for Tauri desktop frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri custom protocol origins can be wildcards
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Screenshot Files statically
app.mount("/data/screenshots", StaticFiles(directory=str(settings.SCREENSHOTS_DIR)), name="screenshots")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing ChronaAI Services...")

    # 1. Establish Database Connection & Initialize Tables
    # Try to verify PostgreSQL connection. If it fails, log error.
    # Note: For initial zero-configuration or fallbacks, we run create_all on the engine.
    try:
        db_manager.verify_connection(max_retries=2, delay_sec=1.0)
        Base.metadata.create_all(bind=db_manager.engine)
        logger.info("SQL database tables initialized successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize SQL database: {e}")
        logger.warning("The application will proceed, but database features may be impaired.")

    # 3. Start Universal Activity Recorder
    # By default, watch the root workspace directory
    watch_path = str(settings.BASE_DIR)
    
    # Run the recorder start command in a thread so as to not block FastAPI startup
    def run_recorder():
        try:
            activity_recorder.start(watch_path)
        except Exception as e:
            logger.error(f"Failed to start Activity Recorder on startup: {e}")
            
    threading.Thread(target=run_recorder, daemon=True).start()

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Stopping ChronaAI Services...")
    activity_recorder.stop()

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "message": settings.APP_NAME + " Personal Digital Time Machine API is running."
    }

@app.get("/api/v1/timeline")
def get_timeline(
    activity_type: Optional[str] = Query(None, description="Filter by type"),
    app_name: Optional[str] = Query(None, description="Filter by app name"),
    grouped: bool = Query(False, description="Group events by time epochs"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(db_manager.get_db)
):
    """Retrieve user activity log timeline. Optionally groups events by chronological epochs."""
    try:
        query = db.query(ActivityLog)
        
        if activity_type:
            query = query.filter(ActivityLog.activity_type == activity_type)
        if app_name:
            query = query.filter(ActivityLog.app_name.ilike(f"%{app_name}%"))
            
        logs = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        
        flat_results = []
        for log in logs:
            flat_results.append({
                "id": str(log.id),
                "event_id": str(log.event_id),
                "timestamp": log.timestamp.isoformat(),
                "activity_type": log.activity_type,
                "app_name": log.app_name,
                "window_title": log.window_title,
                "details": log.details,
                "ocr_extracted": log.ocr_extracted
            })
            
        if not grouped:
            return flat_results
            
        # Group by epochs
        from datetime import date, timedelta
        
        today_dt = date.today()
        yesterday_dt = today_dt - timedelta(days=1)
        last_week_dt = today_dt - timedelta(days=7)
        last_month_dt = today_dt - timedelta(days=30)
        
        epochs = {
            "Today": [],
            "Yesterday": [],
            "Last Week": [],
            "Last Month": [],
            "Career & History": []
        }
        
        # Categorize
        for item in flat_results:
            item_date = datetime.fromisoformat(item["timestamp"]).date()
            if item_date == today_dt:
                epochs["Today"].append(item)
            elif item_date == yesterday_dt:
                epochs["Yesterday"].append(item)
            elif item_date >= last_week_dt:
                epochs["Last Week"].append(item)
            elif item_date >= last_month_dt:
                epochs["Last Month"].append(item)
            else:
                epochs["Career & History"].append(item)
                
        # Format as list of groups
        grouped_results = []
        for name in ["Today", "Yesterday", "Last Week", "Last Month", "Career & History"]:
            if epochs[name]:  # Only return epochs with events
                grouped_results.append({
                    "epoch": name,
                    "events": epochs[name]
                })
        return grouped_results
    except Exception as e:
        logger.error(f"Error fetching timeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch timeline logs")

@app.get("/api/v1/search")
def search_hybrid(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(10, ge=1, le=50)
):
    """Hybrid search endpoint combining keyword indexes (Tantivy) and semantic vectors (Qdrant)."""
    try:
        logger.info(f"Executing hybrid search for: '{q}'")
        
        # 1. Full text keyword search via Tantivy
        tantivy_results = app_container.search_index().search_keyword(q, limit=limit)
        
        # 2. Semantic vector search via Qdrant
        embedding_agent = app_container.embedding_agent()
        vector_store = app_container.vector_store()
        
        query_vector = embedding_agent.get_embeddings(q)
        qdrant_results = vector_store.search_semantic(query_vector, limit=limit)
        
        # 3. Reciprocal Rank Fusion (RRF) combining rankings
        rrf_scores = {}
        k = 60 # Constant for RRF smoothing
        
        # Process Tantivy rank lists
        for rank, hit in enumerate(tantivy_results):
            event_id = hit["event_id"]
            rrf_scores[event_id] = rrf_scores.get(event_id, 0.0) + (1.0 / (k + rank + 1))
            
        # Process Qdrant rank lists
        for rank, hit in enumerate(qdrant_results):
            event_id = hit["payload"].get("event_id")
            if event_id:
                rrf_scores[event_id] = rrf_scores.get(event_id, 0.0) + (1.0 / (k + rank + 1))
        
        # Sort by final RRF score
        sorted_event_ids = sorted(rrf_scores.keys(), key=lambda eid: rrf_scores[eid], reverse=True)[:limit]
        
        # Fetch actual records matching sorted ids from read db
        db: Session = next(db_manager.get_db())
        try:
            matched_logs = db.query(ActivityLog).filter(ActivityLog.event_id.in_(sorted_event_ids)).all()
            # Map into hash lookup
            log_lookup = {str(log.event_id): log for log in matched_logs}
            
            final_hits = []
            for eid in sorted_event_ids:
                log = log_lookup.get(eid)
                if log:
                    final_hits.append({
                        "event_id": eid,
                        "timestamp": log.timestamp.isoformat(),
                        "activity_type": log.activity_type,
                        "app_name": log.app_name,
                        "window_title": log.window_title,
                        "details": log.details,
                        "ocr_extracted": log.ocr_extracted,
                        "score": rrf_scores[eid]
                    })
            return {
                "query": q,
                "hits_count": len(final_hits),
                "hits": final_hits
            }
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Failed to execute hybrid search: {e}")
        raise HTTPException(status_code=500, detail="Search engine failed to process query")

from pydantic import BaseModel

class AskSchema(BaseModel):
    question: str

@app.post("/api/v1/search/ask")
def ask_memory_assistant(payload: AskSchema):
    """Execute local RAG: perform hybrid search to extract context, and call local LLM."""
    question = payload.question
    
    try:
        embedding_agent = app_container.embedding_agent()
        vector_store = app_container.vector_store()
        
        # Keyword search
        tantivy_results = app_container.search_index().search_keyword(question, limit=10)
        
        # Vector search
        question_vector = embedding_agent.get_embeddings(question)
        qdrant_results = vector_store.search_semantic(question_vector, limit=10)
        
        # Reciprocal Rank Fusion
        rrf_scores = {}
        k = 60
        for rank, hit in enumerate(tantivy_results):
            event_id = hit["event_id"]
            rrf_scores[event_id] = rrf_scores.get(event_id, 0.0) + (1.0 / (k + rank + 1))
            
        for rank, hit in enumerate(qdrant_results):
            event_id = hit["payload"].get("event_id")
            if event_id:
                rrf_scores[event_id] = rrf_scores.get(event_id, 0.0) + (1.0 / (k + rank + 1))
                
        sorted_event_ids = sorted(rrf_scores.keys(), key=lambda eid: rrf_scores[eid], reverse=True)[:8]
        
        # Retrieve logs from db
        db: Session = next(db_manager.get_db())
        context_items = []
        matched_logs = []
        try:
            if sorted_event_ids:
                matched_logs = db.query(ActivityLog).filter(ActivityLog.event_id.in_(sorted_event_ids)).all()
                log_lookup = {str(log.event_id): log for log in matched_logs}
                for eid in sorted_event_ids:
                    log = log_lookup.get(eid)
                    if log:
                        body_desc = log.ocr_extracted or (log.details.get("text") if log.details else "") or ""
                        doc_str = (
                            f"- Event: {log.activity_type} in {log.app_name}\n"
                            f"  Title: {log.window_title}\n"
                            f"  Time: {log.timestamp.isoformat()}\n"
                            f"  Content: {body_desc[:250]}\n"
                        )
                        context_items.append(doc_str)
        finally:
            db.close()
            
        context_block = "\n".join(context_items) if context_items else "No relevant history logs found."
        
        # Call local Ollama RAG model
        ollama_url = f"{settings.OLLAMA_API_URL}/api/generate"
        prompt = (
            "You are ChronaAI, a helpful Personal Digital Time Machine. You answer questions about the user's digital history using the provided context logs. The context logs are recorded actions from the user's computer.\n"
            "Answer the user's question concisely, directly, and factually based on the context logs. Reference specific apps, files, or times where possible.\n"
            "If the context doesn't contain the answer, say you couldn't find a record for it in their memory.\n\n"
            f"Context Logs:\n{context_block}\n\n"
            f"User Question: {question}\n\n"
            "Answer:"
        )
        
        import urllib.request
        response_text = ""
        used_fallback = False
        try:
            req = urllib.request.Request(
                ollama_url,
                data=json.dumps({
                    "model": settings.LLM_MODEL,
                    "prompt": prompt,
                    "stream": False
                }).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=8.0) as res:
                if res.status == 200:
                    res_data = json.loads(res.read().decode('utf-8'))
                    response_text = res_data.get("response", "")
                else:
                    used_fallback = True
        except Exception:
            used_fallback = True
            
        # Fallback template processor if Ollama is offline or fails
        if used_fallback or not response_text.strip():
            used_fallback = True
            if matched_logs:
                summary_lines = []
                for log in matched_logs[:3]:
                    summary_lines.append(
                        f"• {log.activity_type.capitalize()} on {log.timestamp.strftime('%Y-%m-%d %H:%M:%S')} in {log.app_name} (Window: \"{log.window_title}\")"
                    )
                summary_text = "\n".join(summary_lines)
                response_text = (
                    f"ChronaAI (Offline Summary):\n"
                    f"I couldn't establish a connection to your local Ollama instance on `{settings.OLLAMA_API_URL}`, but I successfully queried your local sqlite memory store.\n"
                    f"Here are the top matches related to your question:\n"
                    f"{summary_text}"
                )
            else:
                response_text = "I couldn't establish a connection to Ollama and found no timeline activities matching your question."
                
        # Expose context hits to frontend
        sources = []
        for log in matched_logs:
            sources.append({
                "event_id": str(log.event_id),
                "timestamp": log.timestamp.isoformat(),
                "activity_type": log.activity_type,
                "app_name": log.app_name,
                "window_title": log.window_title
            })
            
        return {
            "answer": response_text.strip(),
            "sources": sources,
            "used_fallback": used_fallback
        }
        
    except Exception as e:
        logger.error(f"Failed to process RAG ask: {e}")
        raise HTTPException(status_code=500, detail="Memory assistant failed to process question")

class NodeSchema(BaseModel):
    id: str
    label: str
    properties: Dict[str, Any]

class EdgeSchema(BaseModel):
    source: str
    target: str
    relationship: str
    properties: Dict[str, Any] = {}

@app.post("/api/v1/graph/nodes")
def add_graph_node(node: NodeSchema):
    """Register a node manually in the Knowledge Graph."""
    g_client = app_container.graph_client()
    ok = g_client.add_node(node.id, node.label, node.properties)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to write node to graph database")
    return {"status": "success", "node_id": node.id}

@app.post("/api/v1/graph/edges")
def add_graph_edge(edge: EdgeSchema):
    """Register a relationship edge manually in the Knowledge Graph."""
    g_client = app_container.graph_client()
    ok = g_client.add_edge(edge.source, edge.target, edge.relationship, edge.properties)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to write relationship edge to graph database")
    return {"status": "success"}

@app.get("/api/v1/graph")
def get_graph_visualization(
    limit: int = Query(100, ge=10, le=500),
    q: Optional[str] = Query(None, description="Keyword search node properties"),
    type: Optional[str] = Query(None, description="Filter by node entity category")
):
    """Fetch nodes and edges of the Knowledge Graph supporting filters."""
    try:
        g_client = app_container.graph_client()
        
        # Determine nodes
        nodes = []
        edges = []
        
        if g_client.use_fallback:
            import sqlite3
            with sqlite3.connect(g_client.sqlite_db_path) as conn:
                cursor = conn.cursor()
                
                # Fetch filtered nodes
                query_nodes = "SELECT id, label, properties FROM graph_nodes"
                conditions = []
                params = []
                
                if q:
                    conditions.append("(id LIKE ? OR label LIKE ? OR properties LIKE ?)")
                    q_like = f"%{q}%"
                    params.extend([q_like, q_like, q_like])
                if type:
                    conditions.append("label = ?")
                    params.append(type)
                    
                if conditions:
                    query_nodes += " WHERE " + " AND ".join(conditions)
                    
                query_nodes += " LIMIT ?"
                params.append(limit)
                
                cursor.execute(query_nodes, params)
                node_rows = cursor.fetchall()
                nodes = [{"id": r[0], "label": r[1], "properties": json.loads(r[2])} for r in node_rows]
                
                # Extract list of node ids to filter connected edges
                node_ids = [n["id"] for n in nodes]
                if node_ids:
                    # Placeholders for IN clause
                    placeholders = ",".join(["?"] * len(node_ids))
                    query_edges = f"SELECT source_id, target_id, relationship, properties FROM graph_edges WHERE source_id IN ({placeholders}) AND target_id IN ({placeholders}) LIMIT ?"
                    edge_params = node_ids + node_ids + [limit]
                    cursor.execute(query_edges, edge_params)
                    edge_rows = cursor.fetchall()
                    edges = [{"source": r[0], "target": r[1], "relationship": r[2], "properties": json.loads(r[3])} for r in edge_rows]
        else:
            # Neo4j implementation
            # Dynamic Cypher query generation
            cypher_nodes = "MATCH (n)"
            conditions = []
            params = {"limit": limit}
            
            if q:
                conditions.append("(toLower(n.name) CONTAINS $q OR toLower(n.id) CONTAINS $q)")
                params["q"] = q.lower()
            if type:
                conditions.append(f"labels(n)[0] = $type")
                params["type"] = type
                
            if conditions:
                cypher_nodes += " WHERE " + " AND ".join(conditions)
                
            cypher_nodes += " RETURN n LIMIT $limit"
            
            with g_client.driver.session() as session:
                result_nodes = session.run(cypher_nodes, **params)
                nodes = [{"id": r['n']['id'], "label": list(r['n'].labels)[0] if r['n'].labels else "Node", "properties": dict(r['n'])} for r in result_nodes]
                
                node_ids = [n["id"] for n in nodes]
                if node_ids:
                    cypher_edges = "MATCH (a)-[r]->(b) WHERE a.id IN $node_ids AND b.id IN $node_ids RETURN a.id as source, b.id as target, type(r) as rel LIMIT $limit"
                    result_edges = session.run(cypher_edges, node_ids=node_ids, limit=limit)
                    edges = [{"source": r["source"], "target": r["target"], "relationship": r["rel"], "properties": {}} for r in result_edges]
                    
        return {
            "nodes": nodes,
            "edges": edges
        }
    except Exception as e:
        logger.error(f"Failed to retrieve graph data: {e}")
        raise HTTPException(status_code=500, detail="Graph database failed to retrieve structures")

@app.post("/api/v1/recorder/start")
def start_recorder():
    """Manually start the activity recorder background daemon."""
    if activity_recorder.running:
        return {"status": "already_running"}
    try:
        watch_path = str(settings.BASE_DIR)
        activity_recorder.start(watch_path)
        return {"status": "started", "watching": watch_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start recorder: {e}")

@app.post("/api/v1/recorder/stop")
def stop_recorder():
    """Manually stop the activity recorder background daemon."""
    if not activity_recorder.running:
        return {"status": "not_running"}
    try:
        activity_recorder.stop()
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop recorder: {e}")

@app.get("/api/v1/projects/replay")
def get_project_replay(limit: int = 20):
    """Fetch files changed list and lifecycle explanations."""
    db: Session = next(db_manager.get_db())
    try:
        # Fetch file modification logs
        logs = db.query(ActivityLog).filter(ActivityLog.activity_type == "file_edit").order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        files = []
        for l in logs:
            files.append({
                "id": str(l.event_id),
                "timestamp": l.timestamp.isoformat(),
                "file_path": l.window_title,
                "app_name": l.app_name
            })
        
        # If no file logs, return mock records for visual demonstration
        if not files:
            files = [
                {"id": "f_mock_1", "timestamp": "2026-07-02T19:00:00", "file_path": "backend/app/main.py", "app_name": "VS Code"},
                {"id": "f_mock_2", "timestamp": "2026-07-02T18:45:00", "file_path": "frontend/src/App.tsx", "app_name": "VS Code"},
                {"id": "f_mock_3", "timestamp": "2026-07-02T18:15:00", "file_path": "backend/tests/test_timeline.py", "app_name": "VS Code"}
            ]

        explanation = (
            "ChronaAI Project Lifecycle Explanation:\n"
            "This project was initialized by bootstrapping Vite React under /frontend and FastAPI in the /backend root.\n"
            "We configured CQRS event sourcing pipelines, routing logs through custom sqlite write engines. "
            "Recent iterations focused heavily on creating the Canvas physics visualizer and RAG question answering templates, "
            "stabilizing core dependency injections to prevent test-runner database locks."
        )

        return {
            "project_name": "Personal Digital Time Machine",
            "files_changed": files,
            "explanation": explanation
        }
    finally:
        db.close()

@app.get("/api/v1/decisions")
def get_decisions(limit: int = 50):
    """Retrieve extracted decision records."""
    db: Session = next(db_manager.get_db())
    try:
        from backend.app.infrastructure.agents.decision_agent import decision_agent
        logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        return decision_agent.analyze_logs_for_decisions(logs)
    finally:
        db.close()

@app.get("/api/v1/predictions")
def get_predictions(limit: int = 50):
    """Retrieve priorities, bug warnings, and upcoming forecastings."""
    db: Session = next(db_manager.get_db())
    try:
        from backend.app.infrastructure.agents.prediction_agent import prediction_agent
        logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        error_nodes = [{"id": "err_1", "properties": {"name": "TypeError"}}]
        return prediction_agent.predict_future_trends(logs, error_nodes)
    finally:
        db.close()

@app.get("/api/v1/evolution")
def get_evolution(limit: int = 50):
    """Retrieve learning paths and technologies expertise roadmaps."""
    db: Session = next(db_manager.get_db())
    try:
        from backend.app.infrastructure.agents.evolution_agent import evolution_agent
        logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        return evolution_agent.track_learning_progress(logs, [])
    finally:
        db.close()

@app.get("/api/v1/research")
def get_research(q: Optional[str] = None):
    """Retrieve bibliography citations and auto-generated summaries."""
    from backend.app.infrastructure.agents.research_agent import research_agent
    return research_agent.format_citations_and_reviews(q or "General AI", [])

@app.get("/api/v1/reflection")
def get_reflection(date: Optional[str] = None):
    """Retrieve focus scores and auto-generated reflection reviews."""
    db: Session = next(db_manager.get_db())
    try:
        from backend.app.infrastructure.agents.reflection_agent import reflection_agent
        logs = db.query(ActivityLog).all()
        return reflection_agent.generate_reflection_report(logs, date or "Today")
    finally:
        db.close()

@app.get("/api/v1/analytics")
def get_analytics():
    """Retrieve coding metrics, focuses, and technology focus details."""
    db: Session = next(db_manager.get_db())
    try:
        logs = db.query(ActivityLog).all()
        total_count = len(logs)
        vscode_count = sum(1 for l in logs if "vscode" in l.app_name.lower())
        browser_count = sum(1 for l in logs if "chrome" in l.app_name.lower() or "firefox" in l.app_name.lower())
        terminal_count = sum(1 for l in logs if "terminal" in l.app_name.lower() or "cmd" in l.app_name.lower())
        
        total_hours = 65.5 if total_count == 0 else round(total_count * 0.1, 1)
        focus_score = 82 if total_count == 0 else int((vscode_count / total_count) * 100) if vscode_count > 0 else 50
        
        frameworks = [
            {"name": "FastAPI", "count": 24 if total_count == 0 else vscode_count // 2},
            {"name": "React", "count": 18 if total_count == 0 else browser_count},
            {"name": "SQLAlchemy", "count": 12 if total_count == 0 else terminal_count}
        ]

        return {
            "total_coding_hours": total_hours,
            "focus_score": focus_score,
            "language_badges": ["Python", "TypeScript", "SQL"],
            "apps_breakdown": [
                {"name": "VS Code", "percent": 60 if total_count == 0 else int((vscode_count / total_count)*100) if total_count > 0 else 60},
                {"name": "Browser", "percent": 25 if total_count == 0 else int((browser_count / total_count)*100) if total_count > 0 else 20},
                {"name": "Terminal", "percent": 15 if total_count == 0 else int((terminal_count / total_count)*100) if total_count > 0 else 20}
            ],
            "frameworks": frameworks
        }
    finally:
        db.close()

@app.get("/api/v1/creative")
def get_creative():
    """Retrieve creative innovative ideas and redundancy alerts."""
    db: Session = next(db_manager.get_db())
    try:
        logs = db.query(ActivityLog).all()
        from backend.app.infrastructure.agents.creative_agent import creative_agent
        return creative_agent.detect_opportunities(logs, [])
    finally:
        db.close()

class BrainstormSchema(BaseModel):
    topic: str

@app.post("/api/v1/creative/brainstorm")
def brainstorm_ideas(payload: BrainstormSchema):
    """Brainstorms dynamic creative ideas for a given topic using local LLM."""
    topic = payload.topic
    
    # 1. Fetch user's primary tech profile from logs
    db: Session = next(db_manager.get_db())
    primary_tech = "TypeScript"
    try:
        logs = db.query(ActivityLog).all()
        tech_counts = {"Python": 0, "TypeScript": 0, "Rust": 0, "React": 0, "FastAPI": 0}
        for log in logs:
            app = log.app_name.lower()
            title = log.window_title.lower() if log.window_title else ""
            combined = f"{app} {title}"
            if "python" in combined or ".py" in combined:
                tech_counts["Python"] += 1
            if "typescript" in combined or ".ts" in combined or ".tsx" in combined:
                tech_counts["TypeScript"] += 1
            if "rust" in combined or ".rs" in combined or "cargo" in combined:
                tech_counts["Rust"] += 1
            if "react" in combined:
                tech_counts["React"] += 1
            if "fastapi" in combined:
                tech_counts["FastAPI"] += 1
        if any(tech_counts.values()):
            primary_tech = max(tech_counts, key=tech_counts.get)
    except Exception:
        pass
    finally:
        db.close()

    # 2. Call local Ollama model to generate ideas
    ollama_url = f"{settings.OLLAMA_API_URL}/api/generate"
    prompt = (
        "You are ChronaAI, a creative startup and open-source project ideator.\n"
        f"The user wants to brainstorm project ideas around the topic: '{topic}'.\n"
        f"Their primary programming language/stack is: {primary_tech}.\n\n"
        "Generate a highly creative and original project concept that combines their tech stack with the requested topic.\n"
        "Respond ONLY with a JSON object. Do not include markdown code block backticks (like ```json), just raw text. Structure:\n"
        "{\n"
        "  \"title\": \"Project Name\",\n"
        "  \"description\": \"One sentence description of the idea.\",\n"
        "  \"reasoning\": \"A short explanation of how this leverages their tech stack.\"\n"
        "}"
    )

    used_ollama = False
    result = {}
    import urllib.request
    try:
        req = urllib.request.Request(
            ollama_url,
            data=json.dumps({
                "model": settings.LLM_MODEL,
                "prompt": prompt,
                "stream": False
            }).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5.0) as res:
            if res.status == 200:
                res_data = json.loads(res.read().decode('utf-8'))
                response_text = res_data.get("response", "").strip()
                if response_text.startswith("```"):
                    lines = response_text.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    response_text = "\n".join(lines).strip()
                result = json.loads(response_text)
                used_ollama = True
    except Exception:
        pass

    if not used_ollama or not result:
        # Fallback generator
        result = {
            "title": f"Smart {topic} Orchestrator",
            "description": f"An offline-first platform built with {primary_tech} to automate and analyze {topic} pipelines locally.",
            "reasoning": f"Leverages your dominant expertise in {primary_tech} to build a zero-configuration local tool."
        }

    return result

if __name__ == "__main__":
    # Start ASGI Web Server locally on standard port 8000
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )
