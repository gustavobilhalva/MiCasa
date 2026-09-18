# 09 · Registro de decisiones

Formato corto tipo ADR. Se agregan al final; no se editan las anteriores (si cambia, se agrega una nueva que la reemplaza).

---

## ADR-001 · Stack frontend: React + Vite + TypeScript + Tailwind

**Fecha:** 2026-09-17
**Contexto:** app mobile-first, PWA, mucha UI de listas y formularios cortos.
**Decisión:** React 18 con Vite, TypeScript estricto, Tailwind para estilos.
**Alternativas:** Next.js (descartado: no hace falta SSR ni API routes, Firebase cubre backend), Vue (descartado por preferencia).
**Consecuencias:** build simple, deploy estático a Firebase Hosting, sin servidor Node propio más allá de Cloud Functions.

## ADR-002 · Firebase como backend completo

**Fecha:** 2026-09-17
**Contexto:** el usuario ya tiene cuenta; se necesita tiempo real, offline, auth, storage y jobs programados.
**Decisión:** Auth (Google), Firestore, Storage, Cloud Functions, Cloud Messaging, Hosting. Todo en un proyecto.
**Alternativas:** Supabase (Postgres + realtime; buen candidato pero requiere aprender otra plataforma), backend propio con WebSockets (más trabajo, más costo).
**Consecuencias:** requiere plan Blaze para functions programadas; costo real esperado $0 en uso doméstico.

## ADR-003 · Modelo multi-hogar

**Fecha:** 2026-09-17
**Contexto:** hoy son dos usuarios, pero podría compartirse con otros.
**Decisión:** todo dato vive bajo `households/{id}`; el usuario tiene un `householdId`; unión por código de invitación.
**Alternativas:** hogar único hardcodeado (más simple, pero cerrado).
**Consecuencias:** reglas de seguridad basadas en `memberIds`; una Cloud Function callable para unirse.

## ADR-004 · Motor de recordatorios único

**Fecha:** 2026-09-17
**Contexto:** stock, servicios, cuotas, vacunas, documentos, mantenimiento y garantías necesitan "avisar en una fecha".
**Decisión:** colección `reminders` transversal, una Cloud Function horaria que evalúa y notifica; los módulos solo crean/actualizan recordatorios.
**Alternativas:** cada módulo con su propia lógica de aviso (duplicación, inconsistencias).
**Consecuencias:** cualquier módulo nuevo obtiene notificaciones gratis; hay que mantener sincronizado el estado del recordatorio con la entidad origen.

## ADR-005 · Alcance v1: todos los módulos

**Fecha:** 2026-09-17
**Contexto:** el usuario prefiere la app completa antes que un MVP reducido.
**Decisión:** v1 incluye todos los módulos listados, desarrollados por fases para que sea usable desde la Fase 1.
**Consecuencias:** roadmap más largo; se prioriza el orden de fases para que cada una entregue valor.

## ADR-006 · Notificaciones v1: push + email; WhatsApp después

**Fecha:** 2026-09-17
**Contexto:** WhatsApp requiere API de Meta Business o Twilio (trámite o costo).
**Decisión:** FCM para push (PWA) y Resend para email en v1. WhatsApp como canal adicional en Fase 6.
**Consecuencias:** el módulo `notify/` se diseña con canales intercambiables.

## ADR-007 · Región y formato: Argentina

**Fecha:** 2026-09-17
**Decisión:** ARS, `es-AR`, zona `America/Argentina/Buenos_Aires`, Firestore en `southamerica-east1`, servicios y trámites típicos locales (expensas, VTV, DNI, etc.).
**Consecuencias:** recargos/percepciones sobre cuotas como porcentaje configurable; primer día de semana lunes.

## ADR-008 · Hosting en Firebase Hosting

**Fecha:** 2026-09-17
**Decisión:** frontend estático en Firebase Hosting, mismo proyecto que el backend.
**Alternativas:** Vercel/Netlify (descartado: agrega una cuenta y un dominio más sin beneficio).

## ADR-009 · Datos derivados: cliente vs function

**Fecha:** 2026-09-17
**Decisión:** lo que puede hacerse en el cliente en la misma transacción (cuotas, próxima fecha de vacuna, reinicio de contador) se hace en el cliente con batch writes. Lo que debe ocurrir sin usuario activo (instancias mensuales, evaluación de recordatorios) va a Cloud Functions programadas, con fallback en cliente cuando aplica.
**Consecuencias:** menos latencia y menos functions; hay que cuidar que la lógica compartida viva en un módulo común.

## ADR-010 · Plan Spark: sin Cloud Functions ni Firebase Storage

**Fecha:** 2026-09-17
**Contexto:** Firebase exige plan Blaze (tarjeta) para crear buckets de Storage en proyectos nuevos y para Cloud Functions. El usuario quiere costo cero garantizado, sin tarjeta.
**Decisión:** quedarse en plan Spark. Reemplazos:
- Cloud Functions programadas → **GitHub Actions** (cron) ejecutando scripts Node con Firebase Admin SDK (service account como secreto).
- `joinHousehold` callable → flujo de canje de invitación **en cliente**, validado por reglas de Firestore (`invites/` top-level + `users.pendingInvite`).
- Firebase Storage → **Supabase Storage** (1 GB gratis) con auth de terceros vía Firebase, recién en Fase 5.
- Email → Nodemailer + Gmail app password desde el job (Resend como alternativa).
**Reemplaza:** partes de ADR-002 y ADR-009 que mencionaban Cloud Functions y Storage.
**Consecuencias:** el repo necesita GitHub para los crons; los recordatorios pueden demorarse minutos en horas pico (aceptable); los avisos de eventos con precisión de minutos se complementan con notificaciones locales del navegador. Cero dependencia de tarjeta.
