# Nuestra Casa

Web app responsive (mobile-first, PWA) para la organización del hogar en pareja: compras, finanzas, calendario familiar, menús, mascotas y trámites, con sincronización en tiempo real vía Firebase.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/01-vision-y-alcance.md](docs/01-vision-y-alcance.md) | Objetivo, usuarios, principios de diseño, alcance de la v1 |
| [docs/02-funcionalidades.md](docs/02-funcionalidades.md) | Detalle funcional de cada módulo |
| [docs/03-arquitectura.md](docs/03-arquitectura.md) | Stack, estructura del proyecto, decisiones técnicas |
| [docs/04-modelo-de-datos.md](docs/04-modelo-de-datos.md) | Colecciones de Firestore, campos, reglas de seguridad |
| [docs/05-notificaciones.md](docs/05-notificaciones.md) | Motor de recordatorios, push, email, WhatsApp (futuro) |
| [docs/06-ui-y-navegacion.md](docs/06-ui-y-navegacion.md) | Pantallas, navegación, guía de estilo mobile |
| [docs/07-roadmap.md](docs/07-roadmap.md) | Fases de desarrollo y orden de implementación |
| [docs/08-setup-firebase.md](docs/08-setup-firebase.md) | Pasos para configurar el proyecto en Firebase |
| [docs/09-decisiones.md](docs/09-decisiones.md) | Registro de decisiones (ADR) |

## Decisiones clave

- **Stack:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Firebase plan Spark (Auth con Google, Firestore, Cloud Messaging, Hosting) — sin Cloud Functions ni Storage; jobs en GitHub Actions, archivos en Supabase (ADR-010)
- **Modelo:** multi-hogar (cada usuario pertenece a un `household`; se invita por código)
- **Región:** Argentina (ARS, formato `1.234,56`, servicios y trámites locales)
- **Alertas v1:** push (PWA) + email, enviados desde un cron gratuito de GitHub Actions. WhatsApp para una fase posterior.
- **Costo:** $0 garantizado, sin tarjeta.

## Estado

Fases 1, 2, 4 y 5 entregadas (súper, finanzas, agenda/notas/menús, hijo/mascotas/trámites/casa) en https://nuestra-casa-2cb72.web.app. Pendientes: Fase 3 (recordatorios push/email vía GitHub Actions) y bóveda de archivos (Supabase). Ver [roadmap](docs/07-roadmap.md).
