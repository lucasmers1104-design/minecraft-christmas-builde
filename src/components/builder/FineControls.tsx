"use client";

import { useMemo, useState } from "react";
import { APPLICABLE_OPTIONS } from "@/core/generator/generateBuilding";
import { festiveChoices } from "@/core/generator/festiveKits";
import { resolveHouseInput } from "@/core/generator/house/resolveInput";
import { createSeededRandom } from "@/core/generator/seededRandom";
import { FOOTPRINT_LIMITS, type BuildOptions, type MaterialRoleUi } from "@/core/schema/buildOptions";
import type { BuildSpec } from "@/core/schema/buildSpec";
import { sourceOf, type SettingPath } from "@/core/schema/resolveSpec";
import { getMaterial, hasOwnForm, listMaterials, type MaterialFamily } from "@/core/style/materials";
import { getPalette } from "@/core/style/palettes";
import { STYLES, type RoofProfile, type RoofType } from "@/core/style/styles";
import { Panel } from "@/components/ui/Panel";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { SettingsBinding } from "@/components/builder/StyleControls";

export const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  gable: "Satteldach",
  hip: "Walmdach",
  half_hip: "Krüppelwalm",
  pyramid: "Pyramide",
  mansard: "Mansarddach",
  gambrel: "Gambrel (Scheune)",
  saltbox: "Saltbox (asymmetrisch)",
  a_frame: "A-Frame",
  flat: "Flachdach mit Attika",
  pagoda: "Pagode",
};

export const ROOF_PROFILE_LABELS: Record<RoofProfile, string> = {
  standard: "45° gerade",
  steep: "steil (63°)",
  shallow: "flach (27°)",
  flared: "ausgestellte Traufe",
  bell: "geschwungen (Glocke)",
  convex: "gewölbt (Gambrel)",
  ogee: "S-Kurve",
};

const LABELS: Partial<Record<string, Record<string, string>>> = {
  wings: { none: "keine", L: "L-Form", T: "T-Form", U: "U-Form" },
  annex: { none: "keiner", left: "links", right: "rechts" },
  tower: { none: "keiner", square: "eckig", round: "rund" },
  towerPosition: { front_left: "vorne links", front_right: "vorne rechts", back_left: "hinten links", back_right: "hinten rechts" },
  symmetry: { auto: "Stil-Standard", symmetric: "symmetrisch", asymmetric: "asymmetrisch", rambling: "verwinkelt" },
  windows: { few: "wenige", normal: "normal", many: "viele" },
  lanternDensity: { none: "keine", few: "wenige", normal: "normal", many: "viele" },
  windowFamily: {
    auto: "Stil-Standard",
    simple: "schlicht",
    shuttered: "mit Läden",
    framed: "mit Rahmen",
    arched: "Bogenfenster",
    round: "Rundfenster",
    shoji: "Shoji",
    band: "Fensterband",
    leaded: "Bleiglas",
  },
  doorFamily: { auto: "Stil-Standard", simple: "schlicht", transom: "mit Oberlicht", arched: "Bogenportal", double: "Doppeltür", porch: "mit Veranda", genkan: "Genkan (japanisch)" },
};

const MATERIAL_ROLE_LABELS: Record<MaterialRoleUi, string> = {
  wall: "Wände",
  roof: "Dach",
  frame: "Rahmen & Balken",
  plinth: "Sockel",
  accent: "Akzent",
};

const ROLE_FAMILIES: Record<MaterialRoleUi, readonly MaterialFamily[]> = {
  wall: ["wood", "log", "stone", "brick", "plaster"],
  roof: ["wood", "stone", "brick", "metal"],
  frame: ["log", "wood", "plaster"],
  plinth: ["stone", "brick"],
  accent: ["cloth", "glass", "brick", "plaster", "metal", "nature"],
};

const FLAGS: [keyof BuildOptions, string][] = [
  ["porch", "Veranda / Vordach"],
  ["oriel", "Erker (Obergeschoss)"],
  ["balcony", "Balkon (Obergeschoss)"],
  ["chimney", "Schornstein"],
  ["jetty", "Auskragung (Jetty)"],
  ["garden", "Garten, Weg & Hecke"],
  ["soulLanterns", "Seelenlaternen"],
  ["garland", "Girlanden"],
  ["christmasTree", "Weihnachtsbaum im Garten"],
  ["presents", "Geschenke"],
  ["snow", "Schnee (nur auf ausdrücklichen Wunsch)"],
];

const range = (min: number, max: number, step = 1) => Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + step * i);
const numbers = (values: number[]) => values.map((v) => ({ value: String(v), label: String(v) }));
const flag = (v: boolean | undefined) => (v ? "an" : "aus");

function currentValue(spec: BuildSpec, path: SettingPath): unknown {
  const [, key, sub] = path.split(".");
  if (key === "materials" && sub) return spec.options.materials?.[sub as MaterialRoleUi];
  return spec.options[key as keyof BuildOptions];
}

/** What the style would choose for this option if it were left automatic. */
function automaticValue(spec: BuildSpec, path: SettingPath): string {
  const [, key, sub] = path.split(".");
  if (spec.kind !== "house" && spec.kind !== "tower") return "Standard";
  const options: BuildOptions = { ...spec.options };
  if (key === "materials" && sub) options.materials = { ...options.materials, [sub]: undefined };
  else delete options[key as keyof BuildOptions];
  const wishes = { ...options, materials: undefined };
  const input = resolveHouseInput(spec.style, spec.theme, spec.size, spec.detailLevel, spec.seed, spec.targetMinecraftVersion, wishes as never, createSeededRandom(spec.seed));
  switch (key) {
    case "width":
    case "depth":
    case "floors":
    case "floorHeight":
    case "overhang":
    case "dormers":
      return String(input[key]);
    case "roofType":
      return ROOF_TYPE_LABELS[input.roofType];
    case "roofProfile":
      return ROOF_PROFILE_LABELS[input.roofProfile];
    case "palette":
      return getPalette(input.paletteId).label;
    case "materials": {
      const role = sub === "wall" ? "wall" : sub === "frame" ? "frame" : (sub as "roof" | "plinth" | "accent");
      return getMaterial(input.materials[role]).label;
    }
    case "wings":
    case "annex":
    case "tower":
    case "towerPosition":
    case "symmetry":
    case "windows":
    case "lanternDensity":
      return LABELS[key]?.[String(input[key])] ?? String(input[key]);
    case "windowFamily":
    case "doorFamily":
      return "Stil-Standard";
    case "oriel":
    case "balcony":
    case "porch":
    case "chimney":
    case "jetty":
    case "garden":
      return flag(input[key]);
    case "garland":
      return flag(festiveChoices(spec.style, spec.theme, spec.detailLevel, {}).garland);
    case "christmasTree":
      return flag(festiveChoices(spec.style, spec.theme, spec.detailLevel, {}).tree);
    case "presents":
      return flag(festiveChoices(spec.style, spec.theme, spec.detailLevel, {}).presents);
    case "snow":
      return flag(input.festive[key]);
    case "soulLanterns":
      return flag(input.lantern === "soul_lantern");
    default:
      return "Standard";
  }
}

export function FineControls({ binding }: { binding: SettingsBinding }) {
  const [open, setOpen] = useState(false);
  const { spec, sources, set, reset, disabled } = binding;
  const applicable = APPLICABLE_OPTIONS[spec.kind];
  const shows = (key: keyof BuildOptions) => applicable.includes(key);

  const field = (path: SettingPath, label: string, choices: { value: string; label: string }[], parse: (v: string) => unknown = (v) => v) => {
    const source = sourceOf(sources, path);
    const value = currentValue(spec, path);
    // "Automatisch" is only selected when neither text nor manual setting provides a value.
    const selected = source === "standard" || value === undefined ? "" : String(value);
    const id = `fine-${path.replace(/\./g, "-")}`;
    return (
      <div key={path} className="min-w-0">
        <label htmlFor={id} className="mb-1 flex items-center gap-2 text-[11px] font-medium text-mist-300">
          {label}
          <SourceBadge source={source} label={label} onReset={() => reset(path)} />
        </label>
        <select
          id={id}
          data-testid={id}
          disabled={disabled}
          value={selected}
          onChange={(e) => (e.target.value === "" ? reset(path) : set(path, parse(e.target.value)))}
          className="w-full rounded-lg border border-white/10 bg-night-950/70 px-2 py-1.5 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none disabled:opacity-50"
        >
          <option value="">Automatisch ({automaticValue(spec, path)})</option>
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  };
  const enumField = (key: keyof BuildOptions, label: string) =>
    field(`options.${key}`, label, Object.entries(LABELS[key] ?? {}).map(([value, l]) => ({ value, label: l })));
  const flagChoices = [
    { value: "true", label: "an" },
    { value: "false", label: "aus" },
  ];
  const materialChoices = (role: MaterialRoleUi) =>
    listMaterials()
      .filter((m) => ROLE_FAMILIES[role].includes(m.family) && (role !== "roof" || hasOwnForm(m.id, "stairs")))
      .map((m) => ({ value: m.id, label: m.label }));

  const summary = useMemo(() => {
    if (spec.kind !== "house") return "Optionen für diesen Bauwerkstyp";
    const input = resolveHouseInput(spec.style, spec.theme, spec.size, spec.detailLevel, spec.seed, spec.targetMinecraftVersion, { ...spec.options, materials: undefined } as never, createSeededRandom(spec.seed));
    return `${input.width} × ${input.depth} Grundfläche, ${input.floors} Geschoss${input.floors > 1 ? "e" : ""}, ${ROOF_TYPE_LABELS[input.roofType]}`;
  }, [spec]);

  const legend = (text: string) => <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">{text}</legend>;

  return (
    <Panel
      title="Feinparameter"
      headingId="fine-heading"
      description={summary}
      actions={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="fine-body"
          data-testid="toggle-fine"
          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-mist-300 hover:text-snow-50"
        >
          {open ? "Einklappen" : "Anzeigen"}
        </button>
      }
    >
      {open ? (
        <div id="fine-body" className="flex flex-col gap-4">
          {shows("width") || shows("floors") ? (
            <fieldset className="min-w-0 grid grid-cols-2 gap-2">
              {legend("Maße")}
              {shows("width") ? field("options.width", "Breite", numbers(range(FOOTPRINT_LIMITS.width.min, FOOTPRINT_LIMITS.width.max, 2)), Number) : null}
              {shows("depth") ? field("options.depth", "Tiefe", numbers(range(FOOTPRINT_LIMITS.depth.min, FOOTPRINT_LIMITS.depth.max, 2)), Number) : null}
              {shows("floors") ? field("options.floors", "Geschosse", numbers(range(FOOTPRINT_LIMITS.floors.min, FOOTPRINT_LIMITS.floors.max)), Number) : null}
              {shows("floorHeight") ? field("options.floorHeight", "Geschosshöhe", numbers(range(FOOTPRINT_LIMITS.floorHeight.min, FOOTPRINT_LIMITS.floorHeight.max)), Number) : null}
            </fieldset>
          ) : null}
          {shows("roofProfile") ? (
            <fieldset className="min-w-0 grid grid-cols-2 gap-2">
              {legend("Dach")}
              {shows("roofType") ? field("options.roofType", "Dachform", Object.entries(ROOF_TYPE_LABELS).map(([value, label]) => ({ value, label }))) : null}
              {field("options.roofProfile", "Profil", Object.entries(ROOF_PROFILE_LABELS).map(([value, label]) => ({ value, label })))}
              {shows("overhang") ? field("options.overhang", "Überstand", numbers(range(0, 3)), Number) : null}
              {shows("dormers") ? field("options.dormers", "Gauben", numbers(range(0, 6)), Number) : null}
            </fieldset>
          ) : null}
          {shows("wings") ? (
            <fieldset className="min-w-0 grid grid-cols-2 gap-2">
              {legend("Form & Bauteile")}
              {enumField("symmetry", "Symmetrie")}
              {enumField("wings", "Flügel")}
              {enumField("annex", "Anbau")}
              {enumField("tower", "Turm")}
              {enumField("towerPosition", "Turmposition")}
            </fieldset>
          ) : null}
          {shows("windows") ? (
            <fieldset className="min-w-0 grid grid-cols-2 gap-2">
              {legend("Fenster & Türen")}
              {enumField("windows", "Fensterzahl")}
              {shows("windowFamily") ? enumField("windowFamily", "Fensterform") : null}
              {shows("doorFamily") ? enumField("doorFamily", "Türform") : null}
            </fieldset>
          ) : null}
          <fieldset className="min-w-0 grid grid-cols-2 gap-2">
            {legend("Ausstattung & Licht")}
            {shows("lanternDensity") ? enumField("lanternDensity", "Laternen") : null}
            {FLAGS.filter(([key]) => shows(key)).map(([key, label]) => field(`options.${key}`, label, flagChoices, (v) => v === "true"))}
          </fieldset>
          {shows("materials") ? (
            <fieldset className="min-w-0 grid grid-cols-1 gap-2">
              {legend("Palette & Material")}
              {field(
                "options.palette",
                "Palette",
                STYLES[spec.style].palettes.map((id) => ({ value: id, label: getPalette(id).label })),
              )}
              {(Object.keys(MATERIAL_ROLE_LABELS) as MaterialRoleUi[]).map((role) => field(`options.materials.${role}`, MATERIAL_ROLE_LABELS[role], materialChoices(role)))}
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
