import { defineConfig } from '@rsbuild/core'

export default defineConfig({
  environments: {
    webworker: {
      source: {
        entry: {
          background: './src/background/index.ts',
          content: './src/content/index.ts',
        },
      },
      output: {
        target: 'web-worker',
        distPath: {
          js: '',
        },
        filenameHash: false,
        copy: [
          {
            from: './public',
          },
          {
            from: './src/content/**/*.css',
            to: '[name].css',
          },
        ],
      },
    },
  },
})
