import { spawn } from 'node:child_process';
import { dotnetPath } from './dotnet-path.mjs';

const child = spawn(dotnetPath(), ['Starter.Api.dll'], {
  cwd: '.artifacts/publish',
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
