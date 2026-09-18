# 07 · Roadmap

El orden está pensado para que la app sea usable desde la Fase 1 y cada fase agregue valor sin rehacer lo anterior. El motor de recordatorios se construye una vez (Fase 3) y las fases siguientes solo lo consumen.

## Fase 0 · Documentación y setup — actual

- [x] Documentación funcional y técnica (estos docs)
- [x] Proyecto Firebase `nuestra-casa-2cb72` + app web registrada, `.env.local` cargado
- [x] Firestore y Auth Google habilitados en consola ([08-setup-firebase.md](08-setup-firebase.md))
- [x] Reglas e índices desplegados
- [x] Repositorio con estructura de [03-arquitectura.md](03-arquitectura.md)
- [x] Scaffold de Vite + React + TS + Tailwind + PWA (build OK)
- [x] Reglas de Firestore con canje de invitación en cliente (sin Cloud Functions, ADR-010)
- [ ] Emuladores locales funcionando (opcional; hoy se desarrolla contra el proyecto real)

## Fase 1 · Base + Lista del súper — entregada

Objetivo: los dos pueden entrar, estar en el mismo hogar y usar la lista en tiempo real.

- [x] Login con Google
- [x] Crear hogar / unirse con código (flujo en cliente validado por reglas) — falta probar el canje con la segunda cuenta
- [x] Layout base: BottomNav (sidebar en desktop), TopBar, Sheet
- [ ] FAB de acciones rápidas
- [x] Reglas de Firestore desplegadas
- [x] Sectores del súper por defecto + orden de recorrido
- [x] Lista compartida: agregar, tachar, quitar, limpiar, tiempo real
- [ ] Verificar comportamiento offline
- [x] Catálogo de productos con autocompletado y categoría automática
- [x] Ficha de producto: marca preferida, marcas a evitar, notas, cantidad habitual (pestaña Catálogo)
- [x] Cantidad al agregar ("leche x2", "1kg papas")
- [x] Reordenar sectores (orden de recorrido) desde Más
- [x] Modo compra
- [x] PWA instalable (manifest, íconos, SW básico)
- [x] Deploy a Firebase Hosting — https://nuestra-casa-2cb72.web.app

**Entregable:** la lista del súper reemplaza al chat de WhatsApp.

## Fase 2 · Finanzas — entregada (v1)

- [x] Categorías de gasto por defecto (IDs fijos, seed idempotente)
- [x] Cargar gasto (sheet rápido, también desde Hoy) y lista de movimientos del mes
- [x] Tarjetas (cierre / vencimiento)
- [x] Gastos en cuotas: generación y proyección a 12 meses con detalle por cuota
- [x] Simulador de cuotas con recargo/impuestos
- [x] Servicios: alta, generación de instancias mensuales (fallback en cliente; job en Fase 3), marcar pagado → gasto, omitir mes
- [x] Asignación de responsable por instancia (tocar el avatar rota entre miembros)
- [x] Balance entre miembros y "Saldar" (reparto por defecto 50/50 si no está configurado)
- [x] Presupuesto por categoría (tope mensual con barra)
- [x] Fondos de ahorro con aportes, retiros, progreso y proyección mensual

**Entregable:** se sabe qué se gasta, qué vence y quién lo paga.

Pendiente menor: editar gasto existente, configurar reparto por defecto distinto de 50/50, vista resumen de suscripciones (Fase 6).

## Fase 3 · Motor de recordatorios + Hoy — código listo, falta configurar secretos

- [x] El job lee directamente cada colección (servicios, cuotas, salud, documentos, trámites, mantenimiento, garantías, eventos, notas); no hace falta colección `reminders` aparte
- [x] Job `jobs/src/reminders.ts` + workflow de GitHub Actions (09:00 y 18:00 ART, más ejecución manual con dry run)
- [x] Push: permisos, tokens, Service Worker (`firebase-messaging-sw.js`), envío desde el job, toast en primer plano. Falta: clave VAPID
- [x] Email vía Gmail SMTP (Nodemailer): un resumen por persona y por corrida. Falta: app password
- [x] Preferencias de notificación por usuario (Más → Notificaciones)
- [ ] Productos recurrentes (intervalo, auto-agregar a lista, sugerencia por historial) — pendiente
- [x] Panel Hoy completo (eventos, notas, vencimientos, menú, accesos rápidos)
- [x] Recordatorios de servicios y cuotas enganchados al job

**Entregable:** la app avisa sola. Ya no hay que acordarse de nada.

## Fase 4 · Calendario, notas y menús — entregada (v1)

- [x] Eventos con categorías, recurrencia (semanal/quincenal/mensual/anual) y roles (lleva / busca / ayuda)
- [x] Vista agenda por mes con filtro por miembro; vencimientos de servicios integrados. Vista semana/mes en grilla: pendiente
- [ ] Recordatorios de eventos (job + notificación local del navegador) — Fase 3
- [x] Notas rápidas con hora, responsable y checklist; visibles en Hoy. Convertir en evento: pendiente
- [x] Recetas con ingredientes vinculados al catálogo (autocompletado)
- [x] Planificador semanal (almuerzo/cena, receta o texto libre)
- [x] "Agregar faltantes a la lista" por receta o semana completa (cruza despensa y lista pendiente, respeta exclusiones)
- [x] Ingredientes excluidos, reparto por defecto y recargo de cuotas en Más → Preferencias
- [x] Despensa básica (pestaña en Súper) con vencimientos y "cociná esto primero"

**Entregable:** la semana se planifica en un lugar y la lista se arma sola.

Además: panel Hoy completo (agenda, notas, vencimientos, menú del día, lista) con FAB de acciones rápidas (gasto / nota / evento).

## Fase 5 · Hijo, mascotas, trámites y casa — entregada (v1)

- [x] Ficha del hijo (colegio, obra social, alergias, talles con fecha, notas), contactos con llamar/WhatsApp
- [x] `healthRecords` para personas y mascotas: próxima fecha automática por intervalo; al registrar de nuevo se cierra la anterior
- [x] Ficha de mascota, botón "Queda poca comida" (manda el alimento configurado al sector Mascotas, evita duplicados)
- [x] Documentos con vencimiento y semáforo (verde > 30 días, amarillo ≤ 30, rojo vencido), por miembro / hijo / mascota / casa
- [x] Trámites con checklist, plantillas (DNI, pasaporte, licencia, VTV, inscripción escolar), responsable y fecha límite
- [ ] Bóveda de documentos (Supabase Storage + auth de terceros con Firebase) — pendiente
- [x] Mantenimiento recurrente (sugerencias, intervalo, "Hecho" recalcula), garantías, contactos de servicio
- [x] Vencimientos de salud, documentos, trámites, mantenimiento y garantías visibles en Hoy (14 días) y en Agenda. Enganche al motor push/email: Fase 3

**Entregable:** toda la v1 completa.

## Fase 6 · Pulido y extras

- [ ] Historial de precios con gráfico
- [ ] Suscripciones (vista resumen)
- [ ] Tema oscuro afinado
- [ ] Exportar gastos a CSV
- [ ] WhatsApp como canal de notificación
- [ ] Widgets de acceso directo (shortcuts del manifest)
- [ ] Roles/permisos para miembros adicionales

## Estimación relativa

| Fase | Tamaño |
|---|---|
| 0 | S |
| 1 | M |
| 2 | L |
| 3 | M |
| 4 | L |
| 5 | L |
| 6 | según prioridad |

Las fases 1 a 3 juntas son el núcleo; después de la Fase 3 la app ya es más útil que cualquier alternativa genérica.
