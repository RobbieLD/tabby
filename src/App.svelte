<script lang="ts">
    import { onMount } from "svelte";
    import Clock from "./components/Clock.svelte";
    import SidePanels from "./components/SidePanels.svelte";
    import Settings from "./components/Settings.svelte";
    import WeatherWidget from "./components/WeatherWidget.svelte";
    import WelcomePanel from "./components/WelcomePanel.svelte";
    import { background } from "./stores/background";
    import { icons } from "./stores/icons";
    import { azureDevOpsSettings } from "./stores/azure-devops";
    import { weatherLocation } from "./stores/weather";
    import {
        hasWebsiteActivityAccess,
        websiteActivityAccess,
    } from "./services/extension-permissions";

    background.init().catch((error: unknown) => {
        console.error("Unable to load the Unsplash background.", error);
    });

    onMount(() => {
        hasWebsiteActivityAccess()
            .then((granted) => websiteActivityAccess.set(granted))
            .catch((error: unknown) => {
                console.error("Unable to check remote icon data consent.", error);
                websiteActivityAccess.set(false);
            });
    });

    $: showLeftPanels =
        $azureDevOpsSettings.enabled &&
        Boolean($azureDevOpsSettings.organization) &&
        Boolean($azureDevOpsSettings.pat);
    $: showWelcome =
        $icons.length === 0 &&
        !showLeftPanels &&
        !$weatherLocation &&
        !$background.url;

    window.localStorage.removeItem("outlook-calendar-settings");

    const isRemoteIcon = (icon: string): boolean => /^https?:\/\//i.test(icon);
</script>

<div
    class="main"
    style:background-image={$background.url ||
        "linear-gradient(135deg, #111b27 0%, #1d3444 55%, #253b49 100%)"}
>
    <header class="header">
        <nav class="content" aria-label="Shortcuts">
            {#each $icons as icon}
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={icon.url}
                    title={icon.title}
                    aria-label={icon.title}
                >
                    {#if !isRemoteIcon(icon.icon) || $websiteActivityAccess}
                        <img src={icon.icon} alt={icon.title} class="icon" />
                    {:else}
                        <span class="icon icon-placeholder" aria-hidden="true">
                            {icon.title.charAt(0).toUpperCase()}
                        </span>
                    {/if}
                </a>
            {/each}
        </nav>
    </header>
    <div
        class="workspace"
        class:has-left-panel={showLeftPanels}
        class:show-welcome={showWelcome}
    >
        <SidePanels />
        {#if showWelcome}
            <WelcomePanel />
        {/if}
        <WeatherWidget />
        <Clock />
    </div>
    <Settings />
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: system-ui, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Helvetica Neue", Arial, sans-serif;
        background-size: cover;
    }

    .main {
        display: grid;
        grid-template-areas:
            "header"
            "workspace"
            "info";
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100vh;
        overflow: hidden;
        background-color: #17232e;
        background-size: cover;
    }

    .header {
        grid-area: header;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
        min-width: 0;
    }

    .content {
        min-width: 0;
        display: grid;
        grid-auto-flow: column;
        gap: 1em;
        padding: 0.5em 1em;
        backdrop-filter: blur(20px);
        grid-template-columns: repeat(auto-fill, minmax(2em, 1fr));
    }

    .workspace {
        grid-area: workspace;
        display: grid;
        grid-template-areas:
            ". . weather"
            ". . clock";
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto minmax(0, 1fr);
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .workspace.has-left-panel {
        grid-template-areas:
            "sidebar . weather"
            "sidebar . clock";
        grid-template-columns: max-content minmax(0, 1fr) auto;
    }

    .workspace.show-welcome {
        grid-template-areas:
            ". welcome weather"
            ". welcome clock";
        grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .icon {
        max-width: 2em;
        filter: grayscale(100%);
        mix-blend-mode: multiply;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .icon:hover {
        filter: none;
        transform: scale(2) translateY(0.5em);
    }

    .icon-placeholder {
        display: inline-grid;
        place-items: center;
        width: 2em;
        height: 2em;
        border-radius: 0.35em;
        color: white;
        background: rgba(0, 0, 0, 0.22);
        font-size: 0.8rem;
        font-weight: 600;
    }

    @media (max-width: 820px) {
        .workspace.has-left-panel {
            grid-template-areas:
                "sidebar"
                "weather"
                "clock";
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto auto minmax(0, 1fr);
            overflow-y: auto;
        }

        .workspace.show-welcome {
            grid-template-areas:
                "welcome"
                "weather"
                "clock";
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto auto minmax(0, 1fr);
            overflow-y: auto;
        }

        .content {
            grid-auto-flow: row;
            grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
        }
    }
</style>
