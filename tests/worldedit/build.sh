#!/usr/bin/env bash
# Builds tests/worldedit/target/schem-reader.jar: a real EngineHub WorldEdit (worldedit-core +
# worldedit-cli) Sponge-schematic reader harness. See README.md.
#
#   tests/worldedit/build.sh              # default: compile EngineHub sources from GitHub
#   WE_MODE=enginehub tests/worldedit/build.sh   # use maven.enginehub.org artifacts instead
#   tests/worldedit/build.sh --selftest   # ...and run the fixture self-test afterwards
#
# Needs bash (Linux, macOS, or Git Bash / WSL on Windows), git, JDK 21, Maven 3.9, Python 3.
#
# Environment:
#   WE_BUILD_CACHE  clones + Maven local repo + build output (default ~/.cache/...); never inside the repo
#   WE_MODE         source (default) | enginehub
#   MVN             maven executable (default: mvn)
#   PYTHON          python 3 executable (default: python3, else python)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${WE_BUILD_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/minecraft-christmas-builder/worldedit-build}"
MODE="${WE_MODE:-source}"
MVN_BIN="${MVN:-mvn}"
SELFTEST=0
for arg in "$@"; do
  case "$arg" in
    --selftest) SELFTEST=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 64 ;;
  esac
done
if [ -n "${PYTHON:-}" ]; then
  PY_BIN="$PYTHON"
elif python3 -c '' >/dev/null 2>&1; then
  PY_BIN=python3
else
  PY_BIN=python   # Windows installs usually only provide "python"
fi

# shellcheck source=upstream.lock
source "$HERE/upstream.lock"

# Paths handed to native Windows programs (java, mvn, python) must be Windows paths under Git Bash.
native_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}

SRC="$CACHE/src"
GEN="$CACHE/generated-resources"
M2="${WE_M2_REPO:-$CACHE/m2}"
CLI_DATA="$GEN/schem-reader/cli-data"
rm -rf "$GEN"
mkdir -p "$SRC" "$CLI_DATA"
MVN=("$MVN_BIN" -B -ntp "-Dmaven.repo.local=$(native_path "$M2")")
PY=("$PY_BIN" -I)

log() { printf '[build.sh] %s\n' "$*" >&2; }

# checkout <dir> <url> <tag-or-empty> <commit> [<path>...]: fetch exactly <commit> and verify
# that the work tree is pristine. With paths, only those files are checked out (sparse checkout,
# blob-less fetch), which keeps e.g. the mcmeta summaries at a few MB instead of hundreds.
checkout() {
  local dir="$1" url="$2" tag="$3" commit="$4"
  shift 4
  local only=("$@")
  if [ -n "$tag" ]; then
    local remote
    remote="$(git ls-remote "$url" "refs/tags/$tag" "refs/tags/$tag^{}" | awk '{print $1}' | tail -n1)"
    if [ "$remote" != "$commit" ]; then
      log "ERROR: $url tag $tag resolves to '$remote', expected $commit"; exit 1
    fi
  fi
  if [ ! -d "$dir/.git" ]; then
    log "fetching $url @ ${tag:-$commit}${only[0]:+ (${#only[@]} files only)}"
    git init -q "$dir"
    git -C "$dir" remote add origin "$url"
    if [ ${#only[@]} -gt 0 ]; then
      git -C "$dir" config core.sparseCheckout true
      printf '/%s\n' "${only[@]}" > "$dir/.git/info/sparse-checkout"
    fi
  fi
  if [ "$(git -C "$dir" rev-parse -q --verify HEAD 2>/dev/null || true)" != "$commit" ]; then
    if [ "$(git -C "$dir" config --bool core.sparseCheckout || true)" = true ]; then
      git -C "$dir" fetch -q --depth 1 --filter=blob:none origin "$commit"
    else
      git -C "$dir" fetch -q --depth 1 origin "$commit"
    fi
    git -C "$dir" -c advice.detachedHead=false checkout -q --detach "$commit"
  fi
  if [ "$(git -C "$dir" rev-parse HEAD)" != "$commit" ] || [ -n "$(git -C "$dir" status --porcelain)" ]; then
    log "ERROR: $dir is not a clean checkout of $commit"; exit 1
  fi
}

# --- 1. upstream sources ------------------------------------------------------------------------
checkout "$SRC/WorldEdit" "$WE_URL" "$WE_TAG" "$WE_COMMIT"
checkout "$SRC/WorldEdit-$WE_VALIDATE_TAG-cli-data" "$WE_URL" "$WE_VALIDATE_TAG" "$WE_VALIDATE_COMMIT" "$WE_VALIDATE_PATH"
# The files registry/gen_cli_registry.py reads from a mcmeta summary.
MCMETA_FILES=(version.json blocks/data.json registries/data.json
              data/tag/block/data.json data/tag/item/data.json data/tag/entity_type/data.json)
checkout "$SRC/mcmeta-$MCMETA_VALIDATE_TAG" "$MCMETA_URL" "$MCMETA_VALIDATE_TAG" "$MCMETA_VALIDATE_COMMIT" "${MCMETA_FILES[@]}"
for target in "${MCMETA_TARGETS[@]}"; do
  read -r tag commit _ <<<"$target"
  checkout "$SRC/mcmeta-$tag" "$MCMETA_URL" "$tag" "$commit" "${MCMETA_FILES[@]}"
done
if [ "$MODE" = source ]; then
  checkout "$SRC/Piston" "$PISTON_URL" "$PISTON_TAG" "$PISTON_COMMIT"
  checkout "$SRC/lin-bus" "$LINBUS_URL" "$LINBUS_TAG" "$LINBUS_COMMIT"
  checkout "$SRC/jlibnoise" "$JLIBNOISE_URL" "$JLIBNOISE_TAG" "$JLIBNOISE_COMMIT"
  if ! grep -q "<we.version>$WE_VERSION</we.version>" "$HERE/upstream/pom.xml"; then
    log "ERROR: upstream/pom.xml does not build WorldEdit $WE_VERSION (update the reactor poms)"; exit 1
  fi
fi

# --- 2. WorldEdit-CLI registry data ---------------------------------------------------------
# The generator writes the JSON format that WorldEdit-CLI's FileRegistries/DataFile read. Fail if
# the pinned WorldEdit no longer loads <working dir>/cli-data/<DataVersion>_<format>.json with the
# format version the generator implements.
FILE_REGISTRIES="$SRC/WorldEdit/worldedit-cli/src/main/java/com/sk89q/worldedit/cli/data/FileRegistries.java"
if ! grep -q "CLI_DATA_VERSION = $WE_CLI_DATA_FORMAT;" "$FILE_REGISTRIES" \
   || ! grep -q 'getWorkingDirectoryPath("cli-data")' "$FILE_REGISTRIES" \
   || ! grep -q '"_" + CLI_DATA_VERSION + ".json"' "$FILE_REGISTRIES"; then
  log "ERROR: $FILE_REGISTRIES changed how/which CLI data it loads; re-check registry/gen_cli_registry.py"; exit 1
fi

REFERENCE="$SRC/WorldEdit-$WE_VALIDATE_TAG-cli-data/$WE_VALIDATE_PATH"
if [ "$(git -C "$SRC/WorldEdit-$WE_VALIDATE_TAG-cli-data" rev-parse "HEAD:$WE_VALIDATE_PATH")" != "$WE_VALIDATE_BLOB" ]; then
  log "ERROR: $WE_VALIDATE_PATH at $WE_VALIDATE_TAG is not blob $WE_VALIDATE_BLOB"; exit 1
fi
GENPY=("${PY[@]}" "$(native_path "$HERE/registry/gen_cli_registry.py")")
log "validating registry converter against EngineHub's $MCMETA_VALIDATE_DATA_VERSION.json (worldedit-cli $WE_VALIDATE_TAG)"
"${GENPY[@]}" "$(native_path "$SRC/mcmeta-$MCMETA_VALIDATE_TAG")" --expect-data-version "$MCMETA_VALIDATE_DATA_VERSION" \
  --compare "$(native_path "$REFERENCE")"

PROPS="$GEN/schem-reader-build.properties"
cat > "$PROPS" <<EOF
we.version=$WE_VERSION
we.tag=$WE_TAG
we.commit=$WE_COMMIT
build.mode=$MODE
piston=$PISTON_TAG@$PISTON_COMMIT
lin-bus=$LINBUS_TAG@$LINBUS_COMMIT
jlibnoise=$JLIBNOISE_COMMIT
registry.cliDataFormat=$WE_CLI_DATA_FORMAT
EOF
DATA_VERSIONS=()
for target in "${MCMETA_TARGETS[@]}"; do
  read -r tag commit dv <<<"$target"
  "${GENPY[@]}" "$(native_path "$SRC/mcmeta-$tag")" --expect-data-version "$dv" \
    --out "$(native_path "$CLI_DATA/${dv}_$WE_CLI_DATA_FORMAT.json")"
  DATA_VERSIONS+=("$dv")
  echo "registry.generated.$dv=generated by tests/worldedit/registry/gen_cli_registry.py from Minecraft ${tag%-summary} data-generator output (misode/mcmeta $tag@$commit); converter verified to reproduce worldedit-cli $WE_VALIDATE_TAG's own $MCMETA_VALIDATE_DATA_VERSION.json" >> "$PROPS"
done
echo "registry.dataVersions=$(IFS=,; echo "${DATA_VERSIONS[*]}")" >> "$PROPS"

# worldedit-core expects lang/i18n.zip (Crowdin translations, artifact worldedit-lang, published
# only on repo.enginehub.org) and fails while rendering any InputParseException message without
# it. It is only consulted for non-default locales; English comes from worldedit-core's own
# lang/strings.json. A zip without translations therefore restores upstream behaviour for
# English. (It needs one directory entry: ArchiveUnpacker only creates its target directory
# while extracting entries.)
if [ "$MODE" = source ]; then
  mkdir -p "$GEN/lang"
  "${PY[@]}" -c 'import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "w") as z:
    z.writestr(zipfile.ZipInfo("no-translations/", date_time=(1980, 1, 1, 0, 0, 0)), "")' "$(native_path "$GEN/lang/i18n.zip")"
fi

# --- 3. WorldEdit artifacts -----------------------------------------------------------------
# Always "clean": the output directories are reused across pin changes, and stale classes or
# resources of an older WorldEdit (e.g. 7.3's bundled cli/data/*.json) must never be packaged.
PROFILE=()
if [ "$MODE" = source ]; then
  log "compiling EngineHub sources with Maven (lin-bus, Piston, jlibnoise, worldedit-core, worldedit-cli)"
  "${MVN[@]}" -q -f "$(native_path "$HERE/upstream/pom.xml")" \
    "-Dsrc.root=$(native_path "$SRC")" "-Dupstream.build.dir=$(native_path "$CACHE/maven-target")" \
    "-Dwe.commit=$WE_COMMIT" clean install
elif [ "$MODE" = enginehub ]; then
  PROFILE=(-Penginehub)
else
  log "ERROR: WE_MODE must be 'source' or 'enginehub'"; exit 64
fi

# --- 4. the harness jar ---------------------------------------------------------------------
log "building schem-reader.jar"
"${MVN[@]}" -q -f "$(native_path "$HERE/pom.xml")" ${PROFILE[@]+"${PROFILE[@]}"} \
  "-Dgenerated.resources=$(native_path "$GEN")" "-Dwe.version=$WE_VERSION" "-Dwe.commit=$WE_COMMIT" clean package
log "built $HERE/target/schem-reader.jar"

if [ "$SELFTEST" = 1 ]; then
  "${PY[@]}" "$(native_path "$HERE/fixtures-src/selftest.py")" --jar "$(native_path "$HERE/target/schem-reader.jar")"
fi
