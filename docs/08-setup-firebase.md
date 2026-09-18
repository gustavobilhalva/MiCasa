# 08 · Setup de Firebase

Pasos a hacer una sola vez en la consola de Firebase (https://console.firebase.google.com) y en la máquina de desarrollo. Los valores que salen de acá se cargan en `app/.env.local` (nunca se commitean).

## 1. Proyecto

1. Proyecto **`nuestra-casa-2cb72`** ya creado.
2. Plan **Spark (gratis)**. No se activa Blaze: no se usan Cloud Functions ni Firebase Storage (ver ADR-010).
3. Desarrollo con emuladores locales; un único proyecto para producción.

## 2. Authentication

1. Build → Authentication → Comenzar.
2. Proveedor **Google** → habilitar. Nombre público del proyecto: "Nuestra Casa". Email de soporte: el tuyo.
3. Settings → Dominios autorizados: agregar el dominio de Hosting (`nuestra-casa.web.app`) cuando exista. `localhost` ya viene.

## 3. Firestore

1. Build → Firestore Database → Crear base de datos.
2. Ubicación: `southamerica-east1` (São Paulo), la más cercana a Argentina. **No se puede cambiar después.**
3. Modo: producción (las reglas se despliegan desde el repo).

## 4. Storage

**No se usa Firebase Storage** (requiere Blaze). Los archivos van a Supabase Storage; setup en la Fase 5.

## 5. Cloud Messaging (push)

1. Configuración del proyecto → Cloud Messaging.
2. Web Push certificates → Generar par de claves. Copiar la **clave pública VAPID** → `VITE_FIREBASE_VAPID_KEY`.

## 6. App web

1. Configuración del proyecto → General → Tus apps → Agregar app → Web (`</>`).
2. Alias: "Nuestra Casa web". Marcar "Configurar Firebase Hosting".
3. Copiar el objeto `firebaseConfig` a variables de entorno:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

## 7. Recordatorios push + email (GitHub Actions) — Fase 3

Repo: https://github.com/gustavobilhalva/MiCasa (privado). El workflow `.github/workflows/reminders.yml` corre `jobs/src/reminders.ts` a las 09:00 y 18:00 (hora Argentina) y se puede lanzar a mano desde la pestaña Actions ("Run workflow", con opción *dry run*).

### 7.1 Service account de Firebase (obligatorio)

1. https://console.firebase.google.com/project/nuestra-casa-2cb72/settings/serviceaccounts/adminsdk → **Generar nueva clave privada**. Se descarga un JSON. No lo subas al repo.
2. Cargarlo como secreto del repo. Desde una terminal en la carpeta donde quedó el JSON:

```bash
gh secret set FIREBASE_SERVICE_ACCOUNT --repo gustavobilhalva/MiCasa < nuestra-casa-2cb72-firebase-adminsdk-xxxxx.json
```

### 7.2 Email por Gmail (opcional pero recomendado)

1. https://myaccount.google.com/apppasswords → crear una app password (requiere verificación en dos pasos activa). Son 16 caracteres.
2. Cargar dos secretos:

```bash
gh secret set GMAIL_USER --repo gustavobilhalva/MiCasa --body "gustavobilhalva@gmail.com"
```

```bash
gh secret set GMAIL_APP_PASSWORD --repo gustavobilhalva/MiCasa
```

(el segundo pide el valor por teclado; pegalo sin espacios).

### 7.3 Push en el celular (clave VAPID)

1. https://console.firebase.google.com/project/nuestra-casa-2cb72/settings/cloudmessaging → Web Push certificates → **Generate key pair**.
2. Copiar la clave pública en `app/.env.local` como `VITE_FIREBASE_VAPID_KEY=...` y volver a desplegar (`npm --prefix app run build; firebase.cmd deploy --only hosting`).
3. En la app: Más → Notificaciones → **Activar en este dispositivo**. En iPhone hay que instalar la PWA (Compartir → Agregar a inicio) y abrirla desde el ícono.

### 7.4 Probar

Actions → Recordatorios → Run workflow con *dry run* marcado: lista qué mandaría sin enviar nada. Luego sin dry run para el envío real. Los envíos quedan registrados en `households/{id}/notifications` y no se repiten el mismo día.

## 8. Herramientas locales

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

En la raíz del repo:

```bash
firebase init
```

No hace falta: `firebase.json`, `.firebaserc`, `firestore.rules` y `firestore.indexes.json` ya están en el repo.

## 9. Emuladores en desarrollo

```bash
firebase emulators:start
```

El cliente se conecta a los emuladores cuando `import.meta.env.DEV` es true (ver `app/src/lib/firebase.ts` cuando exista). UI de emuladores en http://localhost:4000.

## 10. Deploy

```bash
npm --prefix app run build; firebase.cmd deploy --only hosting,firestore
```

Primer deploy: verificar que `nuestra-casa.web.app` esté en dominios autorizados de Auth (paso 2.3).

## Checklist

Proyecto real: **`nuestra-casa-2cb72`** (display name "Nuestra-Casa").

- [x] Proyecto creado, plan Spark (gratis)
- [ ] Auth con Google habilitado — https://console.firebase.google.com/project/nuestra-casa-2cb72/authentication/providers
- [ ] Firestore en `southamerica-east1` — https://console.firebase.google.com/project/nuestra-casa-2cb72/firestore
- [x] Storage: no se usa (Supabase en Fase 5)
- [ ] Clave VAPID generada y cargada en `.env.local` (ver 7.3)
- [x] App web registrada (`1:597934237624:web:deccf13e97d717c2af514d`), `app/.env.local` completado
- [ ] Service account + secretos en GitHub (ver 7.1 y 7.2)
- [x] `firebase.json`, `.firebaserc`, reglas e índices en el repo
- [ ] Reglas desplegadas: `firebase deploy --only firestore`
- [ ] Emuladores arrancan sin error

Nota Windows: si `firebase` falla por política de ejecución, usar `firebase.cmd` o `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
