<script lang="ts">
    import { onMount } from "svelte";
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

    const menuIconFilter = `url("${new URL("#menu-icon-monochrome", window.location.href).href}")`;
    const settingsIconFilter = `url("${new URL("#menu-icon-alpha-tint", window.location.href).href}")`;

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
    $: panelTeamName = $azureDevOpsSettings.teamName;
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
    style:--theme-text-primary-rgb={$background.textPalette?.primaryRgb ??
        "255, 255, 255"}
    style:--theme-text-secondary-rgb={$background.textPalette?.secondaryRgb ??
        "230, 246, 251"}
    style:--theme-text-accent-rgb={$background.textPalette?.accentRgb ??
        "198, 237, 249"}
    style:--menu-icon-filter={menuIconFilter}
    style:--settings-icon-filter={settingsIconFilter}
>
    <svg class="icon-filters" aria-hidden="true" focusable="false">
        <defs>
            <filter
                id="menu-icon-monochrome"
                color-interpolation-filters="sRGB"
            >
                <feColorMatrix
                    in="SourceGraphic"
                    type="matrix"
                    values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        -0.2126 -0.7152 -0.0722 1 0"
                    result="icon-mask"
                />
                <feFlood flood-color="currentColor" result="icon-color" />
                <feComposite in="icon-color" in2="icon-mask" operator="in" />
            </filter>
            <filter
                id="menu-icon-alpha-tint"
                color-interpolation-filters="sRGB"
            >
                <feColorMatrix
                    in="SourceGraphic"
                    type="matrix"
                    values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                    result="icon-mask"
                />
                <feFlood flood-color="currentColor" result="icon-color" />
                <feComposite in="icon-color" in2="icon-mask" operator="in" />
            </filter>
        </defs>
    </svg>
    <header class="header">
        <div class="top-bar">
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
            <WeatherWidget />
        </div>
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
            teamName={panelTeamName}
        />
        {#if showWelcome}
            <WelcomePanel />
        {/if}
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
        --theme-text-primary-rgb: 255, 255, 255;
        --theme-text-secondary-rgb: 230, 246, 251;
        --theme-text-accent-rgb: 198, 237, 249;
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
        min-width: 0;
    }

    .top-bar {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 1rem;
        min-width: 0;
        padding: 0.5em 1em;
        border: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 0;
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(20px);
    }

    .content {
        min-width: 0;
        display: grid;
        grid-auto-flow: column;
        gap: 1em;
        grid-template-columns: repeat(auto-fill, minmax(2.75em, 1fr));
    }

    .icon-filters {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
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
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .workspace.has-left-panel {
        grid-template-areas: "sidebar .";
        grid-template-columns: max-content minmax(0, 1fr);
    }

    .workspace.show-welcome {
        grid-template-areas: ". welcome .";
        grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .icon {
        cursor: pointer;
        transition: filter 0.2s, transform 0.2s;
    }

    .shortcut-link img.icon {
        width: 2.6em;
        height: 2.6em;
        object-fit: contain;
        filter: var(--menu-icon-filter);
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

    .icon:hover,
    .shortcut-link:hover .icon,
    .shortcut-link:focus-visible .icon {
        filter: none;
        transform: scale(2) translateY(0.5em);
    }

    .icon-placeholder {
        display: inline-grid;
        place-items: center;
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 0.35em;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        background: rgba(0, 0, 0, 0.22);
        font-size: 0.9rem;
        font-weight: 600;
    }

    @media (max-width: 820px) {
        .top-bar {
            grid-template-columns: minmax(0, 1fr);
            gap: 0.5rem;
        }

        .workspace.has-left-panel {
            grid-template-areas: "sidebar";
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto;
            overflow-y: auto;
        }

        .workspace.show-welcome {
            grid-template-areas: "welcome";
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, 1fr);
            overflow-y: auto;
        }

        .content {
            grid-auto-flow: row;
            grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
        }
    }
</style>
