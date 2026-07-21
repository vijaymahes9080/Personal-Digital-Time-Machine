#!/usr/bin/env bash
# ChronaAI Setup Script for macOS / Linux (setup.sh)
# Verifies environment, sets up Python, Node, directories, and requirements.

set -e

# ANSI colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}     Initializing ChronaAI Setup Sequence     ${NC}"
echo -e "${CYAN}=============================================${NC}"

# 1. Ensure Local Directories Exist
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$BASE_DIR/data"

echo -e "${YELLOW}[*] Creating data and index directories...${NC}"
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/screenshots"
mkdir -p "$DATA_DIR/qdrant"
mkdir -p "$DATA_DIR/tantivy"
mkdir -p "$DATA_DIR/cache"
echo -e "    Directories created under $DATA_DIR"

# 2. Check for Python & Setup Virtual Environment
echo -e "${YELLOW}[*] Checking for Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[!] Python3 not found in PATH! Please install Python 3.10+ and try again.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "    Found Python: $PYTHON_VERSION"

VENV_DIR="$BASE_DIR/backend/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}[*] Creating Python Virtual Environment under backend/.venv...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "    Created virtual environment."
else
    echo -e "    Python Virtual Environment already exists."
fi

# Activate virtual environment and install requirements
echo -e "${YELLOW}[*] Installing Python dependencies...${NC}"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$BASE_DIR/backend/requirements.txt"
echo -e "    Python packages installed successfully."

# 3. Check for Node.js
echo -e "${YELLOW}[*] Checking for Node.js and npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[!] Node.js not found in PATH! Please install Node.js (v18+) and try again.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "    Found Node.js: $NODE_VERSION (npm: $NPM_VERSION)"

# 4. Check for Rust Toolchain (Tauri requirement)
echo -e "${YELLOW}[*] Checking for Rust Toolchain (Tauri compiler)...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}[!] Rust/Cargo toolchain not found. Tauri desktop requires Rust to compile.${NC}"
    echo -e "    Would you like to install Rust toolchain natively now? (y/n)"
    read -r install_rust
    if [ "$install_rust" = "y" ] || [ "$install_rust" = "Y" ]; then
        echo -e "${YELLOW}[*] Downloading and running rustup installer...${NC}"
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        echo -e "${CYAN}[!] Rust installed. Please restart your terminal session or run 'source \$HOME/.cargo/env' to load Cargo.${NC}"
    else
        echo -e "${YELLOW}[!] Skipping Rust installation. You can run the FastAPI backend, but compiling Tauri desktop will fail.${NC}"
    fi
else
    CARGO_VERSION=$(cargo --version)
    echo -e "    Found Rust compiler: $CARGO_VERSION"
fi

# 5. Create Default Configuration File (.env)
ENV_PATH="$BASE_DIR/.env"
if [ ! -f "$ENV_PATH" ]; then
    echo -e "${YELLOW}[*] Creating default environment configuration file (.env)...${NC}"
    cat <<EOT > "$ENV_PATH"
# ChronaAI Environment Configuration
DATABASE_URL=sqlite:///data/chrona_ai.db
QDRANT_PREFER_LOCAL=True
NEO4J_PREFER_FALLBACK=True
REDIS_PREFER_FALLBACK=True
EMBEDDING_MODEL=nomic-embed-text
LLM_MODEL=qwen2.5-coder:7b
EOT
    echo -e "    Created .env file at $ENV_PATH"
else
    echo -e "    .env file already exists."
fi

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}      ChronaAI Setup Complete!               ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "To launch the FastAPI backend:"
echo -e "    cd backend"
echo -e "    source .venv/bin/activate"
echo -e "    python app/main.py"
echo -e "${GREEN}=============================================${NC}"
