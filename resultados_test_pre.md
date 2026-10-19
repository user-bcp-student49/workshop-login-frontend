# Resultados de pruebas antes de la implementacion

## Alcance y evidencia

Repositorio: `workshop-login-frontend`.
Fecha: 19/10/2026. Horas locales de la ejecucion (UTC-05:00).

Este informe resume salidas reales de Vitest registradas durante el trabajo.
No se reconstruyo ni se volvio a ejecutar una version anterior del codigo.
El seguimiento de hallazgos permanece en [HALLAZGOS.md](HALLAZGOS.md).

## 1. Suite original del repositorio

Ejecucion anterior a la implementacion y a la ampliacion de pruebas:

```text
Comando: npm test
Runner: Vitest 3.2.4
Inicio: 15:23:11
Duracion: 592 ms
Archivos: 1 aprobado
Tests: 1 aprobado
Fallos: 0
Codigo de salida: 0
```

| Archivo | Tests aprobados |
|---|---:|
| [src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | 1 |
| **Total** | **1** |

La unica prueba comprobaba el formato nominal de prioridad y propietario.
No habia pruebas de login, dashboard, almacenamiento o contratos HTTP.
No se ejecuto cobertura en esta etapa: no existe un porcentaje previo medido.

## 2. Caracterizacion previa al refactor

Se agregaron pruebas sobre los componentes originales y la utilidad antes de
la refactorizacion amplia. Resultado real:

```text
Comando: npm test
Runner: Vitest 3.2.4
Inicio: 15:38:01
Duracion: 1,08 s
Archivos: 3 aprobados
Tests: 40 aprobados
Fallos: 0
Codigo de salida: 0
```

| Archivo | Tests aprobados en esa ejecucion |
|---|---:|
| [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) | 20 |
| [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) | 16 |
| [src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | 4 |
| **Total** | **40** |

Los enlaces apuntan a los archivos actuales: sus pruebas se adaptaron despues
al codigo refactorizado. Los conteos anteriores corresponden a esa ejecucion,
no a su contenido final.

Se caracterizaron:

- Validacion de usuario/contrasena y prioridad del mensaje de usuario.
- POST de login, payload sin recortar, client y timeout de 5000 ms.
- Persistencia con las claves originales y navegacion posterior.
- Respuesta sin token, errores de red/backend y restablecimiento de `busy`.
- Preferencias por defecto, merge original, JSON invalido y fallos de escritura.
- Redireccion sin token y comportamiento original ante usuario corrupto.
- GET de tareas con propietario y autorizacion Bearer.
- Filtrado exacto de `ARCHIVED`, orden observado, etiquetas y estados.
- Lista vacia, errores y logout que conserva preferencias.

HTTP, almacenamiento y dependencias Angular se simularon en las pruebas.
Estos resultados no acreditan integracion con los backends reales.

## 3. Expectativa de correccion antes de H-03

Despues de caracterizar y antes de corregir los mensajes, se exigio que el
error publico no contuviera HTML ni detalles del backend:

```text
Comando: npm test -- src\app\login\login.component.spec.ts
Inicio: 15:39:47
Duracion: 871 ms
Tests: 17 aprobados, 3 fallidos
Codigo de salida: 1
```

Los tres fallos mostraron que la cadena aun contenia `<strong>`; el caso del
backend tambien contenia `<em>detalle</em>`. Fue una expectativa nueva que
demostro el defecto antes de corregirlo, no un fallo de la suite original.
Tras el cambio acotado, a las 15:39:58 volvieron a pasar los 40 tests.

## Limitaciones

- No se midio cobertura antes del cambio; no se puede cuantificar un aumento
  porcentual de cobertura respecto de esta base.
- No se ejecutaron estos resultados contra servicios reales.
- Las pruebas de caracterizacion no implican que los defectos observados
  deban conservarse: los cambios deliberados se documentaron al implementar.

La comparacion posterior esta en
[resultados_test_post.md](resultados_test_post.md).
