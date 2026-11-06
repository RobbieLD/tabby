import { get, writable } from "svelte/store";
import type { CurrentWeather, WeatherLocation } from "../models/weather";

const LOCATION_KEY = "weather-location";
export const WEATHER_CACHE_KEY = "weather-cache";
export const WEATHER_CACHE_DURATION_MS = 15 * 60 * 1000;

export interface WeatherCache {
    latitude: number;
    longitude: number;
    fetchedAt: number;
    weather: CurrentWeather;
}

const isOptionalNumber = (value: unknown): boolean =>
    value === null || (typeof value === "number" && Number.isFinite(value));

const isCurrentWeather = (value: unknown): value is CurrentWeather => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as {
        temperature?: unknown;
        apparentTemperature?: unknown;
        weatherCode?: unknown;
        windSpeed?: unknown;
        windDirection?: unknown;
        humidity?: unknown;
        pressure?: unknown;
        minimumTemperature?: unknown;
        maximumTemperature?: unknown;
    };
    return (
        typeof candidate.temperature === "number" &&
        typeof candidate.apparentTemperature === "number" &&
        typeof candidate.weatherCode === "number" &&
        typeof candidate.windSpeed === "number" &&
        isOptionalNumber(candidate.windDirection) &&
        isOptionalNumber(candidate.humidity) &&
        isOptionalNumber(candidate.pressure) &&
        isOptionalNumber(candidate.minimumTemperature) &&
        isOptionalNumber(candidate.maximumTemperature)
    );
};

const isWeatherLocation = (value: unknown): value is WeatherLocation => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as {
        name?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        source?: unknown;
    };
    return (
        typeof candidate.name === "string" &&
        candidate.name.trim().length > 0 &&
        typeof candidate.latitude === "number" &&
        Number.isFinite(candidate.latitude) &&
        candidate.latitude >= -90 &&
        candidate.latitude <= 90 &&
        typeof candidate.longitude === "number" &&
        Number.isFinite(candidate.longitude) &&
        candidate.longitude >= -180 &&
        candidate.longitude <= 180 &&
        (candidate.source === "manual" ||
            candidate.source === "browser" ||
            candidate.source === "preview")
    );
};

const readLocation = (): WeatherLocation | null => {
    const storedLocation = window.localStorage.getItem(LOCATION_KEY);
    if (!storedLocation) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedLocation);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            !("source" in parsed)
        ) {
            window.localStorage.removeItem(LOCATION_KEY);
            window.localStorage.removeItem(WEATHER_CACHE_KEY);
            return null;
        }
        if (!isWeatherLocation(parsed)) {
            throw new Error("The saved weather location has an invalid format.");
        }
        return parsed;
    } catch (error) {
        console.error("The saved weather location could not be loaded.", error);
        window.localStorage.removeItem(LOCATION_KEY);
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        return null;
    }
};

const weatherLocationStore = writable<WeatherLocation | null>(readLocation());

export const readCachedWeather = (
    location: WeatherLocation | null
): WeatherCache | null => {
    if (!location) {
        return null;
    }

    const storedCache = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!storedCache) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedCache);
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            typeof (parsed as WeatherCache).latitude !== "number" ||
            typeof (parsed as WeatherCache).longitude !== "number" ||
            typeof (parsed as WeatherCache).fetchedAt !== "number" ||
            !isCurrentWeather((parsed as WeatherCache).weather) ||
            (parsed as WeatherCache).latitude !== location.latitude ||
            (parsed as WeatherCache).longitude !== location.longitude ||
            Date.now() - (parsed as WeatherCache).fetchedAt >=
                WEATHER_CACHE_DURATION_MS
        ) {
            return null;
        }
        return parsed as WeatherCache;
    } catch (cause) {
        console.error("The cached weather could not be loaded.", cause);
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        return null;
    }
};

const cachedWeather = readCachedWeather(get(weatherLocationStore));
export const currentWeather = writable<CurrentWeather | null>(
    cachedWeather?.weather ?? null
);

export const weatherLocation = {
    subscribe: weatherLocationStore.subscribe,
    save: (location: WeatherLocation): void => {
        if (!isWeatherLocation(location)) {
            throw new Error("Enter a valid weather location.");
        }

        window.localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        weatherLocationStore.set(location);
    },
    clear: (): void => {
        window.localStorage.removeItem(LOCATION_KEY);
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        weatherLocationStore.set(null);
    },
};
