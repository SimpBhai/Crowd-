#!/bin/bash
set -e

echo "1. Checking /api/health..."
curl -s http://localhost:3000/api/health | grep '"status":"ok"'

echo "2. Checking /api/users..."
curl -s http://localhost:3000/api/users | grep '"bihari-achhut"'

echo "3. Checking /api/messages..."
curl -s http://localhost:3000/api/messages | grep '"messages"'

echo "4. Checking /api/global-marker..."
curl -s http://localhost:3000/api/global-marker | grep '"marker"'

echo "5. Checking /api/inspection-points..."
curl -s http://localhost:3000/api/inspection-points | grep '"points"'

echo "6. Checking /api/groups..."
curl -s http://localhost:3000/api/groups | grep '"groups"'

echo "7. Checking /api/tags..."
curl -s http://localhost:3000/api/tags | grep '"tags"'

echo "8. Checking /api/assignments..."
curl -s http://localhost:3000/api/assignments | grep '"assignments"'

echo "ALL 8 CORE BACKEND API ENDPOINTS ARE FULLY OPERATIONAL!"
