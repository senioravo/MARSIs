import type {
  CropKind,
  FacilityCategory,
  FacilityKind,
  IncidentKind,
  ResourceKey,
  ResourceMap,
  Role,
  SectorKind,
  VehicleKind,
  MissionKind,
  CommsKind,
} from "./types";

// ───────────────────────────── resources

export interface ResourceDef {
  label: string;
  unit: string;
  color: string;
  critical: boolean;
  minReserve: number; // per colonist, used for low-stock alerts
}

export const RESOURCES: Record<ResourceKey, ResourceDef> = {
  oxygen: { label: "Oxygen", unit: "kg", color: "var(--life)", critical: true, minReserve: 6 },
  water: { label: "Water", unit: "L", color: "var(--energy)", critical: true, minReserve: 150 },
  food: { label: "Food", unit: "kg", color: "var(--signal)", critical: true, minReserve: 20 },
  ice: { label: "Ice", unit: "kg", color: "#bfe3f2", critical: false, minReserve: 0 },
  regolith: { label: "Regolith", unit: "kg", color: "var(--regolith)", critical: false, minReserve: 0 },
  metals: { label: "Metals", unit: "kg", color: "#b8c2cc", critical: false, minReserve: 2 },
  silicon: { label: "Silicon", unit: "kg", color: "#8fa6c9", critical: false, minReserve: 1 },
  construction: { label: "Construction materials", unit: "kg", color: "#c7a17a", critical: true, minReserve: 8 },
  fuel: { label: "Methane fuel", unit: "kg", color: "#e8c46a", critical: false, minReserve: 3 },
  components: { label: "Spare components", unit: "u", color: "var(--white)", critical: true, minReserve: 0.6 },
  medical: { label: "Medical supplies", unit: "u", color: "#ff7a8a", critical: true, minReserve: 0.6 },
  waste: { label: "Recyclable waste", unit: "kg", color: "#7d7466", critical: false, minReserve: 0 },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

/** What the landing craft itself can store before any storage is built. */
export const BASE_CAPACITY: Record<ResourceKey, number> = {
  oxygen: 200,
  water: 3000,
  food: 1500,
  ice: 2000,
  regolith: 5000,
  metals: 500,
  silicon: 300,
  construction: 2000,
  fuel: 500,
  components: 60,
  medical: 60,
  waste: 2000,
};

// ───────────────────────────── roles

export const ROLES: Record<Role, { label: string; plural: string; blurb: string }> = {
  engineer: { label: "Engineer", plural: "Engineers", blurb: "Runs power and life-support plants, leads repairs." },
  technician: { label: "Technician", plural: "Technicians", blurb: "Generalist. Fixes seals, leaks and anything else." },
  botanist: { label: "Botanist", plural: "Botanists", blurb: "Keeps greenhouses and bioreactors producing." },
  medic: { label: "Medic", plural: "Medics", blurb: "Treats injuries, manages radiation dose." },
  scientist: { label: "Scientist", plural: "Scientists", blurb: "Research that makes every system more efficient." },
  pilot: { label: "Pilot", plural: "Pilots", blurb: "Drives rovers and haulers on supply runs." },
  geologist: { label: "Geologist", plural: "Geologists", blurb: "Finds ice and ore; boosts extraction." },
};

export const ROLE_KEYS = Object.keys(ROLES) as Role[];

// ───────────────────────────── crops

export interface CropDef {
  label: string;
  cycleSols: number;
  yieldPerSol: number; // kg food-equivalent per greenhouse
  waterPerSol: number; // L
  note: string;
}

export const CROPS: Record<CropKind, CropDef> = {
  potato: { label: "Potato", cycleSols: 70, yieldPerSol: 24, waterPerSol: 50, note: "Calorie anchor. Slow, heavy harvests." },
  wheat: { label: "Wheat", cycleSols: 60, yieldPerSol: 18, waterPerSol: 45, note: "Stores well. Bread and flour." },
  soy: { label: "Soybean", cycleSols: 75, yieldPerSol: 15, waterPerSol: 55, note: "Protein and oil. Fixes nitrogen." },
  lettuce: { label: "Lettuce", cycleSols: 30, yieldPerSol: 10, waterPerSol: 30, note: "Fast cycles, low calories." },
  tomato: { label: "Tomato", cycleSols: 55, yieldPerSol: 14, waterPerSol: 60, note: "Thirsty, but good for morale." },
};

export const CROP_KEYS = Object.keys(CROPS) as CropKind[];

// ───────────────────────────── facilities

export interface FacilityDef {
  label: string;
  category: FacilityCategory;
  blurb: string;
  power: number; // kW drawn while running
  generation?: { kind: "solar" | "steady"; kw: number };
  battery?: number; // kWh storage
  inputs?: ResourceMap; // per hour at full output
  outputs?: ResourceMap; // per hour at full output
  housing?: number;
  storage?: ResourceMap;
  shielding?: number; // fraction of outside radiation that gets through
  staff: number;
  roles: Role[];
  failRate: number; // failures per 1000 operating hours at full integrity
  wear: number; // integrity lost per 100 operating hours
  incidents: IncidentKind[];
  stats: string[]; // short spec lines for the builder
}

export const FACILITIES: Record<FacilityKind, FacilityDef> = {
  habitat_dome: {
    label: "Habitat dome",
    category: "habitat",
    blurb: "Regolith-shielded dome with bunks, galley and its own scrubbers.",
    power: 4,
    housing: 12,
    storage: { oxygen: 150, water: 2000, food: 300 },
    shielding: 0.35,
    staff: 0,
    roles: ["technician"],
    failRate: 0.5,
    wear: 0.35,
    incidents: ["pressure_leak", "fire", "structural", "contamination"],
    stats: ["12 residents", "4 kW", "35% radiation passes"],
  },
  lava_tube: {
    label: "Lava-tube habitat",
    category: "habitat",
    blurb: "Sealed section of an ancient lava tube. Huge, cold, superbly shielded.",
    power: 7,
    housing: 30,
    storage: { oxygen: 300, water: 3000, food: 1000 },
    shielding: 0.08,
    staff: 1,
    roles: ["technician", "engineer"],
    failRate: 0.35,
    wear: 0.25,
    incidents: ["pressure_leak", "structural", "fire"],
    stats: ["30 residents", "7 kW", "8% radiation passes"],
  },
  inflatable_module: {
    label: "Inflatable module",
    category: "habitat",
    blurb: "Kevlar-layered expandable. Fast to deploy, fragile under stress.",
    power: 2.5,
    housing: 6,
    storage: { oxygen: 60, water: 600, food: 100 },
    shielding: 0.6,
    staff: 0,
    roles: ["technician"],
    failRate: 1.2,
    wear: 0.55,
    incidents: ["pressure_leak", "structural"],
    stats: ["6 residents", "2.5 kW", "Leak-prone"],
  },
  o2_electrolysis: {
    label: "Oxygen electrolysis plant",
    category: "life",
    blurb: "Splits melted ice into breathable oxygen and hydrogen.",
    power: 14,
    inputs: { water: 1.6 },
    outputs: { oxygen: 1.4 },
    staff: 2,
    roles: ["engineer", "technician"],
    failRate: 1.1,
    wear: 0.6,
    incidents: ["oxygen_failure", "fire", "power_failure"],
    stats: ["1.4 kg O₂/h", "1.6 L water/h", "14 kW"],
  },
  moxie_array: {
    label: "MOXIE array",
    category: "life",
    blurb: "Solid-oxide cells pulling oxygen straight out of the CO₂ atmosphere.",
    power: 6,
    outputs: { oxygen: 0.5 },
    staff: 1,
    roles: ["engineer", "technician"],
    failRate: 0.9,
    wear: 0.5,
    incidents: ["oxygen_failure", "power_failure"],
    stats: ["0.5 kg O₂/h", "No water", "6 kW"],
  },
  ice_extractor: {
    label: "Ice extractor",
    category: "life",
    blurb: "Drills and melts subsurface ice. Yield depends on the site.",
    power: 10,
    outputs: { water: 12 },
    staff: 2,
    roles: ["geologist", "technician"],
    failRate: 1.3,
    wear: 0.8,
    incidents: ["water_leak", "power_failure", "structural"],
    stats: ["12 L water/h × site ice", "Melts hauled ice", "10 kW"],
  },
  water_recycler: {
    label: "Water recycler",
    category: "life",
    blurb: "Membrane and vapour-compression loop that reclaims grey water and urine.",
    power: 3,
    staff: 1,
    roles: ["technician", "engineer"],
    failRate: 0.9,
    wear: 0.5,
    incidents: ["water_leak", "contamination"],
    stats: ["60 L/h processed", "93% recovery", "3 kW"],
  },
  greenhouse: {
    label: "Greenhouse",
    category: "agri",
    blurb: "400 m² of hydroponic beds under LED and filtered sunlight.",
    power: 8,
    outputs: { oxygen: 0.02 },
    staff: 2,
    roles: ["botanist"],
    failRate: 0.7,
    wear: 0.35,
    incidents: ["contamination", "water_leak", "fire"],
    stats: ["Harvest per crop cycle", "8 kW grow lights", "Uses water"],
  },
  algae_bioreactor: {
    label: "Algae bioreactor",
    category: "agri",
    blurb: "Spirulina photobioreactor. Continuous protein and a little oxygen.",
    power: 3,
    inputs: { water: 0.5 },
    outputs: { food: 0.17, oxygen: 0.06 },
    staff: 1,
    roles: ["botanist", "scientist"],
    failRate: 0.8,
    wear: 0.4,
    incidents: ["contamination"],
    stats: ["4 kg food/sol", "1.4 kg O₂/sol", "3 kW"],
  },
  solar_array: {
    label: "Solar array",
    category: "energy",
    blurb: "Thin-film field. Free power by day, nothing at night, dims in dust.",
    power: 0,
    generation: { kind: "solar", kw: 60 },
    staff: 0,
    roles: ["technician"],
    failRate: 0.4,
    wear: 0.3,
    incidents: ["power_failure", "structural"],
    stats: ["60 kW peak", "Daylight only", "Loses output in dust"],
  },
  fission_reactor: {
    label: "Kilopower reactor",
    category: "energy",
    blurb: "Compact fission unit buried behind a regolith berm. Steady day and night.",
    power: 0,
    generation: { kind: "steady", kw: 40 },
    staff: 1,
    roles: ["engineer"],
    failRate: 0.6,
    wear: 0.25,
    incidents: ["power_failure", "radiation", "fire"],
    stats: ["40 kW constant", "Needs 1 engineer", "Rare radiation risk"],
  },
  rtg: {
    label: "RTG",
    category: "energy",
    blurb: "Radioisotope generator. Small, sealed, almost unkillable.",
    power: 0,
    generation: { kind: "steady", kw: 2.5 },
    staff: 0,
    roles: ["engineer"],
    failRate: 0.05,
    wear: 0.05,
    incidents: ["radiation"],
    stats: ["2.5 kW constant", "No crew", "Decades of life"],
  },
  battery_bank: {
    label: "Battery bank",
    category: "energy",
    blurb: "Li-ion racks in a heated vault. Carries the colony through the night.",
    power: 0.5,
    battery: 600,
    staff: 0,
    roles: ["engineer", "technician"],
    failRate: 0.5,
    wear: 0.3,
    incidents: ["fire", "power_failure"],
    stats: ["600 kWh", "90% round trip", "0.5 kW thermal"],
  },
  regolith_processor: {
    label: "Regolith processor",
    category: "industry",
    blurb: "Sinters and refines hauled regolith into metals, silicon and bricks.",
    power: 15,
    inputs: { regolith: 40 },
    outputs: { metals: 3, silicon: 1.5, construction: 22 },
    staff: 2,
    roles: ["geologist", "engineer"],
    failRate: 1.4,
    wear: 0.9,
    incidents: ["fire", "structural", "contamination"],
    stats: ["40 kg regolith/h", "→ metals, silicon, bricks", "15 kW"],
  },
  fabricator: {
    label: "Fabrication plant",
    category: "industry",
    blurb: "Metal and silicon printers turning raw stock into spare parts.",
    power: 8,
    inputs: { metals: 2, silicon: 0.6 },
    outputs: { components: 0.25 },
    staff: 2,
    roles: ["engineer", "technician"],
    failRate: 1,
    wear: 0.6,
    incidents: ["fire", "power_failure"],
    stats: ["6 components/sol", "Uses metals + silicon", "8 kW"],
  },
  recycling_center: {
    label: "Recycling center",
    category: "industry",
    blurb: "Shreds, sorts and melts colony waste back into feedstock.",
    power: 4,
    inputs: { waste: 6 },
    outputs: { metals: 0.6, construction: 3, water: 1 },
    staff: 1,
    roles: ["technician"],
    failRate: 0.8,
    wear: 0.5,
    incidents: ["fire", "contamination"],
    stats: ["6 kg waste/h", "→ metals, bricks, water", "4 kW"],
  },
  sabatier_plant: {
    label: "Sabatier fuel plant",
    category: "industry",
    blurb: "CO₂ plus hydrogen into methane for the hauler fleet.",
    power: 6,
    inputs: { water: 1.2 },
    outputs: { fuel: 0.9 },
    staff: 1,
    roles: ["engineer"],
    failRate: 1,
    wear: 0.6,
    incidents: ["fire", "power_failure"],
    stats: ["0.9 kg CH₄/h", "1.2 L water/h", "6 kW"],
  },
  medical_bay: {
    label: "Medical bay",
    category: "health",
    blurb: "Surgery, imaging, a pharmacy and a radiation shelter. Medics heal faster here.",
    power: 3,
    inputs: { water: 0.3, silicon: 0.02 },
    outputs: { medical: 0.08 },
    storage: { medical: 200 },
    shielding: 0.15,
    staff: 2,
    roles: ["medic"],
    failRate: 0.4,
    wear: 0.3,
    incidents: ["contamination", "power_failure"],
    stats: ["Treats 6 at once", "Makes 2 supplies/sol", "3 kW"],
  },
  warehouse: {
    label: "Warehouse",
    category: "storage",
    blurb: "Pressurised racks for food, parts and raw materials.",
    power: 0.5,
    storage: {
      food: 8000,
      ice: 20000,
      regolith: 30000,
      metals: 5000,
      silicon: 3000,
      construction: 20000,
      components: 400,
      medical: 300,
      waste: 5000,
    },
    staff: 0,
    roles: ["technician"],
    failRate: 0.3,
    wear: 0.2,
    incidents: ["fire", "structural"],
    stats: ["Food, parts, raw stock", "0.5 kW"],
  },
  tank_farm: {
    label: "Tank farm",
    category: "storage",
    blurb: "Cryogenic oxygen, water and methane tanks behind a berm.",
    power: 1,
    storage: { oxygen: 4000, water: 40000, fuel: 3000 },
    staff: 0,
    roles: ["technician"],
    failRate: 0.4,
    wear: 0.25,
    incidents: ["pressure_leak", "water_leak"],
    stats: ["4 t O₂ · 40 kL water", "3 t methane", "1 kW"],
  },
  research_lab: {
    label: "Research lab",
    category: "science",
    blurb: "Studies that slowly raise the efficiency of every system.",
    power: 5,
    outputs: {},
    staff: 2,
    roles: ["scientist"],
    failRate: 0.5,
    wear: 0.3,
    incidents: ["fire", "contamination"],
    stats: ["Research → upgrades", "Uses a little O₂", "5 kW"],
  },
};

export const FACILITY_KINDS = Object.keys(FACILITIES) as FacilityKind[];

export const CATEGORIES: Record<FacilityCategory, { label: string; color: string }> = {
  habitat: { label: "Habitats", color: "var(--white)" },
  life: { label: "Life support", color: "var(--life)" },
  agri: { label: "Agriculture", color: "#a6d672" },
  energy: { label: "Energy", color: "var(--energy)" },
  industry: { label: "Industry", color: "var(--signal)" },
  storage: { label: "Storage", color: "var(--regolith)" },
  health: { label: "Health", color: "#ff7a8a" },
  science: { label: "Science", color: "#c9a7ff" },
};

export const SECTOR_KINDS: Record<SectorKind, { label: string; suits: FacilityCategory[] }> = {
  residential: { label: "Residential", suits: ["habitat", "health"] },
  industrial: { label: "Industrial", suits: ["industry", "storage"] },
  agricultural: { label: "Agricultural", suits: ["agri"] },
  energy: { label: "Energy", suits: ["energy"] },
  science: { label: "Science", suits: ["science", "health"] },
  mixed: { label: "Mixed use", suits: ["life", "storage"] },
};

// ───────────────────────────── vehicles

export interface VehicleDef {
  label: string;
  blurb: string;
  power: "battery" | "methalox";
  capacity: number; // kWh or kg fuel
  drain: number; // per hour of operation
  o2PerHour: number; // oxidiser + crew
  crew: number;
  cargo: number;
  speed: number; // km/h
  missions: MissionKind[];
  stats: string[];
}

export const VEHICLES: Record<VehicleKind, VehicleDef> = {
  pressurized_rover: {
    label: "Pressurised rover",
    blurb: "Shirt-sleeve cabin for two. Survey, prospecting and rescue.",
    power: "battery",
    capacity: 300,
    drain: 20,
    o2PerHour: 0.07,
    crew: 2,
    cargo: 600,
    speed: 14,
    missions: ["survey", "ice", "rescue"],
    stats: ["300 kWh", "Crew 2", "600 kg cargo"],
  },
  utility_crawler: {
    label: "Utility crawler",
    blurb: "Open-cab excavator-loader. Slow, tireless, hauls regolith.",
    power: "battery",
    capacity: 160,
    drain: 12,
    o2PerHour: 0.05,
    crew: 1,
    cargo: 1500,
    speed: 8,
    missions: ["regolith", "ice", "rescue"],
    stats: ["160 kWh", "Crew 1", "1.5 t cargo"],
  },
  cargo_hauler: {
    label: "Cargo hauler",
    blurb: "Methalox heavy hauler. Burns colony fuel and oxygen to move tonnes.",
    power: "methalox",
    capacity: 300,
    drain: 9,
    o2PerHour: 2,
    crew: 1,
    cargo: 4000,
    speed: 18,
    missions: ["regolith", "ice"],
    stats: ["Burns CH₄ + O₂", "Crew 1", "4 t cargo"],
  },
  survey_drone: {
    label: "Survey drone",
    blurb: "Long-endurance flyer mapping ice deposits and inspecting structures.",
    power: "battery",
    capacity: 12,
    drain: 1.5,
    o2PerHour: 0,
    crew: 0,
    cargo: 0,
    speed: 40,
    missions: ["survey"],
    stats: ["12 kWh", "Uncrewed", "Finds ice"],
  },
};

export const VEHICLE_KINDS = Object.keys(VEHICLES) as VehicleKind[];

export const MISSIONS: Record<MissionKind, { label: string; blurb: string }> = {
  regolith: { label: "Regolith run", blurb: "Haul regolith for the processor." },
  ice: { label: "Ice run", blurb: "Haul ice blocks back to the extractor." },
  survey: { label: "Survey", blurb: "Map ice and inspect the perimeter." },
  rescue: { label: "Rescue", blurb: "Recover a stranded vehicle and crew." },
};

export const COMMS: Record<CommsKind, { label: string; blurb: string }> = {
  antenna: { label: "Ground antenna", blurb: "High-gain dish for the Earth link and local traffic." },
  satellite: { label: "Relay satellite", blurb: "Areostationary relay covering conjunction gaps." },
};

// ───────────────────────────── incidents

export interface IncidentDef {
  label: string;
  role: Role;
  needs: (sev: number) => ResourceMap;
  hours: (sev: number) => number;
  crew: (sev: number) => number;
  color: string;
}

export const INCIDENTS: Record<IncidentKind, IncidentDef> = {
  pressure_leak: {
    label: "Pressure leak",
    role: "technician",
    needs: (s) => ({ construction: 15 * s, components: 1 }),
    hours: (s) => 2 + 2.5 * s,
    crew: (s) => (s > 2 ? 2 : 1),
    color: "var(--energy)",
  },
  fire: {
    label: "Fire",
    role: "engineer",
    needs: (s) => ({ components: 2 * s, medical: s > 2 ? 2 : 0 }),
    hours: (s) => 3 + 3 * s,
    crew: (s) => Math.min(3, s),
    color: "var(--mars)",
  },
  power_failure: {
    label: "Power failure",
    role: "engineer",
    needs: (s) => ({ components: 2 * s }),
    hours: (s) => 3 + 3 * s,
    crew: (s) => (s > 2 ? 2 : 1),
    color: "var(--signal)",
  },
  radiation: {
    label: "Radiation exposure",
    role: "medic",
    needs: (s) => ({ medical: 3 * s }),
    hours: (s) => 2 + 2 * s,
    crew: () => 1,
    color: "#e8d84a",
  },
  comms_failure: {
    label: "Comms outage",
    role: "technician",
    needs: (s) => ({ components: s }),
    hours: (s) => 3 + 2 * s,
    crew: () => 1,
    color: "#c9a7ff",
  },
  water_leak: {
    label: "Water leak",
    role: "technician",
    needs: (s) => ({ construction: 8 * s, components: 1 }),
    hours: (s) => 2 + 2 * s,
    crew: () => 1,
    color: "var(--energy)",
  },
  oxygen_failure: {
    label: "Oxygen system fault",
    role: "engineer",
    needs: (s) => ({ components: 2 * s }),
    hours: (s) => 3 + 3 * s,
    crew: (s) => (s > 2 ? 2 : 1),
    color: "var(--life)",
  },
  structural: {
    label: "Structural damage",
    role: "engineer",
    needs: (s) => ({ construction: 40 * s, metals: 8 * s }),
    hours: (s) => 4 + 5 * s,
    crew: (s) => Math.min(3, 1 + Math.floor(s / 2)),
    color: "#c7a17a",
  },
  vehicle_breakdown: {
    label: "Vehicle breakdown",
    role: "pilot",
    needs: (s) => ({ components: 1 + s }),
    hours: (s) => 3 + 3 * s,
    crew: () => 1,
    color: "var(--signal)",
  },
  contamination: {
    label: "Contamination",
    role: "botanist",
    needs: (s) => ({ components: 1, medical: s > 2 ? 1 : 0 }),
    hours: (s) => 3 + 3 * s,
    crew: () => 1,
    color: "#a6d672",
  },
  medical: {
    label: "Medical emergency",
    role: "medic",
    needs: (s) => ({ medical: 2 * s }),
    hours: (s) => 2 + 3 * s,
    crew: () => 1,
    color: "#ff7a8a",
  },
};

export const SEVERITY: Record<1 | 2 | 3 | 4, { label: string; color: string }> = {
  1: { label: "Low", color: "var(--ink-60)" },
  2: { label: "Moderate", color: "var(--signal)" },
  3: { label: "High", color: "var(--mars)" },
  4: { label: "Critical", color: "#ff3b3b" },
};

// ───────────────────────────── landing sites

export interface SiteDef {
  id: string;
  label: string;
  region: string;
  coords: string;
  blurb: string;
  ice: number; // multiplier on extractor yield
  solar: number; // multiplier on solar output
  dust: number; // storm frequency multiplier
  radiation: number; // mSv/sol at the surface
  baseTemp: number; // mean °C
  swing: number; // day/night amplitude
  pressure: number; // mbar
  terrain: "crater" | "plain" | "basin" | "canyon" | "volcano" | "polar";
}

export const SITES: SiteDef[] = [
  {
    id: "jezero",
    label: "Jezero Crater",
    region: "Isidis rim",
    coords: "18.4°N 77.5°E",
    blurb: "An ancient river delta. Balanced conditions and good geology.",
    ice: 0.75,
    solar: 1,
    dust: 1,
    radiation: 0.68,
    baseTemp: -62,
    swing: 38,
    pressure: 6.4,
    terrain: "crater",
  },
  {
    id: "arcadia",
    label: "Arcadia Planitia",
    region: "Northern lowlands",
    coords: "46.7°N 197.2°E",
    blurb: "Ice sits a metre under the dust. Colder, with weaker sun.",
    ice: 1.45,
    solar: 0.82,
    dust: 0.9,
    radiation: 0.64,
    baseTemp: -72,
    swing: 34,
    pressure: 7.6,
    terrain: "plain",
  },
  {
    id: "hellas",
    label: "Hellas Basin",
    region: "Southern highlands",
    coords: "42.4°S 70.5°E",
    blurb: "The deepest point on Mars. Thicker air, less radiation, frequent storms.",
    ice: 1,
    solar: 0.9,
    dust: 1.5,
    radiation: 0.48,
    baseTemp: -55,
    swing: 30,
    pressure: 11.2,
    terrain: "basin",
  },
  {
    id: "valles",
    label: "Valles Marineris",
    region: "Candor Chasma",
    coords: "6.5°S 71.0°W",
    blurb: "Canyon walls shield against radiation and wind. Short daylight.",
    ice: 0.8,
    solar: 0.88,
    dust: 1.15,
    radiation: 0.55,
    baseTemp: -48,
    swing: 32,
    pressure: 9,
    terrain: "canyon",
  },
  {
    id: "tharsis",
    label: "Arsia Mons flank",
    region: "Tharsis plateau",
    coords: "8.3°S 120.1°W",
    blurb: "High, clear and dry. Excellent sun, little ice, harsh radiation.",
    ice: 0.4,
    solar: 1.18,
    dust: 0.6,
    radiation: 0.9,
    baseTemp: -78,
    swing: 42,
    pressure: 3.8,
    terrain: "volcano",
  },
  {
    id: "planum",
    label: "Planum Boreum edge",
    region: "North polar cap",
    coords: "81.2°N 15.6°E",
    blurb: "Endless ice and brutal cold. Long seasons of low sun.",
    ice: 2,
    solar: 0.65,
    dust: 0.8,
    radiation: 0.7,
    baseTemp: -95,
    swing: 18,
    pressure: 7,
    terrain: "polar",
  },
];

export const siteById = (id: string): SiteDef => SITES.find((s) => s.id === id) ?? SITES[0];
