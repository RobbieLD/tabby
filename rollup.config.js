import svelte from "rollup-plugin-svelte";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import sveltePreprocess from 'svelte-preprocess';
import livereload from 'rollup-plugin-livereload';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import path from 'node:path';
import { spawn } from 'node:child_process';

// if we're not watching then we're in production
const production = !process.env.ROLLUP_WATCH;

function serve() {
    let server;
  
    function toExit() {
      if (server && !server.killed) server.kill();
    }
  
    return {
      writeBundle() {
        if (server) return;
        const sirvCli = path.join(
          path.dirname(require.resolve('sirv-cli/package.json')),
          'bin.js'
        );
        server = spawn(
          process.execPath,
          [sirvCli, 'public', '--dev'],
          {
            stdio: ['ignore', 'inherit', 'inherit'],
            windowsHide: true,
          }
        );
        server.on('error', (error) => {
          console.error('The local preview server could not be started.', error);
        });
  
        process.once('SIGINT', toExit);
        process.once('SIGTERM', toExit);
        process.once('exit', toExit);
      },
    };
  }

export default {
    input: 'src/main.ts',
    output: {
        file: 'public/build/bundle.js',
        format: 'iife',
        name: 'app',
        sourcemap: !production,
    },
    plugins: [
        svelte({
            preprocess: sveltePreprocess(),
            include: 'src/**/*.svelte',
            compilerOptions: {
                dev: !production
            }
        }),
        css({ output: 'bundle.css' }),
        resolve({
            browser: true,
            dedupe: ["svelte"]
        }),
        commonjs(),
        typescript({
            sourceMap: !production,
            inlineSources: !production
        }),
        !production && serve(),
        !production && livereload('public'),
        production && terser()
    ],
}
