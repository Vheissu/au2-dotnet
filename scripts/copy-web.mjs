import { cp, mkdir, rm } from 'node:fs/promises';

await rm('.artifacts/publish/wwwroot', { recursive: true, force: true });
await mkdir('.artifacts/publish/wwwroot', { recursive: true });
await cp('src/Starter.Web/dist', '.artifacts/publish/wwwroot', { recursive: true });
