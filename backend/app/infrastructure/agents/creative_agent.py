import os
import hashlib
import json
import urllib.request
from typing import List, Dict, Any
from pathlib import Path
from backend.app.core.config import settings

class CreativeAgent:
    def detect_opportunities(self, logs: List[Any], nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Scans for duplicated files/topics and maps innovative opportunities."""
        
        # 1. Walk workspace to detect duplicates & redundancies
        duplicates = []
        file_hashes = {}
        file_names = {}
        
        workspace_dir = settings.BASE_DIR
        ignored_dirs = {
            ".git", "node_modules", ".venv", "venv", "__pycache__", 
            ".pytest_cache", "dist", "target", "data", "qdrant_storage", 
            "neo4j_data", "redis_data", "tantivy_index", "logs"
        }
        
        # We limit scanning to avoid potential hangs in very large directories
        scanned_count = 0
        max_scan_files = 300
        
        try:
            for root, dirs, files in os.walk(workspace_dir):
                # prune directory walk
                dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith('.')]
                
                for file in files:
                    if scanned_count >= max_scan_files:
                        break
                    
                    if file.endswith(('.py', '.ts', '.tsx', '.js', '.jsx', '.rs', '.css', '.html', '.toml')):
                        file_path = Path(root) / file
                        try:
                            # Read contents
                            content = file_path.read_text(encoding='utf-8', errors='ignore')
                            scanned_count += 1
                            
                            # Normalize whitespace to avoid small differences
                            cleaned_content = "".join(content.split())
                            if not cleaned_content:
                                continue
                                
                            content_hash = hashlib.md5(cleaned_content.encode('utf-8')).hexdigest()
                            rel_path = file_path.relative_to(workspace_dir).as_posix()
                            
                            # Check exact duplicates
                            if content_hash in file_hashes:
                                duplicates.append({
                                    "id": f"dup_hash_{len(duplicates) + 1}",
                                    "file_a": file_hashes[content_hash],
                                    "file_b": rel_path,
                                    "confidence": 1.0,
                                    "reason": "Exact file contents match (identical MD5 hash)"
                                })
                            else:
                                file_hashes[content_hash] = rel_path
                                
                            # Check name collisions
                            if file in file_names:
                                # Avoid adding if already added as exact hash match
                                already_added = any(
                                    (d["file_b"] == rel_path and d["file_a"] == file_names[file]) or
                                    (d["file_a"] == rel_path and d["file_b"] == file_names[file])
                                    for d in duplicates
                                )
                                if not already_added:
                                    duplicates.append({
                                        "id": f"dup_name_{len(duplicates) + 1}",
                                        "file_a": file_names[file],
                                        "file_b": rel_path,
                                        "confidence": 0.8,
                                        "reason": "Filename duplication in different subfolders"
                                    })
                            else:
                                file_names[file] = rel_path
                        except Exception:
                            continue
        except Exception:
            pass

        # 2. Extract active tech stacks/topics from logs/workspace to craft dynamic innovations
        tech_counts = {"Python": 0, "TypeScript": 0, "Rust": 0, "React": 0, "FastAPI": 0}
        
        # Analyze file types present in the workspace to see active stacks
        for f in file_names.keys():
            if f.endswith('.py'):
                tech_counts["Python"] += 1
            elif f.endswith('.tsx') or f.endswith('.ts'):
                tech_counts["TypeScript"] += 1
            elif f.endswith('.rs'):
                tech_counts["Rust"] += 1
        
        # Also analyze logs
        for log in logs:
            app = getattr(log, "app_name", "").lower()
            title = getattr(log, "window_title", "").lower()
            
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

        primary_tech = max(tech_counts, key=tech_counts.get) if any(tech_counts.values()) else "TypeScript"
        
        # 3. Dynamic Suggestions using local LLM if available, else smart fallbacks
        innovations = []
        used_ollama = False
        
        # Construct summary of logs for LLM context
        log_summaries = []
        for l in logs[:10]:
            app = getattr(l, "app_name", "")
            title = getattr(l, "window_title", "")
            log_summaries.append(f"- App: {app}, Title: {title}")
        logs_block = "\n".join(log_summaries) if log_summaries else "No recent activity logs."

        prompt = (
            "You are ChronaAI, a creative startup and open-source project ideator.\n"
            "Based on the user's coding workspace, they are working on a Personal Digital Time Machine.\n"
            f"Their primary technology stack appears to be: {primary_tech}.\n"
            f"Here are their recent activity logs:\n{logs_block}\n\n"
            "Generate two highly creative and relevant project ideas that the user could build:\n"
            "1. An innovative 'Startup Idea' that expands or leverages their tech stack.\n"
            "2. A cool 'Open Source Project' that solves a real developer pain point related to their work.\n\n"
            "Respond ONLY with a JSON list containing exactly two objects. Do not include markdown code block backticks (like ```json), just raw text. Structure:\n"
            "[\n"
            "  {\n"
            "    \"title\": \"Project Name\",\n"
            "    \"description\": \"One sentence description.\",\n"
            "    \"type\": \"Startup Idea\" or \"Open Source Project\"\n"
            "  }\n"
            "]"
        )
        
        try:
            req = urllib.request.Request(
                f"{settings.OLLAMA_API_URL}/api/generate",
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
                    # Clean markdown wrappers if any
                    if response_text.startswith("```"):
                        lines = response_text.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines[-1].startswith("```"):
                            lines = lines[:-1]
                        response_text = "\n".join(lines).strip()
                    innovations = json.loads(response_text)
                    used_ollama = True
        except Exception:
            pass

        # Fallback template if Ollama is offline or fails
        if not used_ollama or not innovations:
            # Let's provide customized suggestions based on the primary_tech
            if primary_tech == "Python":
                innovations = [
                    {
                        "title": "Local AI Stream Event-Sourcing (LAISES)",
                        "description": "A high-performance Python toolkit to event-source local OS window and file modifications into semantic RAG vectors.",
                        "type": "Startup Idea"
                    },
                    {
                        "title": "FastAPI Dependency Injector Inspector",
                        "description": "Visual debugger middleware for FastAPI apps to chart container setup, provider wiring, and lifecycles in real-time.",
                        "type": "Open Source Project"
                    }
                ]
            elif primary_tech == "Rust":
                innovations = [
                    {
                        "title": "Tauri Local Memory Database (TLM-DB)",
                        "description": "A zero-dependency embedded database for Tauri applications with automatic vector embeddings and hybrid SQLite search capabilities.",
                        "type": "Startup Idea"
                    },
                    {
                        "title": "Rust Window Watcher Daemon",
                        "description": "A cross-platform (Win32, AppKit, X11) system activity observer written in pure Rust with minimal CPU overhead.",
                        "type": "Open Source Project"
                    }
                ]
            else:  # TypeScript / React / default
                innovations = [
                    {
                        "title": "Offline-First Local AI RAG Frameworks",
                        "description": "Building fully secure, zero-docker local vector indices directly targeting Tauri applications. Opportunities for enterprise local privacy memory managers.",
                        "type": "Startup Idea"
                    },
                    {
                        "title": "Canvas Verlet Force Physics Layout for Graph DB",
                        "description": "Formulating a zero-dependency HTML5 canvas layout algorithm in React/TS for fast local nodes plotting. Opportunity for open-source package release.",
                        "type": "Open Source Project"
                    }
                ]

        return {
            "duplicates": duplicates,
            "innovations": innovations,
            "used_ollama": used_ollama
        }

creative_agent = CreativeAgent()
