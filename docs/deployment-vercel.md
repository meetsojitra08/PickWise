# Deploying Pickwise Frontend on Vercel

This guide walks you through deploying the **Pickwise React 19 / Vite frontend** to [Vercel](https://vercel.com) and connecting it to your live Render backend API (`https://pickwise-api-f5fx.onrender.com`).

---

## 1. Architecture Overview

```
                                            +-----------------------------+
                                            |       User's Browser        |
                                            +--------------+--------------+
                                                           |
                                                           v
                                            +-----------------------------+
                                            |       Vercel Edge SPA       |
                                            |  https://<your-app>.vercel  |
                                            +--------------+--------------+
                                                           |
                                      (Proxied automatically via vercel.json)
                                                           |
                                                           v
                                            +-----------------------------+
                                            |     Render FastAPI Backend  |
                                            |  pickwise-api-f5fx.onrender |
                                            +--------------+--------------+
                                                           |
                                          +----------------+----------------+
                                          |                                 |
                                          v                                 v
                              +-----------------------+         +-----------------------+
                              |   Neon PostgreSQL     |         |     Upstash Redis     |
                              +-----------------------+         +-----------------------+
```

### Why Vercel Rewrites (`vercel.json`) are Recommended:
Pickwise includes [`frontend/vercel.json`](../frontend/vercel.json) which automatically proxies `/api`, `/sanctum`, and `/storage` requests directly to your Render backend:
1. **Zero CORS Issues**: The browser communicates with `https://<your-app>.vercel.app/api/...` as a same-origin request.
2. **Zero Cookie Restrictions**: Browsers (like Safari and Chrome) treat authentication cookies as first-party cookies, ensuring login sessions persist reliably.
3. **SPA Deep-Linking**: All client-side React routes (`/catalog`, `/assistant`, `/compare`) route to `index.html` on page reload without 404 errors.

---

## 2. Step-by-Step Vercel Deployment

### Step 1: Push latest code to GitHub
Make sure all your latest changes are pushed to `main`:
```bash
git push origin main
```

### Step 2: Import Project on Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** in the top-right corner and select **"Project"**.
3. Locate your **`PickWise`** repository and click **"Import"**.

### Step 3: Configure Project Settings
In the Vercel project configuration screen:
1. **Framework Preset**: Select **Vite** (Vercel will usually auto-detect this).
2. **Root Directory**: Click **"Edit"** and select the **`frontend`** directory.
3. **Build and Output Settings**:
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
   - Install Command: `npm install` (default)
4. **Environment Variables (Optional)**:
   - You can optionally set:
     ```env
     VITE_API_URL=https://pickwise-api-f5fx.onrender.com
     ```
   *(Note: Thanks to `frontend/vercel.json`, even without this variable, all requests to `/api` and `/sanctum` are automatically rewritten to your Render backend).*

### Step 4: Click Deploy
Click the **"Deploy"** button. Vercel will install dependencies, build the TypeScript bundle with Vite, and provide you with your live URL in under 60 seconds!

---

## 3. Connect Vercel URL to Render (Final Polish)

Once Vercel gives you your live URL (e.g. `https://pickwise-web.vercel.app`):

1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Open your **`pickwise-api`** service.
3. Go to the **Environment** tab on the left.
4. Click **"Edit"** on `CORS_ALLOWED_ORIGINS` and add your Vercel URL:
   ```text
   https://pickwise-web.vercel.app,http://localhost:5173,http://localhost:8080
   ```
5. Click **"Save Changes"**.

---

## 4. Verification Checklist

Open your live Vercel URL:
- [ ] **Home Page**: Hero banner and categories load.
- [ ] **Catalog Page**: Filter and browse 60 products.
- [ ] **AI Assistant**: Test shopping conversation queries.
- [ ] **Compare Matrix**: Compare 2–4 products and check verdicts.
- [ ] **Authentication**: Log in with demo accounts:
  - Admin: `admin@pickwise.test` / `password`
  - Customer: `customer@pickwise.test` / `password`
- [ ] **Deep-link Refresh**: Navigate to `/catalog` or `/assistant` and refresh the page (verifies `vercel.json` SPA rewrite).
