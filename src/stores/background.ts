import UnsplashService, {
    DEFAULT_UNSPLASH_COLOR,
    isUnsplashColor,
} from "../services/unsplash.service";
import type { UnsplashColor } from "../services/unsplash.service";
import {
    getBackgroundTextPalette,
    type BackgroundTextPalette,
} from "../services/image-text-palette.service";
import { writable } from "svelte/store";
import type UnsplashResponse from "../models/unsplash-response";
import { hasAuthenticationInfoAccess } from "../services/extension-permissions";

const setCache = (response: UnsplashResponse) => {
    window.localStorage.setItem("url", response.url);
    window.localStorage.setItem("imageUrl", response.imageUrl);
    window.localStorage.setItem("description", response.description);
    window.localStorage.setItem("photographer", response.photographerName);
    window.localStorage.setItem("photographerUrl", response.photographerUrl);
    window.localStorage.setItem("hour", new Date().getHours().toString());
};

interface BackgroundState extends UnsplashResponse {
    error: string;
    textPalette: BackgroundTextPalette | null;
}

const NO_BACKGROUND: UnsplashResponse = {
    description: "Add an Unsplash access key in settings to enable backgrounds.",
    url: "",
    imageUrl: "",
    photographerName: "",
    photographerUrl: "",
};

const SEARCH_TERMS_STORAGE_KEY = "unsplashSearchTerms";
const COLOR_STORAGE_KEY = "unsplashColor";
const DEFAULT_SEARCH_TERMS = "nature";
const normalizeSearchTerms = (value: string): string =>
    value.trim() || DEFAULT_SEARCH_TERMS;

const createBackground = () => {
    const { subscribe, update, set } = writable<BackgroundState>({
        ...NO_BACKGROUND,
        error: "",
        textPalette: null,
    });
    let localPreviewKey = "";
    let textPaletteRequestNumber = 0;
    const getSearchTerms = (): string =>
        normalizeSearchTerms(
            window.localStorage.getItem(SEARCH_TERMS_STORAGE_KEY) || ""
        );
    const getColor = (): UnsplashColor => {
        const color = window.localStorage.getItem(COLOR_STORAGE_KEY);
        return color !== null && isUnsplashColor(color)
            ? color
            : DEFAULT_UNSPLASH_COLOR;
    };

    const getImageUrlFromBackground = (backgroundUrl: string): string => {
        const value = backgroundUrl.trim();
        if (!value.toLowerCase().startsWith("url(") || !value.endsWith(")")) {
            return "";
        }

        const imageUrl = value.slice(4, -1).trim();
        const quote = imageUrl[0];
        return (
            (quote === '"' || quote === "'") && imageUrl.endsWith(quote)
                ? imageUrl.slice(1, -1)
                : imageUrl
        );
    };

    const applyTextPalette = async (
        imageUrl: string,
        backgroundUrl: string
    ): Promise<void> => {
        if (!imageUrl) {
            return;
        }

        const currentRequest = ++textPaletteRequestNumber;
        try {
            const textPalette = await getBackgroundTextPalette(imageUrl);
            if (!textPalette) {
                console.warn(
                    "The Unsplash background did not produce usable text colors."
                );
                return;
            }

            update((current) =>
                currentRequest === textPaletteRequestNumber &&
                current.url === backgroundUrl
                    ? { ...current, textPalette }
                    : current
            );
        } catch (error) {
            if (currentRequest === textPaletteRequestNumber) {
                console.warn(
                    "The text palette could not be extracted from the Unsplash background.",
                    error
                );
            }
        }
    };

    const load = async (key: string): Promise<UnsplashResponse> => {
        try {
            const service = new UnsplashService(key, getSearchTerms(), getColor());
            const response = await service.get();
            setCache(response);
            set({ ...response, error: "", textPalette: null });
            await applyTextPalette(response.imageUrl, response.url);
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
        getSearchTerms,
        getColor,
        saveSearchTerms: (value: string): string => {
            const searchTerms = normalizeSearchTerms(value);
            window.localStorage.setItem(SEARCH_TERMS_STORAGE_KEY, searchTerms);
            return searchTerms;
        },
        saveColor: (value: string): UnsplashColor => {
            const color = isUnsplashColor(value)
                ? value
                : DEFAULT_UNSPLASH_COLOR;
            window.localStorage.setItem(COLOR_STORAGE_KEY, color);
            return color;
        },
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
            window.localStorage.removeItem("imageUrl");
            window.localStorage.removeItem("description");
            window.localStorage.removeItem("photographer");
            window.localStorage.removeItem("photographerUrl");
            window.localStorage.removeItem("hour");
            textPaletteRequestNumber += 1;
            set({ ...NO_BACKGROUND, error: "", textPalette: null });
        },
        init: async (localKey = "") => {
            localPreviewKey = localKey.trim();
            const key =
                localPreviewKey || window.localStorage.getItem("unsplash") || "";
            const hour = window.localStorage.getItem("hour");
            if (!key) {
                textPaletteRequestNumber += 1;
                set({ ...NO_BACKGROUND, error: "", textPalette: null });
                return;
            }

            const cachedUrl = window.localStorage.getItem("url") || "";
            const cachedImageUrl =
                window.localStorage.getItem("imageUrl") ||
                getImageUrlFromBackground(cachedUrl);
            const cacheDescription = window.localStorage.getItem("description") || "";
            const cachedPhotographer = window.localStorage.getItem("photographer") || "";
            const cachedPhotographerUrl =
                window.localStorage.getItem("photographerUrl") || "";
            const hasCachedImage = Boolean(cachedUrl && cacheDescription);
            if (hasCachedImage) {
                set({
                    description: cacheDescription,
                    url: cachedUrl,
                    imageUrl: cachedImageUrl,
                    photographerName: cachedPhotographer,
                    photographerUrl: cachedPhotographerUrl,
                    error: "",
                    textPalette: null,
                });
                void applyTextPalette(cachedImageUrl, cachedUrl);
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
