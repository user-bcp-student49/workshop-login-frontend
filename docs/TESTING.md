# Pruebas del flujo de login y tareas

Actualizado el 19/10/2026. Alcance exclusivo: `workshop-login-frontend`.
Contrato de referencia: [ENDPOINTS.md](ENDPOINTS.md). Umbral:
[REGLAS.md](../REGLAS.md), 85% o superior del codigo modificado.
El seguimiento de hallazgos permanece en [HALLAZGOS.md](../HALLAZGOS.md).

## Matriz de escenarios

Los siguientes escenarios se ejecutan con Vitest en Node. Se usan los
componentes y servicios reales de la aplicacion, con dobles para Axios,
Router, almacenamiento, NgZone y ChangeDetectorRef. Los resultados esperados
de UI son su estado y mensajes; no equivalen a comprobar el DOM renderizado.

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login -> tareas -> logout | Credenciales validas y respuesta con token/usuario | Camino feliz | Guarda sesion, navega al dashboard, envia GET con owner y Bearer, carga tarea visible y etiqueta, excluye ARCHIVED, cierra sesion; una nueva entrada sin token no hace otro GET. |
| Login | Usuario o contrasena vacios, blancos, null o undefined | Caso borde | Mensaje del campo correspondiente; sin HTTP, escrituras ni navegacion. |
| Login | Credenciales con espacios alrededor | Caso borde | Se validan y se envian sin recortar; client y timeout originales. |
| Login | Respuesta sin token, vacia, null, array, texto o token de otro tipo | Caso borde / Error | `El backend respondió sin token.`, sin nueva persistencia ni navegacion; busy termina. |
| Login | Usuario ausente, null, array o campos de tipos invalidos | Error | `El backend respondió con un usuario inválido.`, sin guardar respuesta ni navegar. |
| Login | HTTP 400/401/403/429/500/503 | Error | Mensaje publico generico, busy false, sin reintento ni reemplazo de sesion anterior. |
| Login | Backend inaccesible (ECONNREFUSED), error de red/CORS (ERR_NETWORK), timeout de transporte (ETIMEDOUT) | Error | Mensaje generico sin causa privada; sin guardar ni navegar. ERR_NETWORK simula lo que observa la aplicacion, no reproduce CORS real. |
| Login | Timeout configurado de 5000 ms | Error | Con reloj virtual, sigue ocupado a 4999 ms; al rechazo simulado a 5000 ms termina busy, muestra generico y no reintenta. No prueba el adaptador de red real. |
| Login | 204 sin body / body no JSON o rechazo al procesar respuesta | Error | No autentica: error sin token si llega al validador; generico si Axios rechaza el procesamiento. |
| Login | Error al escribir preferencias | Error | No publica sesion en memoria ni navega, muestra error y termina busy. Token/usuario nunca se escriben en almacenamiento. |
| Login | Limpieza inicial heredada fallida | Error | Muestra `No se pudo cerrar la sesión local.`, no publica sesion ni aparenta exito. |
| Login | Preferencias corruptas, incompatibles o almacenamiento inaccesible | Error | Mensaje explicito; defaults conservados, sin fallo silencioso. |
| Login | Preferencias parciales, booleanos false y campos desconocidos | Caso borde | Defaults para campos ausentes, false preservado, claves desconocidas descartadas. |
| Login | Navegacion cancelada o rechazada despues de guardar | Error | Generico, busy false; se conserva la sesion ya escrita, como documenta el contrato. |
| Login -> tareas | Token entregado por login rechazado por tareas con 401/403 | Error | Error generico del dashboard, loading false y ninguna tarea presentada; sin refresh, segunda navegacion automatica ni limpieza implicita de la sesion. No prueba validez criptografica del token. |
| Tareas | Token en memoria ausente, incluso con claves heredadas corruptas | Caso borde | Limpia claves heredadas sin interpretarlas; sin GET, redireccion a login. |
| Tareas | Usuario sin username o username vacio | Caso borde | Consulta con owner vacio; no se inventa un usuario ni un filtro alternativo. |
| Tareas | Lista vacia o elementos con campos opcionales ausentes | Caso borde | Lista vacia es exito; campos ausentes aceptados, etiquetas con alternativas. |
| Tareas | Estados conocidos/desconocidos y archivadas | Caso borde | Traducciones y filtrado exacto documentados; no se cambia el orden de negocio. |
| Tareas | HTTP 400/401/403/404/429/500/503 | Error | `No se pudo cargar el dashboard.`, loading false, sesion conservada y sin reintento/redireccion automatica. |
| Tareas | Backend caido, red/CORS o timeout comunicado por transporte | Error | Para ECONNREFUSED, ERR_NETWORK, ETIMEDOUT o ECONNABORTED: generico, fin de carga y sesion conservada. |
| Tareas | Peticion pendiente sin deadline de aplicacion | Caso borde / Limitacion | Tras 60000 ms virtuales sigue loading; al completar la peticion termina. Esta prueba caracteriza una limitacion, no demuestra que exista proteccion contra espera indefinida. |
| Tareas | Body no array, envelope, texto, 204 sin body o elementos/campos invalidos | Error | Error de tareas invalidas, loading false, sin datos parciales exitosos. |
| Tareas | Axios rechaza el procesamiento de la respuesta | Error | Error generico, sin detalles privados y fin de carga. |
| Tareas | Limpieza de claves heredadas fallida | Error | `No se pudo leer la sesión guardada.`, loading false y sin GET. |
| Tareas | Navegacion a login cancelada o rechazada | Error | Generico del dashboard, fin de carga y sin GET. |
| Tareas | Excepcion inesperada propagada por el servicio | Error | Generico y fin de carga; no retorno exitoso artificial. |
| Logout | Borrado correcto | Camino feliz | Elimina token/usuario, conserva preferencias, navega a login; no revoca remotamente. |
| Logout | Borrado de claves heredadas falla | Error | Borra memoria, intenta ambas claves, notifica error y no navega. |
| Sesion | Recarga o nueva instancia/pestana | Caso borde | Sin sesion ni GET, login requerido; preferencias persistidas. No afecta la memoria de otra pagina. |
| Sesion | Logout en otra pagina | Caso borde | No cierra la sesion independiente en memoria de esta pagina; no hay revocacion ni sincronizacion. |
| Logout | Navegacion cancelada o rechazada tras borrar claves | Error | Mensaje publico, claves no restauradas y sin aparentar navegacion exitosa. |
| Errores compartidos | message/detail/error.message y causas sensibles | Error | Extrae causa internamente; UI y logging no reciben objetos HTTP ni secretos completos. |

## Codigo de los tests

### Archivos ejecutables

Los tests completos, incluidos setup, dobles, assertions y limpieza, estan
en estos archivos. Los bloques siguientes son extractos reales del codigo
agregado originalmente, no propuestas ni pseudocodigo. Los extractos de la
primera implementacion que mencionan persistencia son historicos; el codigo
actual y las pruebas de migracion estan en los enlaces y actualizaciones finales.

| Archivo | Pruebas finales | Alcance |
|---|---:|---|
| [login-flow.spec.ts](../src/app/login-flow.spec.ts) | 6 | Flujo integrado, 401/403, paginas independientes y error de migracion. |
| [login.component.spec.ts](../src/app/login/login.component.spec.ts) | 42 | Validacion, estados, respuestas HTTP, timeout simulado, memoria y navegacion. |
| [dashboard.component.spec.ts](../src/app/dashboard/dashboard.component.spec.ts) | 47 | Consulta, filtrado, errores, peticion pendiente, sesion y logout. |
| [auth.service.spec.ts](../src/app/services/auth.service.spec.ts) | 18 | POST, Axios real/adaptador y validacion de respuesta. |
| [tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts) | 19 | GET, Axios real/adaptador, lista vacia y datos invalidos. |
| [session.service.spec.ts](../src/app/services/session.service.spec.ts) | 23 | Memoria, preferencias, migracion, errores y borrado. |
| [build-config.spec.ts](../src/testing/build-config.spec.ts) | 2 | Entradas, assets, budgets y targets de servidor intactos. |
| [ci.spec.ts](../.github/workflows/ci.spec.ts) | 6 | Comandos de gates, instalacion reproducible y scanners preservados. |
| [http-error.spec.ts](../src/app/utils/http-error.spec.ts) | 8 | Causas y notificaciones seguras. |
| [legacy-format.spec.ts](../src/app/utils/legacy-format.spec.ts) | 4 | Etiqueta nominal y alternativas. |
| **Total** | **152** | **53 pruebas adicionales respecto de la base de 99.** |

### Camino feliz integrado

Extracto de [login-flow.spec.ts](../src/app/login-flow.spec.ts). `createFlow`
construye ambos componentes con la misma instancia de SessionService y
servicios de autenticacion/tareas reales; solo las fronteras externas se
simulan. La prueba completa verifica despues el GET, etiqueta y logout.

```typescript
const { router, session, login, dashboard, nextDashboard } = createFlow();
const navigate = vi.mocked(router.navigate);
vi.mocked(axios.post).mockResolvedValue({
  data: { token: 'flow-test-token', user: { username: 'student', displayName: 'Student' } }
});
vi.mocked(axios.get).mockResolvedValue({ data: [
  { title: 'Visible task', description: 'Test description', status: 'TODO', priority: 'high', owner: 'student' },
  { title: 'Hidden task', status: 'ARCHIVED' }
] });

login.username = 'student';
login.password = 'test-password';
await login.login();
expect(login.message).toBe('');
expect(login.busy).toBe(false);
expect(navigate).toHaveBeenLastCalledWith(['/dashboard']);
```

### Casos borde

Prueba existente conservada en
[login.component.spec.ts](../src/app/login/login.component.spec.ts).
`Reflect.set` permite probar datos heredados incompatibles sin introducir
`any` ni debilitar el tipo del componente.

```typescript
it.each([null, undefined, '', '   '])('rejects empty username %s before HTTP', async username => {
  const component = create();
  Reflect.set(component, 'username', username);
  await component.login();
  expect(component.message).toContain('Ingrese un usuario.');
  expect(axios.post).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
```

### Backend caido y otros fallos de transporte

Codigo agregado a
[login.component.spec.ts](../src/app/login/login.component.spec.ts):

```typescript
it.each(['ERR_NETWORK', 'ECONNREFUSED', 'ETIMEDOUT'])('reports transport error %s safely', async code => {
  vi.mocked(axios.post).mockRejectedValue({ code, message: 'private transport detail' });
  const component = create();
  component.username = 'student';
  component.password = 'test-password';
  await component.login();
  expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
  expect(component.busy).toBe(false);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
```

### Timeout de login: umbral y finalizacion

Codigo agregado a
[login.component.spec.ts](../src/app/login/login.component.spec.ts):

```typescript
it('handles the configured 5000 ms timeout without retrying', async () => {
  vi.useFakeTimers();
  vi.mocked(axios.post).mockImplementation((_url, _body, config) =>
    new Promise((_resolve, reject) => {
      setTimeout(() => reject({ code: 'ECONNABORTED', message: 'timeout' }), config?.timeout);
    }));
  const component = create();
  component.username = 'student';
  component.password = 'test-password';
  const pending = component.login();
  await vi.advanceTimersByTimeAsync(4999);
  expect(component.busy).toBe(true);
  expect(component.message).toBe('');
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(component.busy).toBe(false);
  expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
});
```

El doble utiliza el timeout **recibido del servicio**. La prueba existente de
contrato tambien exige `{ timeout: 5000 }`. No se espera cinco segundos reales
ni se afirma haber probado la interrupcion del adaptador XHR.
`afterEach` restablece reloj, globals y spies para aislar cada caso.

### Token invalido: rechazo tras login

Codigo agregado a [login-flow.spec.ts](../src/app/login-flow.spec.ts):

```typescript
it.each([401, 403])('reports a login-issued token rejected by tasks with HTTP %i', async status => {
  const { router, session, login, dashboard } = createFlow();
  vi.mocked(axios.post).mockResolvedValue({
    data: { token: 'rejected-test-token', user: { username: 'student' } }
  });
  vi.mocked(axios.get).mockRejectedValue({ response: { status, data: { detail: 'expired token' } } });
  login.username = 'student';
  login.password = 'test-password';
  await login.login();
  await dashboard.ngOnInit();
  expect(dashboard.error).toBe('No se pudo cargar el dashboard.');
  expect(dashboard.loading).toBe(false);
  expect(dashboard.visibleTasks).toEqual([]);
  expect(vi.mocked(router.navigate)).toHaveBeenCalledTimes(1);
  expect(session.read()?.token).toBe('rejected-test-token');
  expect(axios.get).toHaveBeenCalledTimes(1);
});
```

La ausencia de limpieza/redireccion automatica es el comportamiento explicito
del contrato actual, no una prueba de seguridad del token. No se agrega refresh
ni se presume validacion JWT local.

## Comandos y resultados realmente ejecutados

**Directorio de todas las ejecuciones:**

```text
C:\Users\Usuario\Documents\T12158-daniel-berrospi\reqflow-workspace\workshop-login-frontend
```

**PowerShell, seleccion dirigida:**

```powershell
npm test -- src\app\login-flow.spec.ts src\app\login\login.component.spec.ts src\app\dashboard\dashboard.component.spec.ts
```

**Suite completa y cobertura:**

```powershell
npm run test:coverage
```

**Type-check estricto de todos los tests con herramientas existentes:**

```powershell
$specs = @(Get-ChildItem 'src' -Recurse -Filter '*.spec.ts' | ForEach-Object { $_.FullName })
& '.\node_modules\.bin\tsc.cmd' --noEmit --strict --target ES2022 --module ES2022 --moduleResolution bundler --experimentalDecorators @specs
```

| Ejecucion del 19/10/2026 (UTC-05:00) | Codigo de salida | Resultado |
|---|---:|---|
| Primer intento dirigido, antes de corregir la estructura de la nueva suite | 1 | Fallos del harness: tests nuevos de dashboard registrados accidentalmente dentro de beforeEach. Se corrigio la ubicacion, no las expectativas ni el codigo de aplicacion. |
| Dirigida, 16:50:23 | 0 | 92 tests aprobados en 3 archivos, 903 ms. En ese momento login-flow contenia solo el camino feliz; los 2 casos integrados de token rechazado se agregaron despues. |
| Suite completa con cobertura, 16:51:01 | 0 | 152 tests aprobados en 8 archivos, 1,71 s; incluye los 2 nuevos casos integrados de token rechazado. |
| Type-check estricto posterior a la suite completa | 0 | Sin errores TypeScript en los tests. |
| Repeticion final tras formatear y verificar referencias, 16:52:51 | 0 | 152 tests aprobados en 8 archivos, 2,15 s, misma cobertura; type-check estricto posterior tambien con codigo 0. |

### Cobertura final

El reporte de Vitest/V8 verifica los modulos de produccion incluidos por
[vitest.config.ts](../vitest.config.ts), no cobertura de tests ni de HTML.
En esta tarea solo se agregaron/modificaron pruebas y documentacion; no se
cambio codigo de produccion, dependencias o quality gates.

| Modulos instrumentados | Lineas | Sentencias | Funciones | Ramas |
|---|---:|---:|---:|---:|
| DashboardComponent | 100% | 100% | 100% | 96,42% |
| LoginComponent, modelos, servicios, utilidades y environment, cada archivo | 100% | 100% | 100% | 100% |
| **Total instrumentado** | **100%** | **100%** | **100%** | **99,27%** |

El piso de 85% por archivo se mantiene en las cuatro metricas y se satisface.
No se excluyeron casos dificiles ni se rebajo el gate. Reportes generados en
`coverage/`, ignorado por Git. Los conteos historicos de 99 tests en informes
anteriores siguen representando sus ejecuciones anteriores, no esta ampliacion.

## Fallos, pendientes y pruebas propuestas

### Fallos reales de esta tarea

- El primer intento fallo por registro anidado de tests en el harness.
  Corregido antes de la ejecucion final. No fue un bug de la aplicacion.
- **Ninguna prueba falla en la ejecucion final.** Esto no significa que no
  existan riesgos ni equivale a una auditoria aprobada.

### Bugs o limitaciones reportados aparte

- **Tareas sin deadline:** [tasks.service.ts:11](../src/app/services/tasks.service.ts#L11)
  no configura timeout; una peticion que no termina mantiene loading.
  El test de 60000 ms lo caracteriza y luego resuelve la peticion para limpiar
  el ensayo. No se lo presenta como una prueba de timeout implementado.
  Cambiar ese comportamiento requiere una decision de contrato, no adaptar
  un test para simular una proteccion inexistente.
- **Comparador no devuelve cero para iguales:**
  [dashboard.component.ts:59](../src/app/dashboard/dashboard.component.ts#L59).
  Es un defecto legacy explicitamente documentado y no corregido aqui.
  No se agregaron expectativas que pretendan validar una politica estable
  de empates ni se alteraron los tests existentes para ocultarlo.
- **Sesion vencida:** H-01 fue corregido con memoria por aprobacion renovada.
  El ensayo 401/403 sigue observando una reaccion de UI documentada; no
  demuestra que sea seguro mantener una sesion rechazada por la API.

Estos puntos no cambian silenciosamente el contrato ni el estado de los
hallazgos; el registro autoritativo sigue siendo HALLAZGOS.

### Pendientes no ejecutados

- Integracion con backends reales: estado HTTP, autenticacion y autorizacion
  efectivas, token realmente expirado, CORS y backend realmente detenido.
- Interrupcion de red real a los 5000 ms; la prueba actual mide configuracion
  y reaccion mediante reloj/doble, no el adaptador HTTP del navegador.
- DOM, accesibilidad, anuncio de errores, navegacion real y destruccion del
  componente durante una peticion. Las pruebas Node no renderizan plantillas.
- Auditoria de dependencias no ejecutada de nuevo en esta tarea porque no
  cambia paquetes; el resultado previo fallido no queda invalidado por los tests.

### Pruebas propuestas, no implementadas ni aprobadas

1. Browser test automatizado de login/tareas/logout con endpoints locales
   controlados y respuestas demoradas para comprobar red, DOM y busy/loading.
2. Ensayo con backend real que emita y rechace un token caducado, sin inventar
   algoritmo, caducidad ni endpoint de refresh.
3. Test del orden de prioridades iguales con expectativa acordada antes de
   corregir el comparador; no asumir una jerarquia de negocio.

## Actualizacion posterior: item de dependencias de PLAN, revision 2

Los resultados anteriores son historicos. El 19/10/2026 se agregaron 13 casos
con Axios real y adaptador controlado, y dos casos del contrato de builders
antes de modificar herramientas. El adaptador compartido vive en
[axios-contract.ts](../src/testing/axios-contract.ts); los casos estan en
los specs de AuthService/TasksService y
[build-config.spec.ts](../src/testing/build-config.spec.ts).

Antes: Vitest 3.2.4, 165 pruebas verdes de cobertura a las 17:06:56; despues
de agregar los dos casos de configuracion, 42 pruebas dirigidas verdes
a las 17:12:08. Audit: codigo 1, 25 alertas.

Despues de la migracion autorizada a Vitest/cobertura 4.1.11 y @angular/build
21.2.27, con framework Angular 21.2.25:

| Comando/verificacion desde la raiz | Resultado real |
|---|---|
| `npm run test:coverage` (17:15:44) | Codigo 0, 167 pruebas en 9 archivos; 100% lineas/sentencias/funciones, 99.08% ramas; minimo ramas por archivo 94.73%. |
| Type-check estricto de todos los specs | Codigo 0 tras declarar `@types/node` 22.20.5, requerido por `node:fs`. |
| `npm run build` | Codigo 0, budgets intactos. |
| `npm run audit:workshop` | Codigo 0, cero vulnerabilidades conocidas. |
| `npm ls --depth=0` | Codigo 0, sin peers invalidos. |
| Servidor temporal `npm start -- --port 4300` | GET `/login` y `/dashboard`: HTTP 200 con shell Angular; servidor detenido despues. No verifica login contra backends. |

Fallos intermedios: dos intentos de npm install devolvieron ERESOLVE por el
grafo antiguo. Se regenero el lockfile en un directorio temporal dentro del
repositorio y se ejecuto npm ci, sin force ni legacy-peer-deps; se limpio
el directorio. El primer type-check posterior fallo por tipos Node ausentes;
se declaro la dependencia de tipos, sin bajar strict. npm 11 advirtio sobre
scripts de instalacion sin aprobacion explicita; no se aprobaron globalmente.

V8/Vitest 4 contabilizan ramas de otra forma: se conserva el gate por archivo
de 85% sin interpretar el cambio de porcentaje como perdida de escenarios.
Estas pruebas no demuestran autorizacion, CORS o red real. El seguimiento
y la resolucion del item estan exclusivamente en HALLAZGOS.

## Actualizacion posterior: H-01, sesion solo en memoria

Autorizacion humana renovada recibida antes de modificar la politica.
Caracterizacion anterior: 117 casos dirigidos verdes a las 17:17:56, codigo 0.
Nuevos criterios sobre el codigo antiguo: 23 tests de servicio, 11 fallos,
codigo 1. Son fallos esperados de TDD, no resultados finales.

Despues: `npm run test:coverage` a las 17:20:18, codigo 0, 169 tests en
9 archivos; 100% lineas/sentencias/funciones, 99.08% ramas, minimo por archivo
94.73%; SessionService al 100%. Tipos estrictos, build y audit codigo 0;
audit sin alertas conocidas. Se cambio una expectativa residual de escritura
de usuario por su equivalente en memoria segun el nuevo contrato aprobado.

Navegador con HTTP interceptado verifico limpieza de claves antiguas, login,
tarea visible con el mismo Bearer, ausencia de token/usuario persistidos,
recarga y nueva pestana redirigidas sin GET, y logout conservando preferencias.
El primer click de logout agoto espera por pestana original en segundo plano;
al traerla al frente paso. El servidor temporal se detuvo. No se probaron
backends reales. El escenario de paginas independientes tambien esta
automatizado en login-flow y SessionService.

## Actualizacion posterior: gates en CI

Antes de editar ci.yml, el nuevo spec junto al workflow fue descubierto
agregando `.github/workflows/*.spec.ts` al include de Vitest, sin tocar
thresholds o archivos de produccion incluidos en cobertura. Ejecucion
17:25:44: 6 casos, 2 fallos esperados (comando de cobertura ausente, job
audit ausente), codigo 1; cuatro comprobaciones de preservacion ya verdes.

Diff propio: ci.yml usa npm ci, sustituye npm test por test:coverage y
agrega job audit independiente; vitest.config.ts solo amplia descubrimiento;
ci.spec.ts y documentacion. Sin cambios adicionales de dependencias ni
scanners. Prueba textual exacta de los bloques, no un parser YAML o runner
GitHub. Diagnostico del editor para ci.yml: sin errores. No se instalaron
parser/runner nuevos: actionlint/act/docker no disponibles y PyYAML ausente.
La validacion independiente de sintaxis/esquema y el run remoto quedan
pendientes; no se presentan como aprobados.

Ensayos controlados locales, sin modificar el codigo de aplicacion:

- Fixture temporal con una rama/funcion sin cubrir: 50% en cuatro metricas;
  reutiliza thresholds reales de 85% por archivo. Vitest dio codigo 1 por
  cada umbral, aunque su test funcional paso. No se rebajo ningun gate.
- `npm run audit:workshop -- --registry=http://127.0.0.1:1 --fetch-retries=0
  --fetch-timeout=1000`: fallo esperado ECONNREFUSED y codigo 1.
  Demuestra que un servicio audit no disponible no produce exito; no es
  una auditoria limpia ni una vulnerabilidad sembrada.
- Se eliminaron los tres archivos del fixture y su carpeta. La limpieza
  informo que no existia un subdirectorio coverage; no quedo un fixture activo.
  Los ensayos prueban codigos locales, no ejecucion de jobs en GitHub.

Verificacion final desde raiz en Windows, Node 26.9.0/npm 11.19.1:

| Comando | Resultado real |
|---|---|
| `npm ci` | Codigo 0; 459 paquetes instalados, audit de instalacion sin alertas. Mantiene advertencias de scripts sin aprobacion. |
| `npm run test:coverage` (17:27:57) | Codigo 0; 175 tests en 10 archivos, incluidos los 6 de CI. 100% lineas/sentencias/funciones, 99.08% ramas; minimo por archivo 94.73%. |
| `tsc --noEmit --strict --target ES2022 --module ES2022 --moduleResolution bundler --experimentalDecorators <specs de src y .github/workflows>` | Codigo 0. |
| `npm run build` | Codigo 0. |
| `npm run audit:workshop` | Codigo 0, cero vulnerabilidades conocidas en el registro consultado. |

El workflow remoto conserva Node 22.22.0; no afirmar una ejecucion local
bajo esa version ni una ejecucion remota. Para repetir type-check en PowerShell:

```powershell
$specs = @(Get-ChildItem 'src','.github\workflows' -Recurse -Filter '*.spec.ts' |
  ForEach-Object { $_.FullName })
& '.\node_modules\.bin\tsc.cmd' --noEmit --strict --target ES2022 --module ES2022 `
  --moduleResolution bundler --experimentalDecorators @specs
```

No se genero PR ni commit. El lockfile generado debe incluirse con todos
los archivos nuevos al publicar, para que npm ci funcione desde checkout.
Los checks requeridos de proteccion de rama no se administraron aqui.

## Documentos consultados

- [ENDPOINTS.md](ENDPOINTS.md): flujo, campos, reaccion a errores y limites.
- [REGLAS.md](../REGLAS.md): cobertura y pruebas previas a cambios amplios.
- [HALLAZGOS.md](../HALLAZGOS.md): estado previo y riesgos residuales revisados
  en el contexto de la tarea.
- [vitest.config.ts](../vitest.config.ts), specs existentes y servicios/modelos
  consumidos por las pruebas: herramientas y evidencia ejecutable.
