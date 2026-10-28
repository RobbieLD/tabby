<script lang="ts">
    import PanelRail from "./PanelRail.svelte";
    import WorkItemsPanel from "./WorkItemsPanel.svelte";

    export let enabled = false;
    export let organization = "";
    export let pat = "";
    export let teamName = "";
</script>

{#if enabled && organization && pat}
    <PanelRail side="left">
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
    </PanelRail>
{/if}

<style>
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
</style>
