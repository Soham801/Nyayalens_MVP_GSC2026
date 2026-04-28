# Vercel Deployment Guide

This project lives in a subfolder. Most Vercel 404 issues here are caused by a wrong root directory.

## 1) Import the project correctly

- In Vercel, import the Git repository.
- Set **Root Directory** to `nyayalens`.

If Root Directory is left as the parent folder, deployments can return `404: NOT_FOUND`.

## 2) Build and output settings

This repository includes `vercel.json` with the correct values:

- Build Command: `npm run build`
- Output Directory: `dist/client`
- SPA rewrite fallback to `/index.html`

If you override settings in the Vercel UI, use the same values above.

## 3) Install command

- Install Command: `npm install`

## 4) Environment variables

Add all required app environment variables in Vercel Project Settings -> Environment Variables.

At minimum, confirm values used by your app build/runtime are present (for example Supabase keys/URLs if used in client code).

## 5) Redeploy after changes

After changing config, trigger a new deployment:

- Deployments -> latest deployment -> Redeploy

## 6) Verify after deploy

- Open `/`
- Open a deep route directly (example: `/scan`)
- Refresh on deep route and confirm it does not return 404

## Troubleshooting

### A) Still getting `404: NOT_FOUND`

- Re-check Root Directory is exactly `nyayalens`
- Confirm `vercel.json` exists in that root
- Confirm deployment logs show build output in `dist/client`

### B) Build succeeds but app is blank

- Check browser console for missing environment variables
- Verify API keys/URLs are set for the same environment (Preview/Production)

### C) Wrong project picked in monorepo

- Remove and re-import, then select the correct root folder during setup

## Local validation command

From the app directory:

```bash
cd nyayalens
npm run build
```

A successful build should generate `dist/client` and `dist/server`.
