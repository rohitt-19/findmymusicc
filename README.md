# FindMyMusicc 🎵

> Upload any photo — AI reads the aesthetic, outfit, or vibe and finds the perfect songs.

**Free to run.** Uses Google Gemini 1.5 Flash — 1,500 requests/day free, no credit card needed.

Built with React + Vite, Vercel Serverless Functions, Google Gemini Vision AI.

---

## Deploy in 10 minutes — completely free

### Step 1 — Get your FREE Gemini API key (no credit card)
1. Go to **aistudio.google.com**
2. Sign in with your Google account
3. Click "Get API Key" → "Create API key in new project"
4. Copy the key (looks like AIzaSy...)

### Step 2 — Put the code on GitHub
1. Go to github.com → sign up free
2. Click + → New repository → name it findmymusicc → Create repository
3. Click "uploading an existing file"
4. Unzip this folder → drag ALL contents into the upload area
5. Click Commit changes

### Step 3 — Deploy on Vercel (free)
1. Go to vercel.com → Sign up with GitHub
2. Click Add New Project → select your findmymusicc repo
3. Set Build & Output Settings:
   - Build Command: cd frontend && npm install && npm run build
   - Output Directory: public
4. Click Environment Variables → add:
   - Name: GEMINI_API_KEY
   - Value: your key from Step 1
5. Click Deploy → live in ~2 minutes

---

## Free tier limits (Gemini 1.5 Flash)
- 1,500 requests per day
- 15 requests per minute
- Cost: $0

---

## What's optimised
- Images auto-compressed to 1024px before sending (faster, uses less quota)
- Rate limiting: 10 requests per IP per minute (protects your free quota)
- Gemini returns JSON directly (no parsing errors)
- Input validation on server (rejects bad requests before hitting API)
- Error messages are clear and user-friendly
