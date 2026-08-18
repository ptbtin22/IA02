/**
 * Fallback demo data for popular competitions when offline or unconfigured
 */
export function getDemoFootballData(endpoint: string): Record<string, unknown> {
  if (endpoint.includes("/standings")) {
    return {
      competition: { name: "Premier League", code: "PL" },
      standings: [
        {
          table: [
            { position: 1, team: { name: "Arsenal" }, playedGames: 28, points: 64, goalDifference: 45 },
            { position: 2, team: { name: "Liverpool" }, playedGames: 28, points: 64, goalDifference: 39 },
            { position: 3, team: { name: "Manchester City" }, playedGames: 28, points: 63, goalDifference: 35 },
            { position: 4, team: { name: "Aston Villa" }, playedGames: 29, points: 56, goalDifference: 18 },
          ],
        },
      ],
    };
  }
  if (endpoint.includes("/matches")) {
    return {
      matches: [
        { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, score: { fullTime: { home: 5, away: 0 } }, status: "FINISHED" },
        { homeTeam: { name: "Manchester City" }, awayTeam: { name: "Liverpool" }, score: { fullTime: { home: 1, away: 1 } }, status: "FINISHED" },
      ],
    };
  }
  return {
    competitions: [
      { name: "Premier League", code: "PL", area: { name: "England" } },
      { name: "UEFA Champions League", code: "CL", area: { name: "Europe" } },
      { name: "Primera Division", code: "PD", area: { name: "Spain" } },
      { name: "Serie A", code: "SA", area: { name: "Italy" } },
      { name: "Bundesliga", code: "BL1", area: { name: "Germany" } },
    ],
  };
}
