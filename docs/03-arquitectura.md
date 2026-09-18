# 03 · Arquitectura

## Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| UI | React 18 + TypeScript | Ecosistema amplio, tipado para un modelo de datos con muchas entidades |
| Build | Vite | Arranque rápido, PWA plugin maduro |
| Estilos | Tailwind CSS | Mobile-first por diseño, sin CSS suelto |
| Componentes | Headless UI + iconos Lucide | Accesibles, sin imponer estilo |
| Estado servidor | Firestore (SDK modular) con hooks propios | Tiempo real nativo, persistencia offline |
| Estado local | Zustand (mínimo) | Solo para UI: modal abierto, pestaña activa, filtros |
| Formularios | React Hook Form + Zod | Validación tipada, poco boilerplate |
| Routing | React Router v6 | Rutas anidadas por módulo |
| Fechas | date-fns (locale es) | Liviano, tree-shakeable |
| Auth | Firebase Auth (Google) | Ya disponible, cero gestión de contraseñas |
| Base de datos | Cloud Firestore | Tiempo real + offline + reglas de seguridad |
| Archivos | Supabase Storage (Fase 5) con auth de terceros vía Firebase | 1 GB gratis; Firebase Storage exige plan Blaze en proyectos nuevos |
| Jobs programados | GitHub Actions (cron) + script Node con Firebase Admin SDK | Gratis; reemplaza a Cloud Functions, que requieren Blaze |
| Push | Firebase Cloud Messaging (envío desde el job con Admin SDK) + Service Worker | FCM es gratis en plan Spark |
| Email | Resend (API) desde el job | 3.000 emails/mes gratis |
| Hosting | Firebase Hosting | Deploy con un comando, HTTPS incluido; gratis en Spark |
| PWA | vite-plugin-pwa (Workbox) | Instalable, cache de assets, SW para push |

**Restricción de costo:** todo debe funcionar en el plan **Spark (gratis, sin tarjeta)**. Nada de Cloud Functions ni Firebase Storage. Ver ADR-010.

## Estructura del repositorio

```
WebOrganizacion/
├── docs/                      # esta documentación
├── app/                       # frontend (Vite)
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── icons/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx            # router + layout
│   │   ├── lib/
│   │   │   ├── firebase.ts    # init de app, auth, db, storage, messaging
│   │   │   ├── format.ts      # moneda ARS, fechas es-AR
│   │   │   └── reminders.ts   # cálculo de próximas fechas (compartido con functions)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useHousehold.ts
│   │   │   └── useCollection.ts   # wrapper genérico onSnapshot → estado
│   │   ├── components/
│   │   │   ├── layout/        # BottomNav, TopBar, FAB, Sheet (modal desde abajo)
│   │   │   └── ui/            # Button, Input, Chip, ProgressBar, EmptyState…
│   │   ├── features/
│   │   │   ├── today/
│   │   │   ├── shopping/      # lista, catálogo, recurrentes, preferencias, inventario
│   │   │   ├── finance/       # gastos, tarjetas, cuotas, servicios, presupuesto, balance, fondos
│   │   │   ├── calendar/
│   │   │   ├── meals/
│   │   │   ├── notes/
│   │   │   ├── child/
│   │   │   ├── pets/
│   │   │   ├── paperwork/     # documentos, trámites, bóveda
│   │   │   ├── home/          # mantenimiento, garantías, contactos
│   │   │   └── settings/      # hogar, miembros, notificaciones
│   │   └── types/             # tipos compartidos del modelo (ver 04)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── jobs/                      # scripts programados (Node + Admin SDK), corren en GitHub Actions
│   ├── src/
│   │   ├── reminders.ts       # evalúa recordatorios, envía push/email
│   │   ├── services.ts        # genera instancias mensuales de servicios
│   │   └── notify/            # abstracción push/email
│   └── package.json
├── .github/workflows/
│   ├── reminders.yml          # cron horario
│   └── deploy.yml             # build + firebase deploy en push a main (opcional)
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

Cada carpeta en `features/` sigue el mismo patrón interno:

```
features/shopping/
├── ShoppingPage.tsx        # ruta principal del módulo
├── components/             # componentes específicos
├── hooks/                  # useShoppingList, useCatalog…
├── api.ts                  # funciones de escritura a Firestore (addItem, toggleItem…)
└── types.ts                # re-export o tipos locales
```

## Decisiones técnicas

### Tiempo real

- Toda lectura de datos se hace con `onSnapshot`. No hay `getDoc` en la UI salvo casos puntuales.
- Persistencia offline habilitada (`enableIndexedDbPersistence` / `persistentLocalCache`). Las escrituras offline se encolan y sincronizan solas.
- Los listeners se limitan al hogar del usuario (`where('householdId', '==', …)` o subcolecciones bajo `households/{id}`).

### Multi-hogar

- Todo dato vive bajo `households/{householdId}/...`. Ver [04-modelo-de-datos.md](04-modelo-de-datos.md).
- El usuario tiene un doc en `users/{uid}` con su `householdId` activo. Las reglas de Firestore verifican pertenencia con `households/{id}.memberIds`.
- **Unirse por código sin backend:** las invitaciones viven en `invites/{code}` (top-level). El flujo en cliente es: (1) reclamar la invitación escribiendo `usedBy = uid` (conocer el código es la prueba), (2) guardar `pendingInvite = code` en `users/{uid}`, (3) agregarse a `memberIds` del hogar. Las reglas validan la cadena completa en el paso 3. Ver `firestore.rules`.

### Lógica compartida frontend/jobs

- El cálculo de "próxima fecha" de un recordatorio y la generación de cuotas viven en un módulo TypeScript puro compartido entre `app/src/lib/` y `jobs/src/` (paquete local `packages/shared` o copia; se decide al iniciar la Fase 3).

### Escrituras que generan datos derivados

| Acción | Dónde se resuelve | Motivo |
|---|---|---|
| Crear gasto en cuotas → generar N cuotas | Cliente (batch write) | Inmediato; se puede recalcular |
| Tachar producto recurrente → reiniciar contador | Cliente | Trivial |
| Registrar vacuna → calcular próxima | Cliente | Trivial |
| Generar instancia mensual de servicios | Job en GitHub Actions (día 1 de cada mes) + fallback en cliente al abrir el módulo | Debe ocurrir aunque nadie abra la app |
| Evaluar recordatorios y notificar | Job en GitHub Actions (cron horario) | Necesita enviar push/email sin usuario activo |

### Jobs en GitHub Actions

- Un repo privado en GitHub con un workflow `schedule: cron`. GitHub da 2.000 minutos/mes gratis en repos privados; un job de recordatorios tarda < 1 minuto, así que el cron horario consume ~720 min/mes. Si hace falta, se baja a cada 2 horas o se limita a la franja 8–22.
- El job autentica con una **service account** de Firebase (JSON guardado como secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub). Tiene acceso admin a Firestore y a FCM.
- Limitación: los crons de GitHub pueden demorarse varios minutos en horas pico. Aceptable para recordatorios diarios; para avisos de eventos con precisión de minutos se usa la notificación local del navegador (Notification API + `setTimeout` mientras la app está abierta) como complemento.

### Notificaciones

Ver [05-notificaciones.md](05-notificaciones.md).

### Seguridad

- Reglas de Firestore: solo miembros del hogar leen/escriben bajo `households/{id}`. Ver reglas en 04.
- Archivos (Fase 5): Supabase Storage con políticas RLS que validan el JWT de Firebase (integración "Third-Party Auth" de Supabase), bucket privado por hogar.
- Sin datos financieros sensibles (no se guardan números completos de tarjeta; solo alias y últimos 4 dígitos opcionales).

### Formato regional

- `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`.
- Fechas en `es` con date-fns; primer día de la semana: lunes.
- Zona horaria del hogar configurable, por defecto `America/Argentina/Buenos_Aires`. Las Cloud Functions usan la del hogar para calcular "hoy".

## Entornos

| Entorno | Proyecto Firebase | Uso |
|---|---|---|
| dev | `nuestra-casa-dev` (o emuladores locales) | desarrollo |
| prod | `nuestra-casa` | uso real |

Se recomienda usar el Firebase Emulator Suite (Auth, Firestore) en desarrollo para no ensuciar datos ni consumir cuota. Los emuladores no requieren Blaze.
