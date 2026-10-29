export type SportsKind = "football" | "cricket";

export interface SportsTeam {
    id: number;
    name: string;
    sport: SportsKind;
    countryName: string | null;
    gender: string | null;
    national: boolean;
}

export type SportsMatchStatus = "live" | "finished" | "scheduled" | "unknown";

export interface SportsMatch {
    id: number;
    startTimestamp: number;
    homeTeam: string;
    homeTeamId: number;
    awayTeam: string;
    awayTeamId: number;
    homeScore: string | null;
    awayScore: string | null;
    status: SportsMatchStatus;
    statusDescription: string;
    note: string;
}

export interface SportsFixtures {
    last: SportsMatch | null;
    current: SportsMatch | null;
    next: SportsMatch | null;
}

export interface SportsSettings {
    football: SportsTeam | null;
    cricket: SportsTeam | null;
}
