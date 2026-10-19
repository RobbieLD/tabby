import type WorkItem from "../models/work-item";

interface WiqlResponse {
    workItems: Array<{ id: number }>;
}

interface WorkItemsResponse {
    value: Array<{
        id: number;
        fields?: {
            "System.Title"?: string;
            "System.WorkItemType"?: string;
            "System.State"?: string;
            "System.TeamProject"?: string;
        };
    }>;
}

interface AccountMyWorkItem {
    id?: number;
    title?: string;
    workItemType?: string;
    state?: string;
    teamProject?: string;
    changedDate?: string;
}

interface AccountMyWorkResponse {
    workItemDetails?: Array<AccountMyWorkItem | null>;
}

interface TeamIterationsResponse {
    values?: Array<TeamIterationResponse>;
    value?: Array<TeamIterationResponse>;
}

interface TeamIterationResponse {
    name?: string;
    attributes?: {
        startDate?: string | null;
        finishDate?: string | null;
    };
}

export interface ProjectCurrentIteration {
    project: string;
    name: string;
    startDate?: string | null;
    finishDate?: string | null;
}

export const MAX_WORK_ITEMS = 100;
// QueryOption.Followed in the Azure DevOps Account My Work API.
const FOLLOWED_QUERY_OPTION = "3";
const CURRENT_ITERATION_TIMEFRAME = "current";

const isVisibleWorkItemState = (
    state: string,
    hideCompletedAndDone: boolean
): boolean => {
    const hiddenStates = hideCompletedAndDone
        ? ["closed", "done", "removed", "resolved", "completed"]
        : ["closed", "removed", "resolved"];
    return !hiddenStates.includes(state.toLowerCase());
};

const hasWorkItemId = (
    item: AccountMyWorkItem | null
): item is AccountMyWorkItem & { id: number } =>
    Boolean(item && typeof item.id === "number" && Number.isInteger(item.id));

const changedTime = (value?: string): number => {
    if (!value) {
        return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const normalizeOrganization = (value: string): string => {
    const organization = value.trim();
    if (!organization) {
        return "";
    }

    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,48}[A-Za-z0-9])?$/.test(organization)) {
        throw new Error(
            "Enter the Azure DevOps organization name only (for example, contoso)."
        );
    }

    return organization;
};

export default class AzureDevOpsService {
    private readonly organization: string;
    private readonly pat: string;

    public constructor(organization: string, pat: string) {
        this.organization = normalizeOrganization(organization);
        this.pat = pat.trim();

        if (!this.organization || !this.pat) {
            throw new Error("Enter an Azure DevOps organization and personal access token.");
        }
    }

    public async getAssignedWorkItems(
        signal?: AbortSignal,
        hideCompletedAndDone = true
    ): Promise<WorkItem[]> {
        const wiqlUrl = new URL(
            `https://dev.azure.com/${encodeURIComponent(
                this.organization
            )}/_apis/wit/wiql`
        );
        wiqlUrl.searchParams.set("api-version", "7.1");
        wiqlUrl.searchParams.set("$top", MAX_WORK_ITEMS.toString());

        const stateFilter = hideCompletedAndDone
            ? "AND [System.State] NOT IN ('Closed', 'Done', 'Removed', 'Resolved', 'Completed') "
            : "AND [System.State] NOT IN ('Closed', 'Removed', 'Resolved') ";
        const wiqlResponse = await this.request(wiqlUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query:
                    "SELECT [System.Id] FROM WorkItems " +
                    "WHERE [System.AssignedTo] = @Me " +
                    stateFilter +
                    "ORDER BY [System.ChangedDate] DESC",
            }),
            signal,
        });
        const wiql = (await wiqlResponse.json()) as WiqlResponse;
        if (
            !wiql ||
            !Array.isArray(wiql.workItems) ||
            wiql.workItems.some((item) => !item || !Number.isInteger(item.id))
        ) {
            throw new Error("Azure DevOps returned an invalid work item query response.");
        }
        const ids = wiql.workItems.map((item) => item.id);

        if (ids.length === 0) {
            return [];
        }

        const workItemsUrl = new URL(
            `https://dev.azure.com/${encodeURIComponent(
                this.organization
            )}/_apis/wit/workitems`
        );
        workItemsUrl.searchParams.set("ids", ids.join(","));
        workItemsUrl.searchParams.set(
            "fields",
            [
                "System.Title",
                "System.WorkItemType",
                "System.State",
                "System.TeamProject",
            ].join(",")
        );
        workItemsUrl.searchParams.set("api-version", "7.1");

        const workItemsResponse = await this.request(workItemsUrl, { signal });
        const result = (await workItemsResponse.json()) as WorkItemsResponse;
        if (
            !result ||
            !Array.isArray(result.value) ||
            result.value.some((item) => !item || !Number.isInteger(item.id))
        ) {
            throw new Error("Azure DevOps returned invalid work item details.");
        }

        const workItems = result.value.map((item) => {
            const fields = item.fields || {};
            return this.toWorkItem(
                item.id,
                fields["System.Title"],
                fields["System.WorkItemType"],
                fields["System.State"],
                fields["System.TeamProject"]
            );
        });
        const itemsById = new Map(
            workItems.map((item) => [item.id, item] as [number, WorkItem])
        );

        return ids.reduce<WorkItem[]>((orderedItems, id) => {
            const item = itemsById.get(id);
            if (item) {
                orderedItems.push(item);
            }
            return orderedItems;
        }, []);
    }

    public async getFollowedWorkItems(
        signal?: AbortSignal,
        hideCompletedAndDone = true
    ): Promise<WorkItem[]> {
        // Azure DevOps marks this My Work API internal-only; WIQL has no Followed macro.
        const myWorkUrl = new URL(
            `https://dev.azure.com/${encodeURIComponent(
                this.organization
            )}/_apis/work/accountMyWork`
        );
        myWorkUrl.searchParams.set("$queryOption", FOLLOWED_QUERY_OPTION);
        myWorkUrl.searchParams.set("api-version", "7.1-preview.1");

        const response = await this.request(myWorkUrl, { signal });
        const result = (await response.json()) as AccountMyWorkResponse;
        if (
            !result ||
            !Array.isArray(result.workItemDetails)
        ) {
            throw new Error("Azure DevOps returned invalid followed work item details.");
        }

        const itemsWithIds = result.workItemDetails.filter(hasWorkItemId);
        if (itemsWithIds.length !== result.workItemDetails.length) {
            throw new Error("Azure DevOps returned invalid followed work item details.");
        }

        return itemsWithIds
            .filter((item) =>
                isVisibleWorkItemState(item.state || "Unknown", hideCompletedAndDone)
            )
            .sort(
                (left, right) =>
                    changedTime(right.changedDate) - changedTime(left.changedDate)
            )
            .slice(0, MAX_WORK_ITEMS)
            .map((item) =>
                this.toWorkItem(
                    item.id,
                    item.title,
                    item.workItemType,
                    item.state,
                    item.teamProject
                )
            );
    }

    public async getCurrentIterations(
        projects: string[],
        teamName = "",
        signal?: AbortSignal
    ): Promise<ProjectCurrentIteration[]> {
        const team = teamName.trim();
        const uniqueProjects = Array.from(
            new Set(projects.map((project) => project.trim()).filter(Boolean))
        );
        const iterationsByProject: ProjectCurrentIteration[][] = [];

        for (let index = 0; index < uniqueProjects.length; index += 5) {
            const projectBatch = uniqueProjects.slice(index, index + 5);
            const batchIterations = await Promise.all(
                projectBatch.map(async (project) => {
                    const iterationsUrl = new URL(
                        `https://dev.azure.com/${encodeURIComponent(
                            this.organization
                        )}/${encodeURIComponent(
                            project
                        )}${team ? `/${encodeURIComponent(team)}` : ""}/_apis/work/teamsettings/iterations`
                    );
                    iterationsUrl.searchParams.set(
                        "$timeframe",
                        CURRENT_ITERATION_TIMEFRAME
                    );
                    iterationsUrl.searchParams.set("api-version", "7.1");

                    let response: Response;
                    try {
                        response = await this.request(iterationsUrl, { signal });
                    } catch (cause) {
                        if (signal?.aborted) {
                            throw cause;
                        }
                        const teamDescription = team
                            ? `team "${team}"`
                            : "the project's default team";
                        const detail =
                            cause instanceof Error
                                ? cause.message
                                : "Unknown Azure DevOps error.";
                        throw new Error(
                            `Current iteration lookup for ${teamDescription} in project "${project}" failed: ${detail}`
                        );
                    }
                    const result =
                        (await response.json()) as TeamIterationsResponse;
                    const iterations = result?.value ?? result?.values;
                    if (!Array.isArray(iterations)) {
                        throw new Error(
                            `Azure DevOps returned invalid current iteration data for project "${project}".`
                        );
                    }

                    return iterations.map((iteration) => {
                        if (
                            !iteration ||
                            typeof iteration.name !== "string" ||
                            !iteration.name.trim()
                        ) {
                            throw new Error(
                                `Azure DevOps returned invalid current iteration data for project "${project}".`
                            );
                        }

                        return {
                            project,
                            name: iteration.name.trim(),
                            startDate: iteration.attributes?.startDate,
                            finishDate: iteration.attributes?.finishDate,
                        };
                    });
                })
            );
            iterationsByProject.push(...batchIterations);
        }

        return iterationsByProject.reduce<ProjectCurrentIteration[]>(
            (allIterations, projectIterations) => {
                allIterations.push(...projectIterations);
                return allIterations;
            },
            []
        );
    }

    private toWorkItem(
        id: number,
        title?: string,
        type?: string,
        state?: string,
        project?: string
    ): WorkItem {
        const projectName = project || "";
        const itemPath = projectName
            ? `/${encodeURIComponent(projectName)}`
            : "";
        return {
            id,
            title: title || "Untitled work item",
            type: type || "Work item",
            state: state || "Unknown",
            project: projectName,
            url: `https://dev.azure.com/${encodeURIComponent(
                this.organization
            )}${itemPath}/_workitems/edit/${id}`,
        };
    }

    private async request(url: URL, init: RequestInit): Promise<Response> {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Basic ${btoa(`:${this.pat}`)}`);

        const response = await fetch(url, { ...init, headers });
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Azure DevOps rejected this token. Check that it is active and has Work Items (Read) access."
            );
        }
        if (!response.ok) {
            throw new Error(
                `Azure DevOps request failed with HTTP ${response.status}.`
            );
        }

        return response;
    }
}
