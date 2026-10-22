#!/usr/bin/env python3
"""Runs schem-reader.jar on every fixture in expected.json and checks the results.

Each run happens in a fresh empty working directory (and runs are parallel) to also prove that
the harness writes nothing into its CWD and that concurrent runs do not interfere.

Usage: python3 selftest.py --jar ../target/schem-reader.jar [--java java] [--verbose]
"""
import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def pinned_worldedit_version():
    """WE_VERSION from ../upstream.lock: the jar must report exactly this WorldEdit version."""
    with open(os.path.join(HERE, "..", "upstream.lock"), encoding="utf-8") as f:
        for line in f:
            if line.startswith("WE_VERSION="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("WE_VERSION not found in upstream.lock")


def run_case(java, jar, we_version, case, entry):
    path = os.path.join(HERE, entry.get("file", case))
    cmd = [java, "-jar", jar, *entry.get("args", []), path]
    with tempfile.TemporaryDirectory(prefix="schem-selftest-") as cwd:
        started = time.monotonic()
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=300)
        seconds = time.monotonic() - started
        leftovers = os.listdir(cwd)
    problems = []
    try:
        result = json.loads(proc.stdout)
        if not isinstance(result, dict):
            raise ValueError("stdout JSON is not an object")
    except ValueError as e:
        return {"case": case, "exit": proc.returncode, "problems": [f"stdout is not one JSON object: {e}"],
                "stdout": proc.stdout[-2000:], "stderr": proc.stderr[-4000:], "seconds": seconds}
    if leftovers:
        problems.append(f"harness wrote into its working directory: {leftovers}")
    if proc.returncode != entry["exit"]:
        problems.append(f"exit code {proc.returncode}, expected {entry['exit']}")
    if result.get("ok") != (proc.returncode == 0):
        problems.append("'ok' flag disagrees with exit code")
    if not str(result.get("reader", "")).startswith(f"EngineHub WorldEdit {we_version} "):
        problems.append(f"reader {result.get('reader')!r} does not name the pinned WorldEdit {we_version}")
    if entry["exit"] == 0 and proc.returncode == 0:
        for key in ("palette", "indices", "nonAirCount", "dimensions", "minimumPoint", "origin",
                    "schematicDataVersion"):
            if key in entry and result.get(key) != entry[key]:
                problems.append(f"{key}: got {json.dumps(result.get(key))[:300]}, expected {json.dumps(entry[key])[:300]}")
        if result.get("registryDataVersion") != entry["registryDataVersion"]:
            problems.append(f"registryDataVersion {result.get('registryDataVersion')} != {entry['registryDataVersion']}")
        if "nonCanonicalCount" in entry and len(result.get("nonCanonicalPaletteKeys", [])) != entry["nonCanonicalCount"]:
            problems.append(f"nonCanonicalPaletteKeys: {result.get('nonCanonicalPaletteKeys')}")
        if result.get("warnings"):
            problems.append(f"warnings on a passing file: {result['warnings']}")
    if proc.returncode != 0 and not result.get("errors"):
        problems.append("failed without any 'errors' entry")
    if "errorContains" in entry:
        messages = "\n".join(map(str, (result.get("errors") or []) + (result.get("warnings") or [])))
        if entry["errorContains"] not in messages:
            problems.append(f"errors/warnings do not mention {entry['errorContains']!r}")
    return {"case": case, "exit": proc.returncode, "problems": problems, "result": result,
            "stderr": proc.stderr[-4000:], "seconds": seconds}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jar", default=os.path.join(HERE, "..", "target", "schem-reader.jar"))
    ap.add_argument("--java", default="java")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()
    jar = os.path.abspath(args.jar)
    we_version = pinned_worldedit_version()
    with open(os.path.join(HERE, "expected.json"), encoding="utf-8") as f:
        expected = json.load(f)

    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {case: pool.submit(run_case, args.java, jar, we_version, case, entry)
                   for case, entry in expected.items()}
        results = [futures[c].result() for c in sorted(futures)]
    wall = time.monotonic() - started

    failed = 0
    for r in results:
        status = "PASS" if not r["problems"] else "FAIL"
        failed += bool(r["problems"])
        res = r.get("result") or {}
        detail = (res.get("errors") or [""])[0] if r["exit"] != 0 else \
            f"dataVersion={res.get('schematicDataVersion')} registry={res.get('registryDataVersion')} " \
            f"palette={len(res.get('palette') or [])} nonAir={res.get('nonAirCount')} format={res.get('format')}"
        print(f"{status}  exit={r['exit']}  {r['seconds']:.1f}s  {r['case']}\n        {detail[:220]}")
        for p in r["problems"]:
            print(f"        !! {p}")
        if r["problems"] and args.verbose:
            print(r.get("stdout", ""), r.get("stderr", ""))
    reader = next((r["result"]["reader"] for r in results if r.get("result", {}).get("reader")), "?")
    per_run = sum(r["seconds"] for r in results) / max(len(results), 1)
    print(f"reader: {reader}")
    print(f"{len(results) - failed}/{len(results)} fixture expectations met "
          f"({wall:.1f}s wall with {args.jobs} parallel jobs, {per_run:.1f}s per run on average)")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
