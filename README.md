# Prabhu Hotel QR Menu + Order App

The project is split into two independent folders:

## Structure

- `frontend/` - React + Tailwind UI (Vite project)
- `backend/` - Node.js API server (SQLite database)

## Run (Development)

### 1. Setup Backend
```bash
cd backend
npm install
npm start
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- **Independent Folders**: No backend-related files in the root directory.
- **Automatic IP Detection**: The backend detects your LAN IP and updates the frontend config so QR codes work on other devices in the same network.
- **SQLite Database**: Stored in `backend/data/prabhu.db`.

## API Base
Backend runs on: `http://localhost:3000`
Frontend runs on: `http://localhost:5173`
