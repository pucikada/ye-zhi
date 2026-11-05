import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = path.join(root, "app/api");
const stash = path.join(root, ".api-stash");
let moved = false;

try {
  if (existsSync(api)) {
    renameSync(api, stash);
    moved = true;
  }
  const result = spawnSync(
    process.execPath,
    [path.join(root, "node_modules/next/dist/bin/next"), "build"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        STATIC_EXPORT: "1",
        NEXT_PUBLIC_STATIC_EXPORT: "1",
      },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  if (moved && existsSync(stash)) renameSync(stash, api);
}
