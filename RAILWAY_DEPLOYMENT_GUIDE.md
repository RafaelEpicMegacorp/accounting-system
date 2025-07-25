# Railway Deployment Guide

## Prerequisites
1. Create a Railway account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

## Deployment Steps

### 1. Create Railway Project
```bash
railway login
cd /Users/rafael/Windsurf/accounting
railway init
```

### 2. Set Environment Variables
In Railway dashboard, add these environment variables:
```
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_bzHgcEhN96kD@ep-mute-frost-afhqhft0-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-super-secure-jwt-secret-replace-this-in-production
CORS_ORIGINS=https://cc-accounting.netlify.app,https://cc-accounting--live.netlify.app
PORT=3001
```

### 3. Deploy
```bash
railway up
```

### 4. Get Domain
After deployment, Railway will provide a domain like:
`https://your-app-name.up.railway.app`

### 5. Update netlify.toml
Replace `your-backend-api.com` with your Railway domain.

## Commands
- `railway up` - Deploy
- `railway logs` - View logs  
- `railway status` - Check status
- `railway domain` - Manage domains
- `railway variables` - Manage environment variables

## Health Check
Your backend has a health check endpoint at `/health` that Railway will use to verify deployment.