<script lang="ts">
    import { onDestroy } from "svelte";
    import AzureDevOpsService, {
        MAX_WORK_ITEMS,
    } from "../services/azure-devops.service";
    import type WorkItem from "../models/work-item";
    import { isLocalPreview, localPreviewConfig } from "../utils/environment";
    import { hasAuthenticationInfoAccess } from "../services/extension-permissions";
    import { azureDevOpsSettings } from "../stores/azure-devops";
    import Panel from "./Panel.svelte";

    export let organization: string;
    export let pat: string;

    let items: WorkItem[] = [];
    let loading = true;
    let error = "";
    let requestNumber = 0;
    let activeController: AbortController | null = null;
    const isPreviewMode = isLocalPreview();
    const useSampleData =
        isPreviewMode &&
        !(
            localPreviewConfig.azureDevOpsOrganization &&
            localPreviewConfig.azureDevOpsPat
        );

    $: if (organization && pat) {
        void loadItems(
            organization,
            pat,
            $azureDevOpsSettings.hideCompletedAndDone
        );
    }

    async function loadItems(
        org: string,
        token: string,
        hideCompletedAndDone: boolean
    ): Promise<void> {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const currentRequest = ++requestNumber;
        loading = true;
        error = "";
        items = [];

        try {
            if (
                !isPreviewMode &&
                !(await hasAuthenticationInfoAccess())
            ) {
                throw new Error(
                    "Save your Azure DevOps settings again to approve sending your PAT to Azure DevOps."
                );
            }

            items = useSampleData
                ? [
                      {
                          id: 1042,
                          title: "Review the new booking flow",
                          type: "User Story",
                          state: "Active",
                          project: "Travel Platform",
                          url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1042",
                      },
                      {
                          id: 1058,
                          title: "Update accessibility checks",
                          type: "Task",
                          state: "New",
                          project: "Travel Platform",
                          url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1058",
                      },
                      {
                          id: 1084,
                          title: "Fix a long work item title to check wrapping in the panel",
                          type: "Bug",
                          state: "Committed",
                          project: "Customer Experience",
                          url: "https://dev.azure.com/contoso/Customer%20Experience/_workitems/edit/1084",
                      },
                      {
                          id: 1090,
                          title: "Completed design review",
                          type: "Task",
                          state: "Completed",
                          project: "Travel Platform",
                          url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1090",
                      },
                      {
                          id: 1091,
                          title: "Done: update release notes",
                          type: "Task",
                          state: "Done",
                          project: "Travel Platform",
                          url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1091",
                      },
                  ]
                      .filter((item) =>
                          hideCompletedAndDone
                              ? !["completed", "done"].includes(item.state.toLowerCase())
                              : true
                      )
                : await new AzureDevOpsService(
                      org,
                      token
                  ).getAssignedWorkItems(
                      controller.signal,
                      hideCompletedAndDone
                  );
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
        void loadItems(
            organization,
            pat,
            $azureDevOpsSettings.hideCompletedAndDone
        );
    }

    function updateCompletedFilter(event: Event): void {
        const checkbox = event.currentTarget as HTMLInputElement;
        try {
            azureDevOpsSettings.save({
                ...$azureDevOpsSettings,
                hideCompletedAndDone: checkbox.checked,
            });
        } catch (cause) {
            error =
                cause instanceof Error
                    ? cause.message
                    : "The work-item filter could not be saved.";
            checkbox.checked = $azureDevOpsSettings.hideCompletedAndDone;
        }
    }

    onDestroy(() => activeController?.abort());
</script>

<Panel title="Assigned to me">
    <div slot="actions" class="panel-actions">
        <label class="completed-filter">
            <input
                type="checkbox"
                checked={$azureDevOpsSettings.hideCompletedAndDone}
                on:change={updateCompletedFilter}
            />
            Hide completed and done
        </label>
        {#if useSampleData}
            <span
                class="preview-badge"
                title="These are sample work items; localhost does not query Azure DevOps."
            >
                Sample data
            </span>
        {:else if isPreviewMode}
            <span class="preview-badge" title="Connected to Azure DevOps using local environment credentials.">
                Local API
            </span>
        {/if}
        <button
            class="refresh-button"
            type="button"
            on:click={refresh}
            disabled={loading}
            aria-label="Refresh assigned work items"
            title="Refresh"
        >
            ↻
        </button>
    </div>

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
                            <td class="project-cell">{item.project || "—"}</td>
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
        color: white;
        background: rgba(255, 255, 255, 0.14);
        cursor: pointer;
        font: inherit;
    }

    .preview-badge {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.65rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .completed-filter {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        color: rgba(255, 255, 255, 0.82);
        font-size: 0.68rem;
        white-space: nowrap;
    }

    .completed-filter input {
        margin: 0;
        accent-color: #c6edf9;
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
        background: rgba(255, 255, 255, 0.24);
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
        color: #ffd1d1;
    }

    .table-scroll {
        min-width: 0;
    }

    table {
        width: 100%;
        table-layout: auto;
        border-collapse: collapse;
        color: #f5f7fa;
        font-size: 0.8rem;
        text-align: left;
    }

    th,
    td {
        padding: 0.55rem 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.17);
        vertical-align: top;
        overflow-wrap: normal;
        word-break: normal;
    }

    th {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    th:nth-child(1),
    td:nth-child(1) {
        width: 3rem;
    }

    .id-cell {
        color: #f5f7fa;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }

    .project-cell {
        color: #f5f7fa;
    }

    .title-cell,
    .project-cell {
        overflow-wrap: break-word;
    }

    a {
        color: #c6edf9;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .work-item-type {
        display: block;
        margin-bottom: 0.15rem;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.68rem;
    }

    .state {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.14);
        white-space: nowrap;
    }

    .list-note {
        margin: 0.65rem 0 0;
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.72rem;
    }
</style>
