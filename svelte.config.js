import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // https://rodneylab.com/sveltekit-content-security-policy/
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({ precompress: true }),
        csp: {

            mode: "auto",
            directives: { "script-src": ["self"] },
     
        },
        appDir: 'ext',
	}
};

export default config;
