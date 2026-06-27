#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   AI Freight Pricing Agent Launcher    ${NC}"
echo -e "${BLUE}========================================${NC}"

# Get project root directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo -e "${GREEN}✓ Loaded .env configuration${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Please install it first.${NC}"
  exit 1
fi

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi

  for _ in 1 2 3 4 5; do
    sleep 1
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    [ -z "$pids" ] && return 0
    echo "$pids" | xargs kill -9 2>/dev/null || true
  done

  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  echo -e "${RED}✗ Port $port is still in use by PID(s): $pids${NC}"
  exit 1
}

kill_project_processes() {
  local pids
  pids="$(ps -axo pid=,command= | grep "$PROJECT_DIR" | grep -E 'node_modules/.bin/(nodemon|vite)|@esbuild' | awk '{print $1}' || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# Kill processes on ports 3000 and 3001
echo -e "${YELLOW}→ Cleaning up ports 3000 and 3001...${NC}"
kill_project_processes
kill_port 3000
kill_port 3001
echo -e "${GREEN}✓ Ports cleared${NC}"

# Check PostgreSQL
echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL not found. Please install it first.${NC}"
  exit 1
fi

if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
  echo -e "${YELLOW}→ Starting PostgreSQL...${NC}"
  if command -v brew &> /dev/null; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  fi
  sleep 2
  if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL is not running. Please start it manually.${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Create database
echo -e "${YELLOW}→ Setting up database...${NC}"
if [ -n "${DATABASE_URL:-}" ]; then
  DB_NAME="${DB_NAME:-$(node -e "const u = new URL(process.env.DATABASE_URL); console.log(decodeURIComponent(u.pathname.replace(/^\\//, '')));")}"
  DATABASE_ADMIN_URL="$(node -e "const u = new URL(process.env.DATABASE_URL); u.pathname = '/postgres'; u.search = ''; console.log(u.toString());")"

  if [ -z "$DB_NAME" ]; then
    echo -e "${RED}✗ Could not determine database name from DATABASE_URL.${NC}"
    exit 1
  fi
  if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo -e "${RED}✗ Database name '$DB_NAME' is invalid. Use only letters, numbers, and underscores.${NC}"
    exit 1
  fi

  psql "$DATABASE_ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql "$DATABASE_ADMIN_URL" -c "CREATE DATABASE $DB_NAME"
else
  DB_NAME="${DB_NAME:-aifreightpricingagent_db}"
  if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo -e "${RED}✗ Database name '$DB_NAME' is invalid. Use only letters, numbers, and underscores.${NC}"
    exit 1
  fi
  PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -c "CREATE DATABASE $DB_NAME"
fi
echo -e "${GREEN}✓ Database '${DB_NAME}' ready${NC}"

# Run schema
echo -e "${YELLOW}→ Applying schema...${NC}"
if [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" -f server/schema.sql -q
else
  PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "$DB_NAME" -f server/schema.sql -q
fi
echo -e "${GREEN}✓ Schema applied${NC}"

# Install server dependencies
echo -e "${YELLOW}→ Installing server dependencies...${NC}"
cd server && npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Server dependencies installed${NC}"

# Seed database
echo -e "${YELLOW}→ Seeding database...${NC}"
node seed/index.js
cd "$PROJECT_DIR"

# Install client dependencies
echo -e "${YELLOW}→ Installing client dependencies...${NC}"
cd client && npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Client dependencies installed${NC}"
cd "$PROJECT_DIR"

# Start servers
echo -e "${YELLOW}→ Starting servers...${NC}"

# Start backend with nodemon for hot reload
cd server && npx nodemon --quiet index.js &
SERVER_PID=$!
cd "$PROJECT_DIR"

# Start frontend with vite for hot reload
cd client && npx vite --port 3000 --host &
CLIENT_PID=$!
cd "$PROJECT_DIR"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}→ Shutting down...${NC}"
  kill $SERVER_PID 2>/dev/null || true
  kill $CLIENT_PID 2>/dev/null || true
  kill_port 3000
  kill_port 3001
  echo -e "${GREEN}✓ Shutdown complete${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Application is running!              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}   Frontend: http://localhost:3000      ${NC}"
echo -e "${BLUE}   Backend:  http://localhost:3001      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}   Login: admin@freightai.com / admin123${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop"

# Wait for background processes
wait
