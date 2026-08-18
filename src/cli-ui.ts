/**
 * Modern Terminal UI Styling & ANSI Formatting Helpers
 */

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Bright Foreground
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Backgrounds
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgDark: "\x1b[40m",
};

/**
 * Print modern high-contrast banner header
 */
export function printHeaderBanner(): void {
  console.log(`\n${colors.cyan}╭──────────────────────────────────────────────────────────────────────────────────╮${colors.reset}`);
  console.log(`${colors.cyan}│${colors.reset}  ${colors.bold}${colors.brightWhite}🤖 ADVANCED MCP AGENT HOST — INTERACTIVE CLI${colors.reset}                                 ${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}│${colors.reset}     ${colors.dim}Model Context Protocol Ecosystem | Standard I/O & HTTP Transports${colors.reset}          ${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}╰──────────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
}

/**
 * Print server status card
 */
export function printServerStatus(serverName: string, toolsCount: number, resCount: number, promptCount: number): void {
  console.log(
    `  ${colors.green}🟢 [CONNECTED]${colors.reset} ${colors.bold}${colors.brightCyan}${serverName.padEnd(20)}${colors.reset} ${colors.dim}│ ${toolsCount} tools │ ${resCount} resources │ ${promptCount} prompts${colors.reset}`
  );
}

/**
 * Print turn separator badge
 */
export function printTurnBadge(turn: number): void {
  console.log(`\n${colors.magenta}─── 🔄 Agent Reasoning Loop (Turn ${turn}) ───────────────────────────────────${colors.reset}`);
}

/**
 * Print tool call badge
 */
export function printToolCallBadge(fnName: string, args: Record<string, unknown>): void {
  console.log(
    `  ${colors.yellow}⚙️  [CALLING TOOL]${colors.reset} ${colors.bold}${colors.brightYellow}${fnName}${colors.reset}(${colors.dim}${JSON.stringify(args)}${colors.reset})`
  );
}

/**
 * Print tool result preview
 */
export function printToolResultPreview(resultText: string): void {
  const cleanSnippet = resultText.trim().replace(/\n/g, " ").slice(0, 120);
  console.log(`     ${colors.dim}└─► Result:${colors.reset} ${colors.green}${cleanSnippet}${resultText.length > 120 ? "..." : ""}${colors.reset}`);
}

/**
 * Print skill usage banner
 */
export function printSkillBanner(skillName: string): void {
  console.log(`\n${colors.brightMagenta}╭── 🚀 Skill Activated: "${skillName}" ──────────────────────────────────────────╮${colors.reset}`);
  console.log(`${colors.brightMagenta}│${colors.reset}  ${colors.dim}Loaded procedural execution rules from .skills/${skillName}/SKILL.md${colors.reset}       ${colors.brightMagenta}│${colors.reset}`);
  console.log(`${colors.brightMagenta}╰──────────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
}

/**
 * Print Agent Response Box
 */
export function printAgentResponse(content: string): void {
  console.log(`\n${colors.brightCyan}╭── 💬 Agent Response ─────────────────────────────────────────────────────────────╮${colors.reset}`);
  console.log(content);
  console.log(`${colors.brightCyan}╰──────────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
}
