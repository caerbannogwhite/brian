import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Library build configuration
  if (mode === 'lib' || process.env.npm_config_argv?.includes('build:lib')) {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'Brian',
          fileName: (format) => `index.${format === 'es' ? 'es.js' : 'js'}`,
          formats: ['es', 'cjs']
        },
        rollupOptions: {
          // Make sure to externalize deps that shouldn't be bundled
          external: [],
          output: {
            globals: {}
          }
        },
        outDir: 'dist',
        sourcemap: true,
        target: 'esnext',
        emptyOutDir: true
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, './src')
        }
      }
    };
  }

  // Development/app build configuration
  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    }
  };
}); 