# 🚀 FlickHub — GitHub & Vercel Deployment Guide

## 🔐 Security Summary
| File | Goes to GitHub? | Why |
|------|----------------|-----|
| `.env` | ❌ NO | Contains your secret keys |
| `node_modules/` | ❌ NO | Too large, auto-installed |
| Everything else | ✅ YES | Safe — no keys inside |

Your `.gitignore` already blocks `.env` and `node_modules` automatically.

---

## STEP 1 — Install Git
Download from: https://git-scm.com/downloads
After install, open terminal and check: `git --version`

---

## STEP 2 — Create GitHub Account & Repo
1. Go to https://github.com and sign up (free)
2. Click the **+** button → **New repository**
3. Name it: `flickhub`
4. Set to **Public**
5. Click **Create repository**
6. Copy the repo URL (looks like `https://github.com/yourname/flickhub.git`)

---

## STEP 3 — Push Your Code to GitHub
Open terminal inside your `flickhub` folder and run these commands one by one:

```bash
git init
git add .
git status
```
> Check that `.env` is NOT in the list. If it is, something is wrong with .gitignore.

```bash
git commit -m "Initial FlickHub commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/flickhub.git
git push -u origin main
```

✅ Your code is now on GitHub — with NO secrets inside!

---

## STEP 4 — Deploy on Vercel (Free)
1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New → Project**
3. Find your `flickhub` repo and click **Import**
4. Framework: select **Other**
5. Click **Environment Variables** and add each one:

| Key | Value |
|-----|-------|
| `TMDB_API_KEY` | your TMDB key |
| `DB_HOST` | from Aiven dashboard |
| `DB_PORT` | 3306 |
| `DB_USER` | from Aiven |
| `DB_PASS` | from Aiven |
| `DB_NAME` | defaultdb |
| `DB_SSL` | true |

6. Click **Deploy**
7. Wait ~1 minute → Vercel gives you a URL like:
   `https://flickhub-yourname.vercel.app`

---

## STEP 5 — Test Your Live App
- Register: `https://flickhub-yourname.vercel.app/register`
- Login:    `https://flickhub-yourname.vercel.app/`
- Movies:   `https://flickhub-yourname.vercel.app/home`

---

## How the Security Works
```
Browser (user)
    ↓ calls /api/tmdb/trending
Vercel Server (your backend)
    ↓ adds secret TMDB key from environment variables
TMDB API
    ↓ returns movie data
Vercel Server
    ↓ sends movie data back (NO key included)
Browser (user)
```
The API key **never leaves the server**. It is invisible to everyone. ✅
