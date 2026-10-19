# Workshop Login Frontend — Angular

> **Laboratorio intencionalmente vulnerable.** Ejecutar únicamente en equipos de capacitación, repositorios privados y puertos locales. No publicar en Internet ni desplegar en CERT/PROD.

Aplicación web Angular para autenticar a un estudiante mediante el backend Quarkus y consultar tareas desde la API Python.

## Rama del laboratorio

La rama `main` contiene deuda técnica deliberada para practicar:

- refactorización asistida por prompts y agentes;
- clean code y reducción de complejidad;
- análisis de dependencias con CVEs;
- revisión de seguridad del frontend;
- pruebas unitarias y cobertura.

## Ejecución

Requisitos: Node.js 22.12 o superior y npm.

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

Credenciales de laboratorio:

- `student` / `Workshop123!`
- `trainer` / `Trainer123!`

## Servicios esperados

- Backend de autenticación: `http://localhost:8080`
- API de tareas: `http://localhost:8000`

## Estado del refactor

Consulta [HALLAZGOS.md](HALLAZGOS.md) para el seguimiento y los resultados reales,
y [docs/ENDPOINTS.md](docs/ENDPOINTS.md) para el flujo HTTP preservado.
Los componentes delegan HTTP y almacenamiento en servicios; las URLs se
centralizan por ambiente y los mensajes se presentan como texto.

La sesion vive solo en memoria por autorizacion expresa de PLAN revision 2:
recargar, cerrar la pagina o abrir otra pestana requiere login. La navegacion
interna conserva sesion. SessionService elimina las claves heredadas de
token/usuario al primer uso, sin restaurarlas; si falla, notifica el error.
Solo las preferencias no sensibles persisten en `localStorage`.
Logout borra memoria y restos heredados, no preferencias ni sesiones de otras
pestanas. No revoca tokens en backend. La memoria reduce persistencia, pero
no impide acceso por JavaScript malicioso ejecutandose en la pagina activa.

```bash
npm test
npm run test:coverage
npm run build
npm run audit:workshop
```

La cobertura exige al menos 85% por archivo modificado en lineas, sentencias,
funciones y ramas. Las pruebas unitarias simulan HTTP y almacenamiento;
no sustituyen la verificacion con los backends reales.
La ultima auditoria ejecutada el 19/10/2026 termino con codigo 0 y cero
vulnerabilidades conocidas. No debe omitirse como quality gate: ese resultado
describe el registro consultado en ese momento, no garantiza ausencia de fallos.

Las herramientas usan `@angular/build` 21.2.27 para application/dev-server
(sin el wrapper webpack de build-angular), Angular 21.2.25 y Vitest/cobertura
4.1.11. `@types/node` 22.20.5 es una dependencia solo de desarrollo necesaria
para comprobar con TypeScript los tests de configuracion que usan `node:fs`;
no se incluye en el bundle del navegador. El lockfile permite `npm ci`.

## Gates de CI

[ci.yml](.github/workflows/ci.yml) usa Node 22.22.0 y `npm ci`.
El job build-test ejecuta `npm run test:coverage` y build; un job audit
independiente ejecuta `npm run audit:workshop`. No ignoran errores ni
disminuyen umbrales. CodeQL y dependency-review conservan su configuracion.
Incluir el lockfile y los archivos nuevos al preparar el commit/PR; no basta
con subir solo los archivos ya rastreados.

[ci.spec.ts](.github/workflows/ci.spec.ts) comprueba el contrato textual
exacto de esos workflows; Vitest descubre tambien los specs de esa carpeta.
No reemplaza una ejecucion de GitHub Actions ni configura checks requeridos
en proteccion de ramas. La verificacion local final fue de 175 tests verdes;
la ejecucion remota y proteccion de ramas siguen pendientes de coordinacion.
