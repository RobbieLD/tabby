import UnsplashService from "../services/unsplash.service";
import { writable } from "svelte/store";
import type UnsplashResponse from "../models/unsplash-response";
import { hasAuthenticationInfoAccess } from "../services/extension-permissions";

const setCache = (response: UnsplashResponse) => {
    window.localStorage.setItem("url", response.url);
    window.localStorage.setItem("description", response.description);
    window.localStorage.setItem("photographer", response.photographerName);
    window.localStorage.setItem("photographerUrl", response.photographerUrl);
    window.localStorage.setItem("hour", new Date().getHours().toString());
};

const NO_BACKGROUND: UnsplashResponse = {
    description: "Add an Unsplash access key in settings to enable backgrounds.",
    url: "",
    photographerName: "",
    photographerUrl: "",
};

const createBackground = () => {
    const { subscribe, update, set } = writable({
        ...NO_BACKGROUND,
        error: "",
    });
    let localPreviewKey = "";

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
            const key = window.localStorage.getItem("unsplash") || localPreviewKey;
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
                localPreviewKey = "";
                window.localStorage.setItem("unsplash", key);
                return load(key);
            }

            localPreviewKey = "";
            window.localStorage.removeItem("unsplash");
            window.localStorage.removeItem("url");
            window.localStorage.removeItem("description");
            window.localStorage.removeItem("photographer");
            window.localStorage.removeItem("photographerUrl");
            window.localStorage.removeItem("hour");
            set({ ...NO_BACKGROUND, error: "" });
        },
        init: async (localKey = "") => {
            localPreviewKey = localKey.trim();
            const key =
                localPreviewKey || window.localStorage.getItem("unsplash") || "";
            const hour = window.localStorage.getItem("hour");
            if (!key) {
                set({ ...NO_BACKGROUND, error: "" });
                return;
            }

            const cachedUrl = window.localStorage.getItem("url") || "";
            const cacheDescription = window.localStorage.getItem("description") || "";
            const cachedPhotographer = window.localStorage.getItem("photographer") || "";
            const cachedPhotographerUrl =
                window.localStorage.getItem("photographerUrl") || "";
            const hasCachedImage = Boolean(cachedUrl && cacheDescription);
            if (hasCachedImage) {
                set({
                    description: cacheDescription,
                    url: cachedUrl,
                    photographerName: cachedPhotographer,
                    photographerUrl: cachedPhotographerUrl,
                    error: "",
                });
            }

            if (
                !hasCachedImage ||
                !cachedPhotographer ||
                !cachedPhotographerUrl ||
                new Date().getHours().toString() !== hour
            ) {
                if (!(await hasAuthenticationInfoAccess())) {
                    update((current) => ({
                        ...current,
                        error:
                            "Re-save your Unsplash key in Settings to allow background requests.",
                    }));
                    return;
                }
                await load(key);
                return;
            }
        },
    };
};

export const background = createBackground();
