import { readFileSync, realpathSync, statSync } from "fs";
import { extname, isAbsolute, relative, resolve, sep } from "path";
import { YacaBridgeConfig } from "./types/config";

/** Loaded at server startup, so operators can replace the picture without rebuilding. */
export function connectionImage(config: YacaBridgeConfig, pluginRoot: string): string {
  const overlay = config.ui.connectionOverlay;
  if (overlay.imageUrl) return overlay.imageUrl;
  const assetsRoot = realpathSync(resolve(pluginRoot, "assets"));
  const filename = realpathSync(resolve(pluginRoot, overlay.imagePath));
  const pathInAssets = relative(assetsRoot, filename);
  if (isAbsolute(pathInAssets) || pathInAssets === ".." || pathInAssets.startsWith(".." + sep))
    throw new Error("[YacaBridge] Connection picture must stay inside the plugin assets directory");
  if (statSync(filename).size > 64 * 1024)
    throw new Error("[YacaBridge] Connection picture exceeds 64 KiB; compress it or configure ui.connectionOverlay.imageUrl");
  const mime: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
  if (!mime[extname(filename).toLowerCase()]) throw new Error("[YacaBridge] Unsupported connection picture format");
  return `data:${mime[extname(filename).toLowerCase()]};base64,${readFileSync(filename).toString("base64")}`;
}
