import sys
from pathlib import Path

# Permitir ejecutar directo con python print_service/test_cli.py
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from decimal import Decimal
from datetime import datetime
from print_service.config import settings
from print_service.schemas import (
    TicketPayload,
    TicketItem,
    TicketPago,
    TicketCierrePayload,
    TicketResumenPeriodoPayload,
    ItemCategoriaResumen,
)
from print_service.printer import printer_service, listar_impresoras_sistema

def main():
    print("=" * 50)
    print("   MI ABEJITA - Test CLI de Impresion ESC/POS")
    print("=" * 50)
    print(f"Driver actual: {settings.PRINTER_DRIVER}")
    print(f"Impresora:     {settings.PRINTER_NAME}")
    print(f"Ancho papel:   {settings.PAPER_CHARS} columnas")
    print("-" * 50)
    
    impresoras = listar_impresoras_sistema()
    print(f"Impresoras de Windows detectadas: {impresoras}")
    print("-" * 50)
    
    print("Opciones:")
    print("1. Imprimir Ticket de Prueba de Hardware (Diagnostico)")
    print("2. Imprimir Ticket de Venta Simulado (V2 con Pagos Combinados)")
    print("3. Probar Apertura de Cajon Monedero")
    print("4. Imprimir Ticket de Cierre de Caja / Turno")
    print("5. Imprimir Ticket de Resumen de Ventas por Periodo")
    print("6. Salir")
    print("-" * 50)
    
    if len(sys.argv) > 1:
        opcion = sys.argv[1]
    else:
        opcion = input("Seleccione una opcion (1-6) [default: 2]: ").strip() or "2"
        
    if opcion == "1":
        print("\nImprimiendo ticket de prueba...")
        try:
            printer_service.imprimir_prueba()
            print("[OK] Ticket de prueba enviado exitosamente.")
        except Exception as e:
            print(f"[ERROR] Error al imprimir: {e}")
            
    elif opcion == "2":
        print("\nGenerando e imprimiendo ticket de venta simulado...")
        venta_ejemplo = TicketPayload(
            id_venta=105,
            numero_ticket="#000105",
            fecha=datetime.now(),
            vendedor="Tomas",
            cliente="Consumidor Final",
            items=[
                TicketItem(
                    nombre_producto="Leche La Serenisima 1L Entera",
                    cantidad=Decimal("2.000"),
                    precio_unitario=Decimal("1250.00"),
                    subtotal=Decimal("2500.00")
                ),
                TicketItem(
                    nombre_producto="Queso Cremoso La Paulina",
                    cantidad=Decimal("0.550"),
                    precio_unitario=Decimal("8500.00"),
                    subtotal=Decimal("4675.00")
                ),
                TicketItem(
                    nombre_producto="Pan Frances (por kilo)",
                    cantidad=Decimal("0.800"),
                    precio_unitario=Decimal("2000.00"),
                    subtotal=Decimal("1600.00")
                ),
                TicketItem(
                    nombre_producto="Coca Cola 2.25L Retornable",
                    cantidad=Decimal("1.000"),
                    precio_unitario=Decimal("2200.00"),
                    subtotal=Decimal("2200.00")
                ),
                TicketItem(
                    nombre_producto="Caramelos surtidos",
                    cantidad=Decimal("5.000"),
                    precio_unitario=Decimal("100.00"),
                    subtotal=Decimal("500.00")
                )
            ],
            total=Decimal("11475.00"),
            pagos=[
                TicketPago(
                    metodo="efectivo",
                    monto=Decimal("5000.00"),
                    referencia=None
                ),
                TicketPago(
                    metodo="transferencia",
                    monto=Decimal("6475.00"),
                    referencia="MP-98471203"
                )
            ],
            abrir_cajon=False
        )
        
        try:
            printer_service.imprimir_ticket(venta_ejemplo)
            print("[OK] Ticket de venta impreso exitosamente.")
        except Exception as e:
            print(f"[ERROR] Error al imprimir ticket de venta: {e}")
            
    elif opcion == "3":
        print("\nEnviando pulso de apertura de cajon...")
        try:
            printer_service.abrir_cajon()
            print("[OK] Pulso de apertura enviado.")
        except Exception as e:
            print(f"[ERROR] Error al abrir cajon: {e}")
            
    elif opcion == "4":
        print("\nGenerando e imprimiendo ticket de Cierre de Turno...")
        cierre_ejemplo = TicketCierrePayload(
            id_session=12,
            vendedor="Tomas",
            fecha_apertura=datetime.now(),
            fecha_cierre=datetime.now(),
            monto_apertura=Decimal("15000.00"),
            total_ventas=Decimal("48500.00"),
            cantidad_ventas=18,
            total_efectivo=Decimal("25000.00"),
            total_transferencia=Decimal("12000.00"),
            total_debito=Decimal("8000.00"),
            total_credito=Decimal("3500.00"),
            efectivo_esperado=Decimal("40000.00"),
            efectivo_contado=Decimal("40000.00"),
            diferencia=Decimal("0.00"),
            observaciones="Cierre sin novedades"
        )
        try:
            printer_service.imprimir_cierre_caja(cierre_ejemplo)
            print("[OK] Ticket de Cierre de Caja impreso exitosamente.")
        except Exception as e:
            print(f"[ERROR] Error al imprimir cierre de caja: {e}")

    elif opcion == "5":
        print("\nGenerando e imprimiendo ticket de Resumen de Ventas...")
        resumen_ejemplo = TicketResumenPeriodoPayload(
            titulo="RESUMEN DE VENTAS",
            fecha_desde="2026-08-01",
            fecha_hasta="2026-08-25",
            usuario="Todos",
            total_ventas=Decimal("345800.00"),
            cantidad_ventas=142,
            total_efectivo=Decimal("180000.00"),
            total_transferencia=Decimal("95000.00"),
            total_debito=Decimal("50800.00"),
            total_credito=Decimal("20000.00"),
            categorias=[
                ItemCategoriaResumen(categoria="Almacén", unidades=Decimal("120.000"), total=Decimal("150000.00")),
                ItemCategoriaResumen(categoria="Fiambrería", unidades=Decimal("35.500"), total=Decimal("110000.00")),
                ItemCategoriaResumen(categoria="Bebidas", unidades=Decimal("80.000"), total=Decimal("85800.00")),
            ]
        )
        try:
            printer_service.imprimir_resumen_periodo(resumen_ejemplo)
            print("[OK] Ticket de Resumen de Ventas impreso exitosamente.")
        except Exception as e:
            print(f"[ERROR] Error al imprimir resumen de ventas: {e}")

    elif opcion == "6":
        print("Saliendo.")
    else:
        print("Opcion invalida.")

if __name__ == "__main__":
    main()
