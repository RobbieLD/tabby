import { writable } from "svelte/store";
import type { WeatherLocation } from "../models/weather";

const LOCATION_KEY = "weather-location";
export const WEATHER_CACHE_KEY = "weather-cache";

const isWeatherLocation = (value: unknown): value is WeatherLocation => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as {
        name?: unknown;
        latitude?: unknown;
        longitude?: unknown;
    };
    return (
        typeof candidate.name === "string" &&
        candidate.name.trim().length > 0 &&
        typeof candidate.latitude === "number" &&
        Number.isFinite(candidate.latitude) &&
        typeof candidate.longitude === "number" &&
        Number.isFinite(candidate.longitude)
    );
};

const readLocation = (): WeatherLocation | null => {
    const storedLocation = window.localStorage.getItem(LOCATION_KEY);
    if (!storedLocation) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedLocation);
        if (!isWeatherLocation(parsed)) {
            throw new Error("The saved weather location has an invalid format.");
        }
        return parsed;
    } catch (error) {
        console.error("The saved weather location could not be loaded.", error);
        return null;
    }
};

const { subscribe, set } = writable<WeatherLocation | null>(readLocation());

export const weatherLocation = {
    subscribe,
    save: (location: WeatherLocation): void => {
        if (!isWeatherLocation(location)) {
            throw new Error("Enter a valid weather location.");
        }

        window.localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        set(location);
    },
    clear: (): void => {
        window.localStorage.removeItem(LOCATION_KEY);
        window.localStorage.removeItem(WEATHER_CACHE_KEY);
        set(null);
    },
};
