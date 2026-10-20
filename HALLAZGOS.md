# Hallazgos del frontend

Revision inicial e implementacion realizadas el 2026-10-19, limitadas a este
repositorio. La revision inicial fue estatica; los resultados reales del
refactor, pruebas, cobertura, navegador y auditoria figuran al final.
La matriz contiene evidencias actuales de correccion o riesgo residual.

Este archivo es el unico registro de seguimiento. El paso `2-refactor.md` debera
actualizar aqui cada hallazgo, sin crear una matriz paralela. H-01 se resolvio
tras nueva autorizacion explicita de memoria en PLAN revision 2; H-02 a H-08
conservan su estado. Los resultados anteriores de auditoria son historicos:
la ultima ejecucion del primer item de revision 2 no tiene alertas conocidas.

## Matriz de seguimiento

Las filas cubren las seis areas de [RETO.md](RETO.md); Calidad se desglosa en
tipado, anidamiento y duplicacion. La severidad expresa prioridad de riesgo en
el laboratorio, no una puntuacion CVSS ni una explotacion demostrada.

| id | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|
| H-01 | Seguridad: token persistido en `localStorage` | Vulnerabilidad | Diff local de SessionService y specs: token/usuario solo en memoria, limpieza heredada explicita; preferencias persistidas. Autorizacion humana renovada; 169 tests verdes, servicio al 100% y navegador confirma recarga/nueva pestana sin sesion. JavaScript malicioso en pagina activa sigue siendo riesgo residual. | [session.service.ts:13](src/app/services/session.service.ts#L13); [session.service.spec.ts](src/app/services/session.service.spec.ts); [login-flow.spec.ts](src/app/login-flow.spec.ts) | alta | Resuelto |
| H-02 | Dependencias: Axios y Lodash declarados y utilizados | Sugerencia | Axios actualizado de 0.31.0 a 1.20.0; Lodash y sus tipos retirados, con lectura validada de preferencias nativa. Auditoria posterior sin entradas para Axios/Lodash, pero con 25 alertas ajenas a este par; no equivale a auditoria global aprobada. | [package.json:19](package.json#L19); [src/app/models/auth.ts:43](src/app/models/auth.ts#L43); [src/app/services/auth.service.spec.ts:11](src/app/services/auth.service.spec.ts#L11) | media | Resuelto |
| H-03 | Seguridad: mensaje dinamico renderizado mediante HTML | Refactor | Sustituido por interpolacion y mensajes publicos seguros. La causa HTTP no se refleja en la UI ni se registra el objeto Axios. DOM verificado con texto literal y cero elementos inyectados; no se atribuye XSS al enlace original sanitizado por Angular. | [src/app/login/login.component.html:39](src/app/login/login.component.html#L39); [src/app/utils/http-error.ts:7](src/app/utils/http-error.ts#L7); [src/app/login/login.component.ts:56](src/app/login/login.component.ts#L56) | media | Resuelto |
| H-04 | Arquitectura: HTTP, sesion y URLs dentro de componentes | Refactor | HTTP extraido a AuthService/TasksService, sesion a SessionService y configuracion centralizada por ambiente. Componentes coordinan vista y navegacion. Se conservaron contratos y actualizacion asincrona visible. | [src/app/services/auth.service.ts:8](src/app/services/auth.service.ts#L8); [src/app/services/tasks.service.ts:8](src/app/services/tasks.service.ts#L8); [src/app/services/session.service.ts:12](src/app/services/session.service.ts#L12); [src/environments/environment.ts:1](src/environments/environment.ts#L1) | media | Resuelto |
| H-05 | Testing: pruebas limitadas a una utilidad | Refactor | Ampliado a 99 pruebas en 7 archivos, con contratos, componentes, almacenamiento y errores. Gate de 85% por archivo en lineas, sentencias, funciones y ramas; todas las metricas superan el umbral. Verificacion de navegador con respuestas simuladas, no con backends reales. | [src/app/login/login.component.spec.ts:1](src/app/login/login.component.spec.ts#L1); [src/app/dashboard/dashboard.component.spec.ts:1](src/app/dashboard/dashboard.component.spec.ts#L1); [src/app/services/session.service.spec.ts:1](src/app/services/session.service.spec.ts#L1); [vitest.config.ts:17](vitest.config.ts#L17) | media | Resuelto |
| H-06 | Calidad: any en estado, respuestas, errores y utilidad | Refactor | Eliminado any del codigo fuente, con interfaces, unknown y validacion de respuestas/preferencias. TypeScript strict y strictTemplates activados; build y comprobacion estricta de pruebas aprobados. Las respuestas incompatibles se notifican, no se convierten en exito. | [src/app/models/auth.ts:3](src/app/models/auth.ts#L3); [src/app/models/task.ts:3](src/app/models/task.ts#L3); [src/app/utils/legacy-format.ts:3](src/app/utils/legacy-format.ts#L3); [tsconfig.json:7](tsconfig.json#L7) | media | Resuelto |
| H-07 | Calidad: claves y acceso a sesion duplicados | Refactor | Claves definidas una sola vez y acceso exclusivo desde SessionService. Pruebas verifican los literales originales, rollback de escrituras incompletas y limpieza de ambas claves sin borrar preferencias. | [src/app/services/session.service.ts:5](src/app/services/session.service.ts#L5); [src/app/services/session.service.spec.ts:21](src/app/services/session.service.spec.ts#L21) | baja | Resuelto |
| H-08 | Calidad: validacion anidada de login | Refactor | Retornos anticipados para usuario y contrasena, con un solo flujo try/finally. Se preservan prioridad de mensajes, credenciales sin recortar y finalizacion de busy, incluso si navegar falla. | [src/app/login/login.component.ts:37](src/app/login/login.component.ts#L37); [src/app/login/login.component.spec.ts:40](src/app/login/login.component.spec.ts#L40) | baja | Resuelto |

No hay casos de la tabla de RETO ausentes a nivel de patrones de codigo. Esto no
convierte las hipotesis de CVEs o XSS en vulnerabilidades confirmadas. Si una
revision posterior descarta un caso sembrado, se actualizara su fila como
**No encontrado**, conservando el motivo y la evidencia.

## Mapa de componentes y dependencias actual

- [src/main.ts:1](src/main.ts#L1) arranca Angular con `bootstrapApplication`,
  registra el router y carga `AppComponent`.
- [src/app/app.component.ts:8](src/app/app.component.ts#L8) es el contenedor
  `router-outlet`. [src/app/app.routes.ts:3](src/app/app.routes.ts#L3) carga
  login y dashboard de forma diferida; la raiz y las rutas desconocidas
  redirigen a login.
- [src/app/login/login.component.ts:1](src/app/login/login.component.ts#L1)
  depende de CommonModule, FormsModule, Router, AuthService, SessionService
  y herramientas Angular de actualizacion de vista. Su plantilla enlaza
  las credenciales y llama a `login()`, sin HTTP ni almacenamiento directo.
- [src/app/dashboard/dashboard.component.ts:1](src/app/dashboard/dashboard.component.ts#L1)
  depende de CommonModule, Router, TasksService, SessionService, NgZone,
  ChangeDetectorRef y `formatTaskLabel`. Gestiona la vista y navegacion.
- [src/app/utils/legacy-format.ts:3](src/app/utils/legacy-format.ts#L3)
  convierte prioridad y propietario a mayusculas, con alternativas
  `SIN-DATOS`, `NORMAL` y `SIN-ASIGNAR`; no hace HTTP ni gestiona sesion.
- [package.json:12](package.json#L12) declara Angular 21.2.25, Axios 1.20.0,
  RxJS 7.8.2, tslib 2.8.1 y zone.js 0.15.1, sin Lodash.
  [package.json:24](package.json#L24) declara herramientas Angular,
  TypeScript 5.9.3, Vitest y su proveedor de cobertura V8 4.1.11.
  `npm ls axios lodash --depth=0` confirmo Axios 1.20.0 sin Lodash directo.

## Flujo y riesgos que deben protegerse

El contrato observado completo se documenta en
[docs/ENDPOINTS.md](docs/ENDPOINTS.md): login, sesion en memoria de token y usuario,
consulta de tareas con Bearer y propietario, y cierre local de sesion.
No se inspeccionaron ni se modificaron componentes externos.

Antes de cualquier refactorizacion:

1. Proteger con pruebas `/auth/login` y `/api/tasks`, payload, parametro
   `owner`, cabecera Bearer, mensajes de validacion y redirecciones.
2. Preservar deliberadamente las claves de sesion y las preferencias, o acordar
   una migracion explicita. Cambiar la persistencia altera el comportamiento
   al recargar y entre pestanas.
3. Proteger el filtrado exacto de `ARCHIVED`, las etiquetas, el orden observable
   y los estados de carga/error; no asumir un orden de prioridades de negocio
   que el backend no ha documentado.
4. Cubrir entradas y respuestas malformadas antes de introducir tipos o
   cambiar manejo de errores; evitar que una mejora de arquitectura oculte
   fallos de sesion o del backend.
5. Aplicar cambios incrementales revisables, mantener las alertas y quality
   gates y verificar cobertura de al menos 85% del codigo modificado. El
   resultado medido tras implementar figura en la seccion siguiente.

## Ejecucion del plan y resultados reales - 2026-10-19

La aprobacion general de Daniel Berrospi figura en [PLAN.md](PLAN.md).
Al consultar la decision separada de H-01, el usuario rechazo pasar la sesion
a memoria. Se mantuvo la persistencia, sin sustituirla por otra politica no
aprobada. No se modificaron otros repositorios ni se agregaron dependencias
directas nuevas. Se reconcilio el archivo de bloqueo existente mediante npm;
continua disponible para revision, sin crear commits.

### Diff conceptual, caracterizacion y correccion por hallazgo

| Hallazgo | Antes del cambio | Despues y prueba real de correccion |
|---|---|---|
| H-01 | Las pruebas caracterizaron escritura/lectura de token y usuario, recarga y logout que conserva preferencias. | No se aplico memoria por rechazo humano. 22 pruebas de SessionService preservan la politica persistente y comprueban errores/rollback; el navegador confirmo recarga con sesion y borrado local al cerrar. Sigue Pendiente, no se declara corregida su exposicion. |
| H-02 | Contratos POST/GET y preferencias caracterizados antes de cambiar paquetes. `npm ls` mostro Axios 0.31.0 y Lodash 4.17.21; auditoria inicial: 27 alertas (9 moderadas, 12 altas, 6 criticas). | Axios 1.20.0, sin Lodash ni sus tipos directos; preferencias conocidas validadas de forma nativa. Las suites de AuthService (12), TasksService (12) y SessionService (22) pasan. `npm ls` confirma la version; auditoria posterior no enumera Axios/Lodash, pero falla globalmente con 25 alertas. |
| H-03 | Caso con `<em>detalle</em>` caracterizado antes del cambio; el navegador encontro 1 elemento `em`. Al exigir ausencia de HTML en el mensaje, 3 pruebas fallaron antes de corregirlo. | Interpolacion y mensajes publicos sin detalles privados; las 40 pruebas iniciales volvieron a pasar tras este incremento. Navegador final: error generico inmediato, boton habilitado, 0 elementos `em`; al asignar texto de prueba al componente, se muestra literalmente `<em>detalle</em>`. |
| H-04 | 40 pruebas sobre componentes originales y utilidad pasaron antes de extraer codigo. Se verificaron peticiones, claves, filtrado, orden y errores. | Servicios separados y configuracion central, sin HTTP/almacenamiento en componentes. 99 pruebas finales pasan; navegador verifica POST sin autorizacion, GET con propietario y Bearer exactos, tareas y logout. |
| H-05 | Base original: 1 prueba. Se escribieron y ejecutaron 40 pruebas de caracterizacion antes del refactor amplio; las pruebas nuevas de servicios se agregaron antes de crear su implementacion. | 99 pruebas en 7 archivos aprobadas. Primera cobertura de ramas del dashboard: 75%, gate fallido; se agregaron casos sin reducirlo. Resultado final: minimo por archivo 96.15% de ramas y 100% en las otras metricas. |
| H-06 | El codigo original aceptaba tipos no comprobados; la caracterizacion incluyo respuesta sin token, sesion corrupta y alternativas de etiquetas. | Interfaces y validadores rechazan entradas incompatibles explicitamente; pruebas de datos malformados pasan. `npm run build` con strict/strictTemplates y comprobacion TypeScript estricta de todas las pruebas terminan con codigo 0. |
| H-07 | Pruebas originales fijaron las tres claves literales y la conservacion de preferencias durante logout; se probaron fallos de cada escritura. | Unico servicio y conjunto de claves. Las 22 pruebas de sesion verifican serializacion, lectura en otra instancia, rollback y ambos intentos de borrado, con errores explicitos; componentes sin localStorage. |
| H-08 | Casos de usuario/contrasena nulos, indefinidos, vacios o con espacios ejecutados antes de cambiar el anidamiento; payload con espacios preservado. | Retornos anticipados y finally unico. Las 21 pruebas finales de login pasan, incluida navegacion cancelada, sin HTTP para validacion fallida y con busy restablecido. |

### Comandos y cobertura

- `npm test`: base previa de 40 pruebas aprobadas en 3 archivos.
- `npm run test:coverage`: resultado final de 99 pruebas aprobadas en 7
  archivos, codigo 0; 100% de lineas, sentencias y funciones; 99.25% de
  ramas globales. Dashboard: 96.15% de ramas; todos los demas modulos
  instrumentados: 100% en las cuatro metricas.
- Gate de 85% **por archivo** en las cuatro metricas, incluyendo componentes,
  modelos, servicios, utilidades y configuracion modificados; sin exclusiones
  de ramas dificiles ni rebaja de quality gates. Reportes generados en
  `coverage/` (ignorado por Git).
- Comprobacion estricta de pruebas: TypeScript existente con `--noEmit
  --strict --target ES2022 --module ES2022 --moduleResolution bundler
  --experimentalDecorators`, pasando todos los archivos `src/**/*.spec.ts`;
  codigo final 0. Los errores de tipado de dobles detectados inicialmente
  se corrigieron sin casts dobles.
- `npm run build`: codigo 0 con strict y strictTemplates activados.
- Navegador integrado en servidor temporal `localhost:4300`, con respuestas
  HTTP interceptadas y datos ficticios: login -> tareas -> recarga -> logout;
  sin token no se consulta la API; archivadas no visibles; lista vacia y
  error terminan carga; texto interpolado sin marcado dinamico.
  No es una prueba de integracion con backends reales.

### Auditoria y riesgo residual

`npm run audit:workshop` ejecutado antes y despues del cambio, el 2026-10-19,
manteniendo `--audit-level=moderate`. Resultado final: **codigo 1**, con
**25 alertas: 9 moderadas, 10 altas y 6 criticas**. No se uso
`npm audit fix --force`, no se ignoro la salida y no se declara aprobada la
auditoria. La reduccion desde 27 corresponde a las entradas Axios/Lodash.

La auditoria inicial enumero, entre otros, avisos de Axios como
[GHSA-w9j2-pvgh-6h63](https://github.com/advisories/GHSA-w9j2-pvgh-6h63)
y de Lodash como
[GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc).
Esto confirma coincidencias de versiones, no explotabilidad del frontend:
no se observo uso de `_.template`, `_.unset` o `_.omit`, ni adaptador HTTP
Node/proxy en el codigo de navegador; los avisos de gadgets requieren
condiciones adicionales no demostradas. La version Axios 1.20.0 se eligio
tras consultar el registro y comprobar que la auditoria posterior no
contiene su entrada, verificando compatibilidad con pruebas y build.

Quedan entradas en familias Angular y herramientas de build, Vitest/cobertura,
MCP SDK transitivo, braces/chokidar/micromatch/http-proxy-middleware,
piscina/tinypool, postcss, sockjs/uuid y undici. Corregirlas requiere otro
alcance aprobado; no se modificaron ni se atribuye su explotabilidad sin
analisis. El laboratorio sigue sin ser apto para despliegue publico.

### Desviaciones y cambios deliberados

- H-01 no implementado por rechazo humano de la politica de memoria; sigue
  expuesto el token persistido a JavaScript del mismo origen. No hay
  revocacion ni sincronizacion nueva entre pestanas.
- Se reforzo la actualizacion de vista del login con `markForCheck` dentro
  de NgZone: en navegador el error original y busy quedaban sin reflejar
  hasta otro evento de formulario. Es el ajuste de actualizacion observable
  previsto en H-04, no un cambio de transporte.
- JSON corrupto, preferencias de tipos invalidos y respuestas malformadas
  ahora generan mensajes publicos explicitos. Se descartan campos de
  preferencias desconocidos. Se conservan defaults si cargar preferencias
  falla, pero con notificacion y registro seguro, nunca silenciosamente.
- Las tareas visibles se proyectan con etiqueta sin mutar los objetos de la
  respuesta; se preservan lista original, filtrado y comparacion observables.
- No se agrego un runner ni un entorno DOM: se utilizo el navegador integrado
  para comprobar renderizado. No se afirmo conectividad con servicios reales.

## Revision tecnica del diff local - 2026-10-19

Evidencia revisada: `git diff main`, `git status --short` y archivos nuevos
en la rama `day1/prompting`, exclusivamente en este repositorio. No se
presupone PR ni merge. No se modifico codigo durante esta revision.

### Verificacion de estados

| ID | Resultado de revision | Evidencia actual |
|---|---|---|
| H-01 | Sigue Pendiente: persistencia y acceso JavaScript no eliminados. No estaba marcado Resuelto. | [session.service.ts:15](src/app/services/session.service.ts#L15), [session.service.ts:26](src/app/services/session.service.ts#L26). |
| H-02 | Resuelto para las dependencias originales Axios/Lodash, no para toda la auditoria. Axios instalado 1.20.0; sin entradas de Axios/Lodash en la auditoria actual. | [package.json:19](package.json#L19), [package-lock.json:17](package-lock.json#L17), [models/auth.ts:45](src/app/models/auth.ts#L45). |
| H-03 | Resuelto: interpolacion, errores publicos y logging sin objeto HTTP sensible. Sin innerHTML ni bypass de sanitizacion en src. | [login.component.html:39](src/app/login/login.component.html#L39), [http-error.ts:19](src/app/utils/http-error.ts#L19). |
| H-04 | Resuelto: HTTP en servicios, almacenamiento en SessionService y URLs en environment; componentes coordinan la UI. | [auth.service.ts:11](src/app/services/auth.service.ts#L11), [tasks.service.ts:11](src/app/services/tasks.service.ts#L11), [session.service.ts:12](src/app/services/session.service.ts#L12), [environment.ts:1](src/environments/environment.ts#L1). |
| H-05 | Resuelto: 99 pruebas actuales aprobadas y piso de cobertura por archivo satisfecho. El gate funciona al ejecutar test:coverage; no esta conectado al workflow CI actual. | [vitest.config.ts:17](vitest.config.ts#L17), [login.component.spec.ts:42](src/app/login/login.component.spec.ts#L42), [dashboard.component.spec.ts:39](src/app/dashboard/dashboard.component.spec.ts#L39). |
| H-06 | Resuelto: sin any escrito en src; interfaces, validacion de unknown, strict y strictTemplates; build y type-check de pruebas aprobados. | [models/auth.ts:3](src/app/models/auth.ts#L3), [models/task.ts:15](src/app/models/task.ts#L15), [tsconfig.json:7](tsconfig.json#L7). |
| H-07 | Resuelto: claves y acceso de produccion unicos; pruebas de serializacion, rollback y errores de borrado aprobadas. | [session.service.ts:5](src/app/services/session.service.ts#L5), [session.service.spec.ts:21](src/app/services/session.service.spec.ts#L21). |
| H-08 | Resuelto: retornos anticipados, payload sin recortar y finally que finaliza busy; pruebas de errores y navegacion cancelada aprobadas. | [login.component.ts:37](src/app/login/login.component.ts#L37), [login.component.spec.ts:90](src/app/login/login.component.spec.ts#L90). |

**Ningun item Resuelto vuelve a Pendiente en esta revision.** El alcance de
H-02 no debe interpretarse como cierre de las alertas de otras dependencias.

### Validaciones ejecutadas de nuevo

- `npm run test:coverage`: 99 pruebas aprobadas en 7 archivos; 100% de
  lineas/sentencias/funciones y 99.25% de ramas. Minimo por archivo: 96.15%
  de ramas; umbrales 85% satisfechos, codigo 0.
- `npm run build`: codigo 0 con TypeScript y plantillas estrictos.
- Type-check estricto de todos los spec con TypeScript existente: codigo 0.
- `npm audit --json`: codigo 1, 25 alertas (9 moderadas, 10 altas, 6 criticas).
  Sin entradas Axios/Lodash. No se determina explotabilidad de cada aviso
  a partir del conteo; por ejemplo, el aviso critico de Vitest incluye la
  condicion de un servidor UI escuchando, no demostrada por `vitest run`.
- Busqueda en src: sin any, innerHTML ni bypassSecurityTrust; localStorage
  de produccion exclusivo de SessionService. No se encontraron secretos
  reales agregados al diff; fixtures y credenciales estan identificados como
  datos de laboratorio, sin afirmar una busqueda externa de secretos.

### Observaciones para decisiones posteriores

Observaciones historicas de la review anterior; la resolucion posterior de
auditoria y CI figura en la tabla de ejecucion de PLAN revision 2 al final.

- **Bloqueante para una aprobacion global de seguridad:** auditoria con
  codigo 1 y alertas hasta criticas, asociadas a dependencias fijadas en
  [package.json:13](package.json#L13) y [package.json:24](package.json#L24).
  No bloquea por si solo la verificacion acotada de Axios/Lodash, pero no
  puede declararse el quality gate aprobado ni ignorarse sus avisos.
- **Importante, preexistente:** [ci.yml:20](.github/workflows/ci.yml#L20)
  ejecuta `npm test` y build, no cobertura ni auditoria. Los nuevos umbrales
  no se aplican en esa ejecucion; faltaria acordar su conexion a CI y la
  gestion de alertas, sin excepciones silenciosas. CodeQL y dependency-review
  siguen configurados y no fueron debilitados por el diff.
- **Importante, conservado por el contrato:** query `owner` concatenada
  sin codificacion en [tasks.service.ts:12](src/app/services/tasks.service.ts#L12).
  Un valor con `&` o `#` puede interpretarse como estructura de URL y cambiar
  el filtro enviado. No se afirma que los usernames reales permitan esos
  caracteres ni que exista una vulnerabilidad de autorizacion demostrada.
- **Sugerencia de accesibilidad:** el error dinamico de dashboard sigue
  siendo un parrafo sin role alert/live region en
  [dashboard.component.html:18](src/app/dashboard/dashboard.component.html#L18).
  A diferencia del login, su anuncio automatico a lectores de pantalla no
  esta solicitado explicitamente. Es preexistente, no una regresion del diff.
- **Sugerencia de pruebas:** los componentes se prueban con instanciacion
  directa, dobles de Router/NgZone y CDR, no plantillas renderizadas:
  [login.component.spec.ts:25](src/app/login/login.component.spec.ts#L25) y
  [dashboard.component.spec.ts:20](src/app/dashboard/dashboard.component.spec.ts#L20).
  Automatizar las verificaciones de DOM, accesibilidad y navegacion real
  reforzaria la evidencia; la cobertura TypeScript no las sustituye.

Documentos usados: README, RETO, REGLAS, docs/GOOD_PRACTICES,
docs/ENDPOINTS, PLAN, esta matriz y resultados_test_pre/post.
Tambien se revisaron manifests, lockfile, configuracion Vitest/TypeScript,
workflows CI/CodeQL/dependency-review y codigo/pruebas nuevos.

## Ampliacion de pruebas de contrato - 2026-10-19

Se agregaron 53 pruebas sin modificar codigo de produccion ni dependencias.
La ejecucion `npm run test:coverage` de las 16:51:01 aprobo 152 pruebas en
8 archivos, codigo 0: 100% de lineas/sentencias/funciones y 99.27% de ramas
(minimo por archivo: dashboard, 96.42%). Type-check estricto de todos los
spec aprobado con codigo 0. Los conteos de 99 anteriores son historicos.

Incluye flujo integrado con servicios reales y fronteras simuladas, rechazo
401/403 de token emitido por login, backend inaccesible, errores de transporte,
respuesta malformada, almacenamiento/navegacion y configuracion del timeout
de login con reloj virtual. No prueba interrupcion real de red ni backends
reales. No se cambio el estado de ningun hallazgo.

La ausencia de deadline de tareas y el comparador sin retorno cero en empate
siguen como limitaciones/defectos documentados, no corregidos por estas pruebas.
H-01 sigue Pendiente. El primer intento de ampliar tests fallo por registro
anidado en beforeEach; se corrigio el harness sin rebajar las expectativas.
La matriz de escenarios, extractos de codigo, comandos, resultados y pendientes
de validacion estan en [docs/TESTING.md](docs/TESTING.md), que no sustituye
este registro de seguimiento.

## Ejecucion del plan aprobado, revision 2 - 2026-10-19

| Item de PLAN | Estado | Nota y evidencia |
|---|---|---|
| Auditoria global fallida (observacion bloqueante de review, sin ID) | Resuelto | Diff local: package.json/lock, angular.json y tests de contrato; migraciones autorizadas. Despues: 167 tests verdes, cobertura minima de ramas 94.73%, tipos/build/audit codigo 0; audit sin vulnerabilidades conocidas. |
| Cobertura y auditoria no conectadas a CI (observacion importante de review, sin ID) | Resuelto | Diff local: ci.yml, ci.spec.ts y descubrimiento en Vitest; npm ci, cobertura/build y audit independiente sin ignorar fallos. 6 casos CI y 175 totales verdes; ensayo de cobertura insuficiente y audit inaccesible dieron codigo 1. Run remoto pendiente. |

Primer item, verificacion previa realizada a las 17:06:56 desde la raiz de
este repositorio:

- `npm run test:coverage`: codigo 0, 165 tests en 8 archivos; 100% de
  lineas/sentencias/funciones y 99.28% de ramas globales. Gate por archivo
  de 85% intacto.
- Type-check de todos los specs con `tsc --noEmit --strict --target ES2022
  --module ES2022 --moduleResolution bundler --experimentalDecorators`:
  codigo 0.
- `npm run build`: codigo 0.
- `npm run audit:workshop -- --json` y `npm audit --json`: codigo 1;
  9 moderadas, 10 altas y 6 criticas. Las condiciones de explotacion no se
  deducen del conteo.

Diff propio de caracterizacion: seis casos nuevos en
[auth.service.spec.ts](src/app/services/auth.service.spec.ts), siete en
[tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) y adaptador
compartido en [axios-contract.ts](src/testing/axios-contract.ts), para evitar
duplicar la simulacion de transporte. Se usa Axios real para serializacion,
defaults y rechazo de HTTP 199/300/401/403/500 segun validateStatus. No son
pruebas de red ni backends reales. No hay cambio de produccion ni prueba
posterior a una correccion aun.

Bloqueo de alcance previsto por PLAN: el registro npm confirma Angular
framework 21.2.25 y CLI/build 21.2.27, pero Vitest 3.2.7 aun depende de
`@vitest/mocker` 3.2.7 y `tinypool` ^1.1.1 afectados; se necesita evaluar
la migracion mayor a Vitest/coverage 4.1.11. Ademas, build-angular arrastra
webpack-dev-server/http-proxy-middleware -> micromatch/chokidar -> braces
3.0.3; la ultima publicacion de braces sigue siendo 3.0.3, afectada por
GHSA-vfj7-8cjw-p6xm. Actualizar solo parches no demuestra un gate verde.

Alternativa a autorizar: reemplazar el wrapper build-angular por
`@angular/build` 21.2.27, que ya es su motor application, y cambiar los
builders application/dev-server en [angular.json](angular.json), conservando
opciones, budgets y contratos HTTP. Agregar caracterizacion de esa configuracion
antes de editarla y validar build/servidor despues. Incluye un reemplazo de
dependencia de herramienta, no una dependencia funcional nueva. No se usaran
overrides, exclusiones ni reducciones del gate para eliminar avisos.

No se inicio H-01 ni el item CI: el primer item todavia no tiene auditoria
en verde. Se solicita la aprobacion de estas migraciones antes de ampliar
archivos/versiones respecto de los parches compatibles.

**Actualizacion posterior al bloqueo:** el usuario autorizo ambas migraciones.
Se actualizaron los paquetes del framework a 21.2.25, CLI/build a 21.2.27,
Vitest/coverage a 4.1.11 y los dos builders de angular.json, sin alterar
opciones ni budgets. Se agregaron dos pruebas de configuracion antes de
cambiar builders (42 casos dirigidos verdes, 17:12:08).

Prueba posterior del primer item: `npm run test:coverage`, 17:15:44, codigo 0,
167 pruebas en 9 archivos; 100% lineas/sentencias/funciones, 99.08% ramas,
minimo por archivo 94.73%. Type-check estricto, build y audit codigo 0,
audit con cero vulnerabilidades conocidas. Servidor dev temporal respondio
200 y shell Angular en /login y /dashboard; se detuvo despues. No se invocaron
backends reales. No se tocaron gates, rutas ni codigo de aplicacion.

Desviaciones autorizadas/justificadas: reemplazo de build-angular y migracion
mayor de Vitest. Se declaro @types/node 22.20.5 solo para tipar los tests
Node tras un TS2307 real. Dos intentos de instalacion fallaron ERESOLVE;
se regenero el lockfile en directorio temporal y se instalo con npm ci,
sin force/legacy-peer-deps; temporales eliminados. Las diferencias de conteo
de ramas de Vitest 4 no se ocultaron ni motivaron rebajar el piso de 85%.
Los avisos npm sobre scripts de instalacion no se aprobaron globalmente.
La descripcion anterior del bloqueo es evidencia historica, no el estado actual.

### H-01: prueba y correccion despues del primer item

Autorizacion humana renovada expresamente: memoria solo para token/usuario,
recarga/cierre/nueva pestana requieren login, sin logout entre pestanas;
preferencias persistidas. La negativa anterior y sus tests son historicos.

Diff propio: [session.service.ts](src/app/services/session.service.ts),
su spec, specs de login/dashboard/flujo, README, ENDPOINTS y TESTING.
No se modificaron componentes de produccion ni contratos HTTP. Limpieza
inicial diferida a la primera operacion permite que los limites de error
existentes muestren fallos de almacenamiento sin romper la inyeccion Angular.
Save solo publica sesion tras guardar preferencias; clear vacia memoria
incluso si no puede eliminar ambas claves heredadas.

Antes, 17:17:56: 117 pruebas dirigidas verdes (codigo 0), incluida una nueva
caracterizacion de claves heredadas antes de crear servicio.
Luego, las expectativas aprobadas de memoria dieron 11 fallos entre 23 tests
de servicio sobre el codigo antiguo (codigo 1); no se adapto un bug para pasar.
Tras implementar, un fallo adicional detecto una expectativa residual de
usuario persistido; se sustituyo por usuario en memoria segun aprobacion.

Despues, 17:20:18: `npm run test:coverage`, codigo 0, 169 tests en 9 archivos,
100% lineas/sentencias/funciones y 99.08% ramas (minimo por archivo 94.73%;
SessionService 100% en las cuatro metricas). Tipos estrictos, build y audit
codigo 0, sin vulnerabilidades conocidas.

Navegador con HTTP interceptado: claves heredadas eliminadas sin leer JSON
corrupto, preferencias dark conservadas, login -> tarea visible con payload,
owner y Bearer originales, ninguna escritura persistida de token/usuario,
recarga -> login sin otro GET, nueva pestana -> login con cero GET y logout
con preferencias conservadas. El primer ensayo multipestana agoto el tiempo
de click al dejar la original en segundo plano; al traerla al frente paso.
Servidor temporal detenido. No son pruebas de backends ni autorizacion real.

H-01 queda Resuelto en su alcance de persistencia, no como garantia frente
a XSS activo o revocacion. Con esta fila actualizada y pruebas verdes,
puede iniciarse el tercer item del plan.

### Gates CI: prueba y correccion despues de H-01

Prueba previa, 17:25:44: seis casos de contrato junto al workflow,
cuatro verdes y dos fallos por gates ausentes, codigo 1. Se amplio solo
el include de specs para descubrirlos; ningun umbral fue modificado.
Despues se conectaron test:coverage/build y audit en jobs independientes,
con npm ci y Node 22.22.0, triggers/permisos y scanners intactos.

Verificacion posterior, 17:27:57: npm ci, 175 tests/10 archivos con cobertura,
type-check estricto (incluido spec CI), build y audit codigo 0. Cuatro
metricas sobre el 85% por archivo; SessionService al 100% y minimo de
ramas dashboard 94.73%. Audit sin vulnerabilidades conocidas.

Pruebas negativas controladas: fixture temporal al 50% en cuatro metricas
dio codigo 1 usando thresholds reales; audit con registro loopback
inaccesible dio codigo 1. No se sembraron vulnerabilidades ni se editaron
gates para pasar. Fixtures eliminados. Diagnostico del editor: ci.yml
sin errores; el spec usa contrato textual exacto, no parser/runner GitHub.

Limites de cierre: validacion independiente YAML y ejecucion remota no
disponibles, pendientes de coordinacion, al igual que checks requeridos de
proteccion de ramas. No se publicaron commits/PR. El lockfile y archivos
nuevos deben incluirse al publicar para que checkout contenga lo probado.
Local: Node 26.9.0/npm 11.19.1; no se atribuyen los resultados a Node 22
del workflow. Detalle de comandos y fallos en docs/TESTING.md.

## Análisis discovery — 2026-10-20

Proyecto: `workshop-login-frontend`. Alcance: login, sesión en cliente y solicitud de tareas protegida por Bearer.
No se identificaron candidatos adicionales en este alcance. El flujo revisado delega el login en `AuthService`, mantiene la sesión en memoria según el contrato descrito en el README, y consulta tareas a través de `TasksService`; las pruebas de servicio cubren la solicitud y los errores HTTP. Los cinco candidatos de este análisis corresponden a los dos servicios backend.
