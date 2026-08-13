import { ImagePreloader } from "../../components/ImagePreloader";
import { COMPENDIUM_HERO_IMAGE_URLS } from "../model/heroes";

export function CompendiumHeroImagePreloader() {
  return <ImagePreloader imageUrls={COMPENDIUM_HERO_IMAGE_URLS} />;
}
