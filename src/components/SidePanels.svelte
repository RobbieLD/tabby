<script lang="ts">
    import WorkItemsPanel from "./WorkItemsPanel.svelte";

    export let enabled = false;
    export let organization = "";
    export let pat = "";
    export let teamName = "";
</script>

{#if enabled && organization && pat}
    <aside class="panel-rail" aria-label="Optional panels">
        <div class="panel-card">
            <WorkItemsPanel
                {organization}
                {pat}
                {teamName}
                kind="assigned"
            />
        </div>
        <div class="panel-card">
            <WorkItemsPanel
                {organization}
                {pat}
                {teamName}
                kind="followed"
            />
        </div>
    </aside>
{/if}

<style>
    .panel-rail {
        display: grid;
        grid-area: sidebar;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: 1.5rem;
        box-sizing: border-box;
        width: max-content;
        max-width: calc(100vw - 25rem);
        min-width: 0;
        min-height: 0;
        margin: 2em;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(198, 237, 249, 0.48) rgba(0, 0, 0, 0.12);
    }

    .panel-rail:hover {
        scrollbar-color: rgba(198, 237, 249, 0.72) rgba(0, 0, 0, 0.18);
    }

    .panel-rail::-webkit-scrollbar {
        width: 0.7rem;
    }

    .panel-rail::-webkit-scrollbar-track {
        border-radius: 0.5rem;
        background: rgba(0, 0, 0, 0.12);
    }

    .panel-rail::-webkit-scrollbar-thumb {
        border: 0.2rem solid transparent;
        border-radius: 0.5rem;
        background-color: rgba(198, 237, 249, 0.48);
        background-clip: padding-box;
    }

    .panel-rail::-webkit-scrollbar-thumb:hover {
        background-color: rgba(198, 237, 249, 0.72);
    }

    .panel-rail::-webkit-scrollbar-thumb:active {
        background-color: rgba(198, 237, 249, 0.9);
    }

    .panel-card {
        box-sizing: border-box;
        min-width: 0;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 0;
        background: var(--surface-tint);
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(16px);
    }

    @media (max-width: 820px) {
        .panel-rail {
            width: auto;
            max-width: none;
            overflow: visible;
        }
    }

    @media (forced-colors: active) {
        .panel-rail {
            scrollbar-color: auto;
        }
    }
</style>
