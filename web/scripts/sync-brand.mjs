import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrandModules } from "./brand-modules.mjs";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = resolve(webDir, "..", "brand");
const logoIconPath = resolve(brandDir, "logo", "logo-icon.svg");

const { mascotTs, logoIconTs } = buildBrandModules({
  mascotSvg: readFileSync(resolve(brandDir, "mascot", "mascot-layered.svg"), "utf8"),
  logoIconSvg: readFileSync(logoIconPath, "utf8"),
});

const generatedDir = resolve(webDir, "src", "components", "brand", "generated");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(resolve(generatedDir, "mascot.ts"), mascotTs);
writeFileSync(resolve(generatedDir, "logo-icon.ts"), logoIconTs);
copyFileSync(logoIconPath, resolve(webDir, "src", "app", "icon.svg"));
