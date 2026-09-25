<script lang="ts">
    import { onDestroy } from "svelte";
    import AzureDevOpsService, {
        MAX_WORK_ITEMS,
    } from "../services/azure-devops.service";
    import type WorkItem from "../models/work-item";
    import Panel from "./Panel.svelte";

    export let organization: string;
    export let pat: string;

    let items: WorkItem[] = [];
    let loading = true;
    let error = "";
    let requestNumber = 0;
    let activeController: AbortController | null = null;

    $: if (organization && pat) {
        void loadItems(organization, pat);
    }

    async function loadItems(org: string, token: string): Promise<void> {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const currentRequest = ++requestNumber;
        loading = true;
        error = "";
        items = [];

        try {
            items = await new AzureDevOpsService(
                org,
                token
            ).getAssignedWorkItems(controller.signal);
        } catch (cause) {
            if (!controller.signal.aborted) {
                error =
                    cause instanceof Error
                        ? cause.message
                        : "Assigned work items could not be loaded.";
            }
        } finally {
            if (currentRequest === requestNumber) {
                loading = false;
            }
        }
    }

    function refresh(): void {
        void loadItems(organization, pat);
    }

    onDestroy(() => activeController?.abort());
</script>

<Panel title="Assigned to me">
    <button
        slot="actions"
        class="refresh-button"
        type="button"
        on:click={refresh}
        disabled={loading}
        aria-label="Refresh assigned work items"
        title="Refresh"
    >
        ↻
    </button>

    {#if loading}
        <p class="panel-message" aria-live="polite">Loading assigned work items…</p>
    {:else if error}
        <p class="panel-message error" role="alert">{error}</p>
        <button class="retry-button" type="button" on:click={refresh}>
            Try again
        </button>
    {:else if items.length === 0}
        <p class="panel-message">No open work items are assigned to you.</p>
    {:else}
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Work item</th>
                        <th scope="col">Project</th>
                        <th scope="col">State</th>
                    </tr>
                </thead>
                <tbody>
                    {#each items as item (item.id)}
                        <tr>
                            <td class="id-cell">{item.id}</td>
                            <td class="title-cell">
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <span class="work-item-type">{item.type}</span>
                                    {item.title}
                                </a>
                            </td>
                            <td>{item.project || "—"}</td>
                            <td><span class="state">{item.state}</span></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        {#if items.length === MAX_WORK_ITEMS}
            <p class="list-note">
                Showing the {MAX_WORK_ITEMS} most recently changed open items.
            </p>
        {/if}
    {/if}
</Panel>

<style>
    .refresh-button,
    .retry-button {
        border: 0;
        border-radius: 0.4rem;
        color: #24343c;
        background: rgba(30, 43, 50, 0.08);
        cursor: pointer;
        font: inherit;
    }

    .refresh-button {
        width: 2rem;
        height: 2rem;
        font-size: 1.3rem;
        line-height: 1;
    }

    .retry-button {
        padding: 0.45rem 0.7rem;
    }

    .refresh-button:hover,
    .retry-button:hover {
        background: rgba(30, 43, 50, 0.15);
    }

    .refresh-button:focus-visible,
    .retry-button:focus-visible,
    a:focus-visible {
        outline: 2px solid #236f8b;
        outline-offset: 2px;
    }

    .refresh-button:disabled {
        cursor: wait;
        opacity: 0.6;
    }

    .panel-message {
        margin: 0.5rem 0;
        line-height: 1.45;
    }

    .error {
        color: #9d2c2c;
    }

    .table-scroll {
        max-height: min(64vh, 42rem);
        overflow: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        text-align: left;
    }

    th,
    td {
        padding: 0.55rem 0.4rem;
        border-bottom: 1px solid rgba(30, 43, 50, 0.1);
        vertical-align: top;
    }

    th {
        position: sticky;
        top: 0;
        background: #f4f6f6;
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .id-cell {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }

    .title-cell {
        min-width: 10rem;
    }

    a {
        color: #205f79;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .work-item-type {
        display: block;
        margin-bottom: 0.15rem;
        color: #65757c;
        font-size: 0.68rem;
    }

    .state {
        display: inline-block;
        padding: 0.15rem 0.4rem;
        border-radius: 1rem;
        background: rgba(30, 43, 50, 0.08);
        white-space: nowrap;
    }

    .list-note {
        margin: 0.65rem 0 0;
        color: #536269;
        font-size: 0.72rem;
    }
</style>
