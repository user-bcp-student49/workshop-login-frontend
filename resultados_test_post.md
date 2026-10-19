# Resultados de pruebas despues de la implementacion

## Alcance y evidencia

Repositorio: `workshop-login-frontend`.
Fecha: 19/10/2026. Horas locales de la ejecucion (UTC-05:00).

Este informe resume ejecuciones reales registradas tras implementar el plan.
No se ejecutaron pruebas nuevas para redactar este documento.
El seguimiento y estado de hallazgos permanece exclusivamente en
[HALLAZGOS.md](HALLAZGOS.md).

## 1. Ultima ejecucion completa solicitada

```text
Comando: npm test
Runner: Vitest 3.2.4
Inicio: 15:53:51
Duracion: 1,22 s
Archivos: 7 aprobados
Tests: 99 aprobados
Fallos: 0
Codigo de salida: 0
```

| Archivo | Tests aprobados |
|---|---:|
| [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) | 21 |
| [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) | 20 |
| [src/app/services/auth.service.spec.ts](src/app/services/auth.service.spec.ts) | 12 |
| [src/app/services/tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) | 12 |
| [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts) | 22 |
| [src/app/utils/http-error.spec.ts](src/app/utils/http-error.spec.ts) | 8 |
| [src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | 4 |
| **Total** | **99** |

Se cubren contratos HTTP, coordinacion de componentes, sesion persistida,
preferencias, validacion de respuestas, errores seguros, navegacion cancelada,
rollback de escrituras incompletas, logout y reglas de presentacion de tareas.

La herramienta de tests integrada no descubrio las pruebas; la ejecucion
efectiva anterior fue el script npm del repositorio. No se interpreto el fallo
de descubrimiento como ausencia de tests ni como una ejecucion aprobada.

## 2. Ejecucion con cobertura

La cobertura corresponde a una ejecucion separada, no al ultimo `npm test`:

```text
Comando: npm run test:coverage
Inicio: 15:47:00
Duracion: 1,59 s
Tests: 99 aprobados en 7 archivos
Codigo de salida: 0
```

| Modulo de produccion | Lineas | Sentencias | Funciones | Ramas |
|---|---:|---:|---:|---:|
| [login.component.ts](src/app/login/login.component.ts) | 100% | 100% | 100% | 100% |
| [dashboard.component.ts](src/app/dashboard/dashboard.component.ts) | 100% | 100% | 100% | 96,15% |
| [models/auth.ts](src/app/models/auth.ts) | 100% | 100% | 100% | 100% |
| [models/task.ts](src/app/models/task.ts) | 100% | 100% | 100% | 100% |
| [auth.service.ts](src/app/services/auth.service.ts) | 100% | 100% | 100% | 100% |
| [tasks.service.ts](src/app/services/tasks.service.ts) | 100% | 100% | 100% | 100% |
| [session.service.ts](src/app/services/session.service.ts) | 100% | 100% | 100% | 100% |
| [http-error.ts](src/app/utils/http-error.ts) | 100% | 100% | 100% | 100% |
| [legacy-format.ts](src/app/utils/legacy-format.ts) | 100% | 100% | 100% | 100% |
| [environment.ts](src/environments/environment.ts) | 100% | 100% | 100% | 100% |
| **Total instrumentado** | **100%** | **100%** | **100%** | **99,25%** |

El resumen contiene 313/313 lineas y sentencias, 20/20 funciones y 134/135
ramas cubiertas. El umbral de 85% se aplica por archivo en las cuatro metricas
mediante [vitest.config.ts](vitest.config.ts). Todos los modulos modificados
instrumentados superan el umbral; no es una medicion de todo el repositorio
ni de las plantillas HTML.

La primera medicion tras extraer servicios fallo con 75% de ramas en el
dashboard. Se agregaron pruebas de caminos restantes, sin bajar el gate.
Los reportes se generaron en `coverage/`, directorio ignorado por Git.

## 3. Validaciones complementarias

### Compilacion y tipos

- `npm run build`: aprobado, codigo 0, con `strict` y `strictTemplates`
  habilitados. Compilacion final completada a las 15:47:06.
- Comprobacion de todos los archivos de pruebas con TypeScript existente:
  aprobada con codigo 0 y opciones `--noEmit --strict --target ES2022
  --module ES2022 --moduleResolution bundler --experimentalDecorators`.

### Navegador con respuestas HTTP simuladas

Se uso el navegador integrado y un servidor temporal en `localhost:4300`,
sin agregar runner ni dependencias de DOM:

- POST de login sin autorizacion, campos y valores esperados.
- GET de tareas con propietario y cabecera Bearer exactos.
- Login -> dashboard -> recarga con sesion -> logout -> login.
- Exclusión de archivadas, estado vacio y error que termina la carga.
- Sin token no se consulta la API.
- Mensaje publico generico sin detalles del backend; boton de login
  habilitado al terminar el error.
- Texto `<em>detalle</em>` presentado literalmente, con cero elementos `em`.

El servidor temporal fue detenido y se retiraron las interceptaciones.
Estos chequeos de navegador fueron complementarios; no son parte de los
99 tests de Vitest ni prueban la integracion con backends reales.

### Auditoria: gate no aprobado

`npm run audit:workshop` mantuvo `--audit-level=moderate` y termino con
**codigo 1** despues del cambio:

| Severidad | Alertas |
|---|---:|
| Moderada | 9 |
| Alta | 10 |
| Critica | 6 |
| **Total** | **25** |

La auditoria inicial reportaba 27. La posterior no enumera Axios ni Lodash
tras actualizar Axios a 1.20.0 y retirar Lodash directo, pero conserva
alertas de Angular y herramientas/transitivas documentadas en
[HALLAZGOS.md](HALLAZGOS.md). Pasar los tests no significa que este gate de
seguridad este aprobado.

## 4. Comparacion y limites

| Indicador | Suite original | Caracterizacion previa al refactor | Posterior |
|---|---:|---:|---:|
| Archivos de pruebas aprobados | 1 | 3 | 7 |
| Tests aprobados | 1 | 40 | 99 |
| Tests fallidos en esas ejecuciones | 0 | 0 | 0 |
| Cobertura medida | No | No | Si, >=85% por archivo instrumentado |

La base esta detallada en [resultados_test_pre.md](resultados_test_pre.md).
No puede calcularse una mejora porcentual de cobertura porque no se midio
antes. Las duraciones corresponden a corridas diferentes y no constituyen
un benchmark de rendimiento.

H-01 permanece pendiente por rechazo humano de la alternativa en memoria:
las pruebas confirman la persistencia actual, no eliminan el riesgo del token
en `localStorage`. No se verificaron backends reales y la auditoria global
continua fallando; no se declara el sistema listo para produccion.
