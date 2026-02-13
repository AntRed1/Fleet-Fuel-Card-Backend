#!/bin/bash

# ============================================================================
# Backend API - Deployment Script
# ============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT=${1:-dev}
RESOURCE_GROUP="totalenergies-flotilla-${ENVIRONMENT}-rg"
APP_NAME="totalenergies-flotilla-${ENVIRONMENT}-api"

echo -e "${BLUE}🚀 Deploying Backend API to Azure...${NC}"
echo ""

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Azure. Please run: az login${NC}"
    exit 1
fi

# Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "Temp directory: $TEMP_DIR"

# Copy necessary files
cp -r src "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true

# Create .deployment file for Azure
cat > "$TEMP_DIR/.deployment" << 'EOF'
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
EOF

# Create startup script
cat > "$TEMP_DIR/startup.sh" << 'EOF'
#!/bin/bash
cd /home/site/wwwroot
npm install --production
npm run seed || true
node src/server.js
EOF

chmod +x "$TEMP_DIR/startup.sh"

# Create zip
cd "$TEMP_DIR"
zip -r backend.zip . -x "*.git*" "node_modules/*" ".env"
cd -

echo -e "${GREEN}✅ Package created${NC}"

# Deploy to Azure
echo -e "${BLUE}☁️  Deploying to Azure App Service...${NC}"

az webapp deploy \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --src-path "$TEMP_DIR/backend.zip" \
    --type zip

# Configure startup command
echo -e "${BLUE}⚙️  Configuring startup command...${NC}"

az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --startup-file "startup.sh"

# Restart app
echo -e "${BLUE}🔄 Restarting app...${NC}"

az webapp restart \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME"

# Cleanup
rm -rf "$TEMP_DIR"

# Get URL
APP_URL=$(az webapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --query defaultHostName -o tsv)

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Backend Deployed Successfully!          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Backend URL:${NC} https://$APP_URL"
echo -e "${BLUE}🔍 Health Check:${NC} https://$APP_URL/health"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test the health endpoint"
echo "2. Initialize database (if first deployment):"
echo "   az webapp ssh --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   npm run seed"
echo ""
