# Deployment Guide

This guide covers deploying the Alert Correlation Engine to Railway.

## Prerequisites

1. **Railway Account**: Create one at https://railway.app
2. **Git**: Installed and initialized
3. **GitHub Account**: Optional but recommended for connecting your repo

## Deployment to Railway

### Option 1: Railway CLI (Recommended)

#### Step 1: Install Railway CLI
```bash
npm i -g @railway/cli
```

#### Step 2: Login to Railway
```bash
railway login
```

This opens your browser to authenticate.

#### Step 3: Initialize Railway Project
```bash
cd /home/user/alert-correlation-engine
railway init
```

Follow the prompts to create a new project.

#### Step 4: Deploy
```bash
railway up
```

This will:
1. Build the TypeScript backend
2. Build the React UI
3. Bundle everything into a single service
4. Deploy to Railway

#### Step 5: View Your App
```bash
railway open
```

Your dashboard is now live!

### Option 2: Connect GitHub Repo

#### Step 1: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/alert-correlation-engine.git
git branch -M main
git push -u origin main
```

#### Step 2: Railway Dashboard
1. Go to https://railway.app
2. Click "Create New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account
5. Select `alert-correlation-engine` repo
6. Railway auto-detects Node.js and deploys

#### Step 3: Configure Environment Variables
In Railway dashboard:
1. Click your project → Settings
2. Add environment variables:
   - `EXTREME_API_KEY` - Your API key
   - `EXTREME_REGISTRY_URL` - API registry URL
   - `PORT` - Leave blank (Railway sets this)

#### Step 4: Deploy
Push changes to GitHub:
```bash
git push origin main
```

Railway automatically redeploys on push.

## Environment Variables

Set these in Railway dashboard under "Variables":

```
EXTREME_API_KEY=your-api-key-here
EXTREME_REGISTRY_URL=https://api.extremecloudiq.com
NODE_ENV=production
```

See `.env.example` for all available options.

## Monitoring Deployment

### View Logs
```bash
railway logs
```

### Check Status
```bash
railway status
```

### Scale Up
Railway automatically manages resources. For production workloads:
1. Railway dashboard → Project → Settings
2. Adjust instance size under "Compute"

## Custom Domain

Railway gives you a free railway.app domain. To use a custom domain:

1. Railway Dashboard → Project
2. Settings → Domains
3. Click "Add Domain"
4. Point your DNS to Railway's nameservers

## First Run Checklist

After deployment:

- [ ] Visit your Railway app URL
- [ ] See the Dashboard load successfully
- [ ] Check Health endpoint: `https://your-app.railway.app/health`
- [ ] Register network devices via API
- [ ] Create correlation rules
- [ ] Configure API sources
- [ ] Test alert ingestion

## Troubleshooting

### Build Fails
Check the Railway logs:
```bash
railway logs
```

Common issues:
- Node.js version mismatch (Railway uses latest by default)
- Missing environment variables
- UI build dependencies not installing

### App Crashes on Startup
Check logs for errors:
```bash
railway logs
```

Ensure:
- `EXTREME_API_KEY` is set (can be empty for local testing)
- Port is not hardcoded (uses `process.env.PORT`)

### UI Not Loading
Make sure the build process completed:
1. Check that `npm run build:all` succeeded
2. Verify `/ui/build` directory exists after build
3. Check backend is serving static files

## Updating the App

### With CLI
```bash
git push origin main  # if using GitHub
railway up           # to redeploy
```

### With GitHub
Push to GitHub, Railway auto-redeploys:
```bash
git push origin main
```

## Production Considerations

For production deployments:

1. **Database**: Currently uses in-memory storage
   - Alert data lost on restart
   - Upgrade to PostgreSQL for persistence

2. **API Key Management**: Use Railway's secrets manager
   - Never commit API keys
   - Rotate keys regularly

3. **Backups**: Enable Railway backups
   - Automatic snapshots of your app state

4. **Monitoring**: Set up alerting
   - Railway dashboard → Alerts
   - Get notified of deployment issues

5. **SSL/TLS**: Automatic with Railway
   - All connections encrypted by default

## Scaling

For high-traffic environments:

1. **Increase Instance Size**
   - Railway dashboard → Settings → Compute
   - Choose larger instance (Premium plans)

2. **Database Optimization**
   - Add PostgreSQL plugin for persistent storage
   - Railway marketplace → Add PostgreSQL

3. **Caching**
   - Add Redis for pattern caching
   - Improves ML performance

## Cost Estimation

Railway pricing (approximate):
- **Free Plan**: $5 monthly credit (includes most deployments)
- **Pay-as-you-go**: $0.07/hour per GB RAM beyond free tier
- **Pro Plan**: $20/month for dedicated resources

## Support

- Railway Docs: https://docs.railway.app
- GitHub Issues: Create an issue in your repo
- Railway Discord: https://discord.gg/railway

## Next Steps

After deployment:

1. **Add API Sources**: `/api/sources`
2. **Create Rules**: `/api/rules`
3. **Register Devices**: `/api/topology/devices`
4. **Define Dependencies**: `/api/topology/dependencies`
5. **Ingest Alerts**: `/api/alerts`

See `CLAUDE.md` for API documentation.
