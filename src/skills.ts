import fs from "node:fs";
import path from "node:path";
import type { SkillIndex } from "./types.js";

const SKILLS_DIR = ".skills";

/**
 * Scan .skills/ directory for SKILL.md frontmatter (Cheap startup index)
 */
export function loadSkillsIndex(): SkillIndex[] {
  const skills: SkillIndex[] = [];
  if (!fs.existsSync(SKILLS_DIR)) {
    return skills;
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillFile = path.join(SKILLS_DIR, entry.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, "utf-8");
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = entry.name;
        let description = "Skill workflow";

        if (frontmatterMatch) {
          const fmText = frontmatterMatch[1];
          const nameMatch = fmText.match(/name:\s*(.+)/);
          const descMatch = fmText.match(/description:\s*(.+)/);
          if (nameMatch) name = nameMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
        }

        skills.push({ name, description, filePath: skillFile, fullContent: content });
      }
    }
  }
  return skills;
}
