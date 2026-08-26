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

# Creamos nuestro primer "endpoint" (la URL raíz)
@app.get("/")
def read_root():
    return {"mensaje": "¡Bienvenido a la API del Sistema Mi Abejita V2!"}

# Un ejemplo más real aplicado al proyecto
@app.get("/caja/estado")
def estado_caja():
    # En el futuro, esto leerá la base de datos para ver si hay una sesión abierta
    return {
        "caja_abierta": True, 
        "cajero": "Tomás", 
        "monto_apertura": 15000.00
    }
