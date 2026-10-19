import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', '.github/workflows/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app/login/*.ts',
        'src/app/dashboard/*.ts',
        'src/app/models/*.ts',
        'src/app/services/*.ts',
        'src/app/utils/*.ts',
        'src/environments/*.ts'
      ],
      thresholds: {
        perFile: true,
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 85
      },
      reporter: ['text', 'json-summary', 'html']
    }
  }
});
