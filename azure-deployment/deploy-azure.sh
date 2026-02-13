#!/bin/bash

# ============================================================================
# TotalEnergies Flotilla - Azure Deployment Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   🚗 TotalEnergies Flotilla Deployment       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# Configuration
# ============================================================================

ENVIRONMENT=${1:-dev}
LOCATION=${2:-eastus}
RESOURCE_GROUP="totalenergies-flotilla-${ENVIRONMENT}-rg"
DEPLOYMENT_NAME="flotilla-deployment-$(date +%Y%m%d-%H%M%S)"

print_header

print_info "Environment: ${ENVIRONMENT}"
print_info "Location: ${LOCATION}"
print_info "Resource Group: ${RESOURCE_GROUP}"

# ============================================================================
# Prerequisites Check
# ============================================================================

print_info "Checking prerequisites..."

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi
print_success "Azure CLI installed"

# Check if logged in
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run: az login"
    exit 1
fi
print_success "Logged into Azure"

SUBSCRIPTION=$(az account show --query name -o tsv)
print_info "Subscription: ${SUBSCRIPTION}"

# ============================================================================
# Create Resource Group
# ============================================================================

print_info "Creating resource group..."

if az group exists --name "${RESOURCE_GROUP}" | grep -q "true"; then
    print_warning "Resource group already exists"
else
    az group create \
        --name "${RESOURCE_GROUP}" \
        --location "${LOCATION}" \
        --tags Environment="${ENVIRONMENT}" Application="TotalEnergies-Flotilla"
    print_success "Resource group created"
fi

# ============================================================================
# Validate Bicep Template
# ============================================================================

print_info "Validating Bicep template..."

az deployment group validate \
    --resource-group "${RESOURCE_GROUP}" \
    --template-file azure-deployment/main.bicep \
    --parameters azure-deployment/parameters.${ENVIRONMENT}.json \
    --verbose --debug
    

print_success "Template validation passed"

# ============================================================================
# Deploy Infrastructure
# ============================================================================

print_info "Deploying infrastructure..."
print_warning "This may take 5-10 minutes..."

az deployment group create \
    --name "${DEPLOYMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --template-file azure-deployment/main.bicep \
    --parameters azure-deployment/parameters.${ENVIRONMENT}.json \
    --verbose

print_success "Infrastructure deployed"

# ============================================================================
# Get Deployment Outputs
# ============================================================================

print_info "Retrieving deployment outputs..."

BACKEND_URL=$(az deployment group show \
    --name "${DEPLOYMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.outputs.backendUrl.value -o tsv)

FRONTEND_URL=$(az deployment group show \
    --name "${DEPLOYMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.outputs.frontendUrl.value -o tsv)

STORAGE_ACCOUNT=$(az deployment group show \
    --name "${DEPLOYMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query properties.outputs.storageAccountName.value -o tsv)

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🎉 Deployment Completed Successfully!      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 Application URLs:${NC}"
echo -e "   Frontend: ${GREEN}${FRONTEND_URL}${NC}"
echo -e "   Backend:  ${GREEN}${BACKEND_URL}${NC}"
echo ""
echo -e "${BLUE}☁️  Azure Resources:${NC}"
echo -e "   Resource Group: ${RESOURCE_GROUP}"
echo -e "   Storage Account: ${STORAGE_ACCOUNT}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Deploy backend code:"
echo -e "      ${BLUE}cd fleet-fuel-card-backend${NC}"
echo -e "      ${BLUE}./deploy-backend.sh${NC}"
echo ""
echo -e "   2. Deploy frontend code:"
echo -e "      ${BLUE}cd totalenergies-flotilla${NC}"
echo -e "      ${BLUE}./deploy-frontend.sh${NC}"
echo ""
echo -e "   3. Initialize database:"
echo -e "      ${BLUE}az webapp ssh --name totalenergies-flotilla-${ENVIRONMENT}-api --resource-group ${RESOURCE_GROUP}${NC}"
echo -e "      ${BLUE}npm run seed${NC}"
echo ""
print_warning "IMPORTANT: Change default JWT secrets in production!"
echo ""
