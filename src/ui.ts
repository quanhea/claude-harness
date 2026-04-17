// src/ui.ts — shared checkbox helpers
import { Separator } from "@inquirer/prompts";
import { TASK_GROUPS } from "./types";

export function buildGroupedChoices<T extends { value: string }>(
  items: T[],
): (T | InstanceType<typeof Separator>)[] {
  const choices: (T | InstanceType<typeof Separator>)[] = [];
  for (const group of TASK_GROUPS) {
    const groupItems = items.filter((item) => group.ids.has(item.value));
    if (groupItems.length === 0) continue;
    choices.push(new Separator(`── ${group.label} ──`));
    choices.push(...groupItems);
  }
  const allGrouped = new Set(TASK_GROUPS.flatMap((g) => [...g.ids]));
  const ungrouped = items.filter((item) => !allGrouped.has(item.value));
  if (ungrouped.length > 0) choices.push(...ungrouped);
  return choices;
}
