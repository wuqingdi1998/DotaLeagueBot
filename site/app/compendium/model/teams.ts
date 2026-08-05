export type CompendiumTeam = {
  key: string;
  name: string;
  liquipediaLogoPath: string | null;
};

export const compendiumTeams: CompendiumTeam[] = [
  { key: "tbd", name: "TBD", liquipediaLogoPath: null },
  { key: "aurora-gaming", name: "Aurora Gaming", liquipediaLogoPath: "/commons/images/thumb/1/1c/Aurora_Gaming_2025_allmode.png/50px-Aurora_Gaming_2025_allmode.png" },
  { key: "boomboys", name: "BoomBoys", liquipediaLogoPath: "/commons/images/thumb/0/05/BoomBoys_allmode.png/78px-BoomBoys_allmode.png" },
  { key: "iron-wing", name: "Iron Wing", liquipediaLogoPath: "/commons/images/thumb/3/3c/Iron_Wing_allmode.png/100px-Iron_Wing_allmode.png" },
  { key: "team-falcons", name: "Team Falcons", liquipediaLogoPath: "/commons/images/thumb/8/83/Team_Falcons_2022_allmode.png/41px-Team_Falcons_2022_allmode.png" },
  { key: "team-liquid", name: "Team Liquid", liquipediaLogoPath: "/commons/images/thumb/0/01/Team_Liquid_2024_lightmode.png/44px-Team_Liquid_2024_lightmode.png" },
  { key: "team-yandex", name: "Team Yandex", liquipediaLogoPath: "/commons/images/thumb/9/9c/Team_Yandex_2026_lightmode.png/56px-Team_Yandex_2026_lightmode.png" },
  { key: "xtreme-gaming", name: "Xtreme Gaming", liquipediaLogoPath: "/commons/images/thumb/7/72/Xtreme_Gaming_%28China%29_allmode.png/50px-Xtreme_Gaming_%28China%29_allmode.png" },
  { key: "team-spirit", name: "Team Spirit", liquipediaLogoPath: "/commons/images/thumb/6/66/Team_Spirit_2022_lightmode.png/43px-Team_Spirit_2022_lightmode.png" },
  { key: "team-vision", name: "TEAM VISION", liquipediaLogoPath: "/commons/images/thumb/5/55/TEAM_VISION_allmode.png/52px-TEAM_VISION_allmode.png" },
  { key: "nigma-galaxy", name: "Nigma Galaxy", liquipediaLogoPath: "/commons/images/thumb/6/67/Nigma_Galaxy_allmode.png/50px-Nigma_Galaxy_allmode.png" },
  { key: "huligani", name: "HULIGANI", liquipediaLogoPath: "/commons/images/thumb/8/81/HULIGANI_allmode.png/100px-HULIGANI_allmode.png" },
  { key: "team-resilience", name: "Team Resilience", liquipediaLogoPath: "/commons/images/thumb/b/bd/Team_Resilience_%28DOTA2%29_lightmode.png/79px-Team_Resilience_%28DOTA2%29_lightmode.png" },
  { key: "vici-gaming", name: "Vici Gaming", liquipediaLogoPath: "/commons/images/thumb/c/ce/VICI_Gaming_allmode.png/49px-VICI_Gaming_allmode.png" },
  { key: "og", name: "OG", liquipediaLogoPath: "/commons/images/thumb/7/7b/OG_2026_allmode.png/36px-OG_2026_allmode.png" },
  { key: "gamerlegion", name: "GamerLegion", liquipediaLogoPath: "/commons/images/thumb/2/21/GamerLegion_2026_allmode.png/100px-GamerLegion_2026_allmode.png" },
  { key: "lgd-gaming", name: "LGD Gaming", liquipediaLogoPath: "/commons/images/thumb/2/2f/LGD_Gaming_Dec_2019_allmode.png/50px-LGD_Gaming_Dec_2019_allmode.png" },
];

export function compendiumTeamByKey(key: string): CompendiumTeam | null {
  return compendiumTeams.find((team) => team.key === key) ?? null;
}

export function compendiumTeamLogoUrl(key: string): string {
  if (key === "tbd") return "/tbd-team.svg";
  const sourceFilename = compendiumTeamByKey(key)?.liquipediaLogoPath
    ?.split("/")
    .at(-1);
  const version = sourceFilename
    ? `?v=${encodeURIComponent(sourceFilename)}`
    : "";
  return `/api/compendium/teams/${encodeURIComponent(key)}${version}`;
}
