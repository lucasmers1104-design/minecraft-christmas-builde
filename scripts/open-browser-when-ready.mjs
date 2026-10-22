// Opens the app in the default browser once the server answers, so the first page load does not
// hit a server that is still starting (start-windows.cmd runs this in the background).
import { spawn } from 'node:child_process';

const url = process.argv[2] ?? 'http://localhost:3000';
const timeoutMs = Number(process.argv[3] ?? 180_000);
const deadline = Date.now() + timeoutMs;

async function isReady() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

function openBrowser() {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`Bitte im Browser öffnen: ${url}`));
  child.unref();
}

while (Date.now() < deadline) {
  if (await isReady()) {
    console.log(`App ist bereit: ${url}`);
    openBrowser();
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
console.log(`Die App antwortet nicht unter ${url}. Die Fehlermeldung steht in diesem Fenster.`);
process.exit(1);
