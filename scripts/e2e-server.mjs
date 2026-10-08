import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dotnetPath } from './dotnet-path.mjs';

const directory = await mkdtemp(join(tmpdir(), 'au2-browser-'));
const child = spawn(dotnetPath(), ['Starter.Api.dll', '--urls', 'http://127.0.0.1:5081'], {
  cwd: '.artifacts/publish',
  env: {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Testing',
    Database__ApplyMigrations: 'true',
    ConnectionStrings__Database: `Data Source=${join(directory, 'browser.db')};Pooling=False`,
  },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
try {
  const [code] = await once(child, 'exit');
  process.exitCode = code ?? 0;
} finally {
  await rm(directory, { recursive: true, force: true });
}
