Quick start — Frontend

1. Install dependencies (once)

```bash
cd Frontend
npm install
```

2. Copy .env.example to .env (optional)

PowerShell:
```powershell
Copy-Item .env.example .env
.\start-frontend.ps1
```

bash / WSL / macOS:
```bash
cp .env.example .env
./start.sh
```

3. Open the app at http://localhost:5173

Notes:
- To override the backend URL temporarily (PowerShell):
  `$Env:VITE_API_BASE_URL = "http://localhost:3001"; npm run dev`
- The dev server runs on port 5173 by default (see VITE_PORT).
