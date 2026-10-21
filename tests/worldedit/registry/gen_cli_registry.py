#!/usr/bin/env python3
"""Generate a WorldEdit-CLI registry data file (<DataVersion>.json) from Mojang data.

Why this exists
---------------
WorldEdit-CLI (worldedit-cli/src/main/java/com/sk89q/worldedit/cli/data/FileRegistries.java)
loads exactly ``com/sk89q/worldedit/cli/data/<schematic DataVersion>.json`` from the
classpath. Every 7.3.x release (7.3.0 .. 7.3.19) only ships data files up to 3105
(Minecraft 1.19), so the stock CLI refuses a DataVersion 3955 (1.21.1) schematic with
"The provided file is not compatible with this version of WorldEdit-CLI".

This script builds the missing file in the exact same JSON shape from the vanilla data
generator output for the target version, as mirrored by https://github.com/misode/mcmeta
(``<version>-summary`` tag: blocks/data.json, registries/data.json, data/tag/**/data.json).

Validation: ``--compare`` regenerates a file for another version (e.g. the 1.19 summary)
and diffs it against EngineHub's own shipped data file (e.g. 3105.json). If they are
identical, the conversion rules below reproduce EngineHub's generator.

Property type rules (WorldEdit CLIBlockRegistry knows int/bool/enum/direction):
  * values == ["true", "false"]                -> bool
  * all values are integers                     -> int
  * all values are Direction names              -> direction  (MC DirectionProperty)
  * anything else                               -> enum
"""
import argparse
import json
import re
import sys

DIRECTIONS = {"north", "south", "east", "west", "up", "down"}
INT_RE = re.compile(r"^-?\d+$")


def prop_type(values):
    if values == ["true", "false"]:
        return "bool"
    if all(INT_RE.match(v) for v in values):
        return "int"
    if all(v in DIRECTIONS for v in values):
        return "direction"
    return "enum"


def ns(name):
    return name if ":" in name else "minecraft:" + name


def resolve_tags(raw):
    """raw: {tag_name: {"values": [...]}} (vanilla tag JSON). Returns {ns tag: sorted members}."""
    cache = {}

    def resolve(name, stack=()):
        key = ns(name)
        if key in cache:
            return cache[key]
        if key in stack:
            raise ValueError("tag cycle: " + " -> ".join(stack + (key,)))
        short = key.split(":", 1)[1] if key.startswith("minecraft:") else key
        entry = raw.get(short, raw.get(key))
        if entry is None:
            raise KeyError("unknown tag " + key)
        out = set()
        for v in entry["values"]:
            if isinstance(v, dict):  # {"id": ..., "required": false}
                v = v["id"]
            if v.startswith("#"):
                out |= resolve(v[1:], stack + (key,))
            else:
                out.add(ns(v))
        cache[key] = out
        return out

    return {ns(name): sorted(resolve(name)) for name in raw}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build(summary_dir):
    blocks_raw = load(f"{summary_dir}/blocks/data.json")
    registries = load(f"{summary_dir}/registries/data.json")

    # The block registry is authoritative for *which* blocks exist; blocks/data.json gives
    # properties + default state (older summaries omit property-less blocks entirely).
    block_ids = {ns(b) for b in registries["block"]}
    unknown = {ns(b) for b in blocks_raw} - block_ids
    if unknown:
        raise ValueError(f"blocks/data.json has blocks missing from the block registry: {sorted(unknown)[:10]}")
    blocks = {}
    for bid in sorted(block_ids):
        props, default = blocks_raw.get(bid.split(":", 1)[1], ({}, {}))
        properties = {}
        # Minecraft's StateDefinition orders properties by name (the summary does not always).
        for pname, values in sorted(props.items()):
            properties[pname] = {"values": list(values), "type": prop_type(values)}
        if default:
            state = bid + "[" + ",".join(f"{k}={v}" for k, v in sorted(default.items())) + "]"
        else:
            state = bid
        blocks[bid] = {"defaultstate": state, "properties": properties}

    def tags(kind):
        return resolve_tags(load(f"{summary_dir}/data/tag/{kind}/data.json"))

    return {
        "itemtags": tags("item"),
        "blocktags": tags("block"),
        "entitytags": tags("entity_type"),
        "items": sorted(ns(i) for i in registries["item"]),
        "entities": sorted(ns(e) for e in registries["entity_type"]),
        "biomes": sorted(ns(b) for b in registries["worldgen/biome"]),
        "blocks": blocks,
    }


def diff(generated, reference):
    problems = []
    for key in sorted(set(generated) | set(reference)):
        g, r = generated.get(key), reference.get(key)
        if g == r:
            continue
        if isinstance(g, dict) and isinstance(r, dict):
            for k in sorted(set(g) | set(r)):
                if g.get(k) != r.get(k):
                    problems.append(f"{key}/{k}: generated={json.dumps(g.get(k))} reference={json.dumps(r.get(k))}")
        else:
            problems.append(f"{key}: lists differ (generated {len(g or [])} vs reference {len(r or [])}); "
                            f"only-generated={sorted(set(g or []) - set(r or []))[:10]} "
                            f"only-reference={sorted(set(r or []) - set(g or []))[:10]}")
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("summary_dir", help="checkout of misode/mcmeta at a <version>-summary tag")
    ap.add_argument("--out", help="write the generated <DataVersion>.json here")
    ap.add_argument("--compare", help="EngineHub data file to compare against (validation mode)")
    ap.add_argument("--expect-data-version", type=int,
                    help="fail unless <summary_dir>/version.json has this data_version")
    args = ap.parse_args()

    version = load(f"{args.summary_dir}/version.json")
    if args.expect_data_version is not None and version["data_version"] != args.expect_data_version:
        sys.exit(f"summary is for {version['id']} (data_version {version['data_version']}), "
                 f"expected {args.expect_data_version}")

    data = build(args.summary_dir)
    print(f"[gen_cli_registry] {version['id']} data_version={version['data_version']}: "
          f"{len(data['blocks'])} blocks, {len(data['items'])} items, {len(data['entities'])} entities, "
          f"{len(data['biomes'])} biomes", file=sys.stderr)

    if args.compare:
        problems = diff(data, load(args.compare))
        if problems:
            print(f"[gen_cli_registry] MISMATCH vs {args.compare}: {len(problems)} differences", file=sys.stderr)
            for p in problems[:40]:
                print("  " + p, file=sys.stderr)
            sys.exit(1)
        print(f"[gen_cli_registry] identical to {args.compare}", file=sys.stderr)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"), sort_keys=False)
            f.write("\n")


if __name__ == "__main__":
    main()
