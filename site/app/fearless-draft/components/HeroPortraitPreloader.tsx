import { ImagePreloader } from "../../components/ImagePreloader";
import { FEARLESS_DRAFT_HERO_PORTRAIT_URLS } from "../model/heroes";

export function HeroPortraitPreloader() {
  return (
    <ImagePreloader
      imageUrls={FEARLESS_DRAFT_HERO_PORTRAIT_URLS}
      concurrency={8}
      startMode="immediate"
    />
  );
}
