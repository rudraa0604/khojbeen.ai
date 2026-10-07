@echo off
echo Starting Khojbeen.ai Backend and Frontend...

if exist backend\venv\Scripts\python.exe (
    start "Khojbeen Backend" cmd /k "cd backend && venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
) else (
    start "Khojbeen Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
)

start "Khojbeen Frontend" cmd /k "cd frontend && npm run dev"
echo Both servers started in separate windows!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
