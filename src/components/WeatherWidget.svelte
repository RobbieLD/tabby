<script lang="ts">
    import { onDestroy } from "svelte";
    import type { CurrentWeather, WeatherLocation } from "../models/weather";
    import { describeWeather, getCurrentWeather } from "../services/weather.service";
    import { hasLocationInfoAccess } from "../services/extension-permissions";
    import { isLocalPreview } from "../utils/environment";
    import { WEATHER_CACHE_KEY, weatherLocation } from "../stores/weather";

    interface WeatherCache {
        latitude: number;
        longitude: number;
        fetchedAt: number;
        weather: CurrentWeather;
    }

    const CACHE_DURATION_MS = 15 * 60 * 1000;
    const isPreviewMode = isLocalPreview();
    const sampleWeather: CurrentWeather = {
        temperature: 18,
        apparentTemperature: 17,
        weatherCode: 2,
        windSpeed: 12,
    };
    const isCurrentWeather = (value: unknown): value is CurrentWeather => {
        if (typeof value !== "object" || value === null) {
            return false;
        }

        const candidate = value as {
            temperature?: unknown;
            apparentTemperature?: unknown;
            weatherCode?: unknown;
            windSpeed?: unknown;
        };
        return (
            typeof candidate.temperature === "number" &&
            typeof candidate.apparentTemperature === "number" &&
            typeof candidate.weatherCode === "number" &&
            typeof candidate.windSpeed === "number"
        );
    };

    let current: CurrentWeather | null = null;
    let loading = false;
    let error = "";
    let requestNumber = 0;
    let activeController: AbortController | null = null;
    let currentLocationKey = "";

    $: if (isPreviewMode) {
        current = sampleWeather;
    } else if ($weatherLocation) {
        void loadWeather($weatherLocation);
    } else {
        activeController?.abort();
        activeController = null;
        requestNumber += 1;
        currentLocationKey = "";
        current = null;
        loading = false;
        error = "";
    }

    function readCache(location: WeatherLocation): CurrentWeather | null {
        const storedCache = window.localStorage.getItem(WEATHER_CACHE_KEY);
        if (!storedCache) {
            return null;
        }

        try {
            const cache: unknown = JSON.parse(storedCache);
            if (
                typeof cache !== "object" ||
                cache === null ||
                typeof (cache as WeatherCache).latitude !== "number" ||
                typeof (cache as WeatherCache).longitude !== "number" ||
                typeof (cache as WeatherCache).fetchedAt !== "number" ||
                !isCurrentWeather((cache as WeatherCache).weather) ||
                (cache as WeatherCache).latitude !== location.latitude ||
                (cache as WeatherCache).longitude !== location.longitude ||
                Date.now() - (cache as WeatherCache).fetchedAt >= CACHE_DURATION_MS
            ) {
                return null;
            }
            return (cache as WeatherCache).weather;
        } catch (cause) {
            console.error("The cached weather could not be loaded.", cause);
            window.localStorage.removeItem(WEATHER_CACHE_KEY);
            return null;
        }
    }

    async function loadWeather(
        location: WeatherLocation,
        forceRefresh = false
    ): Promise<void> {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const currentRequest = ++requestNumber;
        const locationKey = `${location.latitude},${location.longitude}`;
        if (currentLocationKey && currentLocationKey !== locationKey) {
            current = null;
        }
        currentLocationKey = locationKey;
        error = "";
        loading = true;

        try {
            if (!forceRefresh) {
                const cachedWeather = readCache(location);
                if (cachedWeather) {
                    current = cachedWeather;
                    return;
                }
            }

            if (!(await hasLocationInfoAccess())) {
                throw new Error(
                    "Location data consent is disabled. Re-enable weather location in Settings before requesting weather."
                );
            }

            const weather = await getCurrentWeather(location, controller.signal);
            current = weather;
            window.localStorage.setItem(
                WEATHER_CACHE_KEY,
                JSON.stringify({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    fetchedAt: Date.now(),
                    weather,
                } satisfies WeatherCache)
            );
        } catch (cause) {
            if (!controller.signal.aborted) {
                error =
                    cause instanceof Error
                        ? cause.message
                        : "Current weather could not be loaded.";
            }
        } finally {
            if (currentRequest === requestNumber) {
                loading = false;
            }
        }
    }

    function refresh(): void {
        if ($weatherLocation) {
            void loadWeather($weatherLocation, true);
        }
    }

    function openSettings(): void {
        window.dispatchEvent(new Event("open-settings"));
    }

    onDestroy(() => activeController?.abort());
</script>

<aside class="weather-widget" aria-label="Current weather" aria-live="polite">
    {#if isPreviewMode}
        <div class="weather-copy">
            <span class="weather-location">Sample weather</span>
            <div class="weather-reading">
                <strong>18°C</strong>
                <span>Partly cloudy</span>
            </div>
            <span class="weather-details">Feels like 17° · Wind 12 km/h</span>
        </div>
    {:else if $weatherLocation}
        <div class="weather-copy">
            <div class="weather-topline">
                <span class="weather-location">{$weatherLocation.name}</span>
                <button
                    class="weather-refresh"
                    type="button"
                    on:click={refresh}
                    disabled={loading}
                    aria-label="Refresh current weather"
                    title="Refresh weather"
                >
                    ↻
                </button>
            </div>
            {#if loading && !current}
                <span class="weather-status">Loading weather…</span>
            {:else if error && !current}
                <span class="weather-error" role="alert">{error}</span>
            {:else if current}
                <div class="weather-reading">
                    <strong>{Math.round(current.temperature)}°C</strong>
                    <span>{describeWeather(current.weatherCode)}</span>
                </div>
                <span class="weather-details">
                    Feels like {Math.round(current.apparentTemperature)}° · Wind {Math.round(current.windSpeed)} km/h
                </span>
                {#if error}
                    <span class="weather-status">{error}</span>
                {/if}
            {/if}
        </div>
    {:else}
        <div class="weather-copy">
            <span class="weather-location">Current weather</span>
            <button class="weather-setup" type="button" on:click={openSettings}>
                Use browser location in Settings
            </button>
        </div>
    {/if}
    <a
        class="weather-attribution"
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
        title="Weather data by Open-Meteo"
    >
        Open-Meteo
    </a>
    <span class="attribution-separator" aria-hidden="true">·</span>
    <a
        class="weather-attribution"
        href="https://www.bigdatacloud.com/geocoding-apis/free-reverse-geocode-to-city-api"
        target="_blank"
        rel="noopener noreferrer"
        title="Place name data by BigDataCloud"
    >
        BigDataCloud
    </a>
</aside>

<style>
    .weather-widget {
        grid-area: weather;
        justify-self: end;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.15rem;
        min-width: 0;
        max-width: min(20rem, 45vw);
        padding: 0.55rem 1rem 0.55rem 0.4rem;
        color: white;
        text-align: right;
    }

    .weather-copy {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.18rem;
        min-width: 0;
    }

    .weather-topline,
    .weather-reading {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.5rem;
        min-width: 0;
    }

    .weather-location {
        color: rgba(255, 255, 255, 0.88);
        font-size: 0.88rem;
        font-weight: 600;
        overflow-wrap: anywhere;
    }

    .weather-reading strong {
        font-size: 2.2rem;
        line-height: 1;
        white-space: nowrap;
    }

    .weather-reading span {
        font-size: 0.95rem;
    }

    .weather-details,
    .weather-status {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.76rem;
    }

    .weather-error {
        max-width: 18rem;
        color: #ffd1d1;
        font-size: 0.68rem;
        overflow-wrap: anywhere;
    }

    .weather-refresh {
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: white;
        background: transparent;
        cursor: pointer;
        font: inherit;
        font-size: 1.1rem;
        line-height: 1;
    }

    .weather-refresh:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.18);
    }

    .weather-refresh:disabled {
        cursor: wait;
        opacity: 0.6;
    }

    .weather-refresh:focus-visible,
    .weather-setup:focus-visible,
    .weather-attribution:focus-visible {
        outline: 2px solid #c6edf9;
        outline-offset: 2px;
    }

    .weather-setup {
        padding: 0;
        border: 0;
        color: #c6edf9;
        background: transparent;
        cursor: pointer;
        font: inherit;
        font-size: 0.75rem;
        text-align: right;
    }

    .weather-setup:hover,
    .weather-attribution:hover {
        text-decoration: underline;
    }

    .weather-attribution {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.58rem;
        text-decoration: none;
    }

    .attribution-separator {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.58rem;
    }
</style>
