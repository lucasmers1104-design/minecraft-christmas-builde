import { z } from 'zod';
import type { ParsedDescription, SpecPatch } from '@/core/generator/parseDescription';
import { buildOptionsSchema, compactOptions, type BuildOptions } from '@/core/schema/buildOptions';
import { buildSpecSchema, type BuildSpec } from '@/core/schema/buildSpec';

/** Validates stored or transmitted manual settings (same fields as the text parser fills). */
export const specPatchSchema = buildSpecSchema
  .pick({ kind: true, style: true, size: true, materialTheme: true, colorTheme: true, detailLevel: true })
  .partial()
  .extend({ options: buildOptionsSchema.optional() })
  .strict() satisfies z.ZodType<SpecPatch>;

export type SettingSource = 'standard' | 'text' | 'manuell';

/** Field paths that can come from text or manual settings, e.g. "size", "options.snow", "options.materials.roof". */
export type SettingPath = string;

export interface ResolvedSpec {
  spec: BuildSpec;
  sources: Record<SettingPath, SettingSource>;
  /** Text wishes overridden by a manual setting (UI has priority). */
  conflicts: string[];
}

const TOP_LEVEL = ['kind', 'style', 'size', 'materialTheme', 'colorTheme', 'detailLevel'] as const;

/** Flattens a patch into "path -> value" pairs. */
export function flattenPatch(patch: SpecPatch): Map<SettingPath, unknown> {
  const out = new Map<SettingPath, unknown>();
  for (const key of TOP_LEVEL) if (patch[key] !== undefined) out.set(key, patch[key]);
  const options = patch.options ?? {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    if (key === 'materials') {
      for (const [part, id] of Object.entries(value as Record<string, unknown>)) {
        if (id !== undefined) out.set(`options.materials.${part}`, id);
      }
    } else out.set(`options.${key}`, value);
  }
  return out;
}

function applyPath(spec: BuildSpec, path: SettingPath, value: unknown): BuildSpec {
  const [head, key, sub] = path.split('.');
  if (head !== 'options') return { ...spec, [head as string]: value };
  if (key === 'materials' && sub) {
    return { ...spec, options: { ...spec.options, materials: { ...spec.options.materials, [sub]: value } } };
  }
  return { ...spec, options: { ...spec.options, [key as string]: value } };
}

function display(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Effective spec = base (defaults, seed, version) ← wishes recognised in the text ← manual
 * UI settings. Manual settings always win; contradicting text wishes are reported.
 */
export function resolveSpec(base: BuildSpec, parsed: ParsedDescription | null, manual: SpecPatch): ResolvedSpec {
  let spec: BuildSpec = { ...base, options: { ...base.options } };
  const sources: Record<SettingPath, SettingSource> = {};
  const conflicts: string[] = [];
  const fromText = parsed ? flattenPatch(parsed.patch) : new Map<SettingPath, unknown>();
  const fromManual = flattenPatch(manual);

  for (const [path, value] of fromText) {
    spec = applyPath(spec, path, value);
    sources[path] = 'text';
  }
  for (const [path, value] of fromManual) {
    if (fromText.has(path) && fromText.get(path) !== value) {
      conflicts.push(`Text wünscht ${path.replace('options.', '')} = ${display(fromText.get(path))}, die Einstellung ${display(value)} hat Vorrang.`);
    }
    spec = applyPath(spec, path, value);
    sources[path] = 'manuell';
  }
  const options: BuildOptions = buildOptionsSchema.parse(compactOptions(spec.options));
  return { spec: buildSpecSchema.parse({ ...spec, options }), sources, conflicts };
}

export function sourceOf(sources: Record<SettingPath, SettingSource>, path: SettingPath): SettingSource {
  return sources[path] ?? 'standard';
}

/** Removes one manual setting (back to text / default). */
export function withoutManual(manual: SpecPatch, path: SettingPath): SpecPatch {
  const [head, key, sub] = path.split('.');
  if (head !== 'options') {
    const next = { ...manual };
    delete next[head as keyof SpecPatch];
    return next;
  }
  const options: BuildOptions = { ...manual.options };
  if (key === 'materials' && sub) {
    const materials = { ...options.materials };
    delete materials[sub as keyof typeof materials];
    options.materials = Object.keys(materials).length > 0 ? materials : undefined;
  } else delete options[key as keyof BuildOptions];
  return { ...manual, options: compactOptions(options) };
}

/** Sets one manual setting. */
export function withManual(manual: SpecPatch, path: SettingPath, value: unknown): SpecPatch {
  const [head, key, sub] = path.split('.');
  if (head !== 'options') return { ...manual, [head as string]: value };
  const options: BuildOptions = { ...manual.options };
  if (key === 'materials' && sub) options.materials = { ...options.materials, [sub]: value };
  else (options as Record<string, unknown>)[key as string] = value;
  return { ...manual, options };
}
