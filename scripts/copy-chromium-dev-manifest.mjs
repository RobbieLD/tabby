import { copyFile } from "node:fs/promises";
import path from "node:path";

await copyFile(
    path.resolve("targets/chromium/dev/manifest.json"),
    path.resolve("public/manifest.json")
);
