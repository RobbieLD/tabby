<script lang="ts">
    import { onDestroy } from "svelte";
    import AzureDevOpsService, {
        MAX_WORK_ITEMS,
    } from "../services/azure-devops.service";
    import type { ProjectCurrentIteration } from "../services/azure-devops.service";
    import type WorkItem from "../models/work-item";
    import { isLocalPreview, localPreviewConfig } from "../utils/environment";
    import { hasAuthenticationInfoAccess } from "../services/extension-permissions";
    import { azureDevOpsSettings } from "../stores/azure-devops";
    import Panel from "./Panel.svelte";

    export let organization: string;
    export let pat: string;
    export let teamName = "";
    export let kind: "assigned" | "followed" = "assigned";

    let items: WorkItem[] = [];
    let currentIterations: ProjectCurrentIteration[] = [];
    let loading = true;
    let currentIterationsLoading = false;
    let error = "";
    let currentIterationsError = "";
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
            teamName,
            $azureDevOpsSettings.hideCompletedAndDone,
            kind
        );
    }
    $: currentIterationStatus = getCurrentIterationStatus(
        kind,
        currentIterationsLoading,
        currentIterationsError,
        items.length,
        currentIterations
    );
    $: currentIterationTitle = getCurrentIterationTitle(
        teamName,
        currentIterationsError,
        useSampleData,
        currentIterations
    );

    const sampleItems: Record<"assigned" | "followed", WorkItem[]> = {
        assigned: [
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
        ],
        followed: [
            {
                id: 1063,
                title: "Review mobile navigation changes",
                type: "User Story",
                state: "Active",
                project: "Customer Experience",
                url: "https://dev.azure.com/contoso/Customer%20Experience/_workitems/edit/1063",
            },
            {
                id: 1072,
                title: "Investigate payment timeout reports",
                type: "Bug",
                state: "New",
                project: "Travel Platform",
                url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1072",
            },
            {
                id: 1102,
                title: "Done: retire legacy booking endpoint",
                type: "Task",
                state: "Done",
                project: "Travel Platform",
                url: "https://dev.azure.com/contoso/Travel%20Platform/_workitems/edit/1102",
            },
        ],
    };
    const sampleCurrentIterations: ProjectCurrentIteration[] = [
        {
            project: "Travel Platform",
            name: "Sprint 24",
            startDate: "2026-10-19T00:00:00Z",
            finishDate: "2026-10-30T00:00:00Z",
        },
        {
            project: "Customer Experience",
            name: "Sprint 18",
            startDate: "2026-10-19T00:00:00Z",
            finishDate: "2026-10-30T00:00:00Z",
        },
    ];

    function formatIterationDate(value?: string | null): string {
        if (!value) {
            return "";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(date);
    }

    function getIterationDateRange(iteration: ProjectCurrentIteration): string {
        const startDate = formatIterationDate(iteration.startDate);
        const finishDate = formatIterationDate(iteration.finishDate);
        if (startDate && finishDate) {
            return `${startDate} – ${finishDate}`;
        }
        return startDate || finishDate;
    }

    function getCurrentIterationStatus(
        itemKind: "assigned" | "followed",
        iterationsLoading: boolean,
        iterationsError: string,
        itemCount: number,
        iterations: ProjectCurrentIteration[]
    ): string {
        if (itemKind !== "assigned") {
            return "";
        }
        if (iterationsLoading) {
            return "Checking current sprint…";
        }
        if (iterationsError) {
            return "Sprint unavailable";
        }
        if (itemCount === 0) {
            return "";
        }
        if (iterations.length === 0) {
            return "No current sprint";
        }

        const details = iterations.map((iteration) => {
            const projectName =
                iterations.length > 1 ? `${iteration.project}: ` : "";
            const dateRange = getIterationDateRange(iteration);
            return `${projectName}${iteration.name}${dateRange ? ` · ${dateRange}` : ""}`;
        });
        return iterations.length === 1
            ? `Current sprint: ${details[0]}`
            : `Current sprints: ${details.join(" | ")}`;
    }

    function getCurrentIterationTitle(
        selectedTeam: string,
        iterationsError: string,
        isSample: boolean,
        iterations: ProjectCurrentIteration[]
    ): string {
        const teamDescription = selectedTeam.trim()
            ? `team "${selectedTeam.trim()}"`
            : "the project's default team";
        if (iterationsError) {
            return iterationsError;
        }
        if (iterations.length === 0) {
            return `No current iteration was returned for ${teamDescription} in the assigned projects.`;
        }

        return [
            isSample
                ? "Sample iterations (not queried from Azure DevOps):"
                : `Azure DevOps current iterations (${teamDescription} per project):`,
            ...iterations.map((iteration) => {
                const dateRange = getIterationDateRange(iteration);
                return `${iteration.project}: ${iteration.name}${dateRange ? ` (${dateRange})` : ""}`;
            })
        ].join("\n");
    }

    async function loadCurrentIterations(
        service: AzureDevOpsService,
        projects: string[],
        team: string,
        signal: AbortSignal,
        currentRequest: number
    ): Promise<void> {
        try {
            const iterations = await service.getCurrentIterations(
                projects,
                team,
                signal
            );
            if (currentRequest === requestNumber && !signal.aborted) {
                currentIterations = iterations;
            }
        } catch (cause) {
            if (currentRequest === requestNumber && !signal.aborted) {
                currentIterationsError =
                    cause instanceof Error
                        ? cause.message
                        : "Current sprint information could not be loaded.";
            }
        } finally {
            if (currentRequest === requestNumber) {
                currentIterationsLoading = false;
            }
        }
    }

    async function loadItems(
        org: string,
        token: string,
        team: string,
        hideCompletedAndDone: boolean,
        itemKind: "assigned" | "followed"
    ): Promise<void> {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const currentRequest = ++requestNumber;
        loading = true;
        error = "";
        items = [];
        currentIterations = [];
        currentIterationsError = "";
        currentIterationsLoading = itemKind === "assigned";

        try {
            if (
                !isPreviewMode &&
                !(await hasAuthenticationInfoAccess())
            ) {
                throw new Error(
                    "Save your Azure DevOps settings again to approve sending your PAT to Azure DevOps."
                );
            }

            if (useSampleData) {
                const hiddenStates = hideCompletedAndDone
                    ? ["completed", "done"]
                    : [];
                items = sampleItems[itemKind].filter(
                    (item) => !hiddenStates.includes(item.state.toLowerCase())
                );
                currentIterations =
                    itemKind === "assigned" ? sampleCurrentIterations : [];
                currentIterationsLoading = false;
            } else {
                const service = new AzureDevOpsService(org, token);
                items =
                    itemKind === "assigned"
                        ? await service.getAssignedWorkItems(
                              controller.signal,
                              hideCompletedAndDone
                          )
                        : await service.getFollowedWorkItems(
                              controller.signal,
                              hideCompletedAndDone
                          );
                if (itemKind === "assigned") {
                    const projects = Array.from(
                        new Set(
                            items
                                .map((item) => item.project)
                                .filter((project) => project.length > 0)
                        )
                    );
                    if (projects.length > 0) {
                        void loadCurrentIterations(
                            service,
                            projects,
                            team,
                            controller.signal,
                            currentRequest
                        );
                    } else {
                        currentIterationsLoading = false;
                    }
                }
            }
        } catch (cause) {
            if (!controller.signal.aborted) {
                error =
                    cause instanceof Error
                        ? cause.message
                        : "Work items could not be loaded.";
                currentIterationsLoading = false;
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
            teamName,
            $azureDevOpsSettings.hideCompletedAndDone,
            kind
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

<Panel title={kind === "assigned" ? "Assigned to me" : "Following"}>
    <div
        slot="heading-details"
        class="current-iteration"
        class:current-iteration--hidden={kind !== "assigned" ||
            (!currentIterationStatus && currentIterations.length === 0)}
        title={currentIterationTitle}
    >
        {#if currentIterationStatus}
            <span class="current-iteration-status">{currentIterationStatus}</span>
        {:else}
            {#if useSampleData}
                <span class="current-iteration-sample">Sample</span>
            {/if}
            {#if currentIterations.length === 1}
                <span class="current-iteration-prefix">Current sprint:</span>
                <strong class="current-iteration-name">
                    {currentIterations[0].name}
                </strong>
                {#if getIterationDateRange(currentIterations[0])}
                    <span class="current-iteration-dates">
                        {getIterationDateRange(currentIterations[0])}
                    </span>
                {/if}
            {:else}
                <span class="current-iteration-prefix">Current sprints:</span>
                <span class="current-iteration-list">
                    {#each currentIterations as iteration, index (`${iteration.project}:${iteration.name}`)}
                        {#if index > 0}
                            <span class="current-iteration-separator" aria-hidden="true">·</span>
                        {/if}
                        <span class="current-iteration-entry">
                            <span class="current-iteration-project">
                                {iteration.project}:
                            </span>
                            <strong class="current-iteration-name">
                                {iteration.name}
                            </strong>
                            {#if getIterationDateRange(iteration)}
                                <span class="current-iteration-dates">
                                    {getIterationDateRange(iteration)}
                                </span>
                            {/if}
                        </span>
                    {/each}
                </span>
            {/if}
        {/if}
    </div>
    <div slot="actions" class="panel-actions">
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
            aria-label={kind === "assigned" ? "Refresh assigned work items" : "Refresh followed work items"}
            title="Refresh"
        >
            ↻
        </button>
    </div>

    {#if kind === "assigned" && currentIterationsError}
        <p class="panel-message error current-iteration-error" role="status">
            Current sprint lookup failed: {currentIterationsError}
        </p>
    {/if}

    {#if loading}
        <p class="panel-message" aria-live="polite">
            Loading {kind === "assigned" ? "assigned" : "followed"} work items…
        </p>
    {:else if error}
        <p class="panel-message error" role="alert">{error}</p>
        <button class="retry-button" type="button" on:click={refresh}>
            Try again
        </button>
    {:else if items.length === 0}
        <p class="panel-message">
            {kind === "assigned"
                ? "No open work items are assigned to you."
                : "You are not following any open work items."}
        </p>
    {:else}
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Type</th>
                        <th scope="col">Work item</th>
                        <th scope="col">Project</th>
                        <th scope="col">State</th>
                    </tr>
                </thead>
                <tbody>
                    {#each items as item (item.id)}
                        <tr>
                            <td class="id-cell">{item.id}</td>
                            <td class="type-cell">
                                <span class="work-item-type">{item.type}</span>
                            </td>
                            <td class="title-cell">
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
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
                Showing the {MAX_WORK_ITEMS} most recently changed open items
                {kind === "assigned" ? " assigned to you." : " you are following."}
            </p>
        {/if}
    {/if}
    {#if kind === "assigned"}
        <label class="completed-filter">
            Hide completed and done
            <input
                type="checkbox"
                checked={$azureDevOpsSettings.hideCompletedAndDone}
                on:change={updateCompletedFilter}
            />
        </label>
    {/if}
</Panel>

<style>
    .refresh-button,
    .retry-button {
        border: 0;
        border-radius: 0.4rem;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        background: rgba(255, 255, 255, 0.14);
        cursor: pointer;
        font: inherit;
    }

    .preview-badge {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.72);
        font-size: 0.65rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .current-iteration {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.3rem;
        min-width: 0;
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
        font-size: 0.76rem;
        font-weight: 500;
        line-height: 1.4;
        overflow-wrap: anywhere;
    }

    .current-iteration--hidden {
        display: none;
    }

    .current-iteration-prefix,
    .current-iteration-status,
    .current-iteration-project {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.72);
        font-size: 0.72rem;
        font-weight: 500;
    }

    .current-iteration-name {
        padding: 0.05rem 0.35rem;
        border: 1px solid rgba(104, 223, 255, 0.42);
        border-radius: 0.35rem;
        color: rgb(var(--theme-text-accent-rgb, 104, 223, 255));
        background: rgba(67, 195, 231, 0.16);
        font-size: 0.86rem;
        font-weight: 700;
    }

    .current-iteration-dates,
    .current-iteration-separator {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.7);
        font-size: 0.72rem;
        font-weight: 400;
    }

    .current-iteration-entry {
        display: inline-flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .current-iteration-sample {
        padding: 0.1rem 0.35rem;
        border-radius: 1rem;
        color: #17232e;
        background: #f0c987;
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
    }

    .completed-filter {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.3rem;
        width: 100%;
        box-sizing: border-box;
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
        font-size: 0.68rem;
        white-space: nowrap;
        margin-top: 1em;
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

    .current-iteration-error {
        font-size: 0.72rem;
        overflow-wrap: anywhere;
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
        color: rgb(var(--theme-text-primary-rgb, 245, 247, 250));
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
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.72);
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    th:nth-child(1),
    td:nth-child(1) {
        width: 3rem;
    }

    .id-cell {
        color: rgb(var(--theme-text-primary-rgb, 245, 247, 250));
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }

    .project-cell {
        color: rgb(var(--theme-text-primary-rgb, 245, 247, 250));
    }

    .title-cell,
    .project-cell {
        overflow-wrap: break-word;
    }

    a {
        color: rgb(var(--theme-text-accent-rgb, 198, 237, 249));
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    .work-item-type {
        display: inline-block;
        max-width: 100%;
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.7);
        font-size: 0.68rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.72);
        font-size: 0.72rem;
    }
</style>
