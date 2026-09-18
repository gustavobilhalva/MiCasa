# 01 · Visión y alcance

## Objetivo

Una única app compartida entre los dos integrantes de la pareja que reemplace los chats, notas sueltas y planillas para organizar el hogar. Todo lo que uno carga, el otro lo ve al instante.

## Usuarios

- **Dos adultos** (los miembros del hogar). Ambos con los mismos permisos.
- **Un hijo**, que no usa la app pero es sujeto de eventos, logística y documentación.
- **Mascota(s)**, con su propio calendario de salud.
- Posible extensión futura: más miembros del hogar (abuelos, niñera) con permisos limitados.

## Contexto de uso

- 90% de los accesos desde el celular, muchas veces fuera de casa (supermercado, cola de un trámite, sala de espera).
- Sesiones cortas: tachar un producto, cargar un gasto, mirar qué hay hoy.
- Conectividad irregular: la app debe funcionar offline y sincronizar al recuperar señal (Firestore lo resuelve con persistencia local).

## Principios de diseño

1. **Mobile-first, pulgar-first.** Acciones principales al alcance del pulgar (barra inferior, botones grandes, FAB).
2. **Dos toques máximo** para las acciones del 90%: tachar producto, cargar gasto, ver el día.
3. **Tiempo real por defecto.** Ninguna pantalla requiere "refrescar".
4. **Un solo motor de recordatorios** para todo lo recurrente (stock, vencimientos, vacunas, mantenimiento, documentos). Se define una vez, se reutiliza en todos los módulos.
5. **Responsable visible.** Cualquier cosa que haya que hacer tiene un "quién" (o "sin asignar", que también es información).
6. **Instalable.** PWA con ícono en la pantalla de inicio y notificaciones push.

## Alcance de la v1

Todos los módulos listados en [02-funcionalidades.md](02-funcionalidades.md), implementados en el orden del [roadmap](07-roadmap.md):

| Módulo | Incluido en v1 |
|---|---|
| Hoy (panel diario) | Sí |
| Compras y almacén | Sí |
| Finanzas y gastos | Sí |
| Calendario familiar | Sí |
| Menús semanales | Sí |
| Logística diaria (notas) | Sí |
| Mascotas | Sí |
| Trámites y documentos | Sí |
| Casa y mantenimiento | Sí (básico) |
| Notificaciones push + email | Sí |
| Notificaciones WhatsApp | No (fase posterior) |
| Multi-hogar con invitación | Sí |
| Roles/permisos diferenciados | No (todos los miembros son iguales) |

## Fuera de alcance (por ahora)

- Integración bancaria o lectura automática de resúmenes de tarjeta.
- Reconocimiento de tickets por foto (OCR).
- App nativa en tiendas (la PWA cubre el caso).
- Compartir listas con personas fuera del hogar.
