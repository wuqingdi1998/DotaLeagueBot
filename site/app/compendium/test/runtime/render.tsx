import { renderToString } from "react-dom/server";
import { ImageConfigContext } from "next/dist/shared/lib/image-config-context.shared-runtime";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import nextConfig from "@/next.config";
import { TestCompendium } from "../sections/TestCompendium";

/** Build only synthetic initial HTML, so thumbnails are discovered before hydration, as in main. */
export function renderTestCompendium() {
  return renderToString(<ImageConfigContext.Provider value={{ ...imageConfigDefault, ...nextConfig.images }}>
    <TestCompendium />
  </ImageConfigContext.Provider>);
}
