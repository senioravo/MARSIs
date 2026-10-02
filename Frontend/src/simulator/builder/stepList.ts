import type { ComponentType } from "react";
import { FACILITIES, siteById } from "../engine/catalog";
import { housingOf } from "../engine/create";
import type { ColonyConfig } from "../engine/types";
import type { StepProps } from "./Builder";
import { CrewStep, FleetStep, IndustryStep, LifeStep, PowerStep, ReviewStep, SectorsStep, SiteStep, SuppliesStep } from "./steps";


export const STEPS: {
  id: string;
  label: string;
  title: string;
  intro: string;
  summary: (c: ColonyConfig) => string;
  Component: ComponentType<StepProps>;
}[] = [
  {
    id: "site",
    label: "Site and mission",
    title: "Choose where to land",
    intro: "Pick a template or start from scratch, then choose the ground you will build on.",
    summary: (c) => siteById(c.siteId).label,
    Component: SiteStep,
  },
  {
    id: "crew",
    label: "Crew",
    title: "Who is on the manifest",
    intro: "Set the headcount, the mix of specialists and how much each person consumes.",
    summary: (c) => `${c.population} colonists`,
    Component: CrewStep,
  },
  {
    id: "sectors",
    label: "Sectors and habitats",
    title: "Lay out the districts",
    intro: "Name the sectors that make up the colony and decide where people live.",
    summary: (c) => `${c.sectors.length} sectors · ${housingOf(c.facilities)} beds`,
    Component: SectorsStep,
  },
  {
    id: "life",
    label: "Life support",
    title: "Air, water and food",
    intro: "The three things nobody survives without. Production has to outpace what the crew uses.",
    summary: (c) => `${c.facilities.filter((f) => ["life", "agri"].includes(FACILITIES[f.kind].category)).length} plants`,
    Component: LifeStep,
  },
  {
    id: "power",
    label: "Power",
    title: "Keep the lights on",
    intro: "Solar is free by day and useless at night or in a storm. Reactors are steady. Batteries bridge the gap.",
    summary: (c) => `${c.facilities.filter((f) => FACILITIES[f.kind].category === "energy").length} units`,
    Component: PowerStep,
  },
  {
    id: "industry",
    label: "Industry and services",
    title: "Build the supply chain",
    intro: "Processing, fabrication, storage, medicine and research — the systems that keep everything else repaired.",
    summary: (c) => `${c.facilities.filter((f) => ["industry", "storage", "health", "science"].includes(FACILITIES[f.kind].category)).length} facilities`,
    Component: IndustryStep,
  },
  {
    id: "fleet",
    label: "Fleet and comms",
    title: "Vehicles and links home",
    intro: "Rovers, crawlers, haulers and drones, plus the antennas and relays that keep you in contact.",
    summary: (c) => `${c.vehicles.length} vehicles · ${c.comms.length} links`,
    Component: FleetStep,
  },
  {
    id: "supplies",
    label: "Supplies and risk",
    title: "Cargo, hazards and standing orders",
    intro: "What you land with, how hostile Mars will be, and what the colony does without being told.",
    summary: (c) => `Storms ${c.events.dustStorms}× · failures ${c.events.failures}×`,
    Component: SuppliesStep,
  },
  {
    id: "review",
    label: "Review and launch",
    title: "Final check before landing",
    intro: "Read the projection on the right, then launch. Saved designs and runs are listed here too.",
    summary: (c) => `${c.durationSols} sols`,
    Component: ReviewStep,
  },
];
