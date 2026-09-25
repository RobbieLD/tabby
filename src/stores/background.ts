import UnsplashService from "../services/unsplash.service";
import { writable } from "svelte/store";
import type UnsplashResponse from "../models/unsplash-response";

const setCache = (response: UnsplashResponse) => {
    window.localStorage.setItem("url", response.url);
    window.localStorage.setItem("description", response.description);
    window.localStorage.setItem("hour", new Date().getHours().toString());
};

const NO_BACKGROUND: UnsplashResponse = {
    description: "Add an Unsplash access key in settings to enable backgrounds.",
    url: "",
};

const createBackground = () => {
    const { subscribe, update, set } = writable({
        ...NO_BACKGROUND,
        error: "",
    });

    const load = async (key: string): Promise<UnsplashResponse> => {
        try {
            const service = new UnsplashService(key);
            const response = await service.get();
            setCache(response);
            set({ ...response, error: "" });
            return response;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "The Unsplash background could not be loaded.";
            update((current) => ({ ...current, error: message }));
            throw error;
        }
    };

    return {
        subscribe,
        refresh: async () => {
            const key = window.localStorage.getItem("unsplash") || "";
            if (!key) {
                const error = new Error("Add an Unsplash access key in settings first.");
                update((current) => ({ ...current, error: error.message }));
                throw error;
            }

            return load(key);
        },
        configure: async (value: string) => {
            const key = value.trim();
            if (key) {
                window.localStorage.setItem("unsplash", key);
                return load(key);
            }

            window.localStorage.removeItem("unsplash");
            set({ ...NO_BACKGROUND, error: "" });
        },
        init: async () => {
            const key = window.localStorage.getItem("unsplash");
            const hour = window.localStorage.getItem("hour");
            if (!key) {
                set({ ...NO_BACKGROUND, error: "" });
                return;
            }

            const cachedUrl = window.localStorage.getItem("url") || "";
            const cacheDescription = window.localStorage.getItem("description") || "";
            if (
                !cachedUrl ||
                !cacheDescription ||
                new Date().getHours().toString() !== hour
            ) {
                await load(key);
                return;
            }

            set({
                description: cacheDescription,
                url: cachedUrl,
                error: "",
            });
        },
    };
};

export const background = createBackground();
