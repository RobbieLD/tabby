import UnsplashService from '$lib/services/unsplash.service';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type UnsplashResponse from '$lib/models/unsplash-response';

const setCache = (response: UnsplashResponse) => {
    window.localStorage.setItem('url', response.url);
    window.localStorage.setItem('description', response.description);
    window.localStorage.setItem('hour', new Date().getHours().toString());
}

const createBackground = async () => {
    let response: UnsplashResponse = {
        description: 'Loading ...',
        url: ''
    }

    if (browser) {
        let key = window.localStorage.getItem('unsplash');
        const hour = window.localStorage.getItem('hour');

        if (!key) {
            key = prompt('Enter Unsplash Key');
            if (!key) throw new Error('An unsplash key needs to be provided');
            window.localStorage.setItem('unsplash', key);
        }

        // Try the cache
        const cachedUrl = window.localStorage.getItem('url') || '';
        const cacheDescription = window.localStorage.getItem('description') || '';

        // Nothing in cache or it's old
        if (!cachedUrl || !cacheDescription || new Date().getHours().toString() !== hour) {
            const service = new UnsplashService(key);
            response = await service.get();
            setCache(response)
        } else {
            response = {
                description: cacheDescription,
                url: cachedUrl
            }
        }        
    }

	const { subscribe, update } = writable(response);

	return {
		subscribe,
        refresh: async () => {
            if (browser) {
                const key = window.localStorage.getItem('unsplash') || '';
                const service = new UnsplashService(key);
                const response = await service.get();
                setCache(response);
                return update(() => response);
            }
        }
	};
}

export const background = await createBackground();
