import type { CurrentWeather, WeatherLocation } from "../models/weather";

interface ForecastResponse {
    current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number | null;
        relative_humidity_2m?: number | null;
        pressure_msl?: number | null;
    };
    daily?: {
        temperature_2m_min?: (number | null)[];
        temperature_2m_max?: (number | null)[];
    };
}

interface GeocodingResult {
    name?: string | null;
    latitude?: number;
    longitude?: number;
    admin1?: string | null;
    country?: string | null;
}

interface GeocodingResponse {
    results?: GeocodingResult[];
}

const readResponse = async (
    response: Response,
    serviceName: string
): Promise<unknown> => {
    if (!response.ok) {
        throw new Error(`${serviceName} request failed with HTTP ${response.status}.`);
    }

    return response.json() as Promise<unknown>;
};

const toOptionalNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const formatPlaceName = (place: GeocodingResult): string => {
    const parts = [place.name, place.admin1, place.country]
        .filter((part): part is string => typeof part === "string")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    return parts
        .filter(
            (part, index) =>
                parts.findIndex(
                    (candidate) =>
                        candidate.toLocaleLowerCase() === part.toLocaleLowerCase()
                ) === index
        )
        .join(", ");
};

export const searchWeatherLocations = async (
    query: string,
    signal?: AbortSignal
): Promise<WeatherLocation[]> => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
        throw new Error("Enter at least two characters to search for a location.");
    }

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", searchTerm);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url, { signal });
    const result = (await readResponse(
        response,
        "Location search"
    )) as GeocodingResponse | null;
    const places = Array.isArray(result?.results) ? result.results : [];
    const locations: WeatherLocation[] = [];
    for (const place of places) {
        const name = formatPlaceName(place);
        const { latitude, longitude } = place;
        if (
            !name ||
            typeof latitude !== "number" ||
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            typeof longitude !== "number" ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            continue;
        }

        locations.push({ name, latitude, longitude, source: "manual" });
    }

    if (locations.length === 0) {
        throw new Error(
            `No matching locations found for "${searchTerm}". Try adding a region or country.`
        );
    }

    return locations;
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
        "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl"
    );
    url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal, cache: "no-store" });
    const result = (await readResponse(
        response,
        "Current weather"
    )) as ForecastResponse | null;
    const current = result?.current;
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
        windDirection: toOptionalNumber(current.wind_direction_10m),
        humidity: toOptionalNumber(current.relative_humidity_2m),
        pressure: toOptionalNumber(current.pressure_msl),
        minimumTemperature: toOptionalNumber(result?.daily?.temperature_2m_min?.[0]),
        maximumTemperature: toOptionalNumber(result?.daily?.temperature_2m_max?.[0]),
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
