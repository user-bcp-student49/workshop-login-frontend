import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspace: unknown = JSON.parse(readFileSync(new URL('../../angular.json', import.meta.url), 'utf8'));

describe('Angular build contract', () => {
  it('preserves browser entry points, assets and production budgets', () => {
    expect(workspace).toMatchObject({
      projects: {
        'workshop-login-frontend': {
          architect: {
            build: {
              builder: expect.stringMatching(/^@angular(?:-devkit\/build-angular|\/build):application$/),
              options: {
                outputPath: 'dist/workshop-login-frontend',
                index: 'src/index.html',
                browser: 'src/main.ts',
                polyfills: ['zone.js'],
                tsConfig: 'tsconfig.app.json',
                assets: [{ glob: '**/*', input: 'public' }],
                styles: ['src/styles.css']
              },
              configurations: {
                production: {
                  budgets: [
                    { type: 'initial', maximumWarning: '500kB', maximumError: '1MB' },
                    { type: 'anyComponentStyle', maximumWarning: '4kB', maximumError: '8kB' }
                  ],
                  outputHashing: 'all'
                },
                development: { optimization: false, extractLicenses: false, sourceMap: true }
              },
              defaultConfiguration: 'production'
            }
          }
        }
      }
    });
  });

  it('preserves dev-server targets and development default', () => {
    expect(workspace).toMatchObject({
      projects: {
        'workshop-login-frontend': {
          architect: {
            serve: {
              builder: expect.stringMatching(/^@angular(?:-devkit\/build-angular|\/build):dev-server$/),
              configurations: {
                production: { buildTarget: 'workshop-login-frontend:build:production' },
                development: { buildTarget: 'workshop-login-frontend:build:development' }
              },
              defaultConfiguration: 'development'
            }
          }
        }
      }
    });
  });
});
