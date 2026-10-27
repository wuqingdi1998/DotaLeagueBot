import { isDevelopmentSite } from "@/lib/development/environment";
import { DevelopmentInfoButton } from "./DevelopmentInfoButton";

export function DevelopmentTools() {
  return isDevelopmentSite() ? <DevelopmentInfoButton /> : null;
}
