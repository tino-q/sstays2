#!/bin/bash
# E2E Test Setup Script
# Uses Makefile commands to ensure all required services are running

set -e

# Colors for output
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
RESET='\033[0m'

echo -e "${BLUE}🔧 E2E Test Setup${RESET}"
echo ""

# Function to check if Supabase is running (from status output)
is_supabase_running() {
    make status 2>/dev/null | grep -q "API URL:" 2>/dev/null
}

# Function to wait for health endpoint
wait_for_health() {
    local max_attempts=15
    local attempt=1
    
    echo -e "${YELLOW}Waiting for health endpoint...${RESET}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
           "http://127.0.0.1:54321/functions/v1/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Health endpoint is ready${RESET}"
            return 0
        fi
        
        echo -e "${YELLOW}  Attempt $attempt/$max_attempts...${RESET}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Health endpoint not accessible${RESET}"
    return 1
}

# Check current status
echo -e "${BLUE}Checking service status...${RESET}"
make status

# Start Supabase if not running
if ! is_supabase_running; then
    echo -e "${YELLOW}Starting Supabase...${RESET}"
    make start
else
    echo -e "${GREEN}✅ Supabase is already running${RESET}"
fi

# Check if Edge Functions are running
echo -e "${BLUE}Checking Edge Functions...${RESET}"
if ! pgrep -f "supabase functions serve" > /dev/null; then
    echo -e "${YELLOW}Starting Edge Functions...${RESET}"
    make dev > /dev/null 2>&1 &
    sleep 3  # Give Edge Functions time to start
fi

# Wait for health endpoint to be ready
if wait_for_health; then
    echo -e "${GREEN}✅ Backend services are ready${RESET}"
else
    echo -e "${RED}❌ Edge Functions failed to start${RESET}"
    echo -e "${YELLOW}💡 Try manually: make dev${RESET}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 E2E test setup complete!${RESET}"
echo -e "${BLUE}💡 Playwright will automatically start frontend${RESET}"
echo ""