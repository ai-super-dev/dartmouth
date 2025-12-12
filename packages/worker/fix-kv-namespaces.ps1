# ============================================================================
# Fix KV Namespaces - Dartmouth Worker
# ============================================================================
# This script checks and creates KV namespaces if they don't exist
# Run from packages/worker directory: .\fix-kv-namespaces.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 Fixing KV Namespaces" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "wrangler.toml")) {
    Write-Host "❌ Error: wrangler.toml not found" -ForegroundColor Red
    Write-Host "Please run this script from packages/worker directory"
    exit 1
}

# Step 1: List existing KV namespaces
Write-Host "Step 1: Listing existing KV namespaces..." -ForegroundColor Blue
try {
    $kvList = npx wrangler kv:namespace list 2>&1 | Out-String
    Write-Host $kvList
} catch {
    Write-Host "⚠️  Could not list KV namespaces: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check if APP_CONFIG namespace exists
Write-Host "Step 2: Checking APP_CONFIG namespace..." -ForegroundColor Blue
$wranglerContent = Get-Content "wrangler.toml" -Raw
$appConfigId = ""
if ($wranglerContent -match 'binding = "APP_CONFIG"[\s\S]*?id = "([^"]+)"') {
    $appConfigId = $matches[1]
    Write-Host "Found APP_CONFIG ID in wrangler.toml: $appConfigId" -ForegroundColor Yellow
}

# Check if namespace exists
$namespaceExists = $false
if ($kvList -match $appConfigId) {
    Write-Host "✅ APP_CONFIG namespace exists" -ForegroundColor Green
    $namespaceExists = $true
} else {
    Write-Host "❌ APP_CONFIG namespace not found" -ForegroundColor Red
    Write-Host "Creating new APP_CONFIG namespace..." -ForegroundColor Yellow
    try {
        $output = npx wrangler kv:namespace create "APP_CONFIG" 2>&1 | Out-String
        Write-Host $output
        
        # Extract the ID from output
        if ($output -match 'id = "([^"]+)"') {
            $newId = $matches[1]
            Write-Host "✅ Created APP_CONFIG with ID: $newId" -ForegroundColor Green
            
            # Update wrangler.toml
            $wranglerContent = $wranglerContent -replace '(binding = "APP_CONFIG"[\s\S]*?id = ")[^"]+(")', "`$1$newId`$2"
            Set-Content "wrangler.toml" -Value $wranglerContent
            Write-Host "✅ Updated wrangler.toml with new APP_CONFIG ID" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Failed to create APP_CONFIG namespace: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Step 3: Check if CACHE namespace exists
Write-Host "Step 3: Checking CACHE namespace..." -ForegroundColor Blue
$cacheId = ""
if ($wranglerContent -match 'binding = "CACHE"[\s\S]*?id = "([^"]+)"') {
    $cacheId = $matches[1]
    Write-Host "Found CACHE ID in wrangler.toml: $cacheId" -ForegroundColor Yellow
}

# Reload kv list
$kvList = npx wrangler kv:namespace list 2>&1 | Out-String

# Check if namespace exists
$namespaceExists = $false
if ($kvList -match $cacheId) {
    Write-Host "✅ CACHE namespace exists" -ForegroundColor Green
    $namespaceExists = $true
} else {
    Write-Host "❌ CACHE namespace not found" -ForegroundColor Red
    Write-Host "Creating new CACHE namespace..." -ForegroundColor Yellow
    try {
        $output = npx wrangler kv:namespace create "CACHE" 2>&1 | Out-String
        Write-Host $output
        
        # Extract the ID from output
        if ($output -match 'id = "([^"]+)"') {
            $newId = $matches[1]
            Write-Host "✅ Created CACHE with ID: $newId" -ForegroundColor Green
            
            # Update wrangler.toml
            $wranglerContent = Get-Content "wrangler.toml" -Raw
            $wranglerContent = $wranglerContent -replace '(binding = "CACHE"[\s\S]*?id = ")[^"]+(")', "`$1$newId`$2"
            Set-Content "wrangler.toml" -Value $wranglerContent
            Write-Host "✅ Updated wrangler.toml with new CACHE ID" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Failed to create CACHE namespace: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Create preview namespaces if they don't exist
Write-Host "Step 4: Checking preview namespaces..." -ForegroundColor Blue
$wranglerContent = Get-Content "wrangler.toml" -Raw

# Check APP_CONFIG preview
if ($wranglerContent -match 'binding = "APP_CONFIG"[\s\S]*?preview_id = "([^"]+)"') {
    $previewId = $matches[1]
    if ($kvList -notmatch $previewId) {
        Write-Host "Creating APP_CONFIG preview namespace..." -ForegroundColor Yellow
        try {
            $output = npx wrangler kv:namespace create "APP_CONFIG" --preview 2>&1 | Out-String
            Write-Host $output
            if ($output -match 'id = "([^"]+)"') {
                $newPreviewId = $matches[1]
                $wranglerContent = $wranglerContent -replace '(binding = "APP_CONFIG"[\s\S]*?preview_id = ")[^"]+(")', "`$1$newPreviewId`$2"
                Set-Content "wrangler.toml" -Value $wranglerContent
                Write-Host "✅ Updated APP_CONFIG preview_id" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️  Could not create preview namespace: $_" -ForegroundColor Yellow
        }
    }
}

# Check CACHE preview
if ($wranglerContent -match 'binding = "CACHE"[\s\S]*?preview_id = "([^"]+)"') {
    $previewId = $matches[1]
    $kvList = npx wrangler kv:namespace list 2>&1 | Out-String
    if ($kvList -notmatch $previewId) {
        Write-Host "Creating CACHE preview namespace..." -ForegroundColor Yellow
        try {
            $output = npx wrangler kv:namespace create "CACHE" --preview 2>&1 | Out-String
            Write-Host $output
            if ($output -match 'id = "([^"]+)"') {
                $newPreviewId = $matches[1]
                $wranglerContent = Get-Content "wrangler.toml" -Raw
                $wranglerContent = $wranglerContent -replace '(binding = "CACHE"[\s\S]*?preview_id = ")[^"]+(")', "`$1$newPreviewId`$2"
                Set-Content "wrangler.toml" -Value $wranglerContent
                Write-Host "✅ Updated CACHE preview_id" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️  Could not create preview namespace: $_" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ KV Namespace Fix Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Verify wrangler.toml has correct KV namespace IDs"
Write-Host "2. Run: npm run deploy"
Write-Host ""
Write-Host "✨ All set!" -ForegroundColor Green

