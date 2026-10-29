<script lang="ts">
    import { onDestroy } from "svelte";
    import type { CurrentWeather, WeatherLocation } from "../models/weather";
    import { describeWeather, getCurrentWeather } from "../services/weather.service";
    import { hasLocationInfoAccess } from "../services/extension-permissions";
    import { isLocalPreview } from "../utils/environment";
    import { WEATHER_CACHE_KEY, weatherLocation } from "../stores/weather";

    export let hasSportsWidgets = false;

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

<aside
    class="weather-widget"
    class:has-sports-widgets={hasSportsWidgets}
    aria-label="Current weather"
    aria-live="polite"
>
    {#if isPreviewMode}
        <div class="weather-copy">
            <div class="weather-reading">
                <strong>18°C</strong>
                <span>Partly cloudy</span>
            </div>
            <span class="weather-details">Feels like 17° · Wind 12 km/h</span>
        </div>
    {:else if $weatherLocation}
        <div class="weather-copy">
            <div class="weather-topline">
                {#if loading && !current}
                    <span class="weather-status">Loading weather…</span>
                {:else if error && !current}
                    <span class="weather-error" role="alert">{error}</span>
                {:else if current}
                    <div class="weather-reading">
                        <strong>{Math.round(current.temperature)}°C</strong>
                        <span>{describeWeather(current.weatherCode)}</span>
                    </div>
                {/if}
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
            {#if current}
                <span class="weather-details">
                    Feels like {Math.round(current.apparentTemperature)}° · Wind {Math.round(current.windSpeed)} km/h
                </span>
            {/if}
            {#if error && current}
                <span class="weather-status">{error}</span>
            {/if}
        </div>
    {:else}
        <div class="weather-copy">
            <button class="weather-setup" type="button" on:click={openSettings}>
                Set weather location
            </button>
        </div>
    {/if}
</aside>

<style>
    .weather-widget {
        justify-self: end;
        align-self: center;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.15rem;
        min-width: 0;
        max-width: min(24rem, 42vw);
        padding: 0;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        text-align: right;
    }

    .weather-widget.has-sports-widgets {
        max-width: min(16rem, 24vw);
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

    .weather-reading strong {
        font-size: 2rem;
        line-height: 1;
        white-space: nowrap;
    }

    .weather-reading span {
        font-size: 0.95rem;
    }

    .weather-details,
    .weather-status {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.72);
        font-size: 0.72rem;
    }

    .weather-status,
    .weather-error {
        max-width: 18rem;
        overflow-wrap: anywhere;
    }

    .weather-error {
        color: #ffd1d1;
        font-size: 0.68rem;
    }

    .weather-refresh {
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
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
    .weather-setup:focus-visible {
        outline: 2px solid #c6edf9;
        outline-offset: 2px;
    }

    .weather-setup {
        padding: 0;
        border: 0;
        color: rgb(var(--theme-text-accent-rgb, 198, 237, 249));
        background: transparent;
        cursor: pointer;
        font: inherit;
        font-size: 0.75rem;
        text-align: right;
    }

    .weather-setup:hover {
        text-decoration: underline;
    }

    @media (max-width: 820px) {
        .weather-widget {
            max-width: 100%;
        }

        .weather-widget.has-sports-widgets {
            max-width: min(100%, 42vw);
        }
    }
</style>
