import { CROP_KEYS, FACILITIES, SITES, VEHICLES } from "./catalog";
import { SECTOR_NAME_POOL, pickColonyName, pickHabName, pickVehicleName } from "./names";
import { Rng, hashSeed, randomSeed } from "./rng";
import type {
  ColonyConfig,
  CommsKind,
  CropKind,
  FacilityConfig,
  FacilityKind,
  Policies,
  Role,
  SectorConfig,
  SectorKind,
  VehicleKind,
} from "./types";

export const DEFAULT_POLICIES: Policies = {
  autoMaintenance: true,
  maintenanceThreshold: 55,
  autoResponse: true,
  autoDispatch: true,
  foodRation: 1,
  waterRation: 1,
  powerPriority: {
    science: 1,
    industry: 2,
    storage: 3,
    agri: 4,
    health: 6,
    life: 7,
    habitat: 8,
    energy: 9,
  },
};

export const DEFAULT_ROLE_MIX: Record<Role, number> = {
  engineer: 4,
  technician: 5,
  botanist: 3,
  medic: 1.5,
  scientist: 2,
  pilot: 1.5,
  geologist: 1.5,
};

let uid = 0;
export function newId(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now().toString(36)}${uid.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function facilityName(kind: FacilityKind, existing: FacilityConfig[], rng?: Rng): string {
  const def = FACILITIES[kind];
  if (def.category === "habitat" && rng) return `${def.label.split(" ")[0]} ${pickHabName(rng)}`;
  const n = existing.filter((f) => f.kind === kind).length + 1;
  return `${def.label} ${n}`;
}

export function makeFacility(
  kind: FacilityKind,
  sectorId: string,
  existing: FacilityConfig[],
  rng?: Rng,
  crop?: CropKind,
): FacilityConfig {
  return {
    id: newId("f"),
    kind,
    name: facilityName(kind, existing, rng),
    sectorId,
    crop: kind === "greenhouse" ? (crop ?? "potato") : undefined,
  };
}

export function makeVehicle(kind: VehicleKind, rng: Rng) {
  const prefix = { pressurized_rover: "Rover", utility_crawler: "Crawler", cargo_hauler: "Hauler", survey_drone: "Drone" }[kind];
  return { id: newId("v"), kind, name: `${prefix} ${pickVehicleName(rng)}` };
}

export function makeComms(kind: CommsKind, index: number, sectorId?: string) {
  return {
    id: newId("c"),
    kind,
    name: kind === "antenna" ? `Dish ${String.fromCharCode(65 + index)}` : `Relay ${["Phobos", "Deimos", "Areo", "Hermes", "Iris"][index % 5]}`,
    sectorId,
  };
}

/** Pick the best sector for a facility, preferring sectors whose kind suits its category. */
export function suggestSector(kind: FacilityKind, sectors: SectorConfig[]): string {
  const cat = FACILITIES[kind].category;
  const pref: Record<string, SectorKind[]> = {
    habitat: ["residential", "mixed"],
    health: ["residential", "science", "mixed"],
    life: ["mixed", "industrial", "residential"],
    agri: ["agricultural", "mixed"],
    energy: ["energy", "industrial", "mixed"],
    industry: ["industrial", "mixed"],
    storage: ["industrial", "mixed"],
    science: ["science", "mixed", "residential"],
  };
  for (const k of pref[cat]) {
    const s = sectors.find((x) => x.kind === k);
    if (s) return s.id;
  }
  return sectors[0]?.id ?? "";
}

type Recipe = {
  population: number;
  sectors: SectorKind[];
  facilities: [FacilityKind, number][];
  vehicles: [VehicleKind, number][];
  antennas: number;
  satellites: number;
  durationSols: number;
};

export const PRESETS: Record<string, { label: string; blurb: string; recipe: Recipe }> = {
  outpost: {
    label: "Outpost",
    blurb: "Twelve people, two sectors, no margin for error.",
    recipe: {
      population: 12,
      sectors: ["residential", "industrial"],
      facilities: [
        ["habitat_dome", 1],
        ["o2_electrolysis", 1],
        ["ice_extractor", 1],
        ["water_recycler", 1],
        ["greenhouse", 2],
        ["algae_bioreactor", 1],
        ["solar_array", 2],
        ["fission_reactor", 2],
        ["battery_bank", 1],
        ["medical_bay", 1],
        ["warehouse", 1],
        ["tank_farm", 1],
        ["fabricator", 1],
      ],
      vehicles: [
        ["pressurized_rover", 1],
        ["survey_drone", 1],
      ],
      antennas: 1,
      satellites: 1,
      durationSols: 90,
    },
  },
  settlement: {
    label: "Settlement",
    blurb: "Forty colonists across four sectors and a working industrial base.",
    recipe: {
      population: 40,
      sectors: ["residential", "agricultural", "energy", "industrial"],
      facilities: [
        ["habitat_dome", 3],
        ["inflatable_module", 2],
        ["o2_electrolysis", 1],
        ["moxie_array", 1],
        ["ice_extractor", 2],
        ["water_recycler", 1],
        ["greenhouse", 4],
        ["algae_bioreactor", 1],
        ["solar_array", 5],
        ["fission_reactor", 3],
        ["battery_bank", 3],
        ["regolith_processor", 1],
        ["fabricator", 1],
        ["recycling_center", 1],
        ["sabatier_plant", 1],
        ["medical_bay", 1],
        ["warehouse", 1],
        ["tank_farm", 1],
        ["research_lab", 1],
      ],
      vehicles: [
        ["pressurized_rover", 1],
        ["utility_crawler", 1],
        ["cargo_hauler", 1],
        ["survey_drone", 1],
      ],
      antennas: 2,
      satellites: 1,
      durationSols: 180,
    },
  },
  township: {
    label: "Township",
    blurb: "A hundred and twenty people, a lava tube and a full supply chain.",
    recipe: {
      population: 120,
      sectors: ["residential", "residential", "agricultural", "energy", "industrial", "science"],
      facilities: [
        ["lava_tube", 2],
        ["habitat_dome", 6],
        ["o2_electrolysis", 3],
        ["moxie_array", 2],
        ["ice_extractor", 4],
        ["water_recycler", 3],
        ["greenhouse", 13],
        ["algae_bioreactor", 3],
        ["solar_array", 10],
        ["fission_reactor", 8],
        ["rtg", 2],
        ["battery_bank", 5],
        ["regolith_processor", 2],
        ["fabricator", 2],
        ["recycling_center", 2],
        ["sabatier_plant", 2],
        ["medical_bay", 2],
        ["warehouse", 3],
        ["tank_farm", 2],
        ["research_lab", 2],
      ],
      vehicles: [
        ["pressurized_rover", 2],
        ["utility_crawler", 2],
        ["cargo_hauler", 2],
        ["survey_drone", 2],
      ],
      antennas: 3,
      satellites: 2,
      durationSols: 365,
    },
  },
};

export function buildConfig(recipe: Recipe, seed: string, siteId?: string, name?: string): ColonyConfig {
  const rng = new Rng(hashSeed(seed + "|build"));
  const pool = [...SECTOR_NAME_POOL];
  const sectors: SectorConfig[] = recipe.sectors.map((kind) => {
    const i = Math.floor(rng.next() * pool.length);
    const n = pool.splice(i, 1)[0];
    return { id: newId("s"), name: n, kind };
  });
  const facilities: FacilityConfig[] = [];
  for (const [kind, count] of recipe.facilities) {
    for (let i = 0; i < count; i++) {
      const crop = kind === "greenhouse" ? CROP_KEYS[i % CROP_KEYS.length] : undefined;
      // spread habitats across residential sectors
      let sectorId = suggestSector(kind, sectors);
      if (FACILITIES[kind].category === "habitat") {
        const res = sectors.filter((s) => s.kind === "residential");
        if (res.length) sectorId = res[i % res.length].id;
      }
      facilities.push(makeFacility(kind, sectorId, facilities, rng, kind === "greenhouse" && i === 0 ? "potato" : crop));
    }
  }
  const vehicles = recipe.vehicles.flatMap(([kind, n]) => Array.from({ length: n }, () => makeVehicle(kind, rng)));
  const comms = [
    ...Array.from({ length: recipe.antennas }, (_, i) => makeComms("antenna", i, sectors[i % sectors.length].id)),
    ...Array.from({ length: recipe.satellites }, (_, i) => makeComms("satellite", i)),
  ];
  const pop = recipe.population;
  return {
    version: 1,
    name: name ?? pickColonyName(rng),
    seed,
    siteId: siteId ?? "jezero",
    durationSols: recipe.durationSols,
    difficulty: "standard",
    population: pop,
    roleMix: { ...DEFAULT_ROLE_MIX },
    consumption: { oxygen: 0.84, water: 25, food: 1.8, power: 6 },
    sectors,
    facilities,
    vehicles,
    comms,
    stock: {
      oxygen: Math.round(pop * 0.84 * 30),
      water: pop * 25 * 20,
      food: Math.round(pop * 1.8 * 60),
      ice: 1000,
      regolith: 3000,
      metals: 200 + pop * 4,
      silicon: 80 + pop * 2,
      construction: 600 + pop * 12,
      fuel: 300,
      components: 30 + pop,
      medical: 30 + pop,
      waste: 0,
    },
    batteryCharge: 0.8,
    events: { dustStorms: 1, solarFlares: 1, meteorites: 1, failures: 1, resupply: true, resupplyEverySols: 60 },
    policies: structuredClone(DEFAULT_POLICIES),
  };
}

export function presetConfig(key: keyof typeof PRESETS, seed = randomSeed()): ColonyConfig {
  return buildConfig(PRESETS[key].recipe, seed);
}

/** A fully randomised colony: site, size, mix, stock and event rates all rolled from the seed. */
export function randomConfig(seed = randomSeed()): ColonyConfig {
  const rng = new Rng(hashSeed(seed + "|random"));
  const pop = rng.int(10, 90);
  const scale = pop / 40;
  const r = (base: number, min = 0) => Math.max(min, Math.round(base * scale * rng.range(0.7, 1.35)));
  const sectorsN = Math.max(2, Math.min(6, Math.round(2 + scale * 2 + rng.range(-0.5, 0.5))));
  const sectorKinds: SectorKind[] = ["residential", "industrial", "agricultural", "energy", "science", "mixed"];
  const recipe: Recipe = {
    population: pop,
    sectors: sectorKinds.slice(0, sectorsN),
    facilities: [
      ["habitat_dome", Math.max(1, r(2.4, 1))],
      ["inflatable_module", r(1.2)],
      ["lava_tube", pop > 60 && rng.chance(0.5) ? 1 : 0],
      ["o2_electrolysis", r(1.1, 1)],
      ["moxie_array", r(1)],
      ["ice_extractor", r(1.6, 1)],
      ["water_recycler", r(1, 1)],
      ["greenhouse", r(4, 1)],
      ["algae_bioreactor", r(1)],
      ["solar_array", r(4, 1)],
      ["fission_reactor", r(2, 1)],
      ["rtg", rng.chance(0.4) ? 1 : 0],
      ["battery_bank", r(2, 1)],
      ["regolith_processor", r(1)],
      ["fabricator", r(1, 1)],
      ["recycling_center", r(0.8)],
      ["sabatier_plant", r(0.8)],
      ["medical_bay", 1],
      ["warehouse", r(1, 1)],
      ["tank_farm", 1],
      ["research_lab", r(1)],
    ],
    vehicles: [
      ["pressurized_rover", r(1, 1)],
      ["utility_crawler", r(1)],
      ["cargo_hauler", r(0.8)],
      ["survey_drone", r(1)],
    ],
    antennas: rng.int(1, 3),
    satellites: rng.int(0, 2),
    durationSols: rng.pick([60, 90, 180, 365]),
  };
  const cfg = buildConfig(recipe, seed, rng.pick(SITES).id);
  cfg.difficulty = rng.pick(["cadet", "standard", "standard", "hardcore"] as const);
  for (const key of Object.keys(cfg.roleMix) as Role[]) cfg.roleMix[key] = Math.round(cfg.roleMix[key] * rng.range(0.5, 1.6) * 2) / 2;
  for (const k of Object.keys(cfg.stock) as (keyof typeof cfg.stock)[]) cfg.stock[k] = Math.round((cfg.stock[k] ?? 0) * rng.range(0.6, 1.4));
  cfg.events = {
    dustStorms: Math.round(rng.range(0.4, 1.8) * 10) / 10,
    solarFlares: Math.round(rng.range(0.4, 1.8) * 10) / 10,
    meteorites: Math.round(rng.range(0.4, 1.8) * 10) / 10,
    failures: Math.round(rng.range(0.6, 1.6) * 10) / 10,
    resupply: rng.chance(0.8),
    resupplyEverySols: rng.pick([45, 60, 90]),
  };
  return cfg;
}

export function vehicleCrewNeeded(kind: VehicleKind) {
  return VEHICLES[kind].crew;
}
