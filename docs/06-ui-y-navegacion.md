# 06 · UI y navegación

## Layout base (móvil)

```
┌─────────────────────────────┐
│ TopBar: título · avatar     │
├─────────────────────────────┤
│                             │
│  contenido (scroll)         │
│                             │
│                        [+]  │  ← FAB contextual
├─────────────────────────────┤
│ Hoy  Súper  Gastos  Agenda  Más │  ← BottomNav (5 ítems)
└─────────────────────────────┘
```

- **BottomNav** fija con 5 destinos. "Más" abre una grilla con el resto de módulos.
- **FAB** cambia según la pantalla: en Súper agrega producto, en Gastos carga gasto, en Agenda crea evento, en Hoy abre un menú de acciones rápidas (producto / gasto / nota).
- **Sheets** (modales desde abajo) para todos los formularios. Nunca páginas completas para crear/editar algo corto.
- En pantallas ≥ 768 px la BottomNav se convierte en sidebar izquierda y el contenido se centra a 720 px máx. Sin layouts especiales para desktop más allá de eso.

## Mapa de rutas

```
/                      Hoy
/super                 Lista de compras (pestañas: Lista · Catálogo · Recurrentes · Despensa)
/super/modo-compra     Modo compra (pantalla completa)
/super/producto/:id    Ficha de producto (preferencias, historial de precios)
/gastos                Gastos del mes (pestañas: Movimientos · Presupuesto · Balance)
/gastos/cuotas         Proyección de cuotas y tarjetas
/gastos/servicios      Servicios y vencimientos
/gastos/fondos         Fondos de ahorro
/gastos/fondos/:id
/agenda                Calendario (agenda / semana / mes)
/agenda/evento/:id
/menus                 Planificador semanal
/menus/recetas
/menus/recetas/:id
/notas                 Logística diaria
/familia               Hijo (ficha, salud, talles, contactos)
/mascotas
/mascotas/:id
/tramites              Documentos · Trámites · Bóveda
/tramites/:id
/casa                  Mantenimiento · Garantías · Contactos
/config                Hogar, miembros, notificaciones, categorías
/unirse                Ingresar código de invitación
/login
```

## Pantallas clave

### Hoy

Tarjetas apiladas, cada una con encabezado y lista corta. Si una sección está vacía, no se muestra. Estado vacío general: "Nada pendiente para hoy" con las tres acciones rápidas.

### Lista del súper

- Encabezados de sector pegajosos (sticky) en el orden de recorrido del hogar.
- Cada ítem: checkbox grande (44 px), nombre, cantidad en gris, chip de marca preferida si existe, avatar chico de quién lo agregó.
- Tachado: animación corta, se desplaza al final del sector.
- Input de agregado siempre visible arriba (no en FAB) con autocompletado del catálogo. Enter agrega y deja el foco para seguir escribiendo.
- Botón "Modo compra" en la TopBar.

### Modo compra

- Fondo blanco puro, tipografía 20 px, solo ítems pendientes, sectores colapsables.
- Al tachar el último ítem de un sector, el sector se colapsa solo.
- Botón fijo abajo: "Terminé · limpiar tachados".

### Cargar gasto (sheet)

Orden de campos pensado para el pulgar: monto (teclado numérico, foco automático) → categoría (chips) → quién pagó (dos avatares, el propio preseleccionado) → medio de pago (chips) → si es crédito: tarjeta y cuotas → nota. Botón "Guardar" fijo abajo del sheet.

### Servicios

Lista del mes actual: nombre, vence en X días, monto estimado, avatar del asignado (tocable para cambiar), botón "Pagado". Los pagados van abajo en gris. Selector de mes arriba.

### Proyección de cuotas

Gráfico de barras simple (12 meses) con total comprometido, debajo tabla por tarjeta y mes. Simulador en un sheet: monto + cuotas + tarjeta → muestra la barra con la nueva cuota resaltada.

### Fondos

Tarjeta por fondo con progreso circular, monto actual / meta, proyección. Al tocar: historial de aportes y botón "Aportar".

### Agenda

Vista agenda por defecto (lista continua agrupada por día). Chips de filtro arriba: Todos · Yo · [pareja] · categorías. Los eventos muestran avatares de responsables por rol.

### Menús

Grilla de 7 días × 2 comidas. Cada celda vacía es un botón "+" que abre selector de recetas con búsqueda. Celda con receta: nombre + botón "faltantes → lista". Arriba: "Agregar toda la semana a la lista".

### Mascotas

Ficha con foto, próximas fechas de salud como tarjetas, botón grande "Queda poca comida" (confirma con toast "Agregado a la lista · [alimento]"). Historial abajo.

### Trámites

Tres pestañas. Documentos: lista con semáforo (verde > 30 días, amarillo < 30, rojo vencido). Trámites: tarjetas con progreso de pasos. Bóveda: grilla de miniaturas con búsqueda.

## Guía de estilo

- **Tipografía:** Inter (o system-ui). Base 16 px, nunca menos de 14 px en móvil.
- **Toques:** área mínima 44 × 44 px.
- **Colores:** una paleta neutra (grises cálidos) + un acento (índigo o verde) + semánticos (rojo vencido, amarillo próximo, verde ok). Cada miembro tiene un color propio para avatares y chips de responsable.
- **Tema:** claro y oscuro según preferencia del sistema; los tokens se definen en `:root` y `@media (prefers-color-scheme: dark)`.
- **Estados vacíos:** siempre con una frase corta y la acción para salir del vacío.
- **Feedback:** toasts breves para confirmaciones; nunca `alert()`.
- **Offline:** indicador discreto en la TopBar cuando no hay conexión; la app sigue funcionando.
- **Carga:** skeletons, no spinners bloqueantes. Con persistencia local casi nunca se ven.

## Accesibilidad

- Contraste AA mínimo.
- Todo control con label (visible o `aria-label`).
- Navegación por teclado funcional en desktop.
- `prefers-reduced-motion` respetado.
