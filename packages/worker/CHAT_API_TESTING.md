# 💬 Chat API Testing Guide

## Available Chat Endpoints

### 1. **Dartmouth OS V2 Chat** (Production)
- **Endpoint:** `POST /api/v2/chat`
- **Description:** Main chat endpoint using Dartmouth OS V2
- **Agent ID:** Specified in request body (defaults to 'fam')

### 2. **Test Chat** (Development)
- **Endpoint:** `POST /test/chat`
- **Description:** Test endpoint for development

---

## 📋 Request Format

### Required Fields
- `message` (string) - The user's message
- `agentId` (string, optional) - Agent to use (defaults to 'fam')

### Optional Fields
- `sessionId` (string) - Session ID for conversation continuity (auto-generated if not provided)
- `userId` (string) - User identifier
- `metadata` (object) - Additional metadata

### Available Agents
- `fam` - Default general assistant
- `mccarthy-artwork` or `artwork-analyzer` - Artwork analysis agent
- `customer-service` - Customer service agent

---

## 🧪 Test Examples

### Example 1: Basic Chat (PowerShell)

```powershell
$body = @{
    message = "Hello, can you help me?"
    agentId = "fam"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Example 2: Chat with Session ID (Maintains Conversation)

```powershell
$body = @{
    message = "What did I just ask you?"
    agentId = "fam"
    sessionId = "my-session-123"
    userId = "user-456"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Example 3: Using curl (Command Line)

```bash
curl -X POST https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "agentId": "fam",
    "sessionId": "test-session-001"
  }'
```

### Example 4: PowerShell with Full Response

```powershell
$body = @{
    message = "Tell me a joke"
    agentId = "fam"
    sessionId = "session-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

# Display the response
$response | ConvertTo-Json -Depth 10
```

---

## 📤 Expected Response Format

```json
{
  "content": "Hello! I'd be happy to help you. What do you need assistance with?",
  "sessionId": "session-fam-1234567890",
  "messageId": "msg-1234567890",
  "metadata": {
    "intent": "greeting",
    "processingTime": 1234,
    "agentId": "fam"
  },
  "timestamp": "2025-12-01T23:50:27.056Z"
}
```

---

## 🧪 Test Different Agents

### Test FAM Agent (Default)
```powershell
$body = @{
    message = "What can you help me with?"
    agentId = "fam"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Test Artwork Analyzer Agent
```powershell
$body = @{
    message = "What are the DTF printing requirements?"
    agentId = "mccarthy-artwork"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

## 🔄 Conversation Flow Test

Test a multi-turn conversation:

```powershell
# First message
$sessionId = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"

$body1 = @{
    message = "My name is John"
    agentId = "fam"
    sessionId = $sessionId
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body1 `
    -ContentType "application/json"

Write-Host "Response 1:" $response1.content

# Second message (should remember the name)
$body2 = @{
    message = "What's my name?"
    agentId = "fam"
    sessionId = $sessionId
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat" `
    -Method Post `
    -Body $body2 `
    -ContentType "application/json"

Write-Host "Response 2:" $response2.content
```

---

## 🧪 Test Endpoint (Development)

For testing without full Dartmouth OS initialization:

```powershell
$body = @{
    message = "Test message"
    agentId = "test-agent"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/test/chat" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

## 🌐 Test in Browser (Using JavaScript Console)

Open browser console (F12) and run:

```javascript
fetch('https://dartmouth-os-worker.lucy-hunter-9411.workers.dev/api/v2/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello, can you help me?',
    agentId: 'fam',
    sessionId: 'browser-test-' + Date.now()
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

---

## 📝 Complete PowerShell Test Script

Save this as `test-chat.ps1`:

```powershell
# Test Chat API
$baseUrl = "https://dartmouth-os-worker.lucy-hunter-9411.workers.dev"
$sessionId = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "Testing Chat API..." -ForegroundColor Green
Write-Host "Session ID: $sessionId" -ForegroundColor Yellow
Write-Host ""

# Test 1: Basic greeting
Write-Host "Test 1: Basic greeting" -ForegroundColor Cyan
$body1 = @{
    message = "Hello!"
    agentId = "fam"
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/v2/chat" `
        -Method Post `
        -Body $body1 `
        -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response: $($response1.content)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Follow-up question
Write-Host "Test 2: Follow-up question" -ForegroundColor Cyan
$body2 = @{
    message = "What can you do?"
    agentId = "fam"
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/v2/chat" `
        -Method Post `
        -Body $body2 `
        -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response: $($response2.content)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Testing complete!" -ForegroundColor Green
```

Run it:
```powershell
.\test-chat.ps1
```

---

## 🐛 Troubleshooting

### Error: "Message is required"
- Make sure `message` field is included in the request body
- Check that it's a string, not null or empty

### Error: "Invalid JSON"
- Verify the JSON format is correct
- Check Content-Type header is `application/json`

### Error: "Internal server error"
- Check Cloudflare dashboard for logs
- Verify OPENAI_API_KEY is set in secrets
- Check worker logs: `npx wrangler tail`

### No response or timeout
- Check if the worker is deployed
- Verify the endpoint URL is correct
- Check network connectivity

---

## ✅ Quick Test Checklist

- [ ] Root endpoint works (`/`)
- [ ] Health check works (`/health`)
- [ ] Basic chat request succeeds
- [ ] Response contains `content` field
- [ ] Session ID is returned
- [ ] Multi-turn conversation works (same sessionId)
- [ ] Different agents work (fam, mccarthy-artwork)

---

## 📊 Response Headers

The chat endpoint returns these headers:
- `Content-Type: application/json`
- `X-Agent-Id: <agent-id>`
- `X-Session-Id: <session-id>`

---

**Happy Testing!** 🚀

