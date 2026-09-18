# 05 · Notificaciones y recordatorios

## Principio

Un solo motor. Cualquier módulo que necesite avisar algo en una fecha crea un documento en `reminders/` (ver [04](04-modelo-de-datos.md#motor-de-recordatorios)). Un único job programado los evalúa y envía. Los módulos no saben nada de push ni email.

**Sin Cloud Functions:** el job corre en **GitHub Actions** (cron) con el Firebase Admin SDK, porque el plan Spark no permite funciones programadas. Ver ADR-010.

## Flujo diario

```
GitHub Actions cron (cada hora)
  └─> jobs/src/reminders.ts
        ├─ para cada hogar: si la hora local == settings.reminderHour
        │     ├─ query reminders where status == "pending" and dueAt <= hoy + max(notifyDaysBefore)
        │     ├─ para cada reminder:
        │     │     ├─ calcular offset = díasHasta(dueAt)
        │     │     ├─ si offset ∈ notifyDaysBefore y offset != lastNotifiedOffset:
        │     │     │     ├─ destinatarios = assigneeUid ? [assigneeUid] : memberIds
        │     │     │     ├─ enviar push (si user.notificationPrefs.push)
        │     │     │     ├─ enviar email (si user.notificationPrefs.email)
        │     │     │     └─ actualizar lastNotifiedAt / lastNotifiedOffset, loguear en notifications/
        │     │     └─ si offset < 0 (vencido) y no notificado hoy: enviar "vencido"
        └─ fin
```

Se corre cada hora (no una vez al día) para respetar la `reminderHour` de cada hogar según su zona horaria. Costo: ~720 minutos/mes de GitHub Actions, dentro de los 2.000 gratis.

## Eventos del calendario

Los recordatorios de eventos (15 min / 1 h antes) necesitan más precisión que un cron horario, y los crons de GitHub pueden demorarse en horas pico. Solución en dos capas:

1. **Job horario:** envía push para eventos del día siguiente (la noche anterior) y de las próximas horas.
2. **Local en el dispositivo:** cuando la app está abierta o instalada, el Service Worker programa avisos con la Notification API para los eventos de las próximas 24 h. No requiere servidor.

Si hiciera falta más precisión, un cron cada 15 minutos consume ~2.900 min/mes y excede el plan gratuito; se puede restringir a la franja 7–23 (≈1.900 min/mes).

## Push (Firebase Cloud Messaging)

- Al instalar la PWA y aceptar permisos, el cliente obtiene un token FCM y lo guarda en `users/{uid}.fcmTokens[]`.
- El Service Worker (`firebase-messaging-sw.js`) muestra la notificación cuando la app está cerrada. Al tocarla abre la ruta del módulo correspondiente (`data.url`).
- El envío lo hace el job con `admin.messaging().sendEachForMulticast()`. FCM no tiene costo en plan Spark.
- Tokens inválidos (usuario desinstaló) se eliminan al recibir error `messaging/registration-token-not-registered`.
- **iOS:** requiere iOS 16.4+ y que la PWA esté agregada a la pantalla de inicio. Se documenta en la pantalla de configuración.

Payload:

```json
{
  "notification": { "title": "Vence Luz en 3 días", "body": "Asignado a Gustavo · $18.500 estimado" },
  "data": { "url": "/finanzas/servicios", "reminderId": "..." }
}
```

## Email

Dos alternativas, ambas gratuitas en volumen doméstico:

| Opción | Pro | Contra |
|---|---|---|
| Resend (API) desde el job | 3.000 emails/mes gratis, dominio propio opcional | Sin dominio propio solo envía al email de la cuenta |
| Nodemailer + SMTP de Gmail (app password) desde el job | Envía a cualquiera, sin cuenta extra | Requiere app password de Google; ~500/día |

**Decisión v1:** Gmail SMTP vía Nodemailer (envía a los dos miembros sin verificar dominio). Se abstrae en `jobs/src/notify/email.ts` para poder cambiar a Resend.

Los emails incluyen: título, detalle, responsable, link directo a la app. Sin HTML elaborado.

## WhatsApp (fase posterior)

Requiere una de estas vías:

- **WhatsApp Business Cloud API (Meta):** gratuita hasta 1.000 conversaciones/mes, pero requiere cuenta Meta Business verificada, número dedicado y plantillas aprobadas. Trámite de varios días.
- **Twilio WhatsApp:** más simple de integrar, pago por mensaje (~USD 0,005 + tarifa de Meta).
- **CallMeBot / similares:** gratuitos, no oficiales, frágiles. No recomendado.

Cuando se implemente, es un canal más en `notify/` y una preferencia más en `notificationPrefs`. Ningún cambio en el motor.

## Qué genera recordatorios

| Módulo | Cuándo se crea/actualiza | notifyDaysBefore por defecto |
|---|---|---|
| Producto recurrente | al tachar el producto (dueAt = ahora + intervalDays) | [0] |
| Servicio (instancia mensual) | al generar la instancia | [3, 0] (configurable por servicio) |
| Cuota de tarjeta | al generar cuotas (dueAt = dueDate del resumen) | [3] |
| Vacuna / desparasitación | al registrar la aplicación (dueAt = nextDueAt) | [7, 1] |
| Documento con vencimiento | al crear/editar | [30, 15, 5] |
| Trámite con fecha límite | al crear/editar | [7, 1] |
| Mantenimiento del hogar | al marcar hecho (dueAt = ahora + intervalMonths) | [7] |
| Garantía | al crear | [30] |
| Evento | al crear/editar con reminderMinutesBefore | según evento (minutos, no días) |
| Nota con hora | al crear con `time` | [0] a la hora indicada |

Los recordatorios se marcan `done` cuando se resuelve la entidad origen (se paga el servicio, se tacha el producto, se registra la vacuna). El cliente es responsable de esa actualización (misma escritura en batch).

## In-app

Además de push/email, el panel "Hoy" lee `reminders` directamente y muestra todo lo que vence en los próximos 7 días. Esto funciona aunque el usuario no tenga notificaciones habilitadas.

## Preferencias del usuario

Pantalla Configuración → Notificaciones:

- Push: on/off (+ botón "Probar").
- Email: on/off.
- Horario silencioso (no aplica a in-app).
- Por tipo: recibir solo lo asignado a mí / todo lo del hogar.
