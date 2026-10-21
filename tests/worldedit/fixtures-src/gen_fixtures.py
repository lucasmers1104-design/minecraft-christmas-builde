#!/usr/bin/env python3
"""Writes small Sponge Schematic v3 (.schem) fixtures for the WorldEdit reader harness.

Independent of the app's own writer on purpose: gzip-compressed, big-endian NBT written by
hand, following https://github.com/SpongePowered/Schematic-Specification (versions/schematic-3.md):

    root TAG_Compound ""                      (WorldEdit ignores the root name)
      Schematic TAG_Compound
        Version      TAG_Int 3
        DataVersion  TAG_Int 3955               (Minecraft Java 1.21.1)
        Width/Height/Length TAG_Short           (unsigned)
        Offset       TAG_Int_Array [x, y, z]    (optional, default 0,0,0)
        Blocks TAG_Compound
          Palette    TAG_Compound  {"<blockstate>": TAG_Int id}
          Data       TAG_Byte_Array  VarInt ids, index = x + W * (z + L * y)
          BlockEntities TAG_List<TAG_Compound>  (optional since WorldEdit 7.3.7)

Also writes expected.json (expected exit code + expected WorldEdit palette/indices) which
selftest.py checks against the harness output.

Usage: python3 gen_fixtures.py [--out-dir DIR]   (default: directory of this script)
"""
import argparse
import gzip
import io
import json
import os
import struct

DATA_VERSION_1_21_1 = 3955

TAG_END, TAG_BYTE, TAG_SHORT, TAG_INT, TAG_LONG = 0, 1, 2, 3, 4
TAG_BYTE_ARRAY, TAG_STRING, TAG_LIST, TAG_COMPOUND, TAG_INT_ARRAY = 7, 8, 9, 10, 11


# --- minimal NBT model ------------------------------------------------------------------------

class Tag:
    def __init__(self, tag_type, value, list_type=None):
        self.type, self.value, self.list_type = tag_type, value, list_type


def Int(v): return Tag(TAG_INT, v)
def Short(v): return Tag(TAG_SHORT, v)
def Long(v): return Tag(TAG_LONG, v)
def String(v, raw_utf8=False): return Tag(TAG_STRING, (v, raw_utf8))
def ByteArray(b): return Tag(TAG_BYTE_ARRAY, bytes(b))
def IntArray(v): return Tag(TAG_INT_ARRAY, list(v))
def Compound(d): return Tag(TAG_COMPOUND, d)  # dict, insertion-ordered
def List(element_type, items): return Tag(TAG_LIST, items, element_type)


def mutf8(s):
    """Java 'modified UTF-8' (DataOutput.writeUTF), which NBT strings use."""
    out = bytearray()
    for (c,) in struct.iter_unpack(">H", s.encode("utf-16-be", "surrogatepass")):
        if 0x0001 <= c <= 0x007F:
            out.append(c)
        elif c <= 0x07FF:  # includes U+0000 -> C0 80
            out += bytes([0xC0 | (c >> 6), 0x80 | (c & 0x3F)])
        else:  # BMP chars and each UTF-16 surrogate separately (3 bytes each)
            out += bytes([0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)])
    return bytes(out)


def write_string(buf, s, raw_utf8=False):
    data = s.encode("utf-8") if raw_utf8 else mutf8(s)
    buf.write(struct.pack(">H", len(data)))
    buf.write(data)


def write_payload(buf, tag):
    t, v = tag.type, tag.value
    if t == TAG_BYTE:
        buf.write(struct.pack(">b", v))
    elif t == TAG_SHORT:
        buf.write(struct.pack(">h", v if v < 0x8000 else v - 0x10000))
    elif t == TAG_INT:
        buf.write(struct.pack(">i", v))
    elif t == TAG_LONG:
        buf.write(struct.pack(">q", v))
    elif t == TAG_BYTE_ARRAY:
        buf.write(struct.pack(">i", len(v)))
        buf.write(v)
    elif t == TAG_STRING:
        write_string(buf, v[0], v[1])
    elif t == TAG_LIST:
        buf.write(struct.pack(">bi", tag.list_type, len(v)))
        for item in v:
            write_payload(buf, item)
    elif t == TAG_COMPOUND:
        for name, child in v.items():
            buf.write(struct.pack(">b", child.type))
            write_string(buf, name)
            write_payload(buf, child)
        buf.write(struct.pack(">b", TAG_END))
    elif t == TAG_INT_ARRAY:
        buf.write(struct.pack(">i", len(v)))
        buf.write(struct.pack(">%di" % len(v), *v))
    else:
        raise ValueError(t)


def write_schem(path, root_payload, root_name=""):
    buf = io.BytesIO()
    buf.write(struct.pack(">b", TAG_COMPOUND))
    write_string(buf, root_name)
    write_payload(buf, root_payload)
    with open(path, "wb") as f:
        # mtime=0 and no file name -> byte-for-byte reproducible output
        with gzip.GzipFile(fileobj=f, mode="wb", filename="", mtime=0) as gz:
            gz.write(buf.getvalue())


def varints(values):
    out = bytearray()
    for v in values:
        while True:
            b = v & 0x7F
            v >>= 7
            if v:
                out.append(b | 0x80)
            else:
                out.append(b)
                break
    return bytes(out)


# --- schematic builder ------------------------------------------------------------------------

def build(grid, w, h, l, palette_order=None, offset=(0, 0, 0), data_version=DATA_VERSION_1_21_1,
          extra=None, block_entities_type=TAG_COMPOUND, metadata=None, data_override=None):
    """grid(x, y, z) -> blockstate string. Returns (nbt payload, palette dict, data ids)."""
    cells = [grid(x, y, z) for y in range(h) for z in range(l) for x in range(w)]
    palette = {}
    for s in (palette_order or []) + cells:
        palette.setdefault(s, len(palette))
    ids = [palette[s] for s in cells]
    schematic = {
        "Version": Int(3),
        "DataVersion": Int(data_version),
    }
    if metadata is not None:
        schematic["Metadata"] = metadata
    schematic.update({
        "Width": Short(w),
        "Height": Short(h),
        "Length": Short(l),
        "Offset": IntArray(offset),
        "Blocks": Compound({
            "Palette": Compound({k: Int(v) for k, v in palette.items()}),
            "Data": ByteArray(data_override if data_override is not None else varints(ids)),
            "BlockEntities": List(block_entities_type, []),
        }),
    })
    if extra:
        schematic.update(extra)
    return Compound({"Schematic": Compound(schematic)}), cells


def expected_worldedit_view(cells, canonical=None):
    """Palette/indices as the harness reports them (first-occurrence order, x fastest)."""
    canonical = canonical or {}
    palette, indices = {}, []
    for s in cells:
        s = canonical.get(s, s)
        indices.append(palette.setdefault(s, len(palette)))
    air = {"minecraft:air", "minecraft:cave_air", "minecraft:void_air"}
    return {
        "palette": list(palette),
        "indices": indices,
        "nonAirCount": sum(1 for s in cells if canonical.get(s, s).split("[")[0] not in air),
    }


# --- fixtures ---------------------------------------------------------------------------------

AIR = "minecraft:air"
SPRUCE = "minecraft:spruce_planks"
LOG_Y = "minecraft:oak_log[axis=y]"
RED_WOOL = "minecraft:red_wool"
GLASS = "minecraft:glass"


def basic_grid(x, y, z):
    # 3 (x) x 2 (y) x 4 (z): spruce floor with a red wool strip, log corners + glass walls above.
    if y == 0:
        return RED_WOOL if x == 1 and z in (1, 2) else SPRUCE
    if x == 1:
        return AIR
    return LOG_Y if z in (0, 3) else GLASS


def big_palette_states():
    colors = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
              "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"]
    states = [AIR]
    for c in colors:
        states += [f"minecraft:{c}_wool", f"minecraft:{c}_concrete", f"minecraft:{c}_stained_glass",
                   f"minecraft:{c}_terracotta"]
    states += [f"minecraft:note_block[instrument=harp,note={n},powered={p}]"
               for n in range(25) for p in ("false", "true")]
    states += [f"minecraft:snow[layers={n}]" for n in range(1, 9)]
    states += [f"minecraft:wheat[age={n}]" for n in range(8)]
    states += [f"minecraft:spruce_leaves[distance={d},persistent={p},waterlogged=false]"
               for d in range(1, 8) for p in ("false", "true")]
    return states  # 1 + 64 + 50 + 8 + 8 + 14 = 145


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default=os.path.dirname(os.path.abspath(__file__)))
    args = ap.parse_args()
    out_dir = args.out_dir
    expected = {}

    def emit(name, payload_cells, exit_code, note, check_view=True, root_name="", canonical=None,
             expect=None, args=None):
        payload, cells = payload_cells
        write_schem(os.path.join(out_dir, name), payload, root_name)
        entry = {"exit": exit_code, "note": note}
        if args:
            entry["args"] = args
        if check_view and exit_code == 0:
            entry.update(expected_worldedit_view(cells, canonical))
        if expect:
            entry.update(expect)
        expected[name] = entry

    # 1. Required: valid 3x2x4 with air, spruce_planks, oak_log[axis=y], red_wool, glass.
    emit("valid_basic_3x2x4.schem",
         build(basic_grid, 3, 2, 4, palette_order=[AIR, SPRUCE, LOG_Y, RED_WOOL, GLASS]),
         0, "basic valid file",
         expect={"dimensions": {"width": 3, "height": 2, "length": 4},
                 "minimumPoint": [0, 0, 0], "origin": [0, 0, 0], "schematicDataVersion": 3955})

    # 2. Required: >127 palette entries -> ids >= 128 need 2-byte VarInts.
    states = big_palette_states()
    w, h, l = 8, 4, 8  # 256 cells, every state used at least once
    emit("valid_palette_145_multibyte_varint.schem",
         build(lambda x, y, z: states[(x + w * (z + l * y)) % len(states)], w, h, l, palette_order=states),
         0, f"{len(states)} palette entries (ids up to {len(states) - 1}, multi-byte VarInts)")

    # 3. Required negative: unknown block (WorldEdit would warn and substitute air).
    emit("invalid_unknown_block.schem",
         build(lambda x, y, z: "minecraft:candy_cane_block" if (x, y, z) == (1, 0, 1) else SPRUCE, 2, 1, 2),
         2, "unknown block id must fail")

    # 4. Required negative: invalid property value.
    emit("invalid_property_value.schem",
         build(lambda x, y, z: "minecraft:oak_log[axis=w]" if (x, y, z) == (0, 0, 0) else SPRUCE, 2, 1, 2),
         2, "invalid property value must fail")

    # --- extra probes of WorldEdit behaviour ---------------------------------------------------
    emit("invalid_unknown_property.schem",
         build(lambda x, y, z: "minecraft:glass[sparkly=true]" if x == 0 else SPRUCE, 2, 1, 1),
         2, "property that the block does not have must fail")

    emit("invalid_unknown_property_resets_state.schem",
         build(lambda x, y, z: "minecraft:oak_stairs[facing=east,half=top,shape=straight,sparkly=true,"
                               "waterlogged=false]" if x == 0 else SPRUCE, 2, 1, 1),
         2, "unknown property: WorldEdit (no actor) logs DEBUG only and silently uses the DEFAULT "
            "state (facing=north,half=bottom) - harness must fail")

    emit("invalid_data_too_short.schem",
         build(lambda x, y, z: SPRUCE, 2, 2, 2, data_override=varints([0] * 7)),
         2, "7 VarInts for 8 cells: WorldEdit silently leaves air, harness must fail", check_view=False)

    emit("invalid_missing_schematic_wrapper.schem",
         (Compound({"Version": Int(3), "DataVersion": Int(3955), "Width": Short(1), "Height": Short(1),
                    "Length": Short(1),
                    "Blocks": Compound({"Palette": Compound({SPRUCE: Int(0)}), "Data": ByteArray(varints([0]))})}),
          [SPRUCE]),
         2, "v3 fields directly in root named 'Schematic' (v2 layout) is not detected as v3",
         root_name="Schematic")

    emit("invalid_data_version_1_21.schem",
         build(lambda x, y, z: SPRUCE, 1, 1, 1, data_version=3953),
         2, "DataVersion 3953 (1.21): WorldEdit-CLI has no 3953.json registry -> cannot load")

    emit("valid_offset_neg.schem",
         build(basic_grid, 3, 2, 4, offset=(-1, 0, -2)),
         0, "Offset [-1,0,-2]: WorldEdit puts the clipboard minimum at Offset, origin at 0,0,0",
         expect={"minimumPoint": [-1, 0, -2], "origin": [0, 0, 0]})

    emit("valid_root_named_schematic.schem",
         build(basic_grid, 3, 2, 4),
         0, "v3 root compound named 'Schematic' instead of '' (WorldEdit ignores the root name)",
         root_name="Schematic")

    emit("valid_block_entities_end_typed_empty_list.schem",
         build(basic_grid, 3, 2, 4, block_entities_type=TAG_END),
         0, "empty BlockEntities list with element type TAG_End (what Minecraft writes for empty lists)")

    noncanon = {
        "oak_log[axis=y]": LOG_Y,  # no namespace
        "minecraft:oak_stairs[waterlogged=false,shape=straight,half=bottom,facing=east]":
            "minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]",
        "minecraft:spruce_slab": "minecraft:spruce_slab[type=bottom,waterlogged=false]",  # defaults
    }
    keys = list(noncanon)
    emit("valid_noncanonical_keys.schem",
         build(lambda x, y, z: keys[x], 3, 1, 1),
         0, "accepted by WorldEdit but not canonical (fails with --require-canonical)",
         canonical=noncanon)
    expected["valid_noncanonical_keys.schem"]["nonCanonicalCount"] = 3
    expected["valid_noncanonical_keys.schem --require-canonical"] = {
        "file": "valid_noncanonical_keys.schem", "args": ["--require-canonical"], "exit": 2,
        "note": "same file, strict canonical mode"}

    meta = lambda raw: Compound({"Name": String("Weihnachtsbaum \U0001F384", raw_utf8=raw),
                                 "Author": String("fixture"), "Date": Long(0)})
    emit("valid_metadata_emoji_mutf8.schem",
         build(basic_grid, 3, 2, 4, metadata=meta(False)),
         0, "Metadata.Name with an emoji encoded as Java modified UTF-8 (surrogate pair)")
    emit("invalid_metadata_emoji_plain_utf8.schem",
         build(basic_grid, 3, 2, 4, metadata=meta(True)),
         2, "same emoji as standard 4-byte UTF-8: not valid NBT (modified UTF-8) for WorldEdit")

    with open(os.path.join(out_dir, "expected.json"), "w", encoding="utf-8") as f:
        json.dump(expected, f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"wrote {len(expected)} fixtures to {out_dir}")


if __name__ == "__main__":
    main()
