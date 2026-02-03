# meteor-guard
MeteorGuard is a lightweight, interactive web app that simulates meteor entry scenarios using real small-body data and visualizes potential ground effects for fast, informed exploration of impact risk. It lets users select or parameterize an object (size, speed, angle, composition), choose an entry location on a map, and instantly see estimated kinetic energy, regime (airburst vs impact), and overpressure zones with clear, intuitive visuals.  

This directly addresses Meteor Madness by turning NASA/JPL small-body information into actionable, scenario-based insights and a hands-on learning tool that demystifies how entry parameters drive consequences. It is important because it bridges open space data and public understanding, enabling educators, students, and civic decision‑makers to compare “what‑if” conditions and discuss mitigation and preparedness in an accessible, evidence‑informed way.

## Local development

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Vite + React)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Deployment checklist

1. **Deploy the backend** (Render, Fly.io, Railway, ECS, etc.)
   - Build/start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - Ensure the service is publicly reachable (e.g., `https://meteor-guard-api.example.com`).
2. **Set the frontend API URL**
   - Configure `VITE_API_URL` to the backend URL.
3. **Build and deploy the frontend**
   - Build command: `npm run build`
   - Output directory: `frontend/dist`
4. **Validate**: Load the frontend, run a simulation, and refresh the PHA list.

## Environment templates

### Frontend (`frontend/.env.example`)
```
VITE_API_URL=https://meteor-guard-api.example.com
```
