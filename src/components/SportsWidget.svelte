<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { SportsFixtures, SportsMatch, SportsTeam } from "../models/sports";
    import {
        getSportsFixtures,
        getSportsTeamLogoUrl,
        SPORTS_FIXTURE_CACHE_DURATION_MS,
    } from "../services/sports.service";

    export let team: SportsTeam;

    let fixtures: SportsFixtures | null = null;
    let loading = false;
    let error = "";
    let logoFailed = false;
    let activeController: AbortController | null = null;
    let requestNumber = 0;

    const sportLabel = team.sport === "football" ? "Football" : "Cricket";
    const shortDateFormat = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });
    const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    async function loadFixtures(forceRefresh = false): Promise<void> {
        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const currentRequest = ++requestNumber;
        error = "";
        loading = fixtures === null;

        try {
            fixtures = await getSportsFixtures(team, controller.signal, forceRefresh);
        } catch (cause) {
            if (!controller.signal.aborted) {
                error =
                    cause instanceof Error
                        ? cause.message
                        : "Sports fixtures could not be loaded.";
            }
        } finally {
            if (currentRequest === requestNumber) {
                loading = false;
            }
        }
    }

    function formatDate(timestamp: number, includeTime: boolean): string {
        const date = new Date(timestamp * 1000);
        return (includeTime ? dateTimeFormat : shortDateFormat).format(date);
    }

    function getOpponent(match: SportsMatch): string {
        return match.homeTeamId === team.id ? match.awayTeam : match.homeTeam;
    }

    function getScoreSummary(match: SportsMatch): string {
        const isHome = match.homeTeamId === team.id;
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;
        if (!teamScore && !opponentScore) {
            return `vs ${getOpponent(match)}`;
        }

        return `${teamScore ?? "—"}–${opponentScore ?? "—"} vs ${getOpponent(match)}`;
    }

    function buildSearchUrl(): string {
        const match = fixtures?.current ?? fixtures?.next ?? fixtures?.last;
        const searchTerms = match
            ? `${team.name} ${sportLabel.toLocaleLowerCase()} ${match.homeTeam} vs ${match.awayTeam} ${formatDate(match.startTimestamp, false)}`
            : `${team.name} ${sportLabel.toLocaleLowerCase()} fixtures`;
        return `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
    }

    function handleLogoError(): void {
        logoFailed = true;
    }

    onMount(() => {
        void loadFixtures();
        const refreshTimer = window.setInterval(
            () => void loadFixtures(true),
            SPORTS_FIXTURE_CACHE_DURATION_MS
        );
        return () => window.clearInterval(refreshTimer);
    });

    onDestroy(() => activeController?.abort());
</script>

<a
    class="sports-widget"
    class:football-widget={team.sport === "football"}
    class:cricket-widget={team.sport === "cricket"}
    href={buildSearchUrl()}
    target="_blank"
    rel="noopener noreferrer"
    title={`Search Google for ${team.name} ${sportLabel.toLocaleLowerCase()} fixtures`}
    aria-label={`${sportLabel} fixtures for ${team.name}. Opens a Google search.`}
>
    <div class="sports-heading">
        {#if logoFailed}
            <span class="team-logo-fallback" aria-hidden="true">
                {team.name.charAt(0).toLocaleUpperCase()}
            </span>
        {:else}
            <img
                class="team-logo"
                src={getSportsTeamLogoUrl(team.id)}
                alt=""
                loading="lazy"
                on:error={handleLogoError}
            />
        {/if}
        <span class="team-identity">
            <span class="sport-label">{sportLabel}</span>
            <strong class="team-name">{team.name}</strong>
        </span>
    </div>

    {#if loading && !fixtures}
        <span class="sports-status">Loading fixtures…</span>
    {:else if error && !fixtures}
        <span class="sports-error" role="status" title={error}>
            Sports data unavailable
        </span>
    {:else if fixtures}
        <span class="match-row last-match-row">
            <span class="match-label">Last</span>
            {#if fixtures.last}
                <span class="match-details">
                    <time datetime={new Date(fixtures.last.startTimestamp * 1000).toISOString()}>
                        {formatDate(fixtures.last.startTimestamp, false)}
                    </time>
                    <span class="match-summary">{getScoreSummary(fixtures.last)}</span>
                </span>
            {:else}
                <span class="match-summary">No recent result</span>
            {/if}
        </span>

        {@const upcomingMatch = fixtures.current ?? fixtures.next}
        <span class="match-row upcoming-match-row">
            <span
                class="match-label"
                class:live={Boolean(fixtures.current)}
            >
                {fixtures.current ? "Live" : "Next"}
            </span>
            {#if upcomingMatch}
                <span class="match-details">
                    <time datetime={new Date(upcomingMatch.startTimestamp * 1000).toISOString()}>
                        {formatDate(upcomingMatch.startTimestamp, true)}
                    </time>
                    <span class="match-summary">
                        {getScoreSummary(upcomingMatch)}
                    </span>
                </span>
            {:else}
                <span class="match-summary">No upcoming fixture</span>
            {/if}
        </span>

        {#if error}
            <span class="sports-stale-status" title={error}>Update failed</span>
        {/if}
    {/if}
</a>

<style>
    .sports-widget {
        box-sizing: border-box;
        display: grid;
        align-items: center;
        column-gap: 0.4rem;
        row-gap: 0.12rem;
        min-width: min(100%, 12rem);
        padding: 0.1rem 0.55rem;
        border-left: 1px solid rgba(var(--theme-text-primary-rgb, 255, 255, 255), 0.2);
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        text-decoration: none;
    }

    .football-widget {
        flex: 1 1 18rem;
        grid-template-columns: minmax(6.2rem, 0.9fr) minmax(9.8rem, 1.45fr);
        grid-template-rows: repeat(2, minmax(1.2rem, auto));
        max-width: 23rem;
    }

    .cricket-widget {
        flex: 2 1 21rem;
        grid-template-columns:
            minmax(6.2rem, 0.9fr)
            repeat(2, minmax(6.3rem, 1fr));
        grid-template-rows: minmax(2.4rem, auto);
        max-width: 29rem;
    }

    .sports-widget:hover {
        background: rgba(var(--theme-text-primary-rgb, 255, 255, 255), 0.08);
    }

    .sports-widget:focus-visible {
        outline: 2px solid rgb(var(--theme-text-accent-rgb, 198, 237, 249));
        outline-offset: 2px;
    }

    .sports-heading {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
    }

    .football-widget .sports-heading {
        grid-column: 1;
        grid-row: 1 / span 2;
    }

    .cricket-widget .sports-heading {
        grid-column: 1;
        grid-row: 1;
    }

    .team-logo,
    .team-logo-fallback {
        flex: 0 0 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        object-fit: contain;
    }

    .team-logo-fallback {
        display: grid;
        place-items: center;
        border: 1px solid rgba(var(--theme-text-primary-rgb, 255, 255, 255), 0.3);
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
        font-size: 0.8rem;
        font-weight: 700;
    }

    .team-identity {
        display: grid;
        min-width: 0;
    }

    .sport-label {
        color: rgb(var(--theme-text-accent-rgb, 198, 237, 249));
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        line-height: 1.1;
        text-transform: uppercase;
    }

    .team-name {
        overflow: hidden;
        font-size: 0.72rem;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .match-row {
        display: grid;
        grid-template-columns: 2.05rem minmax(0, 1fr);
        gap: 0.3rem;
        min-width: 0;
        font-size: 0.61rem;
        line-height: 1.2;
    }

    .football-widget .last-match-row {
        grid-column: 2;
        grid-row: 1;
    }

    .football-widget .upcoming-match-row {
        grid-column: 2;
        grid-row: 2;
    }

    .cricket-widget .last-match-row {
        grid-column: 2;
        grid-row: 1;
    }

    .cricket-widget .upcoming-match-row {
        grid-column: 3;
        grid-row: 1;
    }

    .cricket-widget .match-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.12rem;
        align-content: center;
    }

    .match-label {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
        font-weight: 500;
    }

    .match-label.live {
        font-weight: 800;
    }

    .cricket-widget .match-label {
        font-size: 0.58rem;
    }

    .match-details {
        display: flex;
        flex-wrap: wrap;
        column-gap: 0.3rem;
        min-width: 0;
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
    }

    .cricket-widget .match-details {
        flex-direction: column;
        gap: 0.08rem;
    }

    .match-details time {
        flex: 0 0 auto;
    }

    .match-summary {
        min-width: 0;
        overflow-wrap: anywhere;
        color: rgb(var(--theme-text-primary-rgb, 255, 255, 255));
    }

    .sports-status,
    .sports-error,
    .sports-stale-status {
        color: rgba(var(--theme-text-secondary-rgb, 230, 246, 251), 0.82);
        font-size: 0.62rem;
    }

    .sports-error,
    .sports-stale-status {
        color: #ffd1d1;
    }

    .football-widget .sports-status,
    .football-widget .sports-error,
    .cricket-widget .sports-status,
    .cricket-widget .sports-error {
        grid-column: 2 / -1;
    }

    .football-widget .sports-stale-status,
    .cricket-widget .sports-stale-status {
        grid-column: 1 / -1;
    }

    @media (max-width: 820px) {
        .cricket-widget {
            grid-template-columns:
                minmax(5.8rem, 0.9fr)
                repeat(2, minmax(5.8rem, 1fr));
        }
    }

    @media (max-width: 520px) {
        .football-widget {
            grid-template-columns: minmax(5.8rem, 0.9fr) minmax(8.5rem, 1.45fr);
        }

        .cricket-widget {
            grid-template-columns:
                minmax(5.2rem, 0.85fr)
                repeat(2, minmax(5.2rem, 1fr));
            column-gap: 0.25rem;
        }

        .cricket-widget .match-row {
            font-size: 0.56rem;
        }
    }
</style>
