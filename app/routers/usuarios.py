from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database.database import get_db
from app import auth

router = APIRouter(tags=["Usuarios y Auth"])

# --- LOGIN (público — sin token) ---
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

# ── Helpers de autorización ───────────────────────────────────────────────────
def _solo_admin(user_id: int, db: Session):
    """Lanza 403 si el usuario autenticado no es admin (id_rol == 1)."""
    u = db.query(models.Usuario).filter(models.Usuario.id_usuario == user_id).first()
    if not u or u.id_rol != 1:
        raise HTTPException(status_code=403, detail="Solo el administrador puede realizar esta acción")

# --- USUARIOS ---
@router.get("/usuarios/cajeros", response_model=List[schemas.UsuarioSimpleResponse])
def listar_cajeros(
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve id y nombre de los usuarios activos para selectores y filtros."""
    return db.query(models.Usuario).filter(models.Usuario.activo == True).order_by(models.Usuario.nombre.asc()).all()


@router.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    _solo_admin(user_id, db)
    return db.query(models.Usuario).order_by(models.Usuario.id_usuario).all()



@router.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=201)
def crear_usuario(
    datos: schemas.UsuarioCreate,
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    _solo_admin(user_id, db)
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


@router.patch("/usuarios/{id_usuario}/desactivar", response_model=schemas.UsuarioResponse)
def desactivar_usuario(
    id_usuario: int,
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    _solo_admin(user_id, db)
    if id_usuario == user_id:
        raise HTTPException(status_code=400, detail="No podés desactivarte a vos mismo")
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.activo = False
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/usuarios/{id_usuario}/reactivar", response_model=schemas.UsuarioResponse)
def reactivar_usuario(
    id_usuario: int,
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    _solo_admin(user_id, db)
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.activo = True
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/usuarios/{id_usuario}/password", response_model=schemas.UsuarioResponse)
def cambiar_password(
    id_usuario: int,
    datos: schemas.CambiarPasswordRequest,
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    _solo_admin(user_id, db)
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.contraseña = auth.hashear_password(datos.nueva_password)
    db.commit()
    db.refresh(usuario)
    return usuario

import os
import subprocess
import glob
from datetime import datetime
from fastapi.responses import FileResponse

@router.get("/admin/backup/descargar")
def descargar_backup(user_id: int = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    _solo_admin(user_id, db)
    
    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filepath = f"backups/backup_mi_abejita_{timestamp}.sql"
    
    # Extraer nombre de la base de datos desde la variable de entorno DB_URL si es posible
    db_name = "mi_abejita"
    db_url = os.getenv("DB_URL", "")
    if db_url and "/" in db_url:
        db_name = db_url.split("/")[-1].split("?")[0]

    try:
        with open(filepath, "w") as f:
            subprocess.run(["mysqldump", "-h", "127.0.0.1", "-P", "3306", "-u", "root", db_name], stdout=f, check=True)
    except FileNotFoundError:
        paths = glob.glob("C:/Program Files/MariaDB*/bin/mysqldump.exe") + \
                glob.glob("C:/Program Files/MySQL/MySQL Server*/bin/mysqldump.exe") + \
                ["C:/xampp/mysql/bin/mysqldump.exe"]
        
        success = False
        for path in paths:
            if os.path.exists(path):
                try:
                    with open(filepath, "w") as f:
                        subprocess.run([path, "-h", "127.0.0.1", "-P", "3306", "-u", "root", db_name], stdout=f, check=True)
                    success = True
                    break
                except Exception:
                    continue
        if not success:
            raise HTTPException(status_code=500, detail="No se encontró mysqldump o falló la exportación.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return FileResponse(path=filepath, filename=os.path.basename(filepath), media_type='application/sql')
