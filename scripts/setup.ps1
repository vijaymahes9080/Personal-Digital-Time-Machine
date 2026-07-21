# ChronaAI Setup Script for Windows (setup.ps1)
# Verifies environment, sets up Python, Node, directories, and compiles requirements.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     Initializing ChronaAI Setup Sequence     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Ensure Local Directories Exist
$BaseDir = Resolve-Path ".."
$DataDir = Join-Path $BaseDir "data"
$Directories = @(
    $DataDir,
    (Join-Path $DataDir "screenshots"),
    (Join-Path $DataDir "qdrant"),
    (Join-Path $DataDir "tantivy"),
    (Join-Path $DataDir "cache")
)

Write-Host "[*] Creating data and index directories..." -ForegroundColor Yellow
foreach ($dir in $Directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "    Created: $dir" -ForegroundColor Gray
    }
}

# 2. Check for Python & Setup Virtual Environment
Write-Host "[*] Checking for Python installation..." -ForegroundColor Yellow
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Python not found in PATH! Please install Python 3.10+ and add it to PATH." -ForegroundColor Red
    Exit 1
}

$PythonVersion = python --version
Write-Host "    Found Python: $PythonVersion" -ForegroundColor Green

$VenvDir = Join-Path $BaseDir "backend\.venv"
if (-not (Test-Path $VenvDir)) {
    Write-Host "[*] Creating Python Virtual Environment under backend/.venv..." -ForegroundColor Yellow
    python -m venv $VenvDir
    Write-Host "    Created virtual environment." -ForegroundColor Green
} else {
    Write-Host "    Python Virtual Environment already exists." -ForegroundColor Gray
}

# Activate virtual environment and install requirements
Write-Host "[*] Installing Python dependencies..." -ForegroundColor Yellow
$PipPath = Join-Path $VenvDir "Scripts\pip.exe"
& $PipPath install --upgrade pip
& $PipPath install -r (Join-Path $BaseDir "backend\requirements.txt")
Write-Host "    Python packages installed successfully." -ForegroundColor Green

# 3. Check for Node.js & npm Workspaces
Write-Host "[*] Checking for Node.js and npm..." -ForegroundColor Yellow
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js not found in PATH! Please install Node.js (v18+) and try again." -ForegroundColor Red
    Exit 1
}

$NodeVersion = node --version
$NpmVersion = npm --version
Write-Host "    Found Node.js: $NodeVersion (npm: $NpmVersion)" -ForegroundColor Green

# 4. Check for Rust Toolchain (Tauri requirement)
Write-Host "[*] Checking for Rust Toolchain (Tauri compiler)..." -ForegroundColor Yellow
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Rust/Cargo toolchain not found. Tauri desktop requires Rust to compile." -ForegroundColor Yellow
    
    # Prompt to install via winget
    $installRust = Read-Host "Would you like to install Rust toolchain natively via winget? (y/n)"
    if ($installRust.ToLower() -eq 'y') {
        Write-Host "[*] Executing winget install Rust.Rustup..." -ForegroundColor Yellow
        winget install Rust.Rustup
        Write-Host "[!] Rust has been queued for installation. Please restart your PowerShell session after installation finishes to update PATH variables." -ForegroundColor Cyan
    } else {
        Write-Host "[!] Skipping Rust installation. You can run the FastAPI backend directly, but Tauri desktop compilation will fail." -ForegroundColor Yellow
    }
} else {
    $CargoVersion = cargo --version
    Write-Host "    Found Rust compiler: $CargoVersion" -ForegroundColor Green
}

# 5. Create Default Configuration File (.env)
$EnvPath = Join-Path $BaseDir ".env"
if (-not (Test-Path $EnvPath)) {
    Write-Host "[*] Creating default environment configuration file (.env)..." -ForegroundColor Yellow
    $EnvContent = @"
# ChronaAI Environment Configuration
DATABASE_URL=sqlite:///data/chrona_ai.db
QDRANT_PREFER_LOCAL=True
NEO4J_PREFER_FALLBACK=True
REDIS_PREFER_FALLBACK=True
EMBEDDING_MODEL=nomic-embed-text
LLM_MODEL=qwen2.5-coder:7b
"@
    Set-Content -Path $EnvPath -Value $EnvContent
    Write-Host "    Created .env file at $EnvPath" -ForegroundColor Green
} else {
    Write-Host "    .env file already exists." -ForegroundColor Gray
}

Write-Host "=============================================" -ForegroundColor Green
Write-Host "      ChronaAI Setup Complete!               " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "To launch the FastAPI backend:" -ForegroundColor Gray
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    .\.venv\Scripts\python.exe app\main.py" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Green
