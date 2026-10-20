# Autenticación y límites de tareas — contratos del frontend

## Fuente

Los reportes `HALLAZGOS.md` de los tres proyectos contienen cinco candidatos aprobados por el usuario, todos en los backends. El reporte del frontend registra que no se identificaron candidatos adicionales. Esta especificación cubre únicamente los contratos del cliente que deben preservarse mientras se atienden los hallazgos aprobados:

- Login y respuesta consumida: `src/app/services/auth.service.ts` y `src/app/models/auth.ts`.
- Solicitud de tareas: `src/app/services/tasks.service.ts` y `src/app/models/task.ts`.
- Comportamiento documentado del cliente: `docs/ENDPOINTS.md`.

## Contexto actual

El frontend envía `username`, `password` y `client` a `POST /auth/login`; valida una respuesta 2xx con `token` no vacío y objeto `user`, y mantiene token/usuario en memoria. Para listar tareas envía una solicitud Bearer a `GET /api/tasks?owner=<username>` y espera un array JSON compatible con `readTasks`. El frontend no valida firma, caducidad ni permisos del token; el control de identidad y autorización corresponde a la API.

## Problema confirmado

Los cambios aprobados en los backends afectan el mecanismo de autenticación compartido y las reglas de propiedad de tareas. Sin proteger el contrato observado por el cliente, un cambio de token, respuesta o consulta podría impedir el login o la carga legítima del dashboard. El reporte de discovery no confirma un defecto propio del frontend dentro del alcance analizado.

## Comportamiento a preservar

- Mantener la petición de login a `POST /auth/login` con `username`, `password` y `client: angular-workshop`.
- Mantener una respuesta de login 2xx con `token` no vacío y objeto `user`; el cliente acepta campos de usuario opcionales según sus validadores.
- Mantener token y usuario en memoria durante la sesión actual; no cambiar persistencia ni logout como parte de esta especificación.
- Mantener el envío de `Authorization: Bearer <token>` y del query param `owner` en `GET /api/tasks`.
- Mantener la respuesta de tareas como array JSON compatible con el validador del frontend.
- Mantener mensajes públicos genéricos y el comportamiento actual del cliente ante errores HTTP no exitosos.

## Alcance

- Proteger los contratos de login y listado de tareas frente a cambios coordinados en los backends.
- Verificar que el token emitido y validado por los backends permite login y solicitudes legítimas del usuario autenticado.
- Verificar que las reglas de propiedad se apliquen en el servidor sin depender del filtro `owner` como autorización.

## Fuera de alcance

- Cambios a componentes, formularios, sesión en memoria, preferencias, navegación o mensajes del frontend.
- Implementación de verificación criptográfica o autorización en el cliente.
- Cambio del formato de tareas o de la forma de la lista devuelta.
- Contrato del endpoint de carga de archivos, que no es consumido por el flujo frontend revisado.
- Hallazgos históricos del frontend marcados como resueltos u otros hallazgos no aprobados.

## Criterios de aceptación

1. Las pruebas de contrato del frontend confirman que el login conserva método, ruta, cuerpo y validación de respuesta observados.
2. El login legítimo entrega los campos necesarios para conservar la sesión y navegar al dashboard.
3. Las pruebas de `TasksService` confirman que una solicitud legítima conserva método, ruta, cabecera Bearer, query `owner` y respuesta como array.
4. Un error de autenticación o autorización continúa tratándose como HTTP no exitoso; el cliente no lo interpreta como login o lista exitosa.
5. Las pruebas de integración con los backends confirman el flujo login → token → listado para el propietario autenticado.
6. El backend no concede acceso a tareas de otro propietario solo porque el cliente envíe un valor distinto en `owner`.
7. No cambian almacenamiento de sesión, comportamiento de logout ni demás contratos del frontend cubiertos por `docs/ENDPOINTS.md`.

## Contratos afectados/protegidos

- `POST /auth/login`: body `{ username, password, client }`; respuesta 2xx compatible con `readLoginResponse`, con `token` no vacío y objeto `user`.
- `GET /api/tasks`: cabecera `Authorization: Bearer <token>`, query `owner`, respuesta JSON en forma de array compatible con `readTasks`.
- Respuestas HTTP no exitosas para errores de autenticación/autorización, que Axios debe rechazar y el frontend muestra con mensajes genéricos.
- Contrato de autorización por propietario: `owner` es un filtro enviado por el cliente, no una prueba de permiso; la API es responsable de autorizar el acceso.
- No hay requisito de cambiar contratos ReqFlow de sesión en memoria, logout, preferencias o navegación.

## Riesgos, supuestos y preguntas abiertas

- `docs/ENDPOINTS.md` describe lo que envía y acepta el cliente, no una verificación completa de respuestas reales de los backends.
- Se asume que el nuevo mecanismo interoperable de token conserva el campo `token` como string en la respuesta de login.
- La política de respuesta de la API cuando el usuario solicita un `owner` distinto sigue pendiente de decisión; el frontend no implementa una política alternativa.
- Se asume que los backends se pueden probar integradamente en un entorno aislado.
