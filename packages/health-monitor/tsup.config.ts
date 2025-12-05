import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
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
