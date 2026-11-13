// Copia o worker do MapLibre para public/, de onde o navegador o carrega.
// O MapLibre 6 distribui o worker em arquivo separado, e o empacotador do
// Next.js não o resolve sozinho. Roda antes de "dev" e de "build".
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
copyFileSync(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/maplibre-gl-worker.mjs",
);
