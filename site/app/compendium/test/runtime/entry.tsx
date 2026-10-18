import { hydrateRoot } from "react-dom/client";
import { TestCompendium } from "../sections/TestCompendium";

hydrateRoot(document.getElementById("compendium-test")!, <TestCompendium />);
