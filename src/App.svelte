<script lang="ts">
    import Clock from "./components/Clock.svelte";
    import SidePanels from "./components/SidePanels.svelte";
    import Settings from "./components/Settings.svelte";
    import WeatherWidget from "./components/WeatherWidget.svelte";
    import { background } from "./stores/background";
    import { icons } from "./stores/icons";
    import { azureDevOpsSettings } from "./stores/azure-devops";

    background.init().catch((error: unknown) => {
        console.error("Unable to load the Unsplash background.", error);
    });

    $: showLeftPanels =
        $azureDevOpsSettings.enabled &&
        Boolean($azureDevOpsSettings.organization) &&
        Boolean($azureDevOpsSettings.pat);

    window.localStorage.removeItem("outlook-calendar-settings");
</script>

<div
    class="main"
    style="background-image:{$background.url}"
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
                    <img src={icon.icon} alt={icon.title} class="icon" />
                </a>
            {/each}
        </nav>
    </header>
    <div
        class="workspace"
        class:has-left-panel={showLeftPanels}
    >
        <SidePanels />
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

        .content {
            grid-auto-flow: row;
            grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
        }
    }
</style>
