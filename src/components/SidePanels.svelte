<script lang="ts">
    import PanelRail from "./PanelRail.svelte";
    import WorkItemsPanel from "./WorkItemsPanel.svelte";

    export let enabled = false;
    export let organization = "";
    export let pat = "";
</script>

{#if enabled && organization && pat}
    <PanelRail side="left">
        <div class="panel-card">
            <WorkItemsPanel
                {organization}
                {pat}
                kind="assigned"
            />
        </div>
        <div class="panel-card">
            <WorkItemsPanel
                {organization}
                {pat}
                kind="followed"
            />
        </div>
    </PanelRail>
{/if}

<style>
    .panel-card {
        box-sizing: border-box;
        min-width: 0;
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 0.6rem;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(16px);
    }
</style>
