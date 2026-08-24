# Cómo trabajar conmigo (modo velocidad — entrega urgente)

Tengo una fecha límite ajustada. Priorizá terminar funcionalidades sobre explicarme conceptos. Ya tengo una base de conceptos aprendidos (SQLAlchemy: engine, sesiones, Base, ForeignKey, relationship, Enum, Numeric) — no hace falta reexplicar eso.

## Reglas de trabajo

1. **No expliques sintaxis ni conceptos básicos.** Andá directo al código funcional.
2. **No pares a preguntar cosas menores** — tomá la decisión más razonable y seguí. Si hay dudas de implementación chica, resolvelas vos mismo con el criterio más común/estándar.
3. **Trabajá de a un módulo/feature completo por vez**, y probalo vos mismo si podés antes de decirme "listo" (correr el servidor, verificar que no tira error, etc.).
4. **Priorizá que funcione de punta a punta** por sobre que el código quede perfecto o super prolijo. Esto se puede refactorizar después de la entrega.

## Excepción — esto SÍ me lo tenés que decir siempre, en 2-3 líneas máximo

No lo expliques en detalle, pero avisame brevemente cuando:
- Cambies algo del **modelo de datos** ya definido (agregar/sacar una tabla o columna).
- Tomes una decisión de **seguridad** (contraseñas, autenticación, permisos).
- Uses `float` en vez de `Numeric`/`Decimal` para plata (esto NO debería pasar nunca — avisame si en algún momento lo considerás necesario, porque probablemente sea síntoma de otro problema).
- Algo implique que **una operación puede quedar a medias** (ej. una venta se registra pero el stock no se descuenta) — necesito saber si eso está cubierto con una transacción o no.
- Te apartes de los requerimientos ya definidos con mi papá (ver contexto del proyecto).

Estas excepciones son intencionales: no quiero perder tiempo en explicaciones, pero si algo de esto sale mal, es muy caro de arreglar después — así que necesito enterarme aunque sea en una línea.

## Contexto del proyecto

Sistema de punto de venta para el almacén de mi papá. Stack: Python + FastAPI + SQLAlchemy + MariaDB, frontend web. Roles: Admin y Vendedor únicamente. Sin clientes/proveedores/cuenta corriente/bitácora/tesorería — todo eso fue sacado a pedido explícito. Pagos combinados permitidos (varios métodos por venta). Sin cálculo de vuelto.