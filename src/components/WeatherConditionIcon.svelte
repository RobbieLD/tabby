<script lang="ts">
    import { describeWeather } from "../services/weather.service";
    import { getWeatherIcon } from "../services/weather-icons";

    export let weatherCode: number;

    $: icon = getWeatherIcon(weatherCode);
    $: description = describeWeather(weatherCode);
</script>

<svg
    class="weather-condition-icon"
    viewBox="-30 -30 60 60"
    role="img"
    aria-label={description}
>
    <title>{description}</title>
    {#if icon === "clear"}
        <circle class="sun" r="10" />
        <g class="sun-rays">
            <path d="M0 -17v-5m0 44v-5m17-17h5m-44 0h5m29.02-12.02 3.54-3.54M-20.56 20.56l3.54-3.54m0-24.04-3.54-3.54m24.04 24.04 3.54 3.54" />
        </g>
    {:else if icon === "few-clouds"}
        <circle class="sun" cx="9" cy="-10" r="8" />
        <g class="sun-rays" transform="translate(9 -10)">
            <path d="M0 -12v-3m0 27v-3m12-9h3m-30 0h3m20.49-8.49 2.12-2.12m-21.22 21.22 2.12-2.12m0-16.98-2.12-2.12m16.98 16.98 2.12 2.12" />
        </g>
        <path class="cloud" d="M-19 10c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7h-23c-5 0-9-3-9-8z" />
    {:else if icon === "scattered-clouds"}
        <path class="cloud" d="M-21 7c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7h-23c-5 0-9-3-9-8z" />
    {:else if icon === "broken-clouds"}
        <path class="cloud cloud-back" d="M-1 0c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7H8c-5 0-9-3-9-8z" transform="translate(-5 0) scale(.72)" />
        <path class="cloud" d="M-21 9c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7h-23c-5 0-9-3-9-8z" />
    {:else if icon === "mist"}
        <g class="weather-lines">
            <path d="M-15 -11h21M-23 -4h38M-17 3h31M-11 10h24" />
        </g>
    {:else if icon === "snow"}
        <g class="snowflake">
            <path d="M0-18v36m-15-27 30 18m0-18-30 18M0-18l-3 5m3-5 3 5M0 18l-3-5m3 5 3-5m12-22-6 1m6-1-2 6m-22 8 6-1m-6 1 2-6m22 0-6-1m6 1-2 6m-22-8 6 1m-6-1 2 6" />
        </g>
    {:else if icon === "thunderstorm"}
        <path class="cloud" d="M-20 1c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7h-23c-5 0-9-3-9-8z" />
        <path class="lightning" d="m2 2-8 12h7l-2 12 12-16H4l3-8z" />
    {:else}
        <path class="cloud" d="M-20-4c0-4 3-7 7-7 1-6 6-10 12-10 7 0 12 5 13 11 5 0 8 3 8 7s-3 7-8 7h-23c-5 0-9-3-9-8z" />
        {#if icon === "rain"}
            <g class="rain-drops">
                <path d="m-11 8-3 7m13-7-3 7m13-7-3 7" />
            </g>
        {:else}
            <g class="rain-drops">
                <path d="m-13 8-2 5m7-3-2 5m9-7-2 5m7-3-2 5" />
            </g>
        {/if}
    {/if}
</svg>

<style>
    .weather-condition-icon {
        display: block;
        flex: 0 0 auto;
        width: 1.7rem;
        height: 1.7rem;
        overflow: visible;
        color: rgb(var(--theme-text-accent-rgb, 198, 237, 249));
    }

    .sun {
        fill: currentColor;
    }

    .sun-rays,
    .weather-lines,
    .snowflake,
    .rain-drops {
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
    }

    .cloud {
        fill: rgba(var(--theme-text-primary-rgb, 255, 255, 255), 0.2);
        stroke: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        stroke-linejoin: round;
        stroke-width: 2;
    }

    .cloud-back {
        fill: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.48);
    }

    .snowflake,
    .rain-drops {
        stroke-width: 2.5;
    }

    .lightning {
        fill: rgb(var(--theme-text-accent-rgb, 198, 237, 249));
        stroke: rgba(var(--theme-text-primary-rgb, 255, 255, 255), 0.8);
        stroke-linejoin: round;
        stroke-width: 1;
    }
</style>
