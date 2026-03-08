# Deploy Guide (Free Tier)

## Option A (recommended)
- Frontend: Vercel
- Backend: Render Web Service
- Database: MongoDB Atlas (M0)

---

## 1) Backend on Render
1. Create a new **Web Service** from this repo.
2. Set **Root Directory** = `backend`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables from [backend/.env.example](backend/.env.example).
6. Deploy and copy backend URL, for example:
   - `https://volunteerhub-api.onrender.com`

## 2) Frontend on Vercel
1. Create a new Vercel project from this repo.
2. Set **Root Directory** = `frontend`.
3. Framework preset: `Vite`.
4. Add environment variable:
   - `VITE_API_URL=https://volunteerhub-api.onrender.com`
5. Deploy.

## 3) Set callback URL back to backend
Update Render environment variable:
- `CLIENT_URL=https://<your-vercel-domain>`

Redeploy backend after changing env vars.

---

## Optional: Render Blueprint
A ready blueprint is provided at [render.yaml](render.yaml).
You can use it to create both services quickly.

---

## Notes
- File uploads are currently stored on local disk (`uploads/`). On free hosts, files can be lost after restart/redeploy.
- For production persistence, migrate uploads to cloud storage (Cloudinary, S3-compatible, etc.).
- Frontend SPA rewrites are configured in [frontend/vercel.json](frontend/vercel.json).
