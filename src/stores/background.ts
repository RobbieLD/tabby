import UnsplashService, {
    DEFAULT_UNSPLASH_COLOR,
    isUnsplashColor,
} from "../services/unsplash.service";
import type { UnsplashColor } from "../services/unsplash.service";
import {
    getBackgroundTextPalette,
    type BackgroundTextPalette,
} from "../services/image-text-palette.service";
import { get, writable } from "svelte/store";
import type UnsplashResponse from "../models/unsplash-response";
import { hasAuthenticationInfoAccess } from "../services/extension-permissions";
import { getWeatherSearchKeywords } from "../services/weather.service";
import { currentWeather } from "./weather";

const CACHE_DURATION_MS = 60 * 60 * 1000;
const FETCHED_AT_STORAGE_KEY = "backgroundFetchedAt";
const CACHE_STORAGE_KEYS = [
    "url",
    "imageUrl",
    "description",
    "photographer",
    "photographerUrl",
    FETCHED_AT_STORAGE_KEY,
    // Legacy hour-of-day cache stamp.
    "hour",
];

const setCache = (response: UnsplashResponse) => {
    window.localStorage.setItem("url", response.url);
    window.localStorage.setItem("imageUrl", response.imageUrl);
    window.localStorage.setItem("description", response.description);
    window.localStorage.setItem("photographer", response.photographerName);
    window.localStorage.setItem("photographerUrl", response.photographerUrl);
    window.localStorage.setItem(FETCHED_AT_STORAGE_KEY, Date.now().toString());
    window.localStorage.removeItem("hour");
};

const isCacheFresh = (): boolean => {
    const fetchedAt = Number(window.localStorage.getItem(FETCHED_AT_STORAGE_KEY));
    const age = Date.now() - fetchedAt;
    return Number.isFinite(fetchedAt) && fetchedAt > 0 && age >= 0 && age < CACHE_DURATION_MS;
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
const WEATHER_AWARE_SEARCH_STORAGE_KEY = "unsplashWeatherAwareSearch";
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
    let loadRequestNumber = 0;
    const getKey = (): string =>
        window.localStorage.getItem("unsplash") || localPreviewKey;
    const getSearchTerms = (): string =>
        normalizeSearchTerms(
            window.localStorage.getItem(SEARCH_TERMS_STORAGE_KEY) || ""
        );
    const getWeatherAwareSearch = (): boolean => {
        const storedValue = window.localStorage.getItem(
            WEATHER_AWARE_SEARCH_STORAGE_KEY
        );
        if (storedValue === null || storedValue === "false") {
            return false;
        }
        if (storedValue === "true") {
            return true;
        }

        console.error("The saved weather-aware background setting is invalid.");
        window.localStorage.removeItem(WEATHER_AWARE_SEARCH_STORAGE_KEY);
        return false;
    };
    const getRequestSearchTerms = (): string => {
        const searchTerms = getSearchTerms();
        if (!getWeatherAwareSearch()) {
            return searchTerms;
        }

        const weather = get(currentWeather);
        if (!weather) {
            return searchTerms;
        }

        const existingTerms = new Set(
            searchTerms
                .toLocaleLowerCase()
                .split(/\s+/)
                .filter((term) => term.length > 0)
        );
        const weatherKeywords = getWeatherSearchKeywords(weather.weatherCode).filter(
            (keyword) =>
                !keyword
                    .toLocaleLowerCase()
                    .split(/\s+/)
                    .every((term) => existingTerms.has(term))
        );
        return [...new Set([searchTerms, ...weatherKeywords])].join(" ");
    };
    const getColor = (): UnsplashColor => {
        const color = window.localStorage.getItem(COLOR_STORAGE_KEY);
        return color !== null && isUnsplashColor(color)
            ? color
            : DEFAULT_UNSPLASH_COLOR;
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
        const currentRequest = ++loadRequestNumber;
        try {
            const service = new UnsplashService(
                key,
                getRequestSearchTerms(),
                getColor()
            );
            const response = await service.get();
            // Ignore responses that finish after the key was removed or a newer request started.
            if (currentRequest !== loadRequestNumber) {
                return response;
            }
            setCache(response);
            set({ ...response, error: "", textPalette: null });
            await applyTextPalette(response.imageUrl, response.url);
            return response;
        } catch (error) {
            if (currentRequest === loadRequestNumber) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "The Unsplash background could not be loaded.";
                update((current) => ({ ...current, error: message }));
            }
            throw error;
        }
    };

    return {
        subscribe,
        getSearchTerms,
        getColor,
        getWeatherAwareSearch,
        saveSearchTerms: (value: string): string => {
            const searchTerms = normalizeSearchTerms(value);
            window.localStorage.setItem(SEARCH_TERMS_STORAGE_KEY, searchTerms);
            return searchTerms;
        },
        saveWeatherAwareSearch: (enabled: boolean): boolean => {
            if (typeof enabled !== "boolean") {
                throw new Error("Choose whether background searches use the weather.");
            }

            window.localStorage.setItem(
                WEATHER_AWARE_SEARCH_STORAGE_KEY,
                String(enabled)
            );
            return enabled;
        },
        saveColor: (value: string): UnsplashColor => {
            const color = isUnsplashColor(value)
                ? value
                : DEFAULT_UNSPLASH_COLOR;
            window.localStorage.setItem(COLOR_STORAGE_KEY, color);
            return color;
        },
        hasKey: (): boolean => Boolean(getKey()),
        refresh: async () => {
            const key = getKey();
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
            loadRequestNumber += 1;
            window.localStorage.removeItem("unsplash");
            CACHE_STORAGE_KEYS.forEach((cacheKey) => window.localStorage.removeItem(cacheKey));
            textPaletteRequestNumber += 1;
            set({ ...NO_BACKGROUND, error: "", textPalette: null });
        },
        init: async (localKey = "") => {
            localPreviewKey = localKey.trim();
            const key = getKey();
            if (!key) {
                textPaletteRequestNumber += 1;
                set({ ...NO_BACKGROUND, error: "", textPalette: null });
                return;
            }

            const cachedUrl = window.localStorage.getItem("url") || "";
            const cachedImageUrl = window.localStorage.getItem("imageUrl") || "";
            const cacheDescription = window.localStorage.getItem("description") || "";
            const cachedPhotographer = window.localStorage.getItem("photographer") || "";
            const cachedPhotographerUrl =
                window.localStorage.getItem("photographerUrl") || "";
            const hasCachedImage = Boolean(cachedUrl && cachedImageUrl && cacheDescription);
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
                !isCacheFresh()
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
