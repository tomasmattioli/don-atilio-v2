from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database.database import get_db
from app import auth

router = APIRouter(tags=["Usuarios y Auth"])

# --- LOGIN ---
@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(datos: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.nombre == datos.nombre).first()
    if not usuario or not auth.verificar_password(datos.contraseña, usuario.contraseña):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    token = auth.crear_token({"sub": str(usuario.id_usuario), "rol": usuario.rol.nombre})
    return {"access_token": token, "usuario": usuario}

# --- ROLES ---
@router.get("/roles", response_model=List[schemas.RolResponse])
def listar_roles(db: Session = Depends(get_db)):
    return db.query(models.Rol).all()

# --- USUARIOS ---
@router.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=201)
def crear_usuario(datos: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.nombre == datos.nombre).first():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese nombre")
    nuevo = models.Usuario(
        nombre=datos.nombre,
        contraseña=auth.hashear_password(datos.contraseña),
        id_rol=datos.id_rol,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()

@router.patch("/usuarios/{id_usuario}/desactivar", response_model=schemas.UsuarioResponse)
def desactivar_usuario(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.activo = False
    db.commit()
    db.refresh(usuario)
    return usuario
