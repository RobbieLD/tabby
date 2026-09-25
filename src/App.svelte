<script lang="ts">
    import Clock from "./components/Clock.svelte";
    import SidePanels from "./components/SidePanels.svelte";
    import Settings from "./components/Settings.svelte";
    import { background } from "./stores/background";
    import { icons } from "./stores/icons";
    import { azureDevOpsSettings } from "./stores/azure-devops";

    background.init().catch((error: unknown) => {
        console.error("Unable to load the Unsplash background.", error);
    });

    $: showPanels =
        $azureDevOpsSettings.enabled &&
        Boolean($azureDevOpsSettings.organization) &&
        Boolean($azureDevOpsSettings.pat);
</script>

<div
    class="main"
    class:has-panels={showPanels}
    style="background-image:{$background.url}"
>
    <Clock />
    <SidePanels />
    <div class="content">
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
            "content content content"
            " . . clock"
            "info info info";
        grid-template-columns: auto 1fr auto;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
        background-size: cover;
    }

    .main.has-panels {
        grid-template-areas:
            "sidebar content content"
            "sidebar . clock"
            "info info info";
        grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr) auto;
    }

    .icon {
        max-width: 2em;
        filter: grayscale(100%);
        cursor: pointer;
        transition: transform 0.2s;
    }

    .icon:hover {
        filter: none;
        transform: scale(2) translateY(0.5em);
    }

    .content {
        grid-area: content;
        align-self: center;
        min-width: 0;
        display: grid;
        grid-auto-flow: column;
        gap: 1em;
        padding-left: 1em;
        padding-right: 1em;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
        backdrop-filter: blur(20px);
        grid-template-columns: repeat(auto-fill, minmax(2em, 1fr));
    }

    @media (max-width: 760px) {
        .main.has-panels {
            grid-template-areas:
                "sidebar"
                "content"
                "clock"
                "info";
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto auto 1fr auto;
        }

        .content {
            grid-auto-flow: row;
            grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
        }
    }
</style>
