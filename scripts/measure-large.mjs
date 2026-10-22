// Cross-platform runner for the large-model measurements in tests/integration/largeModels.test.ts
// (Windows cmd/PowerShell have no `VAR=1 cmd` syntax). Prints createVoxelModel, hash, transport,
// export, validator and – if the reader jar is built – WorldEdit timings and sizes.
//
//   node scripts/measure-large.mjs                     # 128x384x128
//   node scripts/measure-large.mjs 96x200x96,128x384x128
import { spawnSync } from 'node:child_process';

const sizes = process.argv[2] ?? '128x384x128';
if (!/^\d+x\d+x\d+(,\d+x\d+x\d+)*$/.test(sizes)) {
  console.error(`Ungültige Größenangabe "${sizes}" – erwartet z. B. 128x384x128 oder 96x200x96,128x384x128`);
  process.exit(2);
}
const result = spawnSync('npx', ['vitest', 'run', 'tests/integration/largeModels.test.ts', '-t', 'Messung', '--reporter=verbose'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, MCB_MEASURE: '1', MCB_MEASURE_SIZES: sizes },
});
process.exit(result.status ?? 1);
