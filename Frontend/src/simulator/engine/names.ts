import type { Rng } from "./rng";

const FIRST = [
  "Ada", "Amara", "Anika", "Aiyana", "Beatriz", "Chiara", "Dalia", "Elif", "Freya", "Hana", "Ines", "Ishani",
  "Jun", "Kaia", "Leila", "Lucía", "Mei", "Nadia", "Noor", "Olena", "Paz", "Rin", "Sofía", "Thandi", "Valentina",
  "Yara", "Zofia", "Ana", "Camila", "Ingrid", "Aarav", "Ahmed", "Bruno", "Diego", "Emeka", "Felipe", "Hiro",
  "Ivan", "Jonas", "Kofi", "Luca", "Mateo", "Nikolai", "Omar", "Pablo", "Ravi", "Santiago", "Tariq", "Tomás",
  "Viktor", "Wei", "Yusuf", "Kenji", "Malik", "Rafael", "Arjun", "Sven", "Joaquín", "Alex", "Sam", "Robin",
];

const LAST = [
  "Adeyemi", "Alvarez", "Andersen", "Bakshi", "Castillo", "Chen", "Dubois", "Eriksen", "Fernández", "García",
  "Haddad", "Ito", "Ivanova", "Jaramillo", "Kaur", "Kim", "Kowalski", "Lindqvist", "Mbeki", "Moreau", "Nakamura",
  "Novak", "Okafor", "Ortega", "Park", "Petrov", "Quispe", "Rahman", "Rossi", "Sato", "Silva", "Soto", "Tanaka",
  "Torres", "Úlfsson", "Vargas", "Watanabe", "Xu", "Yilmaz", "Zhang", "Herrera", "Mendoza", "Nwosu", "Abara",
  "Bianchi", "Costa", "Delgado", "Fischer", "Gutiérrez", "Hoang", "Iyer", "Jensen", "Lund", "Molina", "Reyes",
];

export function personName(rng: Rng): string {
  return `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
}

const HAB_NAMES = ["Hearth", "Bradbury", "Lowell", "Schiaparelli", "Huygens", "Sagan", "Burroughs", "Robinson", "Weir", "Tsiolkovsky", "Korolev", "Herschel", "Galilei", "Kepler", "Clarke", "Butler"];
const VEHICLE_NAMES = ["Sojourner", "Spirit", "Opportunity", "Curiosity", "Zhurong", "Ingenuity", "Pathfinder", "Viking", "Mariner", "Rosalind", "Tianwen", "Hope", "Phoenix", "Beagle"];
const SECTOR_NAMES = ["Aurora", "Basalt", "Cinder", "Dune", "Ember", "Ferrous", "Gale", "Horizon", "Ironwood", "Juniper", "Kestrel", "Lumen"];
const COLONY_NAMES = ["New Bradbury", "Ares Station", "Red Meridian", "Haven Rust", "Cydonia Reach", "Port Lowell", "Ember Hold", "Dawnfall", "Hesperia Gate", "Olympia Base", "Ferrum", "First Light"];

export const pickHabName = (rng: Rng) => rng.pick(HAB_NAMES);
export const pickVehicleName = (rng: Rng) => rng.pick(VEHICLE_NAMES);
export const SECTOR_NAME_POOL = SECTOR_NAMES;
export const pickColonyName = (rng: Rng) => rng.pick(COLONY_NAMES);
