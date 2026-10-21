// Cross-platform runner (Windows cmd/PowerShell have no `VAR=1 cmd` syntax): runs the
// WorldEdit reader suite and fails if the reader jar has not been built.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['vitest', 'run', 'tests/integration/worldedit.test.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, MCB_REQUIRE_WORLDEDIT: '1' },
});
process.exit(result.status ?? 1);
