import React from "react";
import { createRoot } from "react-dom/client";
import { DevelopmentInfoButton } from "@/app/components/development/DevelopmentInfoButton";
import { DevelopmentLoginScreen } from "@/app/components/development/DevelopmentLoginScreen";

createRoot(document.getElementById("root")!).render(
  <>
    <DevelopmentLoginScreen returnTo="/" />
    <DevelopmentInfoButton />
  </>,
);
