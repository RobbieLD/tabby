import type { CurrentWeather, WeatherLocation } from "../models/weather";

interface GeocodingResponse {
    results?: Array<{
        name?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    }>;
}

interface ForecastResponse {
    current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        wind_speed_10m?: number;
    };
}

const readResponse = async (response: Response, serviceName: string): Promise<unknown> => {
    if (!response.ok) {
        throw new Error(`${serviceName} request failed with HTTP ${response.status}.`);
    }

    return response.json() as Promise<unknown>;
};

export const findWeatherLocation = async (
    search: string,
    signal?: AbortSignal
): Promise<WeatherLocation> => {
    const query = search.trim();
    if (query.length < 2) {
        throw new Error("Enter at least two characters for the weather location.");
    }

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", query);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url, { signal, cache: "no-store" });
    const result = (await readResponse(response, "Weather location search")) as GeocodingResponse;
    const match = result.results?.[0];
    if (
        !match ||
        typeof match.name !== "string" ||
        typeof match.latitude !== "number" ||
        typeof match.longitude !== "number"
    ) {
        throw new Error(
            `No weather location matched "${query}". Try adding a country, such as "Paris, France".`
        );
    }

    return {
        name: match.country ? `${match.name}, ${match.country}` : match.name,
        latitude: match.latitude,
        longitude: match.longitude,
    };
};

export const getCurrentWeather = async (
    location: WeatherLocation,
    signal?: AbortSignal
): Promise<CurrentWeather> => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", location.latitude.toString());
    url.searchParams.set("longitude", location.longitude.toString());
    url.searchParams.set(
        "current",
        "temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
    );
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal, cache: "no-store" });
    const result = (await readResponse(response, "Current weather")) as ForecastResponse;
    const current = result.current;
    if (
        !current ||
        typeof current.temperature_2m !== "number" ||
        typeof current.apparent_temperature !== "number" ||
        typeof current.weather_code !== "number" ||
        typeof current.wind_speed_10m !== "number"
    ) {
        throw new Error("The weather service returned incomplete current conditions.");
    }

    return {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        weatherCode: current.weather_code,
        windSpeed: current.wind_speed_10m,
    };
};

const WEATHER_DESCRIPTIONS: Record<number, string> = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Rain showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
};

export const describeWeather = (weatherCode: number): string =>
    WEATHER_DESCRIPTIONS[weatherCode] || "Current conditions";
