import type {
    SportsFixtures,
    SportsKind,
    SportsMatch,
    SportsMatchStatus,
    SportsTeam,
} from "../models/sports";

const API_BASE_URL = "https://www.sofascore.com/api/v1";
const FIXTURE_CACHE_DURATION_MS = 15 * 60 * 1000;

export const SPORTS_FIXTURE_CACHE_DURATION_MS = FIXTURE_CACHE_DURATION_MS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const asString = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return null;
};

const asPositiveInteger = (value: unknown): number | null => {
    const numberValue =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim()
              ? Number(value)
              : NaN;
    return Number.isSafeInteger(numberValue) && numberValue > 0
        ? numberValue
        : null;
};

const asFiniteNumber = (value: unknown): number | null => {
    const numberValue =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim()
              ? Number(value)
              : NaN;
    return Number.isFinite(numberValue) ? numberValue : null;
};

const fetchJson = async (url: URL, signal?: AbortSignal): Promise<unknown> => {
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) {
        throw new Error(`SofaScore request failed with HTTP ${response.status}.`);
    }
    return response.json() as Promise<unknown>;
};

export const getSportsTeamLogoUrl = (teamId: number): string =>
    `${API_BASE_URL}/team/${teamId}/image`;

export const searchSportsTeams = async (
    query: string,
    sport: SportsKind,
    signal?: AbortSignal
): Promise<SportsTeam[]> => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
        throw new Error("Enter at least two characters to search for a team.");
    }

    const url = new URL(`${API_BASE_URL}/search/all`);
    url.searchParams.set("q", searchTerm);

    const response = await fetchJson(url, signal);
    if (!isRecord(response) || !Array.isArray(response.results)) {
        throw new Error("SofaScore returned an invalid team-search response.");
    }

    const teams: SportsTeam[] = [];
    const seenTeamIds = new Set<number>();
    for (const result of response.results) {
        if (!isRecord(result) || result.type !== "team") {
            continue;
        }

        const entity = isRecord(result.entity) ? result.entity : null;
        const teamSport = entity && isRecord(entity.sport) ? entity.sport : null;
        if (teamSport?.slug !== sport || !entity) {
            continue;
        }

        const id = asPositiveInteger(entity.id);
        const name = asString(entity.name);
        if (!id || !name || seenTeamIds.has(id)) {
            continue;
        }

        const country = isRecord(entity.country) ? entity.country : null;
        teams.push({
            id,
            name,
            sport,
            countryName: country ? asString(country.name) : null,
            gender: asString(entity.gender),
            national: entity.national === true,
        });
        seenTeamIds.add(id);
    }

    return teams.slice(0, 12);
};

interface SportsCache {
    fetchedAt: number;
    fixtures: SportsFixtures;
}

const cacheKey = (team: SportsTeam): string =>
    `sports-fixtures:${team.sport}:${team.id}`;

export const clearFixtureCache = (team: SportsTeam): void => {
    window.localStorage.removeItem(cacheKey(team));
};

const isSportsMatch = (value: unknown): value is SportsMatch => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        asPositiveInteger(value.id) !== null &&
        asFiniteNumber(value.startTimestamp) !== null &&
        typeof value.homeTeam === "string" &&
        asPositiveInteger(value.homeTeamId) !== null &&
        typeof value.awayTeam === "string" &&
        asPositiveInteger(value.awayTeamId) !== null &&
        (value.homeScore === null || typeof value.homeScore === "string") &&
        (value.awayScore === null || typeof value.awayScore === "string") &&
        (value.status === "live" ||
            value.status === "finished" ||
            value.status === "scheduled" ||
            value.status === "unknown") &&
        typeof value.statusDescription === "string" &&
        typeof value.note === "string"
    );
};

const isSportsFixtures = (value: unknown): value is SportsFixtures =>
    isRecord(value) &&
    (value.last === null || isSportsMatch(value.last)) &&
    (value.current === null || isSportsMatch(value.current)) &&
    (value.next === null || isSportsMatch(value.next));

const readCache = (team: SportsTeam): SportsFixtures | null => {
    const key = cacheKey(team);
    const storedCache = window.localStorage.getItem(key);
    if (!storedCache) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedCache);
        if (
            !isRecord(parsed) ||
            typeof parsed.fetchedAt !== "number" ||
            !Number.isFinite(parsed.fetchedAt) ||
            !isSportsFixtures(parsed.fixtures)
        ) {
            throw new Error("The cached sports fixtures have an invalid format.");
        }
        if (
            Date.now() - parsed.fetchedAt >= FIXTURE_CACHE_DURATION_MS ||
            parsed.fetchedAt > Date.now() + 60_000
        ) {
            return null;
        }
        return parsed.fixtures;
    } catch (error) {
        console.error("The cached sports fixtures could not be loaded.", error);
        window.localStorage.removeItem(key);
        return null;
    }
};

const getScoreValue = (value: unknown): string | null => asString(value);

const formatCricketScore = (score: Record<string, unknown>): string | null => {
    const innings = isRecord(score.innings)
        ? Object.values(score.innings)
        : [];
    const inningsScores = innings
        .map((value) => {
            if (!isRecord(value)) {
                return null;
            }

            const runs = getScoreValue(value.score);
            if (!runs) {
                return null;
            }

            const wickets = getScoreValue(value.wickets);
            const overs = getScoreValue(value.overs);
            return `${runs}${wickets ? `/${wickets}` : ""}${overs ? ` (${overs})` : ""}`;
        })
        .filter((value): value is string => value !== null);

    if (inningsScores.length > 0) {
        return inningsScores.join(" & ");
    }

    return getScoreValue(score.display) ?? getScoreValue(score.current);
};

const formatScore = (value: unknown, sport: SportsKind): string | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (sport === "cricket") {
        return formatCricketScore(value);
    }
    return getScoreValue(value.display) ?? getScoreValue(value.current);
};

const getStatus = (value: unknown): {
    status: SportsMatchStatus;
    description: string;
} => {
    const status = isRecord(value) ? value : null;
    const statusType = asString(status?.type)?.toLocaleLowerCase() ?? "";
    const description = asString(status?.description) ?? "";
    const normalizedDescription = description.toLocaleLowerCase();

    if (
        ["inprogress", "live", "halftime", "paused"].includes(statusType) ||
        /\b(live|in progress|stumps)\b/.test(normalizedDescription)
    ) {
        return { status: "live", description };
    }
    if (
        ["finished", "ended", "after"].includes(statusType) ||
        status?.code === 100 ||
        /\b(full time|finished|ended)\b/.test(normalizedDescription)
    ) {
        return { status: "finished", description };
    }
    if (
        ["notstarted", "scheduled"].includes(statusType) ||
        status?.code === 0
    ) {
        return { status: "scheduled", description };
    }
    return { status: "unknown", description };
};

const parseEvent = (value: unknown, team: SportsTeam): SportsMatch | null => {
    if (!isRecord(value)) {
        return null;
    }

    const homeTeam = isRecord(value.homeTeam) ? value.homeTeam : null;
    const awayTeam = isRecord(value.awayTeam) ? value.awayTeam : null;
    if (!homeTeam || !awayTeam) {
        return null;
    }

    const homeTeamId = asPositiveInteger(homeTeam.id);
    const awayTeamId = asPositiveInteger(awayTeam.id);
    const homeTeamName = asString(homeTeam.name);
    const awayTeamName = asString(awayTeam.name);
    const id = asPositiveInteger(value.id);
    const startTimestampValue = asFiniteNumber(value.startTimestamp);
    if (
        !homeTeamId ||
        !awayTeamId ||
        !homeTeamName ||
        !awayTeamName ||
        !id ||
        startTimestampValue === null ||
        (homeTeamId !== team.id && awayTeamId !== team.id)
    ) {
        return null;
    }

    const homeSport = isRecord(homeTeam.sport) ? homeTeam.sport : null;
    const awaySport = isRecord(awayTeam.sport) ? awayTeam.sport : null;
    if (
        (homeSport?.slug && homeSport.slug !== team.sport) ||
        (awaySport?.slug && awaySport.slug !== team.sport)
    ) {
        return null;
    }

    const timestamp =
        startTimestampValue > 1_000_000_000_000
            ? Math.floor(startTimestampValue / 1000)
            : Math.floor(startTimestampValue);
    const status = getStatus(value.status);

    return {
        id,
        startTimestamp: timestamp,
        homeTeam: homeTeamName,
        homeTeamId,
        awayTeam: awayTeamName,
        awayTeamId,
        homeScore: formatScore(value.homeScore, team.sport),
        awayScore: formatScore(value.awayScore, team.sport),
        status: status.status,
        statusDescription: status.description,
        note: asString(value.note) ?? "",
    };
};

const fetchTeamEvents = async (
    team: SportsTeam,
    period: "last" | "next",
    signal?: AbortSignal
): Promise<unknown[]> => {
    const url = new URL(`${API_BASE_URL}/team/${team.id}/events/${period}/0`);
    const response = await fetchJson(url, signal);
    if (!isRecord(response) || !Array.isArray(response.events)) {
        throw new Error("SofaScore returned an invalid team-events response.");
    }
    return response.events;
};

const sortByTime = (
    matches: SportsMatch[],
    direction: "ascending" | "descending"
): SportsMatch[] =>
    [...matches].sort((first, second) =>
        direction === "ascending"
            ? first.startTimestamp - second.startTimestamp
            : second.startTimestamp - first.startTimestamp
    );

export const getSportsFixtures = async (
    team: SportsTeam,
    signal?: AbortSignal,
    forceRefresh = false
): Promise<SportsFixtures> => {
    if (!forceRefresh) {
        const cachedFixtures = readCache(team);
        if (cachedFixtures) {
            return cachedFixtures;
        }
    }

    const [lastEvents, nextEvents] = await Promise.all([
        fetchTeamEvents(team, "last", signal),
        fetchTeamEvents(team, "next", signal),
    ]);
    const matchesById = new Map<number, SportsMatch>();
    for (const event of [...lastEvents, ...nextEvents]) {
        const match = parseEvent(event, team);
        if (match) {
            matchesById.set(match.id, match);
        }
    }

    const matches = [...matchesById.values()];
    const now = Math.floor(Date.now() / 1000);
    const current =
        sortByTime(
            matches.filter((match) => match.status === "live"),
            "ascending"
        )[0] ?? null;
    const last =
        sortByTime(
            matches.filter(
                (match) =>
                    match.status === "finished" ||
                    (match.status === "unknown" &&
                        match.startTimestamp <= now &&
                        (match.homeScore !== null || match.awayScore !== null))
            ),
            "descending"
        )[0] ?? null;
    const next =
        sortByTime(
            matches.filter(
                (match) =>
                    match.status === "scheduled" ||
                    (match.status === "unknown" && match.startTimestamp >= now)
            ),
            "ascending"
        )[0] ?? null;

    const fixtures: SportsFixtures = { last, current, next };
    window.localStorage.setItem(
        cacheKey(team),
        JSON.stringify({ fetchedAt: Date.now(), fixtures } satisfies SportsCache)
    );
    return fixtures;
};
