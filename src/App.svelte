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
    import { isLocalPreview, localPreviewConfig } from "./utils/environment";
    import {
        hasWebsiteActivityAccess,
        websiteActivityAccess,
    } from "./services/extension-permissions";

    background.init(localPreviewConfig.unsplashAccessKey).catch((error: unknown) => {
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

    const hasLocalAzureDevOpsCredentials =
        isLocalPreview() &&
        Boolean(localPreviewConfig.azureDevOpsOrganization) &&
        Boolean(localPreviewConfig.azureDevOpsPat);
    $: panelOrganization = hasLocalAzureDevOpsCredentials
        ? localPreviewConfig.azureDevOpsOrganization
        : $azureDevOpsSettings.organization;
    $: panelPat = hasLocalAzureDevOpsCredentials
        ? localPreviewConfig.azureDevOpsPat
        : $azureDevOpsSettings.pat;
    $: showLeftPanels =
        hasLocalAzureDevOpsCredentials ||
        ($azureDevOpsSettings.enabled &&
            Boolean($azureDevOpsSettings.organization) &&
            Boolean($azureDevOpsSettings.pat));
    $: showWelcome =
        $icons.length === 0 &&
        !showLeftPanels &&
        !$weatherLocation &&
        !$background.url;

    let draggedShortcutIndex: number | null = null;
    let dragTargetIndex: number | null = null;
    let suppressClickUntil = 0;

    window.localStorage.removeItem("outlook-calendar-settings");

    const isRemoteIcon = (icon: string): boolean => /^https?:\/\//i.test(icon);

    function startDraggingShortcut(event: DragEvent, index: number): void {
        draggedShortcutIndex = index;
        dragTargetIndex = index;
        event.dataTransfer?.setData("text/plain", index.toString());
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
        }
    }

    function allowShortcutDrop(event: DragEvent, index: number): void {
        event.preventDefault();
        dragTargetIndex = index;
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    function dropShortcut(event: DragEvent, targetIndex: number): void {
        event.preventDefault();
        const transferredIndex = event.dataTransfer?.getData("text/plain") || "";
        const transferIndex = transferredIndex ? Number(transferredIndex) : NaN;
        const sourceIndex =
            draggedShortcutIndex ??
            (Number.isInteger(transferIndex) ? transferIndex : null);

        if (sourceIndex !== null) {
            if (sourceIndex !== targetIndex) {
                icons.reorder(sourceIndex, targetIndex);
            }
            suppressClickUntil = Date.now() + 500;
        }

        draggedShortcutIndex = null;
        dragTargetIndex = null;
    }

    function finishDraggingShortcut(): void {
        if (draggedShortcutIndex !== null) {
            suppressClickUntil = Date.now() + 500;
        }
        draggedShortcutIndex = null;
        dragTargetIndex = null;
    }

    function openShortcut(event: MouseEvent): void {
        if (Date.now() < suppressClickUntil) {
            event.preventDefault();
            suppressClickUntil = 0;
        }
    }
</script>

<div
    class="main"
    style:background-image={$background.url ||
        "linear-gradient(135deg, #111b27 0%, #1d3444 55%, #253b49 100%)"}
>
    <header class="header">
        <nav class="content" aria-label="Shortcuts">
            <span id="shortcut-reorder-help" class="visually-hidden">
                Drag to reorder this shortcut. You can also move shortcuts with the
                controls in Settings.
            </span>
            {#each $icons as icon, index}
                <a
                    class="shortcut-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={icon.url}
                    title={icon.title}
                    aria-label={icon.title}
                    aria-describedby="shortcut-reorder-help"
                    draggable="true"
                    class:is-dragging={draggedShortcutIndex === index}
                    class:drop-target={dragTargetIndex === index && draggedShortcutIndex !== index}
                    on:dragstart={(event) => startDraggingShortcut(event, index)}
                    on:dragover={(event) => allowShortcutDrop(event, index)}
                    on:drop={(event) => dropShortcut(event, index)}
                    on:dragend={finishDraggingShortcut}
                    on:click={openShortcut}
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
        <SidePanels
            enabled={showLeftPanels}
            organization={panelOrganization}
            pat={panelPat}
        />
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

    .shortcut-link {
        display: grid;
        place-items: center;
        min-width: 0;
        border-radius: 0.35rem;
        cursor: grab;
    }

    .shortcut-link:active {
        cursor: grabbing;
    }

    .shortcut-link.is-dragging {
        opacity: 0.35;
    }

    .shortcut-link.drop-target {
        outline: 2px dashed rgba(255, 255, 255, 0.8);
        outline-offset: 0.2rem;
    }

    .shortcut-link:focus-visible {
        outline: 2px solid #c6edf9;
        outline-offset: 0.2rem;
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

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
