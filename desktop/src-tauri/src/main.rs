// Prevents additional console window on Windows in release
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::process::Command;
use std::thread;
use std::time::Duration;

fn start_backend_sidecar() {
  // Spawn the Python FastAPI backend in a separate thread
  thread::spawn(|| {
    println!("Starting ChronaAI FastAPI backend daemon...");
    
    // Determine command based on platform
    let mut child = if cfg!(target_os = "windows") {
      Command::new("powershell")
        .args(&[
          "-NoProfile",
          "-Command",
          "backend/.venv/Scripts/python.exe backend/app/main.py"
        ])
        .spawn()
        .expect("Failed to spawn Windows python backend service")
    } else {
      Command::new("bash")
        .args(&[
          "-c",
          "backend/.venv/bin/python backend/app/main.py"
        ])
        .spawn()
        .expect("Failed to spawn Unix python backend service")
    };

    let status = child.wait().expect("FastAPI backend crashed or failed to exit cleanly");
    println!("FastAPI backend process exited with status: {}", status);
  });
}

fn main() {
  // 1. Launch FastAPI sidecar daemon
  start_backend_sidecar();

  // Give backend 2 seconds to bind port 8000 before Tauri window triggers requests
  thread::sleep(Duration::from_secs(2));

  // 2. Start Tauri Desktop window loop
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
