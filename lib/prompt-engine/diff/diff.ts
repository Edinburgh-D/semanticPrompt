import {
  VisualSpecSchema,
  type VisualSpec,
  type VisualSpecLocks,
} from "../schemas/visual-spec";
import {
  VisualSpecDiffSchema,
  type VisualSpecDiffEntry,
  type VisualSpecModule,
} from "./schemas";

export const VISUAL_SPEC_MODULES = [
  "subject",
  "identity",
  "appearance",
  "wardrobe",
  "pose",
  "composition",
  "camera",
  "environment",
  "lighting",
  "color",
  "aesthetic",
  "constraints",
  "negativeConstraints",
  "references",
] as const satisfies readonly VisualSpecModule[];

export const LOCKABLE_VISUAL_SPEC_MODULES = [
  "identity",
  "wardrobe",
  "pose",
  "camera",
  "environment",
  "lighting",
] as const satisfies readonly (keyof VisualSpecLocks)[];

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectDiff(
  before: unknown,
  after: unknown,
  path: string,
  moduleKey: VisualSpecModule,
  locked: boolean,
  entries: VisualSpecDiffEntry[],
): void {
  if (isEqual(before, after)) return;

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      collectDiff(before[key], after[key], `${path}.${key}`, moduleKey, locked, entries);
    }
    return;
  }

  const kind = before === undefined ? "added" : after === undefined ? "removed" : "changed";
  entries.push({ path, module: moduleKey, kind, before, after, locked });
}

/** Returns stable, leaf-level changes between two validated VisualSpecs. */
export function diffVisualSpecs(beforeInput: unknown, afterInput: unknown): VisualSpecDiffEntry[] {
  const before = VisualSpecSchema.parse(beforeInput);
  const after = VisualSpecSchema.parse(afterInput);
  const entries: VisualSpecDiffEntry[] = [];

  for (const moduleKey of VISUAL_SPEC_MODULES) {
    const locked =
      moduleKey in after.locks && after.locks[moduleKey as keyof VisualSpecLocks];
    collectDiff(before[moduleKey], after[moduleKey], moduleKey, moduleKey, locked, entries);
  }

  return VisualSpecDiffSchema.parse(entries);
}

/** Applies a candidate spec while preserving every module locked on the current spec. */
export function mergeVisualSpecRespectingLocks(
  currentInput: unknown,
  candidateInput: unknown,
): VisualSpec {
  const current = VisualSpecSchema.parse(currentInput);
  const candidate = VisualSpecSchema.parse(candidateInput);
  const merged: VisualSpec = { ...candidate, locks: current.locks };

  for (const moduleKey of LOCKABLE_VISUAL_SPEC_MODULES) {
    if (current.locks[moduleKey]) {
      Object.assign(merged, { [moduleKey]: current[moduleKey] });
    }
  }

  return VisualSpecSchema.parse(merged);
}
