# Operation Gridlock Deployment

## Backend on Render

Create a new Render Web Service from this GitHub repo.

- Root directory: `backend`
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variable: `PYTHON_VERSION=3.11.9`
- Health URL after deploy: `https://YOUR-RENDER-SERVICE.onrender.com/api/status`

Render currently defaults new Python services to Python 3.14. This project is pinned to Python 3.11.9 with `.python-version`; keep the `PYTHON_VERSION` environment variable set as well so Render does not try to build older binary packages from source.

Optional SAM3 model initialization is lazy-loaded and not required for the main demo. If you want live SAM3 model loading later, change the build command to:

```bash
pip install -r requirements-ml.txt
```

## Frontend on Vercel

Create a new Vercel project from this GitHub repo.

- Root directory: `frontend/gridlock-dashboard`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE=https://YOUR-RENDER-SERVICE.onrender.com`

After the frontend deploys, open the Vercel URL and confirm the top-right status says `Backend online`.
