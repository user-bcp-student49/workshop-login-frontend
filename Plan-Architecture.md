# Plan de arquitectura — contratos de autenticación y tareas

## Impacto

Los cambios aprobados se encuentran en los backends. El frontend no tiene un candidato nuevo en el análisis; su impacto consiste en mantener compatibilidad observable con el login, el token y el listado de tareas durante los cambios coordinados.

## Componentes afectados

- `AuthService` y `readLoginResponse`: envío de login y validación de respuesta.
- `SessionService`: conservación en memoria del token y usuario, que queda fuera del cambio.
- `TasksService`: solicitud de tareas con Bearer y `owner`.
- `DashboardComponent`: consumo de la sesión y presentación del resultado.
- Specs de servicios y `docs/ENDPOINTS.md`: caracterización de contratos del cliente.

## Contratos protegidos

- `POST /auth/login` sigue enviando `username`, `password` y `client: angular-workshop`.
- Respuesta 2xx de login compatible con el cliente: `token` no vacío y objeto `user`.
- Sesión en memoria, logout, preferencias y navegación no cambian como parte del alcance.
- `GET /api/tasks` sigue enviando `Authorization: Bearer <token>` y `owner`; respuesta sigue siendo un array aceptado por `readTasks`.
- Errores HTTP no exitosos continúan rechazándose y mostrándose con mensajes públicos genéricos.
- La autorización por propietario se aplica en la API; no se confía en el valor `owner` enviado por el navegador.

## Estrategia incremental

1. Mantener las pruebas existentes de contrato de `AuthService` y `TasksService` como línea base previa a cambios en backends.
2. No añadir verificación criptográfica ni reglas de autorización en frontend: no es la autoridad para esas decisiones.
3. Coordinar la validación JWT HS256 y la autorización en los servicios backend sin cambiar campos, rutas o cuerpos que consume el cliente.
4. Añadir o ejecutar una prueba de integración del flujo login → token → listado con backends reales o un entorno aislado de integración.
5. Actualizar `docs/ENDPOINTS.md` solo si se aprueba un cambio observable para el cliente; mantener la documentación actual si el contrato no cambia.

## Pruebas necesarias

- Pruebas de `AuthService`: método, URL, body, validación de respuesta y rechazo de HTTP fuera de 2xx.
- Pruebas de `TasksService`: método, URL, Bearer, query `owner`, array válido y rechazo de HTTP fuera de 2xx.
- Pruebas de sesión/dashboard que comprueban que los cambios en los backends no alteran sesión en memoria ni navegación.
- Integración con los backends: credenciales válidas producen token aceptado por la API y tareas del usuario autenticado; errores permanecen no exitosos.
- Suite de frontend y build habituales como regresión cuando se implemente la integración.

## Riesgos / trade-offs

- Las pruebas unitarias actuales simulan HTTP; no demuestran por sí solas interoperabilidad real del token ni autorización de la API.
- El cliente concatena `owner` a la URL; cambiar su codificación podría afectar URLs observadas, pero no es requisito de esta especificación. La API debe aplicar autorización independientemente.
- No cambiar el almacenamiento de token evita un cambio no aprobado de sesión y persistencia.
- Cambiar el formato de token internamente no debe modificar `token` como string en la respuesta de login.

## Decisiones abiertas

- Backend y API acordaron JWT HS256 y rechazo inmediato de tokens anteriores; el frontend continúa tratando el token como string opaco y no valida firma.
- La política de respuesta de la API ante un `owner` distinto no está definida; no implica cambios de cliente salvo que el contrato HTTP aprobado los requiera.
- Se debe confirmar si las pruebas de integración se ejecutarán contra servicios locales coordinados o mediante un entorno dedicado.

No se registra ADR en este plan: no se propone una decisión arquitectónica nueva en el frontend.
