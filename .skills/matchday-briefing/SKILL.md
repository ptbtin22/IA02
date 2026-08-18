---
name: matchday-briefing
description: Prepare a comprehensive football matchday briefing, title race breakdown, and fixture preview
---

# Matchday Briefing Procedural Guide

Follow these sequential steps when the user asks for a football matchday briefing, title race analysis, or weekend fixture preview:

1. **Step 1 — Query League Standings**:
   Call the `get_competition_standings` tool with `competition: "PL"` (or the requested league code like `CL`, `PD`).

2. **Step 2 — Query Match Fixtures & Scores**:
   Call the `get_recent_matches` tool for the same competition code to retrieve recent scores and upcoming match fixtures.

3. **Step 3 — Synthesize the Matchday Report**:
   Format the output into a clean, markdown report with:
   - 🏆 **League Leaderboard**: Top 4 teams with points and goal differences.
   - ⚔️ **Recent Fixtures & Scores**: Highlights from recent matches.
   - 🔍 **Title Race Insights**: Analysis of key rivalries and upcoming crucial clashes.
