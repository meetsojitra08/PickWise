# Deploying Pickwise Backend on Render

This guide walks you through deploying the **Pickwise FastAPI backend** to [Render](https://render.com), along with **PostgreSQL** and **Redis**.

---

## 1. Architecture on Render

```
                                      +-------------------------+
                                      |    Render Web Service   |
                                      |      (FastAPI API)      |
                                      |     pickwise-api        |
                                      +------------+------------+
                                                   |
                   +-------------------------------+-------------------------------+
                   |                               |                               |
                   v                               v                               v
       +-----------------------+       +-----------------------+       +-----------------------+
       |   Render PostgreSQL   |       |      Redis Store      |       |       Groq API        |
       |     (pickwise-db)     |       | (Upstash / Render KV) |       |  (Llama-3.3-70b AI)   |
       +-----------------------+       +-----------------------+       +-----------------------+
```

---

## 2. Prerequisites

1. **GitHub Repository**: Push your Pickwise code to GitHub.
2. **Render Account**: Sign up at [render.com](https://render.com).
3. **Groq API Key**: Create a free API key at [console.groq.com](https://console.groq.com).
4. **Redis Provider**:
   - **Recommended (100% Free)**: [Upstash Redis](https://upstash.com) (generous free tier, permanent, no card required).
   - **Alternative**: Render Key-Value ($7/mo starter plan).

---

## 3. Deployment Method A: One-Click Blueprint (Recommended)

Pickwise includes a `render.yaml` Blueprint file at the repository root that defines both the web service and the PostgreSQL database.

### Steps:
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your **Pickwise** GitHub repository.
4. Render will parse `render.yaml` and display the resources to create:
   - **`pickwise-db`**: PostgreSQL database (Free tier).
   - **`pickwise-api`**: FastAPI Web Service (Free tier).
5. Fill in the required parameters prompted by Render:
   - `GROQ_API_KEY`: Your key from Groq Console (`gsk_...`).
   - `REDIS_URL`: Your Redis connection URL (e.g. `rediss://default:...@...upstash.io:6379` from Upstash).
   - `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g. `https://pickwise.vercel.app,http://localhost:5173`).
6. Click **Apply**.
7. Render will automatically:
   - Provision PostgreSQL and link `DATABASE_URL`.
   - Run `pip install -r requirements.txt`.
   - Run `python -m app.db.seed` to initialize schema, triggers, and seed 60 products, then launch `uvicorn app.main:app` on port `$PORT`.

---

## 4. Deployment Method B: Manual Dashboard Setup

If you prefer configuring services step-by-step through the Render web UI:

### Step 1: Create PostgreSQL Database
1. Go to **Dashboard** -> **New +** -> **PostgreSQL**.
2. Set:
   - **Name**: `pickwise-db`
   - **Database**: `pickwise`
   - **User**: `pickwise`
   - **Region**: Choose closest to you (e.g., *Oregon* or *Frankfurt*).
   - **Instance Type**: **Free**.
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgres://pickwise:...@dpg-...-a/pickwise`).

### Step 2: Set up Redis
1. Go to [Upstash Console](https://console.upstash.com) -> **Create Database**.
2. Choose **Redis**, pick the same cloud region (e.g., AWS us-west-1 if Render is Oregon).
3. Copy the **`rediss://...`** connection string (under the *Node / Python / General* tab or *REST/CLI URL*).

### Step 3: Create FastAPI Web Service
1. Go to **Dashboard** -> **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and pick your Pickwise repo.
3. Configure settings:
   - **Name**: `pickwise-api`
   - **Region**: Same region as your database.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
     ```
   - **Instance Type**: **Free**.

### Step 4: Configure Environment Variables
Under the **Environment** tab of `pickwise-api`, add the following variables:

| Key | Example Value | Description |
|-----|---------------|-------------|
| `APP_ENV` | `production` | Production environment mode |
| `APP_DEBUG` | `false` | Disable debug stacktraces in HTTP responses |
| `APP_URL` | `https://pickwise-api.onrender.com` | Your Render web service public URL |
| `SECRET_KEY` | *(Click "Generate" or random 32-char string)* | Session encryption & token signing |
| `DATABASE_URL` | *(Paste Internal Database URL from Step 1)* | Render PostgreSQL connection |
| `REDIS_URL` | *(Paste Redis URL from Step 2)* | Redis session & quota connection |
| `GROQ_API_KEY` | `gsk_...` | Groq LLM API Key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Supported Groq model |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,http://localhost:5173` | Allowed frontend domains |
| `SESSION_COOKIE_SAMESITE` | `lax` (or `none` if frontend on different domain) | Cookie SameSite attribute |

4. Click **Deploy Web Service**.

---

## 5. Cross-Origin Frontend & Cookies Configuration

If your frontend is hosted on **Vercel** (`https://my-app.vercel.app`) or **Netlify** while the backend is on **Render** (`https://pickwise-api.onrender.com`):

1. **CORS**:
   Add your exact frontend domain to `CORS_ALLOWED_ORIGINS`:
   ```env
   CORS_ALLOWED_ORIGINS=https://my-app.vercel.app
   ```
2. **Cross-Origin Auth Cookies**:
   Browsers treat cookies across different root domains as third-party. To allow login session cookies to pass in `credentials: 'include'` requests:
   ```env
   SESSION_COOKIE_SAMESITE=none
   ```
   *(When `SESSION_COOKIE_SAMESITE=none`, Pickwise automatically sets `secure=True`)*.
3. **Frontend API URL**:
   In your frontend deployment (e.g. Vercel environment variables), set:
   ```env
   VITE_API_URL=https://pickwise-api.onrender.com
   ```

---

## 6. Verification Checklist

Once the Render deployment finishes with a green checkmark:

1. **Health Check**:
   Open in browser:
   - `https://<your-service>.onrender.com/up` -> returns `{"status": "ok"}`
   - `https://<your-service>.onrender.com/api/v1/health` -> returns database and redis health status
2. **Interactive API Documentation**:
   - `https://<your-service>.onrender.com/docs` -> interactive Swagger UI
   - `https://<your-service>.onrender.com/redoc` -> OpenAPI ReDoc
3. **Catalog Data**:
   - `https://<your-service>.onrender.com/api/v1/products` -> returns seeded product listing
4. **Pre-Seeded Demo Accounts**:
   - **Admin**: `admin@pickwise.test` / `password`
   - **Customer**: `customer@pickwise.test` / `password`

---

## 7. Troubleshooting & FAQ

### Cold Starts on Render Free Tier
Render free tier instances sleep after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to spin up. This is expected on the free plan.

### Database Connection Strings
Render PostgreSQL URLs start with `postgres://` or `postgresql://`. Pickwise's configuration automatically adapts this to `postgresql+asyncpg://` for async queries and `postgresql://` for synchronous scripts.

### Manually Re-running Seeds or Shell
You can run migrations or seed data at any time from the Render Dashboard:
1. Open the `pickwise-api` service.
2. Click the **Shell** tab.
3. Run:
   ```bash
   python -m app.db.seed
   ```
