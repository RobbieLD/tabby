import svelte from "rollup-plugin-svelte";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import sveltePreprocess from 'svelte-preprocess';
import livereload from 'rollup-plugin-livereload';
import { terser } from "rollup-plugin-terser";
import css from 'rollup-plugin-css-only';

// if we're not watching then we're in production
const production = !process.env.ROLLUP_WATCH;

function serve() {
    // Keep a reference to a spawned server process
    let server;
  
    function toExit() {
      // Kill the server if it exists
      if (server) server.kill(0);
    }
  
    return {
      writeBundle() {
        if (server) return;
        // Spawn a child server process
        server = require('child_process').spawn(
          'npm',
          ['run', 'start', '--', '--dev'],
          {
            stdio: ['ignore', 'inherit', 'inherit'],
            shell: true,
          }
        );
  
        // Kill the server on process termination or exit
        process.on('SIGTERM', toExit);
        process.on('exit', toExit);
      },
    };
  }

export default {
    input: 'src/main.ts',
    output: {
        file: 'public/build/bundle.js',
        format: 'iife',
        name: 'app',
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
