<script lang="ts">
    import AssignedWorkItems from "./AssignedWorkItems.svelte";
    import PanelRail from "./PanelRail.svelte";

    export let enabled = false;
    export let organization = "";
    export let pat = "";
</script>

{#if enabled && organization && pat}
    <PanelRail side="left">
        <AssignedWorkItems
            {organization}
            {pat}
        />
    </PanelRail>
{/if}
