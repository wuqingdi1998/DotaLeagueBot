import { ImagePreloader } from "../../components/ImagePreloader";
import { FEARLESS_DRAFT_HERO_IMAGE_URLS } from "../model/heroes";

export function HeroImagePreloader() {
  return (
    <ImagePreloader
      imageUrls={FEARLESS_DRAFT_HERO_IMAGE_URLS}
      concurrency={24}
      startMode="immediate"
    />
  );
}
