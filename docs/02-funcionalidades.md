# 02 · Funcionalidades

Cada módulo se describe con: qué hace, cómo se usa desde el celular, y qué reglas de negocio aplican. El modelo de datos concreto está en [04-modelo-de-datos.md](04-modelo-de-datos.md).

---

## 0. Hoy (panel diario)

Pantalla de inicio. Resume en un solo scroll todo lo que importa hoy y los próximos días.

**Secciones (en orden):**
1. Eventos de hoy y mañana, con responsable y hora.
2. Notas rápidas de logística vigentes.
3. Vencimientos próximos (servicios, tarjetas, documentos, mascotas) en los próximos 7 días.
4. Alertas de stock: productos recurrentes cuyo ciclo venció.
5. Menú de hoy (almuerzo/cena).
6. Accesos rápidos: "Ir a la lista del súper", "Cargar gasto", "Nota rápida".

**Reglas:**
- Todo elemento es tocable y lleva a su módulo.
- Los ítems vencidos (fecha pasada, no resueltos) se muestran arriba, en rojo.

---

## 1. Compras y almacén

### 1.1 Lista compartida en tiempo real

- Una lista activa por hogar. Ambos la ven y editan simultáneamente.
- Cada ítem: nombre, cantidad opcional, categoría (sector del súper), quién lo agregó, marcado/no marcado.
- **Agrupación automática por sector**: al escribir el nombre, la app sugiere la categoría a partir de un catálogo del hogar (ej. "leche" → Lácteos). Si el producto es nuevo, el usuario elige la categoría una vez y queda guardada en el catálogo.
- **Orden de recorrido** configurable por hogar: el usuario ordena los sectores según el layout de su supermercado habitual. La lista se muestra en ese orden.
- Al tachar un ítem se mueve al final de su sector, en gris. Botón "Limpiar tachados" al terminar la compra.
- **Modo compra**: pantalla de alto contraste, letras grandes, sin distracciones, pensada para usar con una mano en el súper.
- Historial: los ítems tachados quedan registrados con fecha, para el historial de precios y la sugerencia de frecuencia.

**Sectores por defecto** (editables): Verdulería, Carnicería, Fiambrería, Lácteos, Panadería, Almacén, Bebidas, Congelados, Limpieza, Higiene personal, Bebé, Mascotas, Farmacia, Otros.

### 1.2 Catálogo de productos del hogar

- Base de productos que el hogar compra habitualmente. Se alimenta sola a medida que se usan.
- Por producto: nombre, categoría, marca preferida, marcas a evitar, notas ("el de 1L, no el de 900 ml"), precio último pagado (opcional), frecuencia de recompra (opcional).
- Es la fuente del autocompletado en la lista y en el planificador de menús.

### 1.3 Recordatorios de stock (productos recurrentes)

- Cualquier producto del catálogo puede marcarse como **recurrente** con un intervalo en días (ej. pañales cada 10 días, leche cada 4).
- Cuando pasa el intervalo desde la última compra, el producto aparece en el panel "Hoy" y (opcionalmente) se agrega solo a la lista.
- Al tachar el producto en la lista, se reinicia el contador.
- La app sugiere el intervalo a partir del historial ("compraste leche 5 veces en 20 días, ¿cada 4 días?").

### 1.4 Preferencias y filtros

- **Marcas preferidas**: se muestran junto al ítem en la lista para no dudar en la góndola.
- **Ingredientes excluidos**: lista de cosas que el hogar no consume (ej. "cerdo", "lactosa", "azúcar"). Al elegir un menú que las incluye, la app avisa y no las manda a la lista de compras.
- **Productos a evitar**: marcas concretas que no se compran (mala experiencia, alergia). Se muestran como advertencia si alguien los agrega.

### 1.5 Inventario de despensa/freezer (básico)

- Lista de lo que hay en casa con fecha de vencimiento opcional.
- Lo que vence en los próximos 3 días aparece en "Hoy" con la sugerencia "cociná esto primero".
- Conecta con el planificador de menús (ver 4.2).

### 1.6 Historial de precios

- Al tachar un ítem se puede anotar el precio (opcional, campo numérico rápido).
- Vista por producto: último precio, variación respecto al anterior, gráfico simple de evolución.

---

## 2. Finanzas y control de gastos

### 2.1 Registro de gastos

- Carga rápida desde cualquier pantalla (FAB): monto, categoría, quién pagó, medio de pago, nota opcional, fecha (hoy por defecto).
- Categorías por defecto: Supermercado, Servicios, Alquiler/Expensas, Transporte, Salud, Educación, Hijo, Mascotas, Ocio, Ropa, Casa, Otros.
- Medios de pago: Efectivo, Débito, Transferencia, Tarjeta de crédito (por tarjeta), Mercado Pago, Otro.

### 2.2 Compras en cuotas y proyección

- Al cargar un gasto con tarjeta de crédito se puede indicar cantidad de cuotas.
- La app genera automáticamente una cuota por mes en los meses siguientes.
- **Tarjetas**: cada tarjeta tiene día de cierre y día de vencimiento. La app calcula en qué resumen cae cada cuota.
- **Proyección mensual**: vista de los próximos 12 meses con el total comprometido en cuotas por tarjeta. Permite ver "en marzo ya tenemos $X comprometidos".
- **Impuestos y recargos** (configurable): porcentaje adicional a aplicar sobre compras en moneda extranjera o categorías específicas (percepciones). Se aplica al cálculo de la cuota y se muestra por separado.
- Simulador: antes de comprar, ingresar monto y cuotas para ver cómo impacta en la proyección sin guardar.

### 2.3 Servicios y vencimientos recurrentes

- Servicios del hogar: expensas, luz, gas, agua, internet, celular, alquiler, colegio, obra social, seguros, etc.
- Cada servicio: nombre, día de vencimiento mensual (o fecha exacta para anuales), monto estimado, **asignado a** (miembro o sin asignar), días de anticipación para la alerta.
- Cada mes se genera una instancia del servicio ("Luz · Octubre") que se marca como pagada. Al pagarla se puede registrar el monto real y se convierte en gasto automáticamente.
- El responsable se puede cambiar por instancia ("este mes lo pago yo").
- Alertas: push + email N días antes del vencimiento (por defecto 3) y el día del vencimiento si sigue sin pagar.

### 2.4 Suscripciones

- Subconjunto de servicios con frecuencia mensual/anual: Netflix, Spotify, gimnasio, etc.
- Vista resumen: "total mensual en suscripciones: $X".

### 2.5 Presupuesto mensual

- Tope opcional por categoría. Barra de progreso: gastado vs presupuestado. Aviso al 80% y al 100%.

### 2.6 Balance entre los dos

- Por cada gasto se registra quién pagó. Opcionalmente, cómo se reparte (50/50 por defecto, editable por hogar).
- Vista mensual: "Gustavo pagó $X, [pareja] pagó $Y, diferencia $Z a favor de …". Botón "Saldar" que registra la compensación.

### 2.7 Fondos de ahorro / proyectos comunes

- Cada fondo: nombre, meta, fecha objetivo opcional, ícono.
- Aportes con fecha, monto y quién aportó.
- Visual: barra circular de progreso, proyección "a este ritmo llegás en X meses".
- Retiros registrados (gastar del fondo).

---

## 3. Calendario familiar

### 3.1 Eventos

- Evento: título, fecha/hora, duración opcional, categoría (Hijo, Hogar, Trabajo, Salud, Mascota, Social, Otro), lugar opcional, notas.
- **Responsables por rol**: para eventos del hijo se puede asignar quién lo lleva, quién lo busca, quién ayuda a estudiar / prepara. Los roles son configurables por categoría.
- Recurrencia simple: semanal, quincenal, mensual, anual.
- Recordatorio push configurable (15 min, 1 h, 1 día antes).

### 3.2 Vistas

- Agenda (lista por día, default en móvil), semana, mes.
- Filtro por miembro ("solo lo mío") y por categoría.

### 3.3 Integración con otros módulos

- Los vencimientos de servicios, tarjetas, trámites y salud de mascotas se ven en el calendario como eventos de solo lectura.
- El menú semanal se ve como una franja en la vista semana.

---

## 4. Menús semanales

### 4.1 Planificador

- Grilla semana × (almuerzo, cena). Se arrastra o se elige una receta para cada casilla.
- Recetas del hogar: nombre, ingredientes (vinculados al catálogo de productos), porciones, tiempo, notas, foto opcional.
- Plantillas: "semana típica" que se puede clonar.

### 4.2 Un clic a la lista de compras

- Botón "Agregar faltantes a la lista" en cada receta y en la semana completa.
- Cruza los ingredientes de la receta contra el inventario de despensa (si está cargado) y contra lo que ya está en la lista; agrega solo lo que falta, ya categorizado.
- Respeta los ingredientes excluidos del hogar (avisa y omite).

### 4.3 Sugerencias

- "Cociná esto primero": recetas que usan lo que está por vencer en el inventario.
- Historial de menús para no repetir demasiado.

---

## 5. Logística diaria (notas rápidas)

- Notas cortas con fecha (hoy por defecto) y opcionalmente hora y responsable: "Turno médico 16 hs", "Dejarle las llaves a la abuela".
- Se ven en "Hoy" y se pueden marcar como hechas. Las de días pasados no resueltas se destacan.
- Se pueden convertir en evento del calendario con un toque.
- Checklist: una nota puede tener sub-ítems tildables.

---

## 6. Hijo

- **Ficha**: nombre, fecha de nacimiento, colegio, grado, obra social/número, pediatra, alergias.
- **Contactos clave**: pediatra, colegio, otros padres, con botón de llamada y WhatsApp.
- **Calendario de salud**: vacunas y controles pediátricos (mismo motor de recordatorios que mascotas).
- **Talles**: ropa, calzado, con fecha de última actualización.
- **Documentos**: carnet de vacunas, DNI, certificados escolares (ver 8).
- Los eventos del hijo son eventos del calendario con categoría "Hijo" y roles de responsable.

---

## 7. Mascotas

- **Ficha** por mascota: nombre, especie, raza, fecha de nacimiento, peso, veterinario (contacto), foto.
- **Calendario de salud**: vacunas (anuales), desparasitación (interna/externa, trimestral), antipulgas (mensual), turnos con el veterinario. Cada ítem con próxima fecha y recordatorio.
- **Historial**: cada aplicación registrada con fecha, producto/marca, notas. Al registrar, se calcula la próxima fecha automáticamente.
- **Control de alimento**: botón grande "Queda poca comida" en la ficha. Agrega el alimento (producto del catálogo, marca preferida) a la lista de compras en el sector Mascotas y avisa al otro miembro. También puede configurarse como producto recurrente.

---

## 8. Trámites y documentos

### 8.1 Documentos con vencimiento

- Por miembro (incluido hijo y mascotas): DNI, pasaporte, licencia de conducir, cédula del auto, VTV, seguro del auto, patente, obra social, certificados.
- Cada documento: tipo, número (opcional), fecha de vencimiento, foto/PDF adjunto, alertas a 30/15/5 días.

### 8.2 Trámites en curso

- Un trámite es un checklist con pasos, responsable y fecha límite opcional.
- Ejemplo: "Renovar pasaporte del nene": Sacar turno → Fotos → Pagar → Ir al turno → Retirar.
- Plantillas de trámites frecuentes (renovar DNI, pasaporte, licencia, VTV, cambio de titularidad) precargadas y editables.
- Estado: pendiente, en curso, hecho. Se ve en "Hoy" si tiene fecha límite próxima.

### 8.3 Bóveda de documentos

- Fotos o PDFs de documentos que se piden seguido: DNI de todos, carnet de vacunas, carnet de obra social, título del auto, escritura/contrato de alquiler.
- Se guardan en Firebase Storage, accesibles solo por el hogar.
- Búsqueda rápida por nombre.

---

## 9. Casa y mantenimiento

- **Tareas recurrentes**: cambio de filtro de agua, limpieza de aire acondicionado, service de calefón/caldera, cambio de pilas del detector de humo, limpieza del tanque. Cada una con intervalo y responsable. Usa el motor de recordatorios.
- **Garantías**: electrodoméstico, fecha de compra, fecha de fin de garantía, foto del ticket. Alerta 30 días antes del vencimiento.
- **Contactos de servicio**: plomero, electricista, gasista, cerrajero, administración del consorcio.

---

## 10. Motor de recordatorios (transversal)

Todos los módulos que tienen "algo que pasa cada cierto tiempo" comparten un único concepto de **recordatorio**:

| Campo | Descripción |
|---|---|
| origen | módulo y entidad que lo genera (producto recurrente, servicio, vacuna, documento, tarea de casa) |
| próxima fecha | cuándo vence |
| intervalo | cómo calcular la siguiente al resolverlo (días, meses, años, o sin repetir) |
| anticipación | cuántos días antes avisar |
| responsable | miembro o sin asignar |
| estado | pendiente, resuelto, pospuesto |

Un único proceso (Cloud Function programada) recorre los recordatorios cada día y dispara push/email. Ver [05-notificaciones.md](05-notificaciones.md).

---

## 11. Hogar y miembros

- Un usuario crea un hogar y recibe un código de invitación de 6 caracteres.
- El otro usuario ingresa con Google y escribe el código para unirse.
- Configuración del hogar: nombre, moneda, orden de sectores del súper, categorías de gastos, reparto de gastos por defecto, ingredientes excluidos.
- Perfil de miembro: nombre para mostrar, color (para identificar responsables en el calendario), preferencias de notificación.
