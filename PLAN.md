# Plan de correccion de los tres items priorizados

Fecha: 19/10/2026. Ambito exclusivo: este repositorio frontend.

**Aprobador:** Daniel Berrospi
**Fecha aprobación:** 19/10/2026
**Revisión:** #2

## Seleccion y aprobacion

Seleccion confirmada por el usuario: auditoria global fallida, H-01 y gates
en CI, en ese orden de prioridad. La matriz contiene solo un item formal
Pendiente, H-01; los otros dos proceden de las observaciones de review de
[HALLAZGOS.md](HALLAZGOS.md#L209), no tienen IDs y no se les inventan IDs
ni severidades. Se usa la clasificacion registrada: bloqueante, alta e
importante. No se reabren H-02 a H-08.

Este plan reemplaza el plan de la implementacion anterior. **Su aprobacion
anterior no se transfiere a esta propuesta.** La seleccion de items no es
autorizacion para implementarlos. En particular, la sesion en memoria fue
rechazada y sigue sin autorizacion; H-01 requiere una nueva decision humana.
Los estados y resultados permanecen exclusivamente en HALLAZGOS.

No se cambia codigo, dependencias, workflow ni contratos en esta etapa.
No se ejecutaron tests o auditorias nuevas para redactar el plan.

## Item: Auditoria global fallida - bloqueante de review

### Identificacion y alcance propio

Observacion de [HALLAZGOS.md:211](HALLAZGOS.md#L211): auditoria global con
codigo 1 y 25 alertas (9 moderadas, 10 altas y 6 criticas) en la ultima
verificacion registrada. Corresponde a dependencias Angular y herramientas/
transitivas, no al par Axios/Lodash ya corregido en H-02.

**Alcance:** remediar dependencias señaladas por la auditoria, con cambios
compatibles y verificables. No incluye conectar gates a CI, cambiar sesion,
modificar endpoints, ajustar timeout o corregir el comparador de tareas.

### Cambio propuesto

1. Repetir `npm run audit:workshop` y contrastar el arbol resuelto del lockfile
   con los avisos actuales: version afectada, dependencia directa/transitiva,
   version corregida y condiciones de aplicabilidad. Un aviso no prueba
   explotabilidad del frontend; un fallo de consulta no demuestra limpieza.
2. Proponer versiones corregidas verificadas, no elegir versiones por
   suposicion. Mantener alineados los paquetes de framework Angular; evaluar
   por separado CLI/build y el par Vitest/proveedor de cobertura. Preferir
   actualizaciones compatibles del paquete padre para transitivas.
3. Cambiar manifiesto y regenerar el lockfile mediante npm, conservando
   modificaciones ajenas. Si la correccion exige una migracion mayor o
   herramientas nuevas, detener ese incremento y solicitar aprobacion de
   su alcance y justificacion, sin usar overrides forzados como atajo.
4. No usar `npm audit fix --force`, exclusiones silenciosas o rebajas del nivel
   `moderate`. Mantener Axios sin cambiar transporte y comprobar que no
   reaparece Lodash directo.
5. Registrar salida, versiones y riesgos restantes en HALLAZGOS. Solo declarar
   aprobado el gate con resultado real satisfactorio; documentar los avisos
   sin correccion disponible sin convertirlos en aprobacion.

### Archivos a tocar

- [package.json](package.json) y [package-lock.json](package-lock.json).
- [docs/TESTING.md](docs/TESTING.md) y [README.md](README.md) solo si cambian
  requisitos o comandos de las herramientas actualizadas.
- [HALLAZGOS.md](HALLAZGOS.md) para evidencia y estado de esta observacion.
- No cambiar codigo fuente ni configuracion de build/tests por anticipado.
  Si una incompatibilidad exige esos cambios, identificar archivos concretos
  y aprobar una ampliacion antes de editarlos.

### Prueba que escribir antes de modificar dependencias

Agregar a [auth.service.spec.ts](src/app/services/auth.service.spec.ts) y
[tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) un ensayo con
Axios real y un adaptador de prueba controlado, sin depender de backends,
que capture serializacion JSON del login, client, timeout 5000, headers,
owner y Bearer, y el rechazo de estados fuera de 2xx. El adaptador debe
aplicar la semantica de resolucion/rechazo de Axios, no resolver un 401
artificialmente como exito.

Ejecutarlo antes y despues de actualizar paquetes, junto con el flujo existente
[login-flow.spec.ts](src/app/login-flow.spec.ts), cobertura por archivo >=85%,
type-check estricto y build. Estos ensayos prueban compatibilidad de transporte/
UI, no reemplazan la auditoria ni prueban CORS o autorizacion reales.

### Contrato y cierre

Sin cambios a metodos, URLs, payload, headers, query, respuesta consumida,
persistencia o reaccion de UI en [ENDPOINTS.md](docs/ENDPOINTS.md).
No cerrar el item si solo pasan tests/build mientras audit sigue con codigo 1.

## Item: H-01 - Token persistido en localStorage

### Identificacion y alcance propio

[H-01](HALLAZGOS.md#L21), severidad alta y estado Pendiente.
[SessionService](src/app/services/session.service.ts#L15) lee el token
persistido y [save](src/app/services/session.service.ts#L24) lo escribe.
Es accesible a JavaScript del mismo origen y persiste entre recargas.

**Alcance:** alternativa acotada a la persistencia de token y usuario,
centralizada en el servicio de sesion. No incluye dependencias, CI, refresh,
revocacion remota, validacion JWT, reglas de 401/403 ni cambios en backends.

### Cambio propuesto y decision obligatoria

La alternativa propuesta es token y usuario solo en memoria de una instancia
de SessionService provista en raiz, con preferencias no sensibles conservadas
en localStorage. **No se implementara mientras siga vigente el rechazo
humano anterior.**

Antes de autorizar, presentar los efectos y obtener aceptacion explicita:

- Recargar, cerrar la pagina o abrir otra pestana requiere autenticarse otra vez.
- La navegacion interna conserva sesion durante la vida de la aplicacion.
- Logout de una pestana no borra la sesion en memoria de otra.
- Reduce persistencia del secreto, pero no evita su acceso por un script
  malicioso ejecutado dentro de la pagina activa.

Si se aprueba, eliminar las claves heredadas de token/usuario al inicializar
la nueva politica, sin importarlas a memoria; notificar fallos de limpieza.
Guardar preferencias antes de publicar una sesion completa; si falla, no
aparentar exito. Logout limpia memoria y restos heredados y conserva
preferencias. No pasar a sessionStorage como supuesta solucion de XSS,
ni introducir cookies HttpOnly sin contrato/coordinacion externa.

Si no se aprueba, **no cambiar la politica actual** y mantener H-01 Pendiente
con el riesgo registrado; no marcarlo Resuelto por centralizar almacenamiento.

### Archivos a tocar, solo tras aprobacion

- [session.service.ts](src/app/services/session.service.ts) y
  [session.service.spec.ts](src/app/services/session.service.spec.ts).
- [login.component.spec.ts](src/app/login/login.component.spec.ts),
  [dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts)
  y [login-flow.spec.ts](src/app/login-flow.spec.ts), para el ciclo de vida.
- Componentes de login/dashboard solo si cambia su contrato interno de sesion;
  no mover HTTP o almacenamiento de vuelta a componentes.
- [README.md](README.md), [docs/ENDPOINTS.md](docs/ENDPOINTS.md),
  [docs/TESTING.md](docs/TESTING.md) y [HALLAZGOS.md](HALLAZGOS.md).

### Prueba que escribir antes de modificar sesion

Primero fijar el comportamiento actual en una caracterizacion: login guarda
las claves, una instancia nueva puede leer la sesion, logout elimina
token/usuario y conserva preferencias, y no hay GET sin token.
Reutilizar las pruebas existentes y agregar el caso de claves heredadas antes
de inicializar el servicio.

Solo tras aprobacion, escribir pruebas del nuevo criterio: instancia nueva
sin sesion, navegacion interna con la misma instancia conserva token,
ninguna escritura de token/usuario en almacenamiento, claves heredadas
eliminadas sin restauracion, logout y fallos de preferencias/limpieza
explicitamente notificados. Verificar el GET con el mismo Bearer de login.

Agregar un ensayo de navegador de recarga/nueva pestana, distinguiendo la
perdida deliberada de sesion de una regresion. Sustituir expectativas de
persistencia solo con referencia a la aprobacion, no ocultar tests fallidos.
Cobertura >=85% por archivo en las cuatro metricas.

### Contrato y cierre

H-01 pide corregir almacenamiento: permite proponer el cambio de persistencia
descrito, pero **requiere aprobacion explicita** antes de alterar el
comportamiento documentado de recarga/pestanas. Actualizar esa descripcion
en ENDPOINTS solo tras aprobarlo. Los contratos HTTP permanecen intactos:
mismos endpoints, payload, owner y Bearer; sin refresh/revocacion nuevos.

## Item: Cobertura y auditoria no conectadas a CI - importante de review

### Identificacion y alcance propio

Observacion de [HALLAZGOS.md:216](HALLAZGOS.md#L216).
[ci.yml:20](.github/workflows/ci.yml#L20) ejecuta `npm test` y build, pero
no `test:coverage` ni `audit:workshop`. Por tanto, el workflow no aplica
el piso por archivo de [vitest.config.ts](vitest.config.ts#L17) ni el gate
de auditoria existente.

**Alcance:** conectar comandos y resultado a CI; no actualizar dependencias
para obtener verde, cambiar sesion ni corregir otros defectos. El workflow
debe informar el estado real incluso si otro item sigue sin resolver.

### Cambio propuesto

1. Ejecutar `npm run test:coverage` en CI en lugar del paso `npm test`;
   el primero ya corre la suite completa y evita duplicar ejecuciones.
   Conservar el build y el piso de 85% por archivo en cuatro metricas.
2. Agregar auditoria con `npm run audit:workshop`, sin `continue-on-error`,
   `|| true`, bajadas de severidad o exclusiones de dependencias.
   Disponerla en un job separado para que su fallo no impida obtener el
   resultado de tests/build; ambos resultados deben quedar visibles.
3. Mantener triggers y permisos existentes. Conservar CodeQL y
   dependency-review sin debilitarlos. Publicar reportes de cobertura con
   una accion de artefactos solo si se justifica, usando `if: always()` para
   conservar evidencia sin convertir un job fallido en exitoso.
4. Usar `npm ci` con el lockfile revisado e incluido en Git para instalacion
   reproducible. No regenerar dependencias dentro del workflow.
5. No asumir reglas de proteccion o checks requeridos en GitHub: coordinar
   esa configuracion con el responsable sin atribuirla a este archivo.

### Archivos a tocar

- [.github/workflows/ci.yml](.github/workflows/ci.yml).
- [README.md](README.md) y [docs/TESTING.md](docs/TESTING.md) para documentar
  comandos y fallos bloqueantes de CI.
- [HALLAZGOS.md](HALLAZGOS.md) para registrar verificaciones reales.
- [package-lock.json](package-lock.json): revisar su inclusion si sigue sin
  seguimiento; no alterar versiones como parte de este item.
- No modificar thresholds ni nivel de auditoria; no cambiar workflows de
  scanners por una limpieza ajena al objetivo.

### Prueba que escribir antes de modificar el workflow

Agregar una comprobacion de contrato del workflow que exija el comando de
cobertura y el de auditoria, ausencia de excepciones que silencien errores
y conservacion de triggers/checks existentes. Puede usar las herramientas
existentes de test para inspeccion estructural; no afirmar que un chequeo
de strings demuestra la semantica YAML o la ejecucion GitHub completa.
Definir el archivo de prueba junto al workflow y confirmar primero su
descubrimiento por el runner actual, sin ampliar dependencias por defecto.

Antes de editar, ejecutar los comandos actuales y los propuestos localmente
con el lockfile existente, guardando codigos: cobertura/build deben aprobar
o explicar fallos; auditoria puede fallar y ese fallo debe quedar registrado.
Despues validar YAML y ejecutar el workflow mediante una herramienta ya
disponible o una ejecucion de CI autorizada; si no esta disponible, marcar
esa validacion pendiente, no inventar un run.

En una rama de ensayo y con autorizacion, provocar cobertura inferior al piso
y auditoria fallida para verificar que los jobs fallan y reportan evidencia.
No introducir vulnerabilidades ni modificar produccion para el ensayo:
usar resultados controlados en un entorno de validacion del workflow.

### Contrato y cierre

Sin cambios al contrato HTTP ni al flujo de usuario. El item se corrige cuando
ambos gates se ejecutan y sus fallos no son ignorados; no requiere fingir que
la auditoria pasa. La remediacion de dependencias corresponde exclusivamente
al primer item. Marcar pendiente cualquier validacion remota no realizada.

## Reglas comunes y documentos consultados

- Cambios incrementales revisables, tipado estricto, errores explicitos,
  configuracion centralizada, componentes sin HTTP/almacenamiento y sin
  duplicacion, segun [docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md).
- No introducir secretos reales ni dependencias nuevas sin justificacion.
  Mantener tests y cobertura >=85%; no aprobar resultados no ejecutados.
- Consultados: [docs/ENDPOINTS.md](docs/ENDPOINTS.md),
  [docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md), [HALLAZGOS.md](HALLAZGOS.md),
  plan anterior, [package.json](package.json),
  [.github/workflows/ci.yml](.github/workflows/ci.yml) y
  [session.service.ts](src/app/services/session.service.ts).
- Esta etapa modifica unicamente PLAN.md; no cambia el backlog ni asigna
  aprobacion humana a la propuesta.
