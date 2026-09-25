<script lang="ts">
    import { azureDevOpsSettings } from "../stores/azure-devops";
    import AssignedWorkItems from "./AssignedWorkItems.svelte";
</script>

{#if
    $azureDevOpsSettings.enabled &&
    $azureDevOpsSettings.organization &&
    $azureDevOpsSettings.pat
}
    <aside class="side-panels" aria-label="Optional panels">
        <AssignedWorkItems
            organization={$azureDevOpsSettings.organization}
            pat={$azureDevOpsSettings.pat}
        />
    </aside>
{/if}

<style>
    .side-panels {
        grid-area: sidebar;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 0;
        max-height: 100%;
        padding: 1rem;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(16px);
    }

    @media (max-width: 760px) {
        .side-panels {
            max-height: 40vh;
        }
    }
</style>
