import os
import sys
import time
import uuid
import subprocess
from datetime import datetime, timezone
import threading
from loguru import logger
import mss
import pyperclip
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from backend.app.core.config import settings
from backend.app.domain.events import (
    WindowSwitchedEvent,
    ClipboardCopiedEvent,
    FileEditedEvent,
    ScreenshotCapturedEvent
)
from backend.app.infrastructure.database.postgres import db_manager
from backend.app.infrastructure.database.event_store import event_store_repo

# Import projections so subscriber registrations execute
import backend.app.infrastructure.database.projections

# Define platform constants
IS_WINDOWS = sys.platform == "win32"
IS_MAC = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")

if IS_WINDOWS:
    try:
        import win32gui
        import win32process
        import psutil
    except ImportError:
        logger.warning("pywin32 or psutil not installed. Native Windows tracking may be restricted.")

class WorkspaceFileHandler(FileSystemEventHandler):
    def __init__(self, recorder):
        self.recorder = recorder
        self.debounce_cache = {}

    def on_any_event(self, event):
        if event.is_directory:
            return

        # Skip files inside git, data, or cache directories
        ignored_patterns = [".git", "data", "__pycache__", ".venv", "node_modules", "target"]
        if any(pattern in event.src_path for pattern in ignored_patterns):
            return

        # Apply a simple debounce filter to avoid duplicate events on save
        now = time.time()
        cached_time = self.debounce_cache.get(event.src_path, 0)
        if now - cached_time < settings.FILE_WATCHER_DEBOUNCE_SEC:
            return
        
        self.debounce_cache[event.src_path] = now
        
        change_type = "modified"
        if event.event_type == "created":
            change_type = "created"
        elif event.event_type == "deleted":
            change_type = "deleted"

        ext = os.path.splitext(event.src_path)[1].replace(".", "")
        
        # Trigger event capture
        self.recorder.record_file_edit(event.src_path, change_type, ext)

class ActivityRecorder:
    def __init__(self):
        self.running = False
        self.last_window_title = ""
        self.last_app_name = ""
        self.last_clipboard_text = ""
        
        # Threads
        self.window_thread = None
        self.clipboard_thread = None
        self.screenshot_thread = None
        
        # File System Watcher
        self.file_observer = None

    def start(self, watch_path: str) -> None:
        """Starts background recorder engines."""
        if self.running:
            logger.warning("Recorder is already running.")
            return

        self.running = True
        logger.info(f"Starting ChronaAI Activity Recorder on workspace: {watch_path}")

        # 1. Start OS-Native Active Window Polling Thread
        self.window_thread = threading.Thread(target=self._poll_active_window, daemon=True)
        self.window_thread.start()

        # 2. Start Clipboard Polling Thread
        self.clipboard_thread = threading.Thread(target=self._poll_clipboard, daemon=True)
        self.clipboard_thread.start()

        # 3. Start Screenshot Grabber Thread
        self.screenshot_thread = threading.Thread(target=self._capture_screenshots, daemon=True)
        self.screenshot_thread.start()

        # 4. Start Workspace File Watcher
        if os.path.exists(watch_path):
            self.file_observer = Observer()
            handler = WorkspaceFileHandler(self)
            self.file_observer.schedule(handler, watch_path, recursive=True)
            self.file_observer.start()
            logger.info("Workspace File System watcher started.")
        else:
            logger.error(f"Workspace watch directory not found: {watch_path}")

    def stop(self) -> None:
        """Gracefully stops all recording streams."""
        self.running = False
        if self.file_observer:
            self.file_observer.stop()
            self.file_observer.join()
        logger.info("ChronaAI Activity Recorder stopped.")

    def record_file_edit(self, file_path: str, change_type: str, extension: str) -> None:
        """Appends a File Edited event into the store."""
        event = FileEditedEvent(
            file_path=file_path,
            change_type=change_type,
            extension=extension
        )
        self._commit_event(event)

    def _commit_event(self, event) -> None:
        """Saves the event to the Event Store database session."""
        db = next(db_manager.get_db())
        try:
            event_store_repo.append(
                session=db,
                stream_id="activity_history",
                events=[event],
                expected_version=self._get_current_stream_version(db)
            )
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to write event {event.__class__.__name__} to store: {e}")
        finally:
            db.close()

    def _get_current_stream_version(self, db) -> int:
        from backend.app.infrastructure.database.models import StoredEvent
        from sqlalchemy import desc
        row = (
            db.query(StoredEvent.version)
            .filter(StoredEvent.stream_id == "activity_history")
            .order_by(desc(StoredEvent.version))
            .first()
        )
        return row[0] if row else 0

    def _poll_active_window(self) -> None:
        """Continuous polling loop to catch foreground application changes."""
        while self.running:
            try:
                app_name, window_title, proc_path, pid = self._get_foreground_window_details()
                
                # Check for focus shift
                if window_title and (window_title != self.last_window_title or app_name != self.last_app_name):
                    self.last_window_title = window_title
                    self.last_app_name = app_name
                    
                    logger.info(f"Focus switched: [{app_name}] - {window_title}")
                    
                    event = WindowSwitchedEvent(
                        app_name=app_name,
                        window_title=window_title,
                        process_path=proc_path,
                        pid=pid
                    )
                    self._commit_event(event)
            except Exception as e:
                logger.error(f"Error polling foreground window: {e}")
            
            time.sleep(settings.WINDOW_POLL_INTERVAL_SEC)

    def _poll_clipboard(self) -> None:
        """Continuous polling loop for text updates copied to the clipboard."""
        # Grab current text on start to prevent registering existing content
        try:
            self.last_clipboard_text = pyperclip.paste()
        except Exception:
            pass

        while self.running:
            try:
                current_text = pyperclip.paste()
                if current_text and current_text != self.last_clipboard_text:
                    self.last_clipboard_text = current_text
                    
                    # Truncate logged statements in logs for privacy
                    display_text = current_text[:60] + "..." if len(current_text) > 60 else current_text
                    logger.info(f"Clipboard capture: '{display_text.strip()}'")

                    app_name, window_title, _, _ = self._get_foreground_window_details()

                    event = ClipboardCopiedEvent(
                        text_content=current_text,
                        app_name=app_name,
                        window_title=window_title
                    )
                    self._commit_event(event)
            except Exception as e:
                logger.debug(f"Error reading clipboard: {e}")
                
            time.sleep(settings.CLIPBOARD_POLL_INTERVAL_SEC)

    def _capture_screenshots(self) -> None:
        """Periodically grabs screenshots of the primary monitor."""
        while self.running:
            # Let the focus stabilize
            time.sleep(settings.SCREENSHOT_INTERVAL_SEC)
            if not self.running:
                break
                
            try:
                # Capture current window title to associate with screenshot metadata
                app_name, window_title, _, _ = self._get_foreground_window_details()
                
                # File details
                timestamp = int(time.time())
                file_uuid = str(uuid.uuid4())[:8]
                file_name = f"ss_{timestamp}_{file_uuid}.png"
                output_path = os.path.join(settings.SCREENSHOTS_DIR, file_name)

                # Save Screenshot natively via mss
                with mss.mss() as sct:
                    # Capture primary monitor (index 1)
                    if len(sct.monitors) > 1:
                        primary_monitor = sct.monitors[1]
                        sct_img = sct.grab(primary_monitor)
                        mss.tools.to_png(sct_img.rgb, sct_img.size, output=output_path)
                        
                        logger.info(f"Screenshot logged: {file_name} under [{app_name}]")
                        
                        event = ScreenshotCapturedEvent(
                            file_name=file_name,
                            relative_path=f"data/screenshots/{file_name}",
                            app_name=app_name,
                            window_title=window_title
                        )
                        self._commit_event(event)
            except Exception as e:
                logger.error(f"Failed to capture screenshot: {e}")

    def _get_foreground_window_details(self) -> tuple[str, str, str, int]:
        """OS-neutral wrapper to grab active window details."""
        if IS_WINDOWS:
            try:
                hwnd = win32gui.GetForegroundWindow()
                title = win32gui.GetWindowText(hwnd)
                
                # Get PID and executable path
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                if pid > 0:
                    proc = psutil.Process(pid)
                    app_name = proc.name()
                    # Strip .exe suffix
                    if app_name.lower().endswith(".exe"):
                        app_name = app_name[:-4]
                    # Capitalize nicely
                    app_name = app_name.capitalize()
                    proc_path = proc.exe()
                    return app_name, title, proc_path, pid
            except Exception:
                pass
            return "Unknown", "", "", 0

        elif IS_MAC:
            # osascript call to fetch active app and window name
            cmd = (
                "osascript -e 'tell application \"System Events\" to tell (first process whose frontmost is true) "
                "to set {appName, windowName} to {name, name of first window}'; "
                "osascript -e 'get appName & \"|\" & windowName'"
            )
            try:
                output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode("utf-8").strip()
                if "|" in output:
                    parts = output.split("|")
                    return parts[0], parts[1], "", 0
            except Exception:
                pass
            return "Unknown", "", "", 0

        elif IS_LINUX:
            # xdotool call to fetch active window name and PID
            try:
                win_id = subprocess.check_output(["xdotool", "getactivewindow"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
                win_title = subprocess.check_output(["xdotool", "getwindowname", win_id], stderr=subprocess.DEVNULL).decode("utf-8").strip()
                pid = subprocess.check_output(["xdotool", "getwindowpid", win_id], stderr=subprocess.DEVNULL).decode("utf-8").strip()
                
                app_name = "Unknown"
                if pid:
                    pid_int = int(pid)
                    # read application command
                    with open(f"/proc/{pid_int}/comm", "r") as f:
                        app_name = f.read().strip().capitalize()
                return app_name, win_title, "", pid_int
            except Exception:
                pass
            return "Unknown", "", "", 0

        return "Unknown", "", "", 0

# Singleton instance for modular DI wiring
activity_recorder = ActivityRecorder()
