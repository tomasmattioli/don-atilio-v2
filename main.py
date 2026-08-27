from fastapi import FastAPI

from app.database.database import engine
from app import models

models.Base.metadata.create_all(bind=engine)

# Inicializamos la aplicación FastAPI
app = FastAPI(title="Mi Abejita API", version="2.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import catalogo, usuarios, caja, ventas, inventario, reportes
app.include_router(catalogo.router)
app.include_router(usuarios.router)
app.include_router(caja.router)
app.include_router(ventas.router)
app.include_router(inventario.router)
app.include_router(reportes.router)

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Servir el frontend compilado (React/Vite)
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.isdir(frontend_dist):
    # Primero servimos los assets estáticos reales
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    # Luego un catch-all para la SPA (maneja navegación de React Router)
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Si pide un archivo específico que existe en dist (ej. sw.js, favicon.ico)
        path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(path):
            return FileResponse(path)
        # De lo contrario, devuelve index.html para que React Router haga su magia
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"mensaje": "¡Bienvenido a la API del Sistema Mi Abejita V2! (El frontend no está compilado)"}
