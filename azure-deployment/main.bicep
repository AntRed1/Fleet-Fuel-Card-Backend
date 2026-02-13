// ============================================================================
// TotalEnergies Flotilla - Azure Infrastructure
// Complete deployment for Backend API + Frontend App
// FIXED: SCM Container Restart Issues
// ============================================================================

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param appName string = 'totalenergies-flotilla'

@description('JWT Secret for authentication (min 32 characters)')
@secure()
param jwtSecret string

@description('JWT Refresh Secret (min 32 characters)')
@secure()
param jwtRefreshSecret string

@description('SKU for App Service Plan')
@allowed(['F1', 'B1', 'B2', 'S1', 'S2', 'P1V2', 'P2V2'])
param appServicePlanSku string = 'B1'

// ============================================================================
// Variables
// ============================================================================

var resourceBaseName = '${appName}-${environment}'
var storageName = take(replace('${appName}${environment}stg', '-', ''), 24)

var tags = {
  Application: 'TotalEnergies Flotilla'
  Environment: environment
  ManagedBy: 'Bicep'
  CostCenter: 'Fleet-Management'
}

// ============================================================================
// App Service Plan
// ============================================================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${resourceBaseName}-plan'
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ============================================================================
// Storage Account (for SQLite DB and uploads persistence)
// ============================================================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// File shares for backend persistence
resource backendDataShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  name: '${storageAccount.name}/default/backend-data'
  properties: {
    shareQuota: 1024
  }
}

resource backendUploadsShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  name: '${storageAccount.name}/default/backend-uploads'
  properties: {
    shareQuota: 5120
  }
}

// ============================================================================
// Application Insights
// ============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${resourceBaseName}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourceBaseName}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 30
  }
}

// ============================================================================
// Backend API App Service
// ============================================================================

resource backendApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${resourceBaseName}-api'
  location: location
  tags: union(tags, { Component: 'Backend-API' })
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: appServicePlanSku != 'F1'
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/health'
      cors: {
        allowedOrigins: [
          'https://${resourceBaseName}-web.azurewebsites.net'
        ]
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environment
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: jwtRefreshSecret
        }
        {
          name: 'ALLOWED_ORIGINS'
          value: 'https://${resourceBaseName}-web.azurewebsites.net'
        }
        {
          name: 'DB_PATH'
          value: '/home/data/fleet-fuel.db'
        }
        {
          name: 'UPLOAD_DIR'
          value: '/home/uploads'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        // FIXED: Deshabilitar build durante deployment para evitar SCM restart
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        // FIXED: Run from package para deployment más confiable
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        // FIXED: Deshabilitar Oryx build
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'false'
        }
        // FIXED: Optimización de ZIP deploy
        {
          name: 'SCM_ZIPDEPLOY_DONOT_PRESERVE_FILETIME'
          value: 'true'
        }
      ]
      azureStorageAccounts: {
        data: {
          type: 'AzureFiles'
          accountName: storageName
          shareName: 'backend-data'
          mountPath: '/home/data'
          accessKey: storageAccount.listKeys().keys[0].value
        }
        uploads: {
          type: 'AzureFiles'
          accountName: storageName
          shareName: 'backend-uploads'
          mountPath: '/home/uploads'
          accessKey: storageAccount.listKeys().keys[0].value
        }
      }
    }
  }
}

// Backend deployment slot for staging (solo en prod)
resource backendStagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = if (environment == 'prod') {
  parent: backendApp
  name: 'staging'
  location: location
  tags: union(tags, { Slot: 'Staging' })
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
    }
  }
}

// ============================================================================
// Frontend Web App Service
// ============================================================================

resource frontendApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${resourceBaseName}-web'
  location: location
  tags: union(tags, { Component: 'Frontend-Web' })
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: appServicePlanSku != 'F1'
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'VITE_API_URL'
          value: 'https://${backendApp.properties.defaultHostName}/api'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        // FIXED: Deshabilitar build durante deployment
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        // FIXED: Run from package
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        // FIXED: Deshabilitar Oryx
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'false'
        }
        // FIXED: Optimización de ZIP deploy
        {
          name: 'SCM_ZIPDEPLOY_DONOT_PRESERVE_FILETIME'
          value: 'true'
        }
      ]
    }
  }
}

// ============================================================================
// Outputs
// ============================================================================

output backendUrl string = 'https://${backendApp.properties.defaultHostName}'
output frontendUrl string = 'https://${frontendApp.properties.defaultHostName}'
output storageAccountName string = storageAccount.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output resourceGroupName string = resourceGroup().name
