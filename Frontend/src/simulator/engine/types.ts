// Core data model for the MARSIS colony simulator.
// Units: oxygen/food/ice/regolith/metals/silicon/construction/fuel/waste in kg,
// water in litres, components and medical supplies in units, energy in kWh.

export type ResourceKey =
  | "oxygen"
  | "water"
  | "food"
  | "ice"
  | "regolith"
  | "metals"
  | "silicon"
  | "construction"
  | "fuel"
  | "components"
  | "medical"
  | "waste";

export type ResourceMap = Partial<Record<ResourceKey, number>>;

export type Role =
  | "engineer"
  | "technician"
  | "botanist"
  | "medic"
  | "scientist"
  | "pilot"
  | "geologist";

export type FacilityCategory =
  | "habitat"
  | "life"
  | "agri"
  | "energy"
  | "industry"
  | "storage"
  | "health"
  | "science";

export type FacilityKind =
  | "habitat_dome"
  | "lava_tube"
  | "inflatable_module"
  | "o2_electrolysis"
  | "moxie_array"
  | "ice_extractor"
  | "water_recycler"
  | "greenhouse"
  | "algae_bioreactor"
  | "solar_array"
  | "fission_reactor"
  | "rtg"
  | "battery_bank"
  | "regolith_processor"
  | "fabricator"
  | "recycling_center"
  | "sabatier_plant"
  | "medical_bay"
  | "warehouse"
  | "tank_farm"
  | "research_lab";

export type CropKind = "potato" | "wheat" | "soy" | "lettuce" | "tomato";

export type VehicleKind = "pressurized_rover" | "utility_crawler" | "cargo_hauler" | "survey_drone";

export type CommsKind = "antenna" | "satellite";

export type SectorKind = "residential" | "industrial" | "agricultural" | "energy" | "science" | "mixed";

export type IncidentKind =
  | "pressure_leak"
  | "fire"
  | "power_failure"
  | "radiation"
  | "comms_failure"
  | "water_leak"
  | "oxygen_failure"
  | "structural"
  | "vehicle_breakdown"
  | "contamination"
  | "medical";

export type Difficulty = "cadet" | "standard" | "hardcore";

/** Disponible / Reparación / Inhabilitado (+ manually switched off). */
export type FacilityStatus = "operational" | "repair" | "disabled" | "offline";

/** Disponible / Defectuoso / Mantención / Inhabilitado. */
export type CommsStatus = "available" | "defective" | "maintenance" | "disabled";

export type PersonStatus = "assigned" | "available" | "pending" | "responding" | "medical" | "deceased";

export type VehicleStatus = "docked" | "charging" | "mission" | "returning" | "stranded" | "maintenance";

export type MissionKind = "regolith" | "ice" | "survey" | "rescue";

export type IncidentStatus = "open" | "awaiting" | "responding" | "resolved";

// ───────────────────────────── configuration (builder output)

export interface SectorConfig {
  id: string;
  name: string;
  kind: SectorKind;
}

export interface FacilityConfig {
  id: string;
  kind: FacilityKind;
  name: string;
  sectorId: string;
  crop?: CropKind;
}

export interface VehicleConfig {
  id: string;
  kind: VehicleKind;
  name: string;
}

export interface CommsConfig {
  id: string;
  kind: CommsKind;
  name: string;
  sectorId?: string;
}

export interface Policies {
  autoMaintenance: boolean;
  maintenanceThreshold: number; // integrity % that triggers a service
  autoResponse: boolean;
  autoDispatch: boolean;
  foodRation: number; // 0.6 – 1.1
  waterRation: number; // 0.6 – 1.1
  /** Lower numbers are cut first when power runs short. */
  powerPriority: Record<FacilityCategory, number>;
}

export interface EventSettings {
  dustStorms: number; // frequency multiplier 0 – 2
  solarFlares: number;
  meteorites: number;
  failures: number;
  resupply: boolean;
  resupplyEverySols: number;
}

export interface ColonyConfig {
  version: 1;
  name: string;
  seed: string;
  siteId: string;
  durationSols: number;
  difficulty: Difficulty;
  population: number;
  roleMix: Record<Role, number>;
  consumption: { oxygen: number; water: number; food: number; power: number }; // per person per sol
  sectors: SectorConfig[];
  facilities: FacilityConfig[];
  vehicles: VehicleConfig[];
  comms: CommsConfig[];
  stock: ResourceMap;
  batteryCharge: number; // 0 – 1
  events: EventSettings;
  policies: Policies;
}

// ───────────────────────────── runtime state

export interface Environment {
  temp: number; // °C
  pressure: number; // kPa
  humidity: number; // %
  o2: number; // % concentration
  co2: number; // ppm
  airQuality: number; // 0 – 100
  radiation: number; // mSv/sol inside
  dust: number; // µg/m³ indoor particulates
}

export interface Facility {
  id: string;
  kind: FacilityKind;
  name: string;
  sectorId: string;
  status: FacilityStatus;
  enabled: boolean;
  integrity: number; // 0 – 100
  hours: number; // operating hours
  efficiency: number; // last tick output factor 0 – 1
  powered: boolean;
  repairHoursLeft: number;
  repairReason: string;
  lastService: number; // abs hour
  crop?: CropKind;
  growth: number; // sols of effective growth in current cycle
  stockpile: number; // kg accumulated for next harvest
  output: ResourceMap; // last hour
  // habitats only
  residents: number;
  env?: Environment;
  seals: "sealed" | "degraded" | "breached";
}

export interface Sector {
  id: string;
  name: string;
  kind: SectorKind;
  x: number;
  y: number;
}

export interface Person {
  id: string;
  name: string;
  role: Role;
  status: PersonStatus;
  health: number;
  facilityId: string | null;
  sectorId: string | null;
  homeId: string | null;
  shift: "A" | "B" | "C";
  incidentId: string | null;
  arrivedSol: number;
  dose: number; // accumulated mSv
}

export interface Mission {
  kind: MissionKind;
  duration: number;
  elapsed: number;
  targetX: number;
  targetY: number;
  cargoKg: number;
  rescueOf?: string;
}

export interface Vehicle {
  id: string;
  kind: VehicleKind;
  name: string;
  status: VehicleStatus;
  charge: number; // 0 – 1 battery or fuel tank fraction
  integrity: number;
  x: number;
  y: number;
  crew: string[];
  mission: Mission | null;
  distanceKm: number;
  hours: number;
  serviceDueHours: number;
  cargoKg: number;
  serviceHoursLeft: number;
}

export interface CommsAsset {
  id: string;
  kind: CommsKind;
  name: string;
  sectorId?: string;
  status: CommsStatus;
  history: { t: number; status: CommsStatus; note: string }[];
  hoursLeft: number;
}

export interface Incident {
  id: string;
  kind: IncidentKind;
  severity: 1 | 2 | 3 | 4;
  status: IncidentStatus;
  title: string;
  facilityId?: string;
  vehicleId?: string;
  commsId?: string;
  personId?: string;
  sectorId?: string;
  openedAt: number;
  resolvedAt?: number;
  responders: string[];
  responsible?: string;
  needs: ResourceMap;
  needsRole: Role;
  crewNeeded: number;
  workTotal: number;
  workLeft: number;
  resourcesCommitted: boolean;
  manual?: boolean;
}

export interface LogEntry {
  t: number;
  level: "info" | "good" | "warn" | "critical";
  text: string;
  kind?: IncidentKind | "storm" | "resupply" | "harvest" | "research" | "mission" | "system";
}

export interface HistoryPoint {
  t: number;
  oxygen: number;
  water: number;
  food: number;
  battery: number;
  gen: number;
  demand: number;
  population: number;
  health: number;
  o2Days: number;
  waterDays: number;
  foodDays: number;
}

export interface FlowHour {
  prod: ResourceMap;
  cons: ResourceMap;
  energyGen: number;
  energyUse: number;
  recycled: number;
  waterUse: number;
  foodLocal: number;
  componentsLocal: number;
  componentsImported: number;
}

export interface Weather {
  tau: number; // dust optical depth
  stormHoursLeft: number;
  stormScale: "none" | "local" | "regional" | "global";
  flareHoursLeft: number;
  extTemp: number;
  extPressure: number; // mbar
  radiation: number; // mSv/sol outside
}

export interface SimState {
  id: string;
  config: ColonyConfig;
  t: number; // absolute hours since landing
  rng: number;
  ended: null | "complete" | "lost";
  resources: Record<ResourceKey, number>;
  capacity: Record<ResourceKey, number>;
  battery: number;
  batteryCap: number;
  power: { gen: number; demand: number; shed: number; solar: number; steady: number };
  sectors: Sector[];
  facilities: Facility[];
  people: Person[];
  vehicles: Vehicle[];
  comms: CommsAsset[];
  incidents: Incident[];
  log: LogEntry[];
  history: HistoryPoint[];
  flows: FlowHour[]; // last 24 hours, newest last
  weather: Weather;
  research: number;
  upgrades: Partial<Record<FacilityCategory, number>>;
  surveyBonus: number;
  nextResupply: number;
  stats: {
    deaths: number;
    arrivals: number;
    incidents: number;
    resolved: number;
    storms: number;
    harvestKg: number;
    missions: number;
    peakPopulation: number;
    componentsLocal: number;
    componentsImported: number;
    upgrades: number;
  };
  alerted: Record<string, number>;
  counter: number;
}

export const HOURS_PER_SOL = 24;
