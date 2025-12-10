# 🚀 Local Setup Guide - Running Dartmouth OS on Your PC

This guide will help you set up and run the Dartmouth OS project on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (if you need to clone the repository)
- **Cloudflare account** (for deploying the worker, optional for local dev)

## 🔧 Step 1: Install Dependencies

The project uses npm workspaces (monorepo). Install all dependencies from the root:

```bash
cd dartmouth
npm install
```

This will install dependencies for all packages in the monorepo.

## 🔑 Step 2: Set Up Environment Variables

### For Backend (Cloudflare Worker)

Create a `.dev.vars` file in `packages/worker/` directory:

```bash
cd packages/worker
```

Create `.dev.vars` file with the following content:

```env
# Environment
ENVIRONMENT=development

# LLM Provider Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# OpenAI API Key (REQUIRED for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# JWT Secret (REQUIRED for authentication)
JWT_SECRET=your_jwt_secret_here_change_in_production

# Optional: Anthropic (fallback LLM)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Shopify Integration
# SHOPIFY_DOMAIN=your-store.myshopify.com
# SHOPIFY_ACCESS_TOKEN=your_shopify_access_token

# Optional: PERP Integration
# PERP_DB_HOST=your_perp_host
# PERP_DB_PORT=5432
# PERP_DB_NAME=your_perp_db
# PERP_DB_USER=your_perp_user
# PERP_DB_PASSWORD=your_perp_password

# Optional: Gmail Integration (for Customer Service)
# GMAIL_CLIENT_ID=your_gmail_client_id
# GMAIL_CLIENT_SECRET=your_gmail_client_secret
# GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
# GMAIL_REDIRECT_URI=http://localhost:8787/oauth/callback

# Optional: Twilio (for SMS/WhatsApp)
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Optional: SendGrid (for email)
# SENDGRID_API_KEY=your_sendgrid_api_key
```

**Minimum Required:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `JWT_SECRET` - Generate a random string (e.g., `openssl rand -hex 32`)

### For Frontend (Dashboard)

The frontend doesn't require a `.env` file by default. It proxies API requests to the backend worker.

## 🚀 Step 3: Run the Project

### Option A: Run Both Backend and Frontend (Recommended)

**Terminal 1 - Backend (Cloudflare Worker):**
```bash
cd packages/worker
npm run dev
```

This will start the worker on `http://localhost:8787`

**Terminal 2 - Frontend (Dashboard):**
```bash
cd packages/customer-service-dashboard
npm run dev
```

This will start the frontend on `http://localhost:3000`

### Option B: Run from Root (Using Workspace Scripts)

**Terminal 1 - Backend:**
```bash
cd dartmouth
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd dartmouth/packages/customer-service-dashboard
npm run dev
```

## 🌐 Access the Application

- **Frontend Dashboard:** http://localhost:3000
- **Backend API:** http://localhost:8787
- **API Health Check:** http://localhost:8787/health

## 🧪 Test the Setup

### Test Backend API:
```bash
# Health check
curl http://localhost:8787/health

# Test login (if you have test credentials)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"john@dtf.com.au\",\"password\":\"changeme123\"}"
```

### Test Frontend:
1. Open http://localhost:3000 in your browser
2. Navigate to the tickets page: http://localhost:3000/tickets

## 📦 Project Structure

```
dartmouth/
├── packages/
│   ├── worker/                    # Backend (Cloudflare Worker)
│   │   ├── src/                   # Source code
│   │   ├── wrangler.toml         # Cloudflare config
│   │   └── .dev.vars             # Environment variables (create this)
│   │
│   ├── customer-service-dashboard/  # Frontend (React + Vite)
│   │   ├── src/                   # React components
│   │   └── vite.config.ts         # Vite config
│   │
│   ├── customer-service-agent/    # Customer service AI agent
│   ├── dartmouth-core/            # Core platform services
│   ├── mccarthy-artwork/          # Artwork analyzer agent
│   └── ...                        # Other packages
│
├── package.json                   # Root package.json
└── pnpm-workspace.yaml            # Workspace config
```

## 🔍 Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** Make sure you ran `npm install` from the root directory.

### Issue: Worker won't start
**Solution:** 
1. Check that `.dev.vars` exists in `packages/worker/`
2. Verify your API keys are correct
3. Check that you have Wrangler installed: `npm install -g wrangler`

### Issue: Frontend can't connect to backend
**Solution:**
1. Make sure the backend is running on port 8787
2. Check `vite.config.ts` - the proxy should point to `http://localhost:8787`
3. For production, update the proxy target in `vite.config.ts`

### Issue: Database errors
**Solution:**
- The project uses Cloudflare D1 database
- For local development, Wrangler creates a local SQLite database
- Run migrations if needed: `npm run db:migrate:local` (in packages/worker)

## 📚 Next Steps

1. **Read the Documentation:**
   - [README.md](README.md) - Project overview
   - [GETTING_STARTED.md](GETTING_STARTED.md) - Detailed getting started guide
   - [README_START_HERE.md](README_START_HERE.md) - Current project status

2. **Explore the Code:**
   - Backend API: `packages/worker/src/routes/`
   - Frontend: `packages/customer-service-dashboard/src/`
   - Agents: `packages/customer-service-agent/`

3. **Deploy to Cloudflare:**
   - See [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)
   - Or run: `cd packages/worker && npx wrangler deploy`

## 🆘 Need Help?

- Check the documentation in the `docs/` folder
- Review existing code examples in other packages
- Check [DEVELOPER_HELP_SUMMARY.md](DEVELOPER_HELP_SUMMARY.md) for common issues

---

**Happy Coding! 🚀**

