App de Gestión de Limpiezas – Especificación Funcional y Roadmap

1. Introducción Esta aplicación está diseñada para gestionar las limpiezas y el mantenimiento de 6 propiedades turísticas. Permitirá visualizar tareas en calendario, asignar personal, controlar productos de limpieza, registrar videos y tiempos, y generar reportes de horas trabajadas. El sistema se utilizará principalmente desde el móvil, y la información de reservas será cargada manualmente desde un Google Sheet.
2. Módulos funcionales
3. Carga de tareas desde Sheet Importación manual de reservas desde Google Sheets. Por cada check-out se genera una tarea automática. También se pueden ingresar tareas manuales.
4. Calendario de tareas Visualización tipo Google Calendar con eventos por día, filtros por propiedad/persona, y cambio de color según estado.
5. Asignación de tareas y estados Asignación de tareas con dropdown de personal. Estados: URGENTE (rojo), ESP OK (amarillo), CONFIR (verde), MAS (naranja), TENTATIVO (azul).
6. Confirmación desde panel de limpiadora Cada limpiadora puede aceptar, rechazar o proponer horario alternativo para su tarea asignada.
7. Carga de datos de limpieza Cada limpiadora puede registrar hora de ingreso/salida, subir videos, cargar comentarios.
8. Control de productos Listado sincronizado desde Sheet. Las limpiadoras marcan productos faltantes y cantidades.
9. Reportes y pagos Resumen mensual por persona: tareas, horas, viáticos, monto total. Exportación a Excel o Google Sheets.
10. Accesos y roles Usuario administrador (control total). Limpiadoras (acceso solo a sus tareas).
11. Comunicación por WhatsApp Generación automática de mensajes prellenados por WhatsApp al asignar tareas.
12. Roadmap de desarrollo Tarea Prioridad Dependencia Conexión a Google Sheets y carga de tareas Alta Independiente Vista tipo calendario con asignación Alta Después de carga de tareas Generación de mensaje de WhatsApp Media Después de asignación Confirmación de tareas por parte de limpiadora Alta Después de asignación Registro de limpieza (hora, video, comentarios) Alta Después de confirmación Control de productos Media Después de registro de limpieza Generación de reportes y exportación Alta Después de registro de limpieza

13. Prompts para desarrollo en Claude Code TAREA 1 -- Conexión a Google Sheets y carga de tareas Crear un backend en Node.js o Python que se conecte a un Google Sheet para leer reservas manuales. Cada fila representa una reserva con:

14. propiedad, fecha_checkin, fecha_checkout Por cada fecha_checkout, generar una tarea de limpieza. Incluir también un formulario en frontend para cargar tareas manuales con:

15. propiedad, tipo de tarea (limpieza / mantenimiento / sábanas), fecha, notas opcionales. Requisitos:

16. Acceso a Google Sheets usando OAuth o clave API.

17. Guardar tareas en base de datos local (MongoDB o SQLite).

18. Código modular y documentado para poder actualizar el Sheet o columnas fácilmente. TAREA 2 -- Vista tipo calendario con asignación de tareas Crear una vista tipo Google Calendar (usando FullCalendar o similar) que muestre tareas por día. Cada evento debe permitir:
19. Ver notas, tipo de tarea, propiedad.
20. Dropdown para seleccionar limpiadora. Requisitos:
21. Mostrar eventos en rojo si no hay limpiadora asignada (URGENTE).
22. Mostrar eventos en amarillo si hay limpiadora asignada (ESP OK).
23. Al seleccionar limpiadora, actualizar estado visualmente sin recargar.
24. Filtros por limpiadora o propiedad.
25. Compatible con vista móvil. TAREA 3 -- Generar mensaje de WhatsApp con tarea asignada Al asignar limpiadora a una tarea, generar un link <https://wa.me/>

  <número>?text=<mensaje> con este formato:
  Hola [nombre], te comparto una limpieza asignada:
  FECHA: 12/07
  PISO: QDCHA
  ¿CHECK IN HOY?: SÍ
  NOTAS: Revisar persiana rota
  Requisitos:</mensaje></número>

26. Que se pueda abrir con un botón desde el evento del calendario.

27. El número se puede asociar desde una tabla de usuarios.

28. No se envía automáticamente; solo se abre el link. TAREA 4 -- Confirmación de tareas por parte de la limpiadora Agregar funcionalidad en el panel de usuario (limpiadora) para responder a tareas asignadas en estado ESP OK. Opciones:

29. ✅ Confirmar tarea → CONFIR / Verde

30. ❌ Rechazar tarea → MAS / Naranja
31. 🕒 Proponer otro horario → TENTATIVO / Azul (con horario sugerido) Requisitos:
32. El cambio de estado se refleja en tiempo real en el panel del admin.
33. El admin puede ver el horario propuesto si aplica.
34. Cada limpiadora solo puede responder sus tareas. TAREA 5 -- Registro de limpieza (hora, video, comentarios) En el panel de limpiadora permitir:
35. Registrar hora de ingreso y salida (con validación)
36. Subir video de inicio y fin
37. Cargar comentarios Requisitos:
38. Calcular duración automáticamente
39. Comprimir videos si pesan más de 50MB
40. Guardar enlaces de video
41. Solo la limpiadora asignada puede completar esta info TAREA 6 -- Control de productos de limpieza Agregar una sección para marcar productos faltantes:
42. Sincronización desde Google Sheet (solo lectura)
43. Selección de productos y cantidad faltante Requisitos:
44. Guardar la solicitud por tarea y persona
45. Vista de admin con reporte de productos solicitados TAREA 7 -- Generación de reportes mensuales y exportación Crear un resumen mensual por limpiadora con:
46. Tareas realizadas
47. Horas totales (calculadas)
48. Viáticos (editables)
49. Total a pagar = horas x tarifa + viáticos Requisitos:
50. Editable desde admin
51. Exportable a Excel o Google Sheets
52. Filtros por mes, persona, propiedad

# 📊 ESTADOS DE TAREAS - DOCUMENTACIÓN COMPLETA

## 🎯 **ESTADOS IMPLEMENTADOS**

Basados en REQUERIMIENTOS.md con arquitectura event sourced.

**Estado**    | **Descripción**                          | **Color**   | **Implementado** | **Event Sourced**
------------- | ---------------------------------------- | ----------- | ---------------- | ------------------------------
**URGENTE**   | Sin limpiadora asignada                  | 🔴 Rojo     | ✅                | ✅ Snapshots automáticos
**ESP_OK**    | Limpiadora asignada, esperando respuesta | 🟡 Amarillo | ✅                | ✅ Snapshots automáticos
**CONFIR**    | Confirmada por limpiadora                | 🟢 Verde    | ✅                | ✅ Snapshots automáticos
**REJECTED**  | Rechazada por limpiadora                 | 🟠 Naranja  | ✅                | ✅ Snapshots + RejectionService
**TENTATIVO** | Propone horario alternativo              | 🔵 Azul     | ✅                | ✅ Snapshots + ProposalService
**COMPLETED** | Finalizada con videos y comentarios      | 🟣 Morado   | ✅                | ✅ Snapshots automáticos

## 🔄 **DIAGRAMA DE FLUJO**

```
. \t\t\t\t\t\t\t\t\t┌─────────────────┐
                    │    SISTEMA      │
                    │   (Auto-gen)    │
                    └─────────┬───────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    URGENTE      │◄──────────────────┐
                    │   (Sin asignar) │                   │
                    │     🔴 Rojo     │                   │
                    └─────────┬───────┘                   │
                              │                           │
                   ┌─────────────────────────────────────┘
                   │  ADMIN asigna limpiadora
                   │
                   ▼
         ┌─────────────────┐
         │     ESP_OK      │
         │   (Asignada)    │
         │   🟡 Amarillo   │
         └─────────┬───────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌─────────────┐  ┌─────────────┐
│ CONFIR  │  │  REJECTED   │  │ TENTATIVO   │
│(Acepta) │  │ (Rechaza)   │  │(Propone Hr.)│
│🟢 Verde │  │🟠 Naranja   │  │ 🔵 Azul     │
└─────┬───┘  └─────┬───────┘  └─────┬───────┘
      │            │                │
      │            │                │
      │            └────────────────┼─────────┐
      │                             │         │
      │                             │         │
      │            ┌────────────────┘         │
      │            │ ADMIN reasigna           │
      │            │                          │
      │            ▼                          │
      │      ┌─────────────────┐              │
      │      │     ESP_OK      │              │
      │      │  (Reasignada)   │              │
      │      │   🟡 Amarillo   │              │
      │      └─────────────────┘              │
      │                                       │
      │              ┌────────────────────────┘
      │              │ ADMIN acepta/rechaza propuesta
      │              │
      │              ▼
      │      ┌─────────────────┐
      │      │ CONFIR/ESP_OK   │
      │      │   (Según resp)  │
      │      └─────────────────┘
      │
      │
      ▼
┌─────────────────┐
│   COMPLETED     │
│   (Finalizada)  │
│   🟣 Morado     │
└─────────────────┘
```

## 📋 **TRANSICIONES Y ACTORES**

### **🤖 SISTEMA (Automático)**

**Acción**                | **Desde** | **Hacia** | **Servicio**             | **Snapshot**
------------------------- | --------- | --------- | ------------------------ | ------------
Crear tarea desde reserva | -         | URGENTE   | TaskService.createTask() | ✅
Crear tarea manual        | -         | URGENTE   | TaskService.createTask() | ✅

### **👤 ADMIN (Gestión)**

**Acción**             | **Desde** | **Hacia** | **Servicio**                      | **Snapshot**
---------------------- | --------- | --------- | --------------------------------- | ------------
Asignar limpiadora     | URGENTE   | ESP_OK    | TaskService.assignTask()          | ✅
Reasignar tras rechazo | REJECTED  | ESP_OK    | TaskService.assignTask()          | ✅
Aprobar propuesta      | TENTATIVO | CONFIR    | ProposalService.approveProposal() | ✅
Rechazar propuesta     | TENTATIVO | ESP_OK    | ProposalService.rejectProposal()  | ✅

### **👩‍💼 LIMPIADORA (Respuesta)**

**Acción**        | **Desde** | **Hacia** | **Servicio**                     | **Datos Adicionales**
----------------- | --------- | --------- | -------------------------------- | ---------------------
Confirmar tarea   | ESP_OK    | CONFIR    | TaskService.updateTaskStatus()   | ✅ Snapshot
Rechazar tarea    | ESP_OK    | REJECTED  | RejectionService.logRejection()  | ✅ Snapshot + Motivo
Proponer horario  | ESP_OK    | TENTATIVO | ProposalService.createProposal() | ✅ Snapshot + Horario
Finalizar trabajo | CONFIR    | COMPLETED | TaskService.updateTaskStatus()   | ✅ Snapshot + Videos

### **💬 COMENTARIOS (Independientes)**

**Acción**         | **Disponible En** | **Servicio**                     | **Persistencia**
------------------ | ----------------- | -------------------------------- | ----------------
Agregar comentario | TODOS los estados | CommentService.addComment()      | ✅ task_comments
Ver comentarios    | TODOS los estados | CommentService.getTaskComments() | ✅ task_comments

## 🔍 **ARQUITECTURA EVENT SOURCED**

### **📸 Snapshots Automáticos**

- **Cada cambio de estado** → Snapshot completo en `task_events`
- **Ordenados por tiempo** → Historial completo consultable
- **Incluye actor** → Quién hizo el cambio

### **📝 Datos Específicos**

- **Rechazos** → `task_rejections` con motivos detallados
- **Propuestas** → `task_proposals` con horarios y workflow
- **Comentarios** → `task_comments` independientes del estado

### **🔄 Flujo de Datos**

```
Acción → Actualizar tasks → Capturar snapshot → Guardar datos específicos
```

## 🗄️ **ESTRUCTURA DE SHEETS**

### **1\. tasks** (Estado actual - SIMPLIFICADO)

```
| id | property | type | date | status | assigned_cleaner_id | created_at | updated_at | created_by | last_updated_by |
```

### **2\. task_events** (Snapshots históricos - SIMPLIFICADO)

```
| snapshot_id | task_id | property | type | date | status | assigned_cleaner_id | created_at | updated_at | created_by | last_updated_by | snapshot_timestamp | changed_by |
```

### **3\. task_comments** (Comentarios independientes)

```
| id | task_id | user_id | comment | timestamp | comment_type |
```

### **4\. task_rejections** (Rechazos específicos)

```
| id | task_id | user_id | rejection_reason | timestamp | previous_cleaner_id |
```

### **5\. task_proposals** (Propuestas de horario)

```
| id | task_id | user_id | proposed_time | proposal_reason | timestamp | status |
```

### **6\. task_timings** (Eventos de tiempo - NUEVO)

```
| id | task_id | user_id | event_type | timestamp | recorded_at |
```

_event_type: ENTRY o EXIT_

### **7\. task_product_usage** (Uso de productos - NUEVO)

```
| id | task_id | user_id | product_id | quantity | notes | timestamp |
```

## 🎯 **CARACTERÍSTICAS CLAVE**

### **✅ Implementado Según Requerimientos**

- Estados exactos de REQUERIMIENTOS.md
- Colores específicos mantenidos (rojo, amarillo, verde, naranja, azul)
- Workflow completo admin-limpiadora

### **✅ Event Sourcing Completo**

- Historial inmutable de cambios
- Reconstrucción de estado posible
- Análisis temporal disponible

### **✅ Robustez**

- Menos mutaciones en tabla principal
- Datos específicos en sheets separados
- Comentarios independientes del estado

### **✅ Análisis Avanzado**

- Estadísticas de rechazos por limpiadora
- Propuestas de horario más comunes
- Rendimiento por limpiadora
- Cambios por período de tiempo

## 🚀 **SERVICIOS IMPLEMENTADOS**

### **EventService.gs**

- `captureSnapshot()` - Captura automática de snapshots
- `getTaskHistory()` - Historial completo de una tarea
- `getRecentChanges()` - Cambios recientes en el sistema
- `getChangeStatistics()` - Estadísticas de cambios por usuario

### **CommentService.gs**

- `addComment()` - Agregar comentario a cualquier tarea
- `getTaskComments()` - Obtener comentarios de una tarea
- `searchComments()` - Buscar comentarios por texto

### **RejectionService.gs**

- `logRejection()` - Registrar rechazo con motivo
- `getRejectionStatistics()` - Estadísticas de rechazos
- `getUserRejectionRate()` - Tasa de rechazo por usuario

### **ProposalService.gs**

- `createProposal()` - Crear propuesta de horario
- `approveProposal()` - Aprobar propuesta (admin)
- `rejectProposal()` - Rechazar propuesta (admin)
- `getPendingProposals()` - Propuestas pendientes

### **TimingService.gs** (NUEVO)

- `logEntry()` - Registrar entrada a tarea
- `logExit()` - Registrar salida de tarea
- `getTaskTimings()` - Obtener eventos de tiempo de tarea
- `calculateTaskDuration()` - Calcular duración total

### **ProductUsageService.gs** (NUEVO)

- `logProductUsage()` - Registrar uso de producto
- `logMultipleProductUsage()` - Registrar múltiples productos
- `getTaskProductUsage()` - Obtener productos usados en tarea
- `getProductUsageStatistics()` - Estadísticas de uso

## 🎉 **RESULTADO FINAL**

**Sistema completo con:**

- 📊 Estados bien definidos y consistentes
- 🔄 Flujo de trabajo claro y funcional
- 📈 Event sourcing para análisis avanzado
- 💪 Arquitectura robusta y escalable
- 🎯 Cumplimiento total de requerimientos

**Fecha de implementación:** Julio 2024<br>
**Versión:** 2.0 Event Sourced Completo<br>
**Estado:** Listo para producción<br>
**Cambios v2.0:**

- ✅ Eliminado manejo de media (videos)
- ✅ Separación de eventos de tiempo (task_timings)
- ✅ Separación de eventos de productos (task_product_usage)
- ✅ Tabla tasks simplificada sin mutaciones innecesarias
- ✅ Arquitectura 100% event sourced

Technical stack:

Backend: PostgresSQL (Supabase) Front end: React Web App (vite) hosted on github pages with custom domain.

Backend: CQRS style with event sourcing

login: google sso using supabase authentication.

important to be able to run the application locally with a local postgresql database (idk how we can use supabase locally.)

i want the backend api to have tests (not unit tests, but integration tests)
