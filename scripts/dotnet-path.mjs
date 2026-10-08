import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function dotnetPath() {
  if (process.env.DOTNET_EXECUTABLE) return process.env.DOTNET_EXECUTABLE;
  if (spawnSync('dotnet', ['--version'], { stdio: 'ignore' }).status === 0) return 'dotnet';
  const local = join(homedir(), '.dotnet', process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
  if (existsSync(local)) return local;
  throw new Error('Install the .NET 10 SDK: https://dotnet.microsoft.com/download/dotnet/10.0');
}
