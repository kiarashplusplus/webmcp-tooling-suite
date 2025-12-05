import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      moduleResolution: 'bundler',
      paths: {
        '@25xcodes/llmfeed-validator': ['../validator/src/index.ts'],
      },
    },
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: [
    '@25xcodes/llmfeed-validator',
    'better-sqlite3',
    'nodemailer',
    'node-cron',
    'cron-parser',
  ],
})
