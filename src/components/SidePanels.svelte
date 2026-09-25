<script lang="ts">
    import { azureDevOpsSettings } from "../stores/azure-devops";
    import AssignedWorkItems from "./AssignedWorkItems.svelte";
    import PanelRail from "./PanelRail.svelte";
</script>

{#if
    $azureDevOpsSettings.enabled &&
    $azureDevOpsSettings.organization &&
    $azureDevOpsSettings.pat
}
    <PanelRail side="left">
        <AssignedWorkItems
            organization={$azureDevOpsSettings.organization}
            pat={$azureDevOpsSettings.pat}
        />
    </PanelRail>
{/if}
