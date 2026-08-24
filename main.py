from fastapi import FastAPI

from app.database.database import engine
from app import models

models.Base.metadata.create_all(bind=engine)

# Inicializamos la aplicación FastAPI
app = FastAPI(title="Don Atilio API", version="2.0")

from app.routers import catalogo, usuarios
app.include_router(catalogo.router)
app.include_router(usuarios.router)

# Creamos nuestro primer "endpoint" (la URL raíz)
@app.get("/")
def read_root():
    return {"mensaje": "¡Bienvenido a la API del Sistema Don Atilio V2!"}

# Un ejemplo más real aplicado al proyecto
@app.get("/caja/estado")
def estado_caja():
    # En el futuro, esto leerá la base de datos para ver si hay una sesión abierta
    return {
        "caja_abierta": True, 
        "cajero": "Tomás", 
        "monto_apertura": 15000.00
    }
