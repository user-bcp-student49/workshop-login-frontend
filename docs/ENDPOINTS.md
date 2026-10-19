# Endpoints externos y comportamiento actual del frontend

Actualizado el 19/10/2026 mediante lectura del codigo refactorizado. Este
documento describe el contrato que **envia y valida el cliente**, no una
especificacion confirmada de los backends. La actualizacion de sesion de
PLAN revision 2 fue autorizada expresamente y verificada con tests y navegador
con HTTP interceptado; no se consultaron backends reales.

Las URLs proceden de
[environment.ts](../src/environments/environment.ts#L1). Las rutas de la
aplicacion son `/login` y `/dashboard`; la raiz y las rutas desconocidas
redirigen a `/login`, segun [app.routes.ts](../src/app/app.routes.ts#L3).
Solo se consumen los dos endpoints siguientes. Logout y lectura de sesion
son operaciones locales, no endpoints externos.

**Ejemplos:** se utilizan valores ficticios de las pruebas del repositorio,
no credenciales ni tokens reales ni respuestas capturadas de los backends.
Los ejemplos HTTP muestran el formato enviado por el cliente y cuerpos que
sus validadores aceptan. Headers propios del navegador, como `Origin` y
`Host`, dependen del entorno y no son configurados por estos servicios.

## Login - POST http://localhost:8080/auth/login

### 1. Quien lo llama

[LoginComponent.login()](../src/app/login/login.component.ts#L37) invoca
[AuthService.login()](../src/app/services/auth.service.ts#L8), que realiza el
POST con Axios 1.20.0. El componente no hace HTTP ni escribe almacenamiento
directamente. Tras una respuesta validada, delega la sesion en memoria en
[SessionService.save()](../src/app/services/session.service.ts#L30) y navega
a `/dashboard`.

Antes de llamar al servicio, valida usuario y luego contrasena: deben ser
cadenas con al menos un caracter no blanco. Si fallan ambas validaciones,
prevalece el mensaje de usuario. `trim()` se utiliza solo para validar;
**los valores originales se envian sin recortar**.

### 2. Que envia: headers, body y query params

**Headers de aplicacion y defaults de Axios**

| Header | Valor | Procedencia/comportamiento |
|---|---|---|
| `Accept` | `application/json, text/plain, */*` | Default de Axios; el servicio no lo redefine. |
| `Content-Type` | `application/json` | Axios serializa el objeto del body a JSON. No se establece manualmente en AuthService. |
| `Authorization` | No se agrega | El login no lee el token guardado ni configura Bearer. |

No hay query params. No se configura `withCredentials` ni autenticacion por
cookies en el servicio. Con la ejecucion local del README, los puertos del
frontend y del backend son distintos: no se solicita envio de credenciales
cross-origin. Axios puede agregar `X-XSRF-TOKEN` de una cookie `XSRF-TOKEN`
en peticiones del mismo origen; el servicio no habilita ese envio cross-origin
ni implementa por si mismo una politica CSRF.

**Body JSON**

| Campo | Tipo enviado | Valor/regla |
|---|---|---|
| `username` | string | Valor del formulario validado, sin recortar. |
| `password` | string | Valor del formulario validado, sin recortar. |
| `client` | string | Constante `angular-workshop`, agregada por AuthService. |

Timeout de cliente: **5000 ms**, procedente de `apiConfig.loginTimeoutMs`.
No hay reintentos automaticos implementados por la aplicacion.

**Ejemplo verificable:** peticion exacta de la prueba de contrato de
[auth.service.spec.ts](../src/app/services/auth.service.spec.ts#L11).
Los espacios en las credenciales son intencionales y se conservan.

```http
POST http://localhost:8080/auth/login
Accept: application/json, text/plain, */*
Content-Type: application/json

{
  "username": " student ",
  "password": " password ",
  "client": "angular-workshop"
}
```

Evidencia: [auth.service.ts](../src/app/services/auth.service.ts#L11),
[environment.ts](../src/environments/environment.ts#L6) y defaults de
Axios instalados (`lib/defaults/index.js` y `lib/helpers/resolveConfig.js`).

### 3. Que espera recibir en exito: estado, campos y ejemplo

**Estado HTTP:** Axios acepta **200 a 299** por su `validateStatus`
predeterminado. AuthService no exige un codigo particular. Un 2xx no basta:
el body tambien debe superar `readLoginResponse`.
**Pregunta abierta:** que codigo exacto devuelve el backend al autenticar
correctamente; no se puede confirmar leyendo este frontend.

**Body JSON aceptado**

| Campo | Tipo esperado | Obligatorio | Validacion y uso |
|---|---|---|---|
| Raiz | Objeto, no array ni `null` | Si | Se valida antes de acceder a campos. |
| `token` | string no vacia | Si | Se guarda y se reutiliza en la autorizacion de tareas. No se aplica `trim`, ni se valida JWT, firma o caducidad. Una cadena solo de espacios pasa este validador. |
| `user` | Objeto, no array ni `null` | Si | Se valida y se conserva solo su proyeccion de campos consumidos. `{}` es valido. |
| `user.username` | string | No | Si esta presente, no puede ser `null` ni otro tipo. Se utiliza como `owner` al consultar tareas y como alternativa del saludo. Puede ser cadena vacia. |
| `user.displayName` | string | No | Si esta presente, no puede ser `null` ni otro tipo. Se utiliza en el saludo si su valor es verdadero. |

Los campos adicionales de la raiz o del usuario no son consumidos ni
conservados en el objeto validado. No se exige ID, roles, refresh token ni
fecha de vencimiento. La ausencia de `user.username` permite autenticar,
pero la consulta posterior usa `owner=` y el saludo puede quedar sin nombre.

**Ejemplo real de fixture aceptado**, de
[auth.service.spec.ts](../src/app/services/auth.service.spec.ts#L11):

```json
{
  "token": "test-token",
  "user": {}
}
```

Un cuerpo mas completo aceptado se utiliza en las pruebas de sesion:

```json
{
  "token": "test-token",
  "user": {
    "username": "student",
    "displayName": "Student"
  }
}
```

Fuente del segundo ejemplo:
[session.service.spec.ts](../src/app/services/session.service.spec.ts#L7).
No se afirma que estos fixtures sean respuestas reales del backend.

**Efecto en UI y sesion:** mientras espera, `busy=true` deshabilita el boton
y muestra `Ingresando...`. Al validar la respuesta, SessionService escribe
solo `workshop_preferences` en localStorage; tras esa escritura conserva token
y usuario en memoria de su instancia raiz y navega a `/dashboard`.
No escribe token ni usuario en localStorage/sessionStorage.
El `finally` restablece `busy=false`
y notifica la actualizacion de vista, tanto en exito como en error.
Las preferencias no forman parte del request ni de la respuesta HTTP.

Evidencia: [models/auth.ts](../src/app/models/auth.ts#L30),
[login.component.ts](../src/app/login/login.component.ts#L49) y
[login.component.html](../src/app/login/login.component.html#L34).

### 4. Como reacciona ante errores

La UI muestra texto en el bloque `role="alert"`. `httpFailure` preserva los
errores `PublicError` de validacion; para errores HTTP/red crea un mensaje
publico generico. Extrae como causa interna la primera cadena no vacia entre
`response.data.message`, `response.data.detail` y `error.message`.
No exige un esquema de body de error, no lo muestra ni lo registra completo.

| Caso | Comportamiento actual de la UI y sesion |
|---|---|
| Usuario no string, ausente o solo blancos | Muestra `Ingrese un usuario.`; no llama HTTP, no escribe sesion ni navega. |
| Contrasena no string, ausente o solo blancos | Muestra `Ingrese una contraseña.`; no llama HTTP, no escribe sesion ni navega. |
| HTTP fuera de 2xx, incluidos 400/401/403, 429 y 5xx | Muestra `No se pudo autenticar. Intente nuevamente.`; no persiste la nueva respuesta ni navega. No distingue credenciales incorrectas de otros errores por status. Una sesion previamente guardada no se limpia en este camino. |
| Timeout de 5000 ms, fallo de red o bloqueo CORS | Mismo mensaje generico; `busy` se restablece y el boton vuelve a habilitarse. No hay reintento automatico. |
| Body raiz inesperado; token ausente, vacio, numerico o de otro tipo | Muestra `El backend respondió sin token.`. Incluye arrays, `null`, texto o cuerpos sin token; no persiste esa respuesta ni navega. |
| Token no vacio pero usuario ausente, `null`, array o con `username`/`displayName` de tipo incompatible | Muestra `El backend respondió con un usuario inválido.`; no persiste esa respuesta ni navega. |
| 2xx sin body, como 204, o texto/JSON no interpretable que no produce el objeto esperado | No se considera login exitoso; si llega al validador como valor no objeto muestra el error sin token. Si Axios rechaza el procesamiento, muestra el generico. |
| Token cadena no vacia pero invalido o vencido para el backend | **No se detecta durante login**: se guarda y se navega. Si tareas lo rechaza, rige la reaccion del endpoint de tareas. No se valida firma/caducidad en frontend. |
| Falla guardar preferencias | Muestra `No se pudo guardar la sesión.` y no navega. Se borra la sesion previa en memoria y no se publica la nueva; nunca se escribe token/usuario en almacenamiento. |
| Falla la limpieza inicial de claves heredadas | Al construir login, muestra `No se pudo cerrar la sesión local.` y conserva preferencias por defecto. Al intentar guardar una sesion, reintenta limpieza; si vuelve a fallar, muestra el mismo error y no navega ni publica la sesion. Intenta ambas claves aunque una falle; pueden quedar restos heredados que requieren limpieza. |
| Falla cargar o validar preferencias al construir la vista | Muestra `No se pudieron cargar las preferencias guardadas.` y conserva defaults `{theme: 'light', showTips: true, compact: false}`. Puede intentar login posteriormente; al iniciarlo se limpia el mensaje previo. |
| Navegacion a dashboard cancelada o rechazada | Muestra el generico de autenticacion y restablece `busy`. La sesion ya se guardo y no se revierte por este error de navegacion. |

Los fallos que llegan a `notifyError` se registran con un contexto generico
y categoria (`application`/`unexpected`), sin token, contrasena, causa ni
objeto Axios. La validacion local de campos no registra un error en consola.
Una nueva accion de login limpia el mensaje anterior.

Evidencia: [login.component.ts](../src/app/login/login.component.ts#L30),
[session.service.ts](../src/app/services/session.service.ts#L30),
[http-error.ts](../src/app/utils/http-error.ts#L7) y
[models/auth.ts](../src/app/models/auth.ts#L38).

### 5. Notas de seguridad y preguntas abiertas

- Los mensajes se presentan con **interpolacion de texto**, no `[innerHTML]`
  ni `bypassSecurityTrustHtml`. Detalles externos no se reflejan en el mensaje
  publico de autenticacion.
- Token y usuario viven **solo en memoria de SessionService**, provisto en raiz.
  Recargar, cerrar la pagina o abrir otra pestana exige login de nuevo.
  La navegacion interna conserva la instancia y sesion. Las preferencias
  no sensibles siguen en localStorage.
- Antes de la primera lectura de sesion/preferencias o guardado, elimina
  `workshop_token` y `workshop_user` heredados sin leerlos ni importar su
  contenido. La limpieza es diferida para que las vistas capturen y muestren
  sus errores, en vez de fallar durante inyeccion del servicio.
- La memoria reduce persistencia, no protege frente a JavaScript malicioso
  ejecutandose en la pagina activa ni revoca tokens emitidos.
- Las URLs actuales usan HTTP local: no proporcionan cifrado TLS. El README
  limita este laboratorio a uso local y prohibe despliegue publico.
- No hay refresh token, validacion criptografica de token ni peticion externa
  de logout. El cierre local se describe en el endpoint de tareas.
- **Preguntas abiertas del backend:** status exacto de exito y de credenciales
  rechazadas; formato, permisos y caducidad del token; reglas del username
  devuelto; esquema de errores; CORS y politica de cookies/CSRF.
  El frontend no permite responderlas ni garantizar la validez del token.

Fuentes: [login.component.html](../src/app/login/login.component.html#L39),
[session.service.ts](../src/app/services/session.service.ts#L5) y
[README.md](../README.md).

## Tareas - GET http://localhost:8000/api/tasks

### 1. Quien lo llama

[DashboardComponent.ngOnInit()](../src/app/dashboard/dashboard.component.ts#L46)
consulta primero SessionService. Si obtiene una sesion, invoca
[TasksService.list(owner, token)](../src/app/services/tasks.service.ts#L8);
el servicio hace el GET con Axios. Si no hay token, intenta redirigir a
`/login` sin llamar a la API. La carga se inicia al entrar al dashboard con
sesion en memoria; una recarga/nueva pestana no conserva esa sesion y redirige
sin GET. No hay polling ni boton de reintento implementado.

El nombre del propietario proviene del **usuario devuelto por login y
guardado en la sesion**, no directamente del texto del formulario de login.

### 2. Que envia: headers, body y query params

| Header | Valor | Procedencia/comportamiento |
|---|---|---|
| `Authorization` | `Bearer ` seguido del token guardado | Configurado explicitamente por TasksService. |
| `Accept` | `application/json, text/plain, */*` | Default de Axios, sin override del servicio. |
| `Content-Type` | No se configura para este GET | No hay body. |

| Query param | Tipo | Construccion actual |
|---|---|---|
| `owner` | string | `user.username || ''`, concatenado a `?owner=` sin `params` de Axios ni codificacion explicita en la aplicacion. Si falta username o es vacio, envia `owner=`. |

No hay body, no se configura `withCredentials` ni envio de cookies de
autenticacion cross-origin. Los defaults XSRF de Axios son los mismos
descritos para login y no agregan una politica CSRF propia.

**Timeout:** TasksService no configura uno; el default de Axios es **0**
(sin timeout creado por Axios). Puede quedar esperando hasta una respuesta
o un fallo del navegador/red; no hereda los 5000 ms del login.
No hay reintentos automaticos implementados por la aplicacion.

**Ejemplo verificable** de
[tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts#L11):

```http
GET http://localhost:8000/api/tasks?owner=student
Accept: application/json, text/plain, */*
Authorization: Bearer test-token
```

El token es ficticio. La misma prueba verifica `owner=` cuando se recibe
cadena vacia. El username que contiene `&`, `#` u otros caracteres de URL
puede alterar la query efectiva por la concatenacion actual; no se debe
asumir que la aplicacion lo escapa.

Evidencia: [tasks.service.ts](../src/app/services/tasks.service.ts#L11),
[dashboard.component.ts](../src/app/dashboard/dashboard.component.ts#L54) y
defaults instalados de Axios (`lib/defaults/index.js`).

### 3. Que espera recibir en exito: estado, campos y ejemplo

**Estado HTTP:** se aceptan **200 a 299**, por el default de Axios, siempre
que el body pase `readTasks`. No se verifica un status especifico.
**Pregunta abierta:** status exacto y esquema de respuesta que entrega
la API real; el cliente no los confirma.

**Body JSON aceptado:** un **array en la raiz**, sin envelope `data`/`tasks`
del backend. `response.data` es el body que Axios entrega, no un campo
obligatorio dentro del JSON.

| Campo | Tipo esperado | Obligatorio | Validacion y uso |
|---|---|---|---|
| Raiz | array | Si | `[]` es exito; un objeto envelope no es valido. |
| Cada elemento | objeto, no array ni `null` | Si | `{}` es una tarea aceptada. Un elemento invalido rechaza toda la lista. |
| `status` | string | No | Se filtra solo `ARCHIVED` exacto; se traduce para mostrarlo. `null` y tipos no string son invalidos. |
| `priority` | string o number | No | Se compara para ordenar y se convierte a mayusculas en la etiqueta. No hay enum ni validacion de prioridades de negocio. |
| `owner` | string o number | No | Se convierte a mayusculas para la etiqueta. No es una comprobacion de autorizacion. |
| `title` | string | No | Se muestra en el encabezado de la tarjeta. |
| `description` | string | No | Se muestra en el parrafo de la tarjeta. |

Para los campos opcionales, ausencia es valida, pero `null` no lo es.
Campos adicionales se descartan al proyectar la tarea validada.
`label` es un campo derivado localmente, **no un campo requerido del backend**.
No se exige ID ni metadata de paginacion.

**Ejemplo real de fixture aceptado**, de
[tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts#L11):

```json
[
  {
    "status": "UNKNOWN",
    "priority": 2,
    "owner": "student"
  },
  {}
]
```

En este ejemplo la primera etiqueta es `2 · STUDENT`; la segunda,
`NORMAL · SIN-ASIGNAR`. No hay titulo ni descripcion obligatorios, por lo
que el cliente puede mostrar tarjetas sin esos textos. El otro ejemplo
de exito probado es el body `[]`, no un 204 sin contenido.

**Efecto en la UI:**

- Conserva las tareas validadas en `tasks`. Construye `visibleTasks` sin
  mutar esos objetos: excluye solo `status === 'ARCHIVED'`, agrega `label`
  y ordena mediante `first.priority > second.priority ? -1 : 1`,
  sustituyendo prioridad ausente por `Number.NaN`.
- No es un orden de negocio: strings se comparan segun el operador `>` y
  combinaciones string/number siguen su conversion JavaScript. Prioridades
  iguales no retornan cero; no se garantiza una politica estable de empates.
- Etiqueta: prioridad/owner verdaderos se convierten a string y mayusculas;
  valores falsos (incluidos `0` y `''`) usan `NORMAL` y `SIN-ASIGNAR`.
- Traducciones de estado: `TODO` -> `Por hacer`, `IN_PROGRESS` -> `En progreso`,
  `DONE`/`COMPLETED` -> `Completado`, `RESUELTO` -> `Resuelto`. La traduccion
  usa mayusculas; estados desconocidos conservan el texto y ausencia produce
  texto vacio. `archived` en minusculas **no se filtra**.
- Saludo: `user.displayName || user.username`. Mientras espera muestra
  skeletons; al terminar establece `loading=false` y actualiza la vista.
  Con lista visible vacia muestra `No hay tareas para mostrar todavía.`.

Evidencia: [models/task.ts](../src/app/models/task.ts#L15),
[dashboard.component.ts](../src/app/dashboard/dashboard.component.ts#L55),
[legacy-format.ts](../src/app/utils/legacy-format.ts#L3) y
[dashboard.component.html](../src/app/dashboard/dashboard.component.html#L20).

### 4. Como reacciona ante errores

Todo fallo capturado en `ngOnInit` termina la carga en `finally`, actualiza
la vista y muestra un parrafo de error. La grilla solo aparece si
`!loading && !error`; no muestra una lista vacia como reemplazo de una
respuesta invalida. Las causas HTTP se extraen con la misma prioridad
`message`, `detail`, `error.message` descrita en login, sin exponerlas.

| Caso | Comportamiento actual de la UI y sesion |
|---|---|
| Token local ausente o cadena vacia | No hay GET. Intenta navegar a `/login` y termina la carga. No hay validacion remota ni limpieza adicional de un usuario sobrante. |
| Token no vacio pero invalido/vencido, y la API responde 401/403 | Muestra `No se pudo cargar el dashboard.`; termina carga y oculta grilla. **No borra sesion ni redirige a login**, no hace refresh ni reintenta. Conserva el saludo si ya se leyo el usuario. |
| Otro HTTP fuera de 2xx, incluidos 400, 404, 429 y 5xx | Mismo mensaje generico y fin de carga. No distingue por status; conserva sesion. |
| Fallo de red o bloqueo CORS | Mismo generico, fin de carga y sesion conservada. No muestra detalles internos ni reintenta automaticamente. |
| Espera indefinida/timeout | No hay timeout de aplicacion para este endpoint: sin resolucion o rechazo, `loading` puede permanecer activo. Si el navegador/red termina la peticion con error, muestra el generico y finaliza carga. |
| 2xx con body no array, envelope, texto o sin contenido | Muestra `El backend respondió con tareas inválidas.` si el body llega al validador. Si Axios rechaza antes, muestra el generico. Un 204 sin body no es una lista vacia aceptada. |
| Algun elemento no objeto o algun campo consumido con tipo incompatible, incluido `null` | Rechaza la lista completa, muestra `El backend respondió con tareas inválidas.`, termina carga y oculta grilla. No muestra una lista parcial exitosa. |
| Restos de token/usuario de la politica anterior, incluso JSON corrupto | Se eliminan sin interpretarlos; no se restauran a memoria. Sin sesion en la instancia actual, redirige a login sin GET. |
| Fallo al limpiar claves heredadas durante la primera lectura de sesion | Muestra `No se pudo leer la sesión guardada.`, termina carga y no llama GET. Intenta eliminar ambas claves; una lectura posterior reintenta la limpieza fallida. |
| Navegacion a login cancelada/rechazada al no haber sesion | Muestra el generico del dashboard y termina carga; no llama GET. |
| Error durante procesamiento/actualizacion dentro del try distinto de PublicError | Muestra el generico y ejecuta la finalizacion de carga. No se implementa recuperacion ni recarga automatica de datos. |
| Fallo al borrar claves heredadas durante logout | Borra memoria antes de intentar las dos claves. Muestra `No se pudo cerrar la sesión local.` y no navega; pueden quedar claves heredadas sin borrar, pero no una sesion activa en memoria. El error oculta la grilla. |
| Navegacion de logout cancelada/rechazada tras borrar claves | Muestra `No se pudo cerrar la sesión.`. Las claves de token/usuario ya se borraron; no se restauran. El error oculta la grilla. |

Los errores se notifican por `notifyError` con categoria y contexto generico
en consola, nunca con el objeto Axios completo o el token.
No existe codigo de limpieza por 401/403 ni handler de expiracion.

Evidencia: [dashboard.component.ts](../src/app/dashboard/dashboard.component.ts#L46),
[dashboard.component.ts:75](../src/app/dashboard/dashboard.component.ts#L75),
[session.service.ts](../src/app/services/session.service.ts#L13),
[http-error.ts](../src/app/utils/http-error.ts#L7) y
[dashboard.component.html](../src/app/dashboard/dashboard.component.html#L18).

### 5. Notas de seguridad y preguntas abiertas

- SessionService es el unico acceso de aplicacion a localStorage: solo
  lee/escribe preferencias y elimina claves heredadas de token/usuario.
  La consulta obtiene token/usuario de memoria; no sobreviven a recargas.
- El Bearer sale del token guardado; el frontend no comprueba permisos,
  firma ni caducidad. `owner` es solo un filtro enviado por el cliente:
  **la autorizacion de acceso debe comprobarla la API**, y no puede
  verificarse aqui que lo haga.
- La URL usa HTTP local sin TLS; mantener el laboratorio sin despliegue publico.
- Titulos, descripciones, etiquetas y errores se muestran mediante
  interpolacion de texto; no se usa HTML dinamico para esos contenidos.
- **Cerrar sesion es local:** SessionService borra la sesion en memoria e
  intenta eliminar `workshop_token` y `workshop_user` heredados; conserva
  `workshop_preferences`, luego navega a `/login` si la limpieza tuvo exito.
  No hay request externo ni revocacion del token. Tampoco hay un handler de
  eventos de almacenamiento para sincronizar la UI de otras pestanas:
  logout no cierra una sesion autenticada en memoria de otra pestana.
- **Preguntas abiertas:** status y body reales de la API; reglas de `owner`
  vacio y caracteres especiales; autorizacion por propietario; prioridades
  y estados permitidos; paginacion, limites y orden de negocio; caducidad y
  revocacion; CORS. No se pueden inferir desde estos validadores tolerantes.

Fuentes: [session.service.ts](../src/app/services/session.service.ts#L51),
[tasks.service.ts](../src/app/services/tasks.service.ts#L11),
[dashboard.component.html](../src/app/dashboard/dashboard.component.html#L20)
y [README.md](../README.md).

## Documentos y fuentes consultados

**Documentos del repositorio**

- Version anterior de este [ENDPOINTS.md](ENDPOINTS.md), contrastada y
  sustituida por esta descripcion del comportamiento actual.
- [README.md](../README.md): ejecucion local, servicios esperados y
  politica de sesion en memoria autorizada.
- [GOOD_PRACTICES.md](GOOD_PRACTICES.md): servicios, tipos, sesion centralizada
  y mensajes seguros.
- [package.json](../package.json): version declarada de Axios 1.20.0.

**Codigo y pruebas utilizados como evidencia**

- [environment.ts](../src/environments/environment.ts) y
  [app.routes.ts](../src/app/app.routes.ts).
- [auth.service.ts](../src/app/services/auth.service.ts),
  [tasks.service.ts](../src/app/services/tasks.service.ts) y
  [session.service.ts](../src/app/services/session.service.ts).
- [models/auth.ts](../src/app/models/auth.ts),
  [models/task.ts](../src/app/models/task.ts),
  [http-error.ts](../src/app/utils/http-error.ts) y
  [legacy-format.ts](../src/app/utils/legacy-format.ts).
- [login.component.ts](../src/app/login/login.component.ts) y
  [login.component.html](../src/app/login/login.component.html).
- [dashboard.component.ts](../src/app/dashboard/dashboard.component.ts) y
  [dashboard.component.html](../src/app/dashboard/dashboard.component.html).
- [auth.service.spec.ts](../src/app/services/auth.service.spec.ts) y
  [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts).
- [session.service.spec.ts](../src/app/services/session.service.spec.ts):
  fixture completo consultado al refactor y verificado para este documento.
- Codigo de Axios instalado dentro del repositorio:
  `node_modules/axios/lib/defaults/index.js`, `defaults/transitional.js`,
  `helpers/resolveConfig.js` y `adapters/xhr.js`, para diferenciar defaults
  reales de headers/opciones configurados por la aplicacion.

No se inspeccionaron otros componentes del workspace ni contratos externos.
Este documento no modifica el seguimiento de [HALLAZGOS.md](../HALLAZGOS.md).
