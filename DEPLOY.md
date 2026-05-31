# Deployment Guide

## Backend → Railway

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub repo
3. Select the repo, set Root Directory to `backend`
4. Railway auto-detects `railway.json` and runs `gunicorn main:app`
5. Copy the Railway public URL (e.g. `https://focus-timer-xxx.up.railway.app`)

## Frontend → GitHub Pages

1. In `frontend/`, create `.env.local`:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   ```

2. Add `homepage` to `frontend/package.json` (replace with your GitHub username/repo):
   ```json
   "homepage": "https://USERNAME.github.io/REPONAME"
   ```

3. Deploy:
   ```bash
   cd frontend
   npm run deploy
   ```

## Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
# create .env.local with VITE_API_URL=http://localhost:5000
npm run dev
# runs on http://localhost:5173
```
