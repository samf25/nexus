import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderRegionSymbol } from "../../core/symbology.js";
import { prestigeModifiersFromState } from "../../systems/prestige.js";
import { formatLootItemEffectSummary, isManualSocketLootItem, lootInventoryFromState } from "../../systems/loot.js";
import { renderSlotRing } from "../../ui/slotRing.js";

const NODE_ID = "DCC01";
const BASE_MAP_SIZE = 7;
const BASE_FLOOR_ROOMS = 18;
const ROOM_WIDTH = 13;
const ROOM_HEIGHT = 9;
const ENEMY_ACTION_INTERVAL_MS = 1000;

function safeText(value) {
  return String(value || "").trim();
}

const DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1, label: "North (W)", key: "w" }),
  down: Object.freeze({ dx: 0, dy: 1, label: "South (S)", key: "s" }),
  left: Object.freeze({ dx: -1, dy: 0, label: "West (A)", key: "a" }),
  right: Object.freeze({ dx: 1, dy: 0, label: "East (D)", key: "d" }),
});

const DIRECTION_BY_KEY = Object.freeze({
  w: "up",
  a: "left",
  s: "down",
  d: "right",
});

const OPPOSITE_DIRECTION = Object.freeze({
  up: "down",
  down: "up",
  left: "right",
  right: "left",
});

const ABILITIES = Object.freeze({
  basic: Object.freeze({
    id: "basic",
    label: "Basic Attack",
    staminaCost: 0,
    range: 1,
    multiplier: 1,
    bonusDamage: 2,
    detail: "Reliable melee strike.",
  }),
  pocket_sand: Object.freeze({
    id: "pocket_sand",
    label: "Pocket Sand",
    staminaCost: 2,
    range: 2,
    multiplier: 0.7,
    bonusDamage: 1,
    inflictBlind: true,
    detail: "Lower damage, blinds next enemy attack.",
  }),
  door_kick: Object.freeze({
    id: "door_kick",
    label: "Door Kicking",
    staminaCost: 3,
    range: 1,
    multiplier: 1.1,
    bonusDamage: 4,
    inflictStun: true,
    detail: "Heavy impact, stuns the enemy's next turn.",
  }),
  footwork: Object.freeze({
    id: "footwork",
    label: "Unreasonable Footwork",
    staminaCost: 2,
    range: 1,
    multiplier: 1.25,
    bonusDamage: 3,
    gainBlock: 3,
    detail: "Strong strike and brief guard.",
  }),
  threat_call: Object.freeze({
    id: "threat_call",
    label: "Threat Management",
    staminaCost: 2,
    range: 2,
    multiplier: 0.9,
    bonusDamage: 2,
    gainBlock: 5,
    detail: "Steady hit, raises temporary block.",
  }),
  sponsor_blast: Object.freeze({
    id: "sponsor_blast",
    label: "Sponsor Blast",
    staminaCost: 3,
    range: 3,
    multiplier: 1.45,
    bonusDamage: 5,
    detail: "Prestige technique with high burst.",
  }),
  improvised_bomb: Object.freeze({
    id: "improvised_bomb",
    label: "Improvised Bombardment",
    staminaCost: 4,
    range: 3,
    multiplier: 1.25,
    bonusDamage: 6,
    inflictBlind: true,
    detail: "Heavy ranged burst that leaves the enemy reeling.",
  }),
  heel_hook: Object.freeze({
    id: "heel_hook",
    label: "Heel Hook Hell",
    staminaCost: 3,
    range: 1,
    multiplier: 1.4,
    bonusDamage: 5,
    inflictStun: true,
    detail: "Close-range takedown that stops momentum cold.",
  }),
  second_wind: Object.freeze({
    id: "second_wind",
    label: "Second Wind",
    staminaCost: 2,
    range: 1,
    multiplier: 0.95,
    bonusDamage: 2,
    gainBlock: 4,
    healSelf: 10,
    restoreStamina: 2,
    detail: "A steady strike that restores rhythm, health, and stamina.",
  }),
  sponsor_sweep: Object.freeze({
    id: "sponsor_sweep",
    label: "Sponsor Sweep",
    staminaCost: 4,
    range: 3,
    multiplier: 1.35,
    bonusDamage: 8,
    gainBlock: 3,
    detail: "A premium sponsor burst that rakes every target in sight and leaves you braced.",
  }),
  killbox_geometry: Object.freeze({
    id: "killbox_geometry",
    label: "Killbox Geometry",
    staminaCost: 3,
    range: 2,
    multiplier: 1.15,
    bonusDamage: 6,
    gainBlock: 7,
    detail: "Turns the room into a murder diagram, striking every nearby foe while raising a wall of block.",
  }),
  crowdbreaker: Object.freeze({
    id: "crowdbreaker",
    label: "Crowdbreaker",
    staminaCost: 5,
    range: 2,
    multiplier: 1.45,
    bonusDamage: 9,
    inflictStun: true,
    detail: "A savage shockwave that crushes clustered enemies and can stun whoever survives.",
  }),
});

const ABILITY_BOOKS = Object.freeze([
  Object.freeze({
    itemId: "book_footwork",
    label: "Book of Unreasonable Footwork",
    abilityId: "footwork",
    rarity: "rare",
    weight: 4.5,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_pocket_sand",
    label: "Manual of Pocket Sand",
    abilityId: "pocket_sand",
    rarity: "common",
    weight: 8,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_door_kick",
    label: "Treatise on Door Kicking",
    abilityId: "door_kick",
    rarity: "rare",
    weight: 4.2,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_threat",
    label: "Pocket Guide to Threat Management",
    abilityId: "threat_call",
    rarity: "common",
    weight: 7.5,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_grenade",
    label: "Satchel Notes on Improvised Bombardment",
    abilityId: "improvised_bomb",
    rarity: "rare",
    minFloor: 3,
    weight: 3.1,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_heel_hook",
    label: "Heel Hook for Monsters",
    abilityId: "heel_hook",
    rarity: "rare",
    minFloor: 3,
    weight: 3.1,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_second_wind",
    label: "Second Wind Breathing Cadence",
    abilityId: "second_wind",
    rarity: "epic",
    minFloor: 4,
    weight: 1.35,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_sponsor_sweep",
    label: "Sponsor Sweep Broadcast Reel",
    abilityId: "sponsor_sweep",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.34,
    mode: "learn",
    boosts: Object.freeze([]),
  }),
  Object.freeze({
    itemId: "book_killbox_geometry",
    label: "Killbox Geometry Field Binder",
    abilityId: "killbox_geometry",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.3,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "block", amount: 3, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_crowdbreaker",
    label: "Crowdbreaker Choreography",
    abilityId: "crowdbreaker",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.26,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 4, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_pocket_sand_ii",
    label: "Pocket Sand Revisions",
    abilityId: "pocket_sand",
    rarity: "rare",
    minFloor: 3,
    weight: 2.6,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 3, rarity: "rare" }),
      Object.freeze({ stat: "stamina", amount: -1, rarity: "rare" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_footwork_ii",
    label: "Unreasonable Footwork Field Notes",
    abilityId: "footwork",
    rarity: "rare",
    minFloor: 4,
    weight: 2.15,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 2, rarity: "rare" }),
      Object.freeze({ stat: "block", amount: 2, rarity: "rare" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_door_kick_ii",
    label: "Door Kicker Incident Report",
    abilityId: "door_kick",
    rarity: "epic",
    minFloor: 4,
    weight: 1.55,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 4, rarity: "epic" }),
      Object.freeze({ stat: "stamina", amount: -1, rarity: "rare" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_threat_ii",
    label: "Threat Management Escalation Guide",
    abilityId: "threat_call",
    rarity: "rare",
    minFloor: 3,
    weight: 2.35,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "block", amount: 3, rarity: "rare" }),
    ]),
  }),
  Object.freeze({
    itemId: "book_second_wind_iii",
    label: "Second Wind Master Cadence",
    abilityId: "second_wind",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.5,
    mode: "learn",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 4, rarity: "legendary" }),
      Object.freeze({ stat: "stamina", amount: -1, rarity: "epic" }),
      Object.freeze({ stat: "block", amount: 2, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_basic",
    label: "Basic Attack Reinforcement Tome",
    abilityId: "basic",
    rarity: "epic",
    minFloor: 3,
    weight: 1.6,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 4, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_basic_flow",
    label: "Basic Attack Flow Primer",
    abilityId: "basic",
    rarity: "epic",
    minFloor: 4,
    weight: 1.1,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "stamina", amount: -1, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_basic_reach",
    label: "Basic Attack Reach Blueprint",
    abilityId: "basic",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.38,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "range", amount: 1, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_guard",
    label: "Threat Lattice Enhancement Tome",
    abilityId: "threat_call",
    rarity: "epic",
    minFloor: 4,
    weight: 1.05,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "block", amount: 3, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_strike",
    label: "Violent Cadence Enhancement Tome",
    abilityId: "door_kick",
    rarity: "epic",
    minFloor: 4,
    weight: 0.95,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 5, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_footwork_guard",
    label: "Footwork Counterbalance Notes",
    abilityId: "footwork",
    rarity: "epic",
    minFloor: 4,
    weight: 0.95,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "block", amount: 3, rarity: "epic" }),
      Object.freeze({ stat: "stamina", amount: -1, rarity: "rare" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_bombardment",
    label: "Bombardment Overpressure Notes",
    abilityId: "improvised_bomb",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.4,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 5, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_hook",
    label: "Heel Hook Breakpoint Manual",
    abilityId: "heel_hook",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.4,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 5, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_precision",
    label: "Pocket Sand Refinement Manual",
    abilityId: "pocket_sand",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.36,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "range", amount: 1, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_endurance",
    label: "Second Wind Expansion Codex",
    abilityId: "second_wind",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.32,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "stamina", amount: -1, rarity: "legendary" }),
      Object.freeze({ stat: "block", amount: 2, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_sponsor_sweep",
    label: "Sponsor Sweep Harmonics Sheet",
    abilityId: "sponsor_sweep",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.24,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 5, rarity: "legendary" }),
      Object.freeze({ stat: "range", amount: 1, rarity: "legendary" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_killbox_geometry",
    label: "Killbox Geometry Revision Plate",
    abilityId: "killbox_geometry",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.2,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "block", amount: 4, rarity: "legendary" }),
      Object.freeze({ stat: "stamina", amount: -1, rarity: "epic" }),
    ]),
  }),
  Object.freeze({
    itemId: "enhance_crowdbreaker",
    label: "Crowdbreaker Stress Map",
    abilityId: "crowdbreaker",
    rarity: "legendary",
    minFloor: 5,
    weight: 0.18,
    mode: "enhance",
    boosts: Object.freeze([
      Object.freeze({ stat: "damage", amount: 6, rarity: "legendary" }),
    ]),
  }),
]);

const ABILITY_BOOK_BY_ITEM_ID = Object.freeze(
  Object.fromEntries(ABILITY_BOOKS.map((entry) => [entry.itemId, entry])),
);

const KEY_DEFINITIONS = Object.freeze([
  Object.freeze({ itemId: "bronze_key", label: "Bronze Key" }),
  Object.freeze({ itemId: "silver_key", label: "Silver Key" }),
  Object.freeze({ itemId: "obsidian_key", label: "Obsidian Key" }),
]);

const KEY_LABEL_BY_ID = Object.freeze(
  Object.fromEntries(KEY_DEFINITIONS.map((entry) => [entry.itemId, entry.label])),
);

const LOOT_TABLE = Object.freeze([
  Object.freeze({ type: "consumable", itemId: "health_potion", label: "Health Potion", weight: 32, rarity: "common" }),
  Object.freeze({ type: "consumable", itemId: "greater_health_potion", label: "Greater Health Potion", weight: 8, rarity: "rare", minFloor: 3 }),
  Object.freeze({ type: "consumable", itemId: "legend_health_potion", label: "Legend Health Potion", weight: 2, rarity: "epic", minFloor: 4 }),
  Object.freeze({ type: "consumable", itemId: "stamina_potion", label: "Stamina Potion", weight: 28, rarity: "common" }),
  Object.freeze({ type: "consumable", itemId: "greater_stamina_potion", label: "Greater Stamina Potion", weight: 7, rarity: "rare", minFloor: 3 }),
  Object.freeze({ type: "consumable", itemId: "legend_stamina_potion", label: "Legend Stamina Potion", weight: 2, rarity: "epic", minFloor: 4 }),
  Object.freeze({ type: "key", itemId: "bronze_key", label: "Bronze Key", weight: 11, rarity: "uncommon" }),
  Object.freeze({ type: "key", itemId: "silver_key", label: "Silver Key", weight: 7, rarity: "uncommon" }),
  Object.freeze({ type: "key", itemId: "obsidian_key", label: "Obsidian Key", weight: 4, rarity: "rare" }),
  Object.freeze({ type: "utility", itemId: "floor_map", label: "Floor Map", weight: 7, rarity: "uncommon" }),
  ...ABILITY_BOOKS.map((book) => Object.freeze({
    type: "book",
    itemId: book.itemId,
    label: book.label,
    weight: Number(book.weight) || (book.rarity === "epic" ? 2 : book.rarity === "rare" ? 5 : 10),
    rarity: book.rarity,
    abilityId: book.abilityId,
    bookMode: book.mode,
    minFloor: book.minFloor,
    boosts: book.boosts,
  })),
]);

const MINOR_ENEMIES = Object.freeze([
  Object.freeze({ name: "Babababoon", hp: 24, attack: 6, range: 1, trait: "dodge_after_move", goldMin: 8, goldMax: 14 }),
  Object.freeze({ name: "Bad Llama", hp: 28, attack: 5, range: 1, trait: "slow_strike", goldMin: 8, goldMax: 12 }),
  Object.freeze({ name: "Blender Fiend", hp: 22, attack: 7, range: 1, trait: "thief_lunge", goldMin: 10, goldMax: 15 }),
  Object.freeze({ name: "Blister Ghoul", hp: 26, attack: 6, range: 1, trait: "armor_bite", goldMin: 9, goldMax: 14 }),
  Object.freeze({ name: "Blood and Ink Elemental", hp: 30, attack: 6, range: 2, trait: "self_patch", goldMin: 10, goldMax: 16 }),
  Object.freeze({ name: "Brain Boiler", hp: 24, attack: 7, range: 2, trait: "opening_strike", goldMin: 10, goldMax: 16 }),
  Object.freeze({ name: "Razor Fox", hp: 34, attack: 7, range: 1, trait: "corridor_power", goldMin: 12, goldMax: 18 }),
  Object.freeze({ name: "Reaper Spider Minion", hp: 27, attack: 7, range: 1, trait: "bleed_bite", goldMin: 10, goldMax: 16 }),
  Object.freeze({ name: "Shock Chomper", hp: 23, attack: 8, range: 1, trait: "ambush", goldMin: 11, goldMax: 17 }),
  Object.freeze({ name: "Sluggalo", hp: 31, attack: 6, range: 3, trait: "leech_hit", goldMin: 11, goldMax: 17 }),
]);

const BOSS_ENEMIES = Object.freeze([
  Object.freeze({ name: "Krakaren Clone", hp: 92, attack: 12, range: 2, trait: "swarm_summoner", goldMin: 72, goldMax: 98 }),
  Object.freeze({ name: "Rage Elemental", hp: 84, attack: 10, range: 3, trait: "silence_pulse", goldMin: 70, goldMax: 94 }),
  Object.freeze({ name: "Mongoliensis", hp: 108, attack: 11, range: 1, trait: "door_lockdown", goldMin: 78, goldMax: 102 }),
]);

const MINI_BOSS_ENEMIES = Object.freeze([
  Object.freeze({ name: "Howler Matriarch", hp: 56, attack: 9, range: 2, trait: "opening_strike", goldMin: 28, goldMax: 40 }),
  Object.freeze({ name: "Kiosk Executioner", hp: 62, attack: 8, range: 3, trait: "armor_bite", goldMin: 30, goldMax: 43 }),
  Object.freeze({ name: "Reaper Spider Broodlord", hp: 64, attack: 9, range: 2, trait: "bleed_bite", goldMin: 32, goldMax: 46 }),
]);

const FLOOR_BOSS_REWARD_ARTIFACTS = Object.freeze({
  3: "Dockside Broker Contract",
  4: "National Broker Mandate",
  5: "The Dungeon Anarchist's Cookbook",
});
const EXTERNAL_FLOOR_GATE_ARTIFACTS = Object.freeze({
  2: "DCC Floor-2 Key",
  3: "DCC Floor-3 Key",
  4: "DCC Floor-4 Key",
  5: "DCC Floor-5 Key",
});

const ENCOUNTERS = Object.freeze([
  Object.freeze({
    id: "mimic_crate",
    weight: 1.45,
    title: "Mimic Crate",
    text: "A crate rattles in a quiet corner and smells like a trap.",
    options: Object.freeze([
      Object.freeze({ id: "careful", label: "Open carefully", effect: "loot" }),
      Object.freeze({ id: "smash", label: "Smash it", effect: "fight_mimic" }),
      Object.freeze({ id: "ignore", label: "Ignore it", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "sponsor_kiosk",
    weight: 1.15,
    title: "Sponsor Kiosk",
    text: "A cracked kiosk offers supplies for cash and insults for free.",
    options: Object.freeze([
      Object.freeze({ id: "buy", label: "Pay 12 gold for supplies", effect: "buy_supply" }),
      Object.freeze({ id: "taunt", label: "Taunt the kiosk", effect: "ambush" }),
      Object.freeze({ id: "move", label: "Move on", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "warden_post",
    weight: 1.1,
    title: "Warden Post",
    text: "A stair warden patrols a locked rack of keys.",
    options: Object.freeze([
      Object.freeze({ id: "sneak", label: "Sneak a key", effect: "steal_key" }),
      Object.freeze({ id: "duel", label: "Challenge the warden", effect: "fight_warden" }),
      Object.freeze({ id: "retreat", label: "Retreat quietly", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "graffiti_cache",
    weight: 1.4,
    title: "Crawler Graffiti Cache",
    text: "Under a peeling wall ad, somebody left a stash meant for the next desperate crawler.",
    options: Object.freeze([
      Object.freeze({ id: "search-cache", label: "Search the stash", effect: "loot_plus" }),
      Object.freeze({ id: "grab-map", label: "Take the map scraps", effect: "gain_map" }),
      Object.freeze({ id: "move", label: "Move on", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "arena_shrine",
    weight: 0.95,
    title: "Arena Shrine",
    text: "A bronze idol hums with sponsor attention, offering strength for spectacle.",
    options: Object.freeze([
      Object.freeze({ id: "pray", label: "Offer a showman's vow", effect: "gain_stamina_potion" }),
      Object.freeze({ id: "drain", label: "Rip out the charge", effect: "fight_elite" }),
      Object.freeze({ id: "leave", label: "Leave it alone", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "salvage_cart",
    weight: 1.35,
    title: "Salvage Cart",
    text: "A half-burned maintenance cart squeals in place, full of loose junk and maybe something useful.",
    options: Object.freeze([
      Object.freeze({ id: "dig", label: "Dig for valuables", effect: "gain_gold_cache" }),
      Object.freeze({ id: "wrench", label: "Strip out tools", effect: "gain_block_tonic" }),
      Object.freeze({ id: "skip", label: "Skip it", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "fan_club_mail",
    weight: 0.75,
    minFloor: 3,
    title: "Fan Club Mail Drop",
    text: "A drone chute clanks open and spits out a sponsor package addressed to whoever is still alive.",
    options: Object.freeze([
      Object.freeze({ id: "open-box", label: "Open the package", effect: "gain_random_book" }),
      Object.freeze({ id: "auction", label: "Pawn it immediately", effect: "gain_gold_big" }),
      Object.freeze({ id: "ignore", label: "Ignore the bait", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "blood_fountain",
    weight: 0.7,
    minFloor: 3,
    title: "Blood Fountain",
    text: "A decorative fountain circulates crimson fluid that smells faintly medicinal and strongly cursed.",
    options: Object.freeze([
      Object.freeze({ id: "sip", label: "Take the risk", effect: "heal_or_ambush" }),
      Object.freeze({ id: "fill-flask", label: "Bottle what you can", effect: "gain_health_potion" }),
      Object.freeze({ id: "back-off", label: "Back away", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "vault_auction",
    weight: 0.45,
    minFloor: 4,
    title: "Shadow Auction",
    text: "Behind a false wall, crawlers whisper over a private exchange where everything costs too much and might be worth it.",
    options: Object.freeze([
      Object.freeze({ id: "buy-rare", label: "Spend 28 gold on premium salvage", effect: "buy_rare_supply" }),
      Object.freeze({ id: "pickpocket", label: "Try to skim the table", effect: "steal_loot_or_fight" }),
      Object.freeze({ id: "walk", label: "Walk away", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "maintenance_hatch",
    weight: 1.2,
    title: "Maintenance Hatch",
    text: "A bent panel has been pried open. The crawl's backstage smells like copper, ozone, and bad choices.",
    options: Object.freeze([
      Object.freeze({ id: "crawl-through", label: "Crawl through", effect: "gain_key_cache" }),
      Object.freeze({ id: "strip-wires", label: "Strip the wiring", effect: "gain_stamina_potion" }),
      Object.freeze({ id: "leave", label: "Seal it back up", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "corpse_lottery",
    weight: 0.9,
    minFloor: 2,
    title: "Corpse Lottery",
    text: "A dead crawler still clutches a numbered chit. Somewhere nearby, a sponsor drone waits to see if you'll play along.",
    options: Object.freeze([
      Object.freeze({ id: "draw", label: "Draw the prize", effect: "gain_loot_or_gold" }),
      Object.freeze({ id: "rob", label: "Take everything and run", effect: "steal_loot_or_fight" }),
      Object.freeze({ id: "respect", label: "Leave the body", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "sealed_apothecary",
    weight: 0.7,
    minFloor: 3,
    title: "Sealed Apothecary",
    text: "A supply locker has been welded shut, but the labels promise much better medicine than the usual floor junk.",
    options: Object.freeze([
      Object.freeze({ id: "force-it", label: "Force it open", effect: "gain_premium_potions" }),
      Object.freeze({ id: "tap-lock", label: "Work the mechanism", effect: "gain_health_potion" }),
      Object.freeze({ id: "retreat", label: "Don't risk the noise", effect: "leave" }),
    ]),
  }),
  Object.freeze({
    id: "floor_announcer",
    weight: 0.55,
    minFloor: 4,
    title: "Floor Announcer Booth",
    text: "An abandoned commentary booth still has one live mic, one reward chute, and one deeply petty AI in it.",
    options: Object.freeze([
      Object.freeze({ id: "perform", label: "Give it a show", effect: "gain_random_book" }),
      Object.freeze({ id: "hack", label: "Raid the chute", effect: "gain_loot_plus" }),
      Object.freeze({ id: "mute", label: "Cut the feed", effect: "fight_elite" }),
    ]),
  }),
]);

const ENCOUNTER_BY_ID = Object.freeze(Object.fromEntries(ENCOUNTERS.map((entry) => [entry.id, entry])));

function roomKey(x, y) {
  return `${x},${y}`;
}

function parseRoomKey(key) {
  const [x, y] = String(key || "0,0").split(",").map((value) => Number(value));
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function createRng(seed) {
  let state = (Number(seed) || 1) >>> 0;
  if (!state) {
    state = 1;
  }
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    state >>>= 0;
    return state / 4294967296;
  };
}

function randomInt(rand, min, max) {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  const span = high - low + 1;
  return low + Math.floor(rand() * Math.max(1, span));
}

function randomPick(rand, values) {
  const list = Array.isArray(values) ? values : [];
  if (!list.length) {
    return null;
  }
  return list[randomInt(rand, 0, list.length - 1)];
}

function weightedPick(rand, values) {
  const list = Array.isArray(values) ? values : [];
  const total = list.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (!total) {
    return list[0] || null;
  }
  let cursor = rand() * total;
  for (const entry of list) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor <= 0) {
      return entry;
    }
  }
  return list[list.length - 1] || null;
}

function mapSizeForFloor(floor) {
  const depth = Math.max(0, Math.floor(Number(floor) || 1) - 1);
  return BASE_MAP_SIZE + Math.min(10, Math.floor(depth * 1.6));
}

function roomCountForFloor(floor, size) {
  const depth = Math.max(0, Math.floor(Number(floor) || 1) - 1);
  const cap = Math.max(BASE_FLOOR_ROOMS, (size * size) - 4);
  return Math.min(cap, BASE_FLOOR_ROOMS + depth * 7);
}

function withDefaultMeta(meta) {
  const source = meta && typeof meta === "object" ? meta : {};
  const upgrades = source.upgrades && typeof source.upgrades === "object" ? source.upgrades : {};
  const preparedEquipment = normalizeEquipment(source.preparedEquipment);
  const encounteredAbilityIds = Array.isArray(source.encounteredAbilityIds)
    ? source.encounteredAbilityIds.map((entry) => safeText(entry)).filter((entry) => entry && ABILITIES[entry])
    : [];
  const bossRewardsClaimed =
    source.bossRewardsClaimed && typeof source.bossRewardsClaimed === "object"
      ? source.bossRewardsClaimed
      : {};
  return {
    gold: Math.max(0, Math.floor(Number(source.gold) || 0)),
    upgrades: {
      hp: Math.max(0, Math.floor(Number(upgrades.hp) || 0)),
      attack: Math.max(0, Math.floor(Number(upgrades.attack) || 0)),
      stamina: Math.max(0, Math.floor(Number(upgrades.stamina) || 0)),
      rare: Math.max(0, Math.floor(Number(upgrades.rare) || 0)),
      slots: Math.max(0, Math.floor(Number(upgrades.slots) || 0)),
    },
    totalRuns: Math.max(0, Math.floor(Number(source.totalRuns) || 0)),
    totalDeaths: Math.max(0, Math.floor(Number(source.totalDeaths) || 0)),
    bestFloor: Math.max(1, Math.floor(Number(source.bestFloor) || 1)),
    preparedEquipment,
    encounteredAbilityIds: [...new Set(encounteredAbilityIds)],
    bossRewardsClaimed: {
      3: Boolean(bossRewardsClaimed[3] || bossRewardsClaimed["3"]),
      4: Boolean(bossRewardsClaimed[4] || bossRewardsClaimed["4"]),
      5: Boolean(bossRewardsClaimed[5] || bossRewardsClaimed["5"]),
    },
  };
}

function dccModifiers(state) {
  const modifiers = prestigeModifiersFromState(state || {});
  const source = modifiers && modifiers.dcc && typeof modifiers.dcc === "object" ? modifiers.dcc : {};
  return {
    maxHpBonus: Math.max(0, Number(source.maxHpBonus) || 0),
    attackBonus: Math.max(0, Number(source.attackBonus) || 0),
    maxStaminaBonus: Math.max(0, Number(source.maxStaminaBonus) || 0),
    damageReduction: Math.max(0, Number(source.damageReduction) || 0),
    goldGainBonus: Math.max(0, Number(source.goldGainBonus) || 0),
    rareDropBonus: Math.max(0, Number(source.rareDropBonus) || 0),
    shopPriceDivider: Math.max(1, Number(source.shopPriceDivider) || 1),
    mapRevealChanceBonus: Math.max(0, Number(source.mapRevealChanceBonus) || 0),
    startWithSponsorSkill: Boolean(source.startWithSponsorSkill),
    extraAbilitySlots: Math.max(0, Number(source.extraAbilitySlots) || 0),
    startBasicAttackRefinements: Math.max(0, Number(source.startBasicAttackRefinements) || 0),
    tomeDropChanceBonus: Math.max(0, Number(source.tomeDropChanceBonus) || 0),
    skillDamageMultiplier: Math.max(1, Number(source.skillDamageMultiplier) || 1),
    potionHealingMultiplier: Math.max(1, Number(source.potionHealingMultiplier) || 1),
    startingHealingPotions: Math.max(0, Math.floor(Number(source.startingHealingPotions) || 0)),
    startingGoldBonus: Math.max(0, Math.floor(Number(source.startingGoldBonus) || 0)),
    bonusLootRollChance: Math.max(0, Number(source.bonusLootRollChance) || 0),
  };
}

function dccProgressFromState(state) {
  const source =
    state && state.systems && state.systems.dungeonCrawl && typeof state.systems.dungeonCrawl === "object"
      ? state.systems.dungeonCrawl
      : {};
  return {
    floor2Unlocked: Boolean(source.floor2Unlocked),
    floor3Unlocked: Boolean(source.floor3Unlocked),
    floor4Unlocked: Boolean(source.floor4Unlocked),
    floor5Unlocked: Boolean(source.floor5Unlocked),
    checkpointFloor: Math.max(1, Math.floor(Number(source.checkpointFloor) || 1)),
  };
}

function isExternalFloorUnlocked(progress, floor) {
  const numericFloor = Math.max(1, Math.floor(Number(floor) || 1));
  if (numericFloor <= 1) {
    return true;
  }
  if (numericFloor === 2) {
    return Boolean(progress.floor2Unlocked);
  }
  if (numericFloor === 3) {
    return Boolean(progress.floor3Unlocked);
  }
  if (numericFloor === 4) {
    return Boolean(progress.floor4Unlocked);
  }
  if (numericFloor === 5) {
    return Boolean(progress.floor5Unlocked);
  }
  return true;
}

function externalFloorArtifactName(floor) {
  return safeText(EXTERNAL_FLOOR_GATE_ARTIFACTS[Math.max(1, Math.floor(Number(floor) || 1))]);
}

function deriveBaseStats(meta, modifiers) {
  const slotCount = Math.max(2, 2 + meta.upgrades.slots + modifiers.extraAbilitySlots);
  return {
    maxHp: 70 + (meta.upgrades.hp * 12) + modifiers.maxHpBonus,
    attack: 8 + (meta.upgrades.attack * 2) + modifiers.attackBonus,
    maxStamina: 6 + (meta.upgrades.stamina * 2) + modifiers.maxStaminaBonus,
    slotCount,
    rareBonus: Math.min(0.45, (meta.upgrades.rare * 0.05) + modifiers.rareDropBonus),
    goldMultiplier: 1 + modifiers.goldGainBonus,
  };
}

function equipmentDefaults() {
  return {
    head: null,
    chest: null,
    legs: null,
    trinket: null,
  };
}

function normalizeEquipment(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const base = equipmentDefaults();
  for (const slot of Object.keys(base)) {
    const entry = source[slot];
    base[slot] = entry && typeof entry === "object" ? entry : null;
  }
  return base;
}

function equippedBonuses(run) {
  const equipment = normalizeEquipment(run && run.equipment);
  const result = {
    hp: 0,
    attack: 0,
    stamina: 0,
    abilitySlots: 0,
    abilityIds: [],
    abilityBoosts: [],
  };
  for (const item of Object.values(equipment)) {
    if (!item) {
      continue;
    }
    result.hp += Math.max(0, Math.floor(Number(item.hpBonus || 0)));
    result.attack += Math.max(0, Math.floor(Number(item.attackBonus || 0)));
    result.stamina += Math.max(0, Math.floor(Number(item.staminaBonus || 0)));
    result.abilitySlots += Math.max(0, Math.floor(Number(item.abilitySlotBonus || 0)));
    const unlocks = Array.isArray(item.abilityUnlocks) ? item.abilityUnlocks : [];
    for (const abilityId of unlocks) {
      const cleanAbilityId = safeText(abilityId);
      if (cleanAbilityId && ABILITIES[cleanAbilityId] && !result.abilityIds.includes(cleanAbilityId)) {
        result.abilityIds.push(cleanAbilityId);
      }
    }
    const boosts = Array.isArray(item.abilityBoosts) ? item.abilityBoosts : [];
    for (const boost of boosts) {
      const abilityId = safeText(boost && boost.abilityId);
      const stat = safeText(boost && boost.stat).toLowerCase();
      const amount = Number(boost && boost.amount) || 0;
      if (!abilityId || !stat || !amount || !ABILITIES[abilityId]) {
        continue;
      }
      result.abilityBoosts.push({ abilityId, stat, amount });
    }
  }
  return result;
}

function applyGearAbilityUnlocks(run, bonuses) {
  const slots = Array.isArray(run && run.abilitySlots) ? run.abilitySlots : [];
  const extraSlots = Math.max(0, Math.floor(Number(bonuses && bonuses.abilitySlots) || 0));
  for (let index = 0; index < extraSlots; index += 1) {
    slots.push("");
  }

  const abilityIds = Array.isArray(bonuses && bonuses.abilityIds) ? bonuses.abilityIds : [];
  for (const abilityId of abilityIds) {
    if (!ABILITIES[abilityId] || slots.includes(abilityId)) {
      continue;
    }
    const emptyIndex = slots.findIndex((entry) => !entry);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = abilityId;
    } else {
      slots.push(abilityId);
    }
  }
  run.abilitySlots = slots;
}

function applyEquipmentToRun(run) {
  if (!run) {
    return;
  }
  const bonuses = equippedBonuses(run);
  const baseMaxHp = Math.max(1, Number(run.baseMaxHp || run.maxHp || 1));
  const baseAttack = Math.max(1, Number(run.baseAttack || run.attack || 1));
  const baseMaxStamina = Math.max(1, Number(run.baseMaxStamina || run.maxStamina || 1));
  run.maxHp = baseMaxHp + bonuses.hp;
  run.attack = baseAttack + bonuses.attack;
  run.maxStamina = baseMaxStamina + bonuses.stamina;
  run.hp = Math.min(run.maxHp, Math.max(0, Number(run.hp || 0)));
  run.stamina = Math.min(run.maxStamina, Math.max(0, Number(run.stamina || 0)));
  applyGearAbilityUnlocks(run, bonuses);
  for (const boost of Array.isArray(bonuses && bonuses.abilityBoosts) ? bonuses.abilityBoosts : []) {
    applyAbilityBoosts(run, boost.abilityId, [boost]);
  }
}

function consumePreparedEquipmentForRun(preparedEquipment) {
  const runEquipment = normalizeEquipment(preparedEquipment);
  const nextPrepared = normalizeEquipment(preparedEquipment);
  const expiredItemIds = [];

  for (const slot of Object.keys(runEquipment)) {
    const item = runEquipment[slot];
    if (!item || typeof item !== "object") {
      nextPrepared[slot] = null;
      continue;
    }
    const remaining = Math.max(
      1,
      Math.floor(Number(item.remainingRunLifespan ?? item.runLifespan ?? 1) || 1),
    );
    runEquipment[slot] = {
      ...item,
      remainingRunLifespan: remaining,
    };
    const nextRemaining = remaining - 1;
    if (nextRemaining <= 0) {
      if (item.itemId) {
        expiredItemIds.push(String(item.itemId));
      }
      nextPrepared[slot] = null;
    } else {
      nextPrepared[slot] = {
        ...item,
        remainingRunLifespan: nextRemaining,
      };
    }
  }

  return {
    runEquipment,
    nextPrepared,
    expiredItemIds,
  };
}

function collectNeighbors(openRooms, key, size = BASE_MAP_SIZE) {
  const from = parseRoomKey(key);
  const result = [];
  for (const [direction, vector] of Object.entries(DIRECTIONS)) {
    const targetX = from.x + vector.dx;
    const targetY = from.y + vector.dy;
    if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) {
      continue;
    }
    const targetKey = roomKey(targetX, targetY);
    if (openRooms.has(targetKey)) {
      result.push({ direction, targetKey });
    }
  }
  return result;
}

function farthestRooms(startKey, roomKeys) {
  const start = parseRoomKey(startKey);
  return [...roomKeys].sort((a, b) => {
    const pa = parseRoomKey(a);
    const pb = parseRoomKey(b);
    const da = Math.abs(pa.x - start.x) + Math.abs(pa.y - start.y);
    const db = Math.abs(pb.x - start.x) + Math.abs(pb.y - start.y);
    return db - da;
  });
}

function chooseLootDrop(rand, rareBonus, floor = 1, tomeDropChanceBonus = 0) {
  const entries = LOOT_TABLE.map((entry) => {
    let weight = Number(entry.weight) || 1;
    const minFloor = Math.max(1, Math.floor(Number(entry.minFloor) || 1));
    const currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
    if (currentFloor < minFloor) {
      weight = 0;
    }
    if (entry.type === "book") {
      weight *= 1 + Math.max(0, Number(tomeDropChanceBonus || 0)) * 2.2;
    }
    if (entry.rarity === "epic") {
      weight *= 1 + (rareBonus * 8.5);
    } else if (entry.rarity === "rare") {
      weight *= 1 + (rareBonus * 5.2);
    } else if (entry.rarity === "uncommon") {
      weight *= 1 + (rareBonus * 2.3);
    } else if (entry.rarity === "common") {
      weight *= Math.max(0.22, 1 - (rareBonus * 0.95));
    }
    return {
      ...entry,
      adjustedWeight: Math.max(0.1, weight),
    };
  });

  const total = entries.reduce((sum, entry) => sum + entry.adjustedWeight, 0);
  let cursor = rand() * Math.max(0.1, total);
  for (const entry of entries) {
    cursor -= entry.adjustedWeight;
    if (cursor <= 0) {
      return {
        id: `${entry.itemId}-${Date.now()}-${Math.floor(rand() * 10000)}`,
        type: entry.type,
        itemId: entry.itemId,
        label: entry.label,
        abilityId: entry.abilityId || "",
        bookMode: safeText(entry.bookMode),
        boosts: Array.isArray(entry.boosts) ? entry.boosts.map((boost) => ({ ...boost })) : [],
      };
    }
  }
  const fallback = entries[0];
  return {
    id: `${fallback.itemId}-${Date.now()}-fallback`,
    type: fallback.type,
    itemId: fallback.itemId,
    label: fallback.label,
    abilityId: fallback.abilityId || "",
    bookMode: safeText(fallback.bookMode),
    boosts: Array.isArray(fallback.boosts) ? fallback.boosts.map((boost) => ({ ...boost })) : [],
  };
}

function chooseEncounterEntry(rand, floor = 1) {
  const currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const pool = ENCOUNTERS
    .filter((entry) => currentFloor >= Math.max(1, Math.floor(Number(entry.minFloor) || 1)))
    .map((entry) => ({
      ...entry,
      weight: Math.max(0.05, Number(entry.weight) || 1),
    }));
  return weightedPick(rand, pool) || ENCOUNTERS[0];
}

function currentFloorRareBonus(run, extra = 0) {
  const floor = Math.max(1, Math.floor(Number(run && run.floor) || 1));
  const floorDepth = Math.max(0, floor - 1);
  return Math.max(0, Number(run && run.rareBonus ? run.rareBonus : 0) + floorDepth * 0.04 + Number(extra || 0));
}

function titleCaseWords(value) {
  return safeText(value)
    .split(/[_\s-]+/u)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function dccEnemyTraitLabel(trait) {
  const key = safeText(trait);
  const known = {
    dodge_after_move: "Dodge After Move",
    slow_strike: "Slow Strike",
    thief_lunge: "Thief Lunge",
    armor_bite: "Armor Bite",
    self_patch: "Self Patch",
    opening_strike: "Opening Strike",
    corridor_power: "Corridor Power",
    bleed_bite: "Bleed Bite",
    ambush: "Ambush",
    leech_hit: "Leech Hit",
    swarm_summoner: "Swarm Summoner",
    silence_pulse: "Silence Pulse",
    door_lockdown: "Door Lockdown",
  };
  return known[key] || titleCaseWords(key);
}

function dccAbilityDamageLabel(ability, attackValue = 0) {
  if (!ability || typeof ability !== "object") {
    return "Damage: none";
  }
  const attack = Math.max(0, Number(attackValue) || 0);
  const mult = Number(ability.multiplier || 1);
  const bonus = Number(ability.bonusDamage || 0);
  const low = Math.max(1, Math.round((attack * mult) + bonus));
  const high = Math.max(low, Math.round((attack * mult) + bonus + 3));
  const baseBonus = Number(ABILITIES[safeText(ability.id)] && ABILITIES[safeText(ability.id)].bonusDamage || 0);
  const bonusDelta = Math.max(0, bonus - baseBonus);
  const suffix = bonusDelta > 0 ? ` (+${bonusDelta})` : "";
  return low === high ? `Damage: ${low}${suffix}` : `Damage: ${low}-${high}${suffix}`;
}

function dccAbilityStatLines(ability) {
  if (!ability || typeof ability !== "object") {
    return [];
  }
  const base = ABILITIES[safeText(ability.id)] || ability;
  const lines = [];
  const rangeDelta = Math.max(0, Number(ability.range || 1) - Number(base.range || 1));
  lines.push(`Range: ${Math.max(1, Number(ability.range) || 1)}${rangeDelta > 0 ? ` (+${rangeDelta})` : ""}`);
  const staminaDelta = Number(ability.staminaCost || 0) - Number(base.staminaCost || 0);
  lines.push(`Stamina: ${Math.max(0, Number(ability.staminaCost) || 0)}${staminaDelta < 0 ? ` (${staminaDelta})` : ""}`);
  if (Number(base.gainBlock || 0) > 0 || Number(ability.gainBlock || 0) > 0) {
    const blockDelta = Math.max(0, Number(ability.gainBlock || 0) - Number(base.gainBlock || 0));
    lines.push(`Block: ${Math.max(0, Number(ability.gainBlock) || 0)}${blockDelta > 0 ? ` (+${blockDelta})` : ""}`);
  }
  return lines;
}

function emptyAbilityRefinement() {
  return {
    damage: 0,
    stamina: 0,
    block: 0,
    range: 0,
  };
}

function cloneBoosts(boosts) {
  return Array.isArray(boosts) ? boosts.map((boost) => ({ ...boost })) : [];
}

function ensureAbilityRefinements(run) {
  if (!run || typeof run !== "object") {
    return {};
  }
  if (!run.abilityRefinements || typeof run.abilityRefinements !== "object") {
    run.abilityRefinements = {};
  }
  return run.abilityRefinements;
}

function applyAbilityBoosts(run, abilityId, boosts) {
  const key = safeText(abilityId);
  if (!run || !key || !ABILITIES[key]) {
    return;
  }
  const refinements = ensureAbilityRefinements(run);
  const current = {
    ...emptyAbilityRefinement(),
    ...(refinements[key] && typeof refinements[key] === "object" ? refinements[key] : {}),
  };
  for (const boost of cloneBoosts(boosts)) {
    const stat = safeText(boost && boost.stat).toLowerCase();
    const amount = Number(boost && boost.amount) || 0;
    if (!stat || !amount || !Object.prototype.hasOwnProperty.call(current, stat)) {
      continue;
    }
    current[stat] += amount;
  }
  refinements[key] = current;
}

function randomCheckpointBasicBoosts(rand) {
  const pool = [
    Object.freeze({ stat: "damage", amount: 4, rarity: "epic" }),
    Object.freeze({ stat: "damage", amount: 3, rarity: "rare" }),
    Object.freeze({ stat: "block", amount: 3, rarity: "epic" }),
    Object.freeze({ stat: "range", amount: 1, rarity: "legendary" }),
    Object.freeze({ stat: "stamina", amount: -1, rarity: "legendary" }),
  ];
  const available = pool.slice();
  const chosen = [];
  while (available.length && chosen.length < 2) {
    const index = randomInt(rand, 0, available.length - 1);
    chosen.push(available[index]);
    available.splice(index, 1);
  }
  return chosen;
}

function randomBasicRefinement(rand) {
  const picks = randomCheckpointBasicBoosts(rand);
  return picks[0] || Object.freeze({ stat: "damage", amount: 3, rarity: "rare" });
}

function scaledAbility(run, abilityId) {
  const base = ABILITIES[safeText(abilityId)];
  if (!base) {
    return null;
  }
  const refinements =
    run && run.abilityRefinements && typeof run.abilityRefinements === "object" && run.abilityRefinements[safeText(abilityId)]
      ? {
          ...emptyAbilityRefinement(),
          ...run.abilityRefinements[safeText(abilityId)],
        }
      : emptyAbilityRefinement();
  return {
    ...base,
    bonusDamage: Math.max(0, Number(base.bonusDamage || 0)) + Math.max(0, Number(refinements.damage || 0)),
    staminaCost: Math.max(0, Number(base.staminaCost || 0) + Math.min(0, Number(refinements.stamina || 0))),
    gainBlock: Math.max(0, Number(base.gainBlock || 0)) + Math.max(0, Number(refinements.block || 0)),
    range: Math.max(1, Number(base.range || 1) + Math.max(0, Number(refinements.range || 0))),
    refinementSummary: refinements,
  };
}

function dccAbilityTooltip(ability, attackValue = 0) {
  if (!ability || typeof ability !== "object") {
    return "Empty slot\nLearn a book to fill this slot.";
  }
  const base = ABILITIES[safeText(ability.id)] || ability;
  const rangeDelta = Math.max(0, Number(ability.range || 1) - Number(base.range || 1));
  const staminaDelta = Number(ability.staminaCost || 0) - Number(base.staminaCost || 0);
  const blockDelta = Math.max(0, Number(ability.gainBlock || 0) - Number(base.gainBlock || 0));
  return [
    ability.label,
    dccAbilityDamageLabel(ability, attackValue),
    `Range: ${Math.max(1, Number(ability.range) || 1)}${rangeDelta > 0 ? ` (+${rangeDelta})` : ""}`,
    `Stamina: ${Math.max(0, Number(ability.staminaCost) || 0)}${staminaDelta < 0 ? ` (${staminaDelta})` : ""}`,
    ...(Number(base.gainBlock || 0) > 0 || Number(ability.gainBlock || 0) > 0
      ? [`Block: ${Math.max(0, Number(ability.gainBlock) || 0)}${blockDelta > 0 ? ` (+${blockDelta})` : ""}`]
      : []),
    safeText(ability.detail),
  ].join("\n");
}

function dccAbilityCardBodyMarkup(ability, attackValue = 0) {
  const statLines = [
    dccAbilityDamageLabel(ability, attackValue),
    ...dccAbilityStatLines(ability),
  ];
  return `
    <div class="dcc-ability-tooltip-body">
      <div class="dcc-ability-tooltip-left">
        ${statLines.map((line) => `<p class="dcc-ability-stat-row">${escapeHtml(line)}</p>`).join("")}
      </div>
      <div class="dcc-ability-tooltip-right">
        <p class="dcc-ability-detail-text">${escapeHtml(safeText(ability.detail))}</p>
      </div>
    </div>
  `;
}

function dccAbilityTooltipMarkup(ability, attackValue = 0) {
  if (!ability || typeof ability !== "object") {
    return `
      <div class="dcc-ability-tooltip-card" aria-hidden="true">
        <div class="dcc-ability-tooltip-title">Empty Slot</div>
        <div class="dcc-ability-tooltip-body">
          <div class="dcc-ability-tooltip-left">
            <p class="dcc-ability-stat-row">Damage: none</p>
          </div>
          <div class="dcc-ability-tooltip-right">
            <p class="dcc-ability-detail-text">Learn a book to fill this slot.</p>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="dcc-ability-tooltip-card" aria-hidden="true">
      <div class="dcc-ability-tooltip-title">${escapeHtml(ability.label)}</div>
      ${dccAbilityCardBodyMarkup(ability, attackValue)}
    </div>
  `;
}

function dccEnemyTraitDetail(enemy) {
  const trait = safeText(enemy && enemy.trait);
  const details = {
    dodge_after_move: "Slides after advancing, making retaliation less reliable if you let it dictate the distance.",
    slow_strike: "Hits late but hard. If it reaches you cleanly, the blow lands with extra weight.",
    thief_lunge: "Can surge forward twice when it smells weakness, closing corridors faster than normal monsters.",
    armor_bite: "Its hit chews through guard and turns steady defenses into a liability.",
    self_patch: "Mends itself mid-fight if you give it breathing room.",
    opening_strike: "Starts the fight with a sharper first hit than the rest of its pattern.",
    corridor_power: "Fights best in tight lanes and gains force when it can press straight through you.",
    bleed_bite: "Its bite turns small openings into nastier follow-up damage.",
    ambush: "Explodes out of the first exchange with a larger opening hit.",
    leech_hit: "Feeds on landed blows and can convert your lost health into its own recovery.",
    swarm_summoner: "Grows more dangerous over time as the swarm thickens around it.",
    silence_pulse: "Emits disruptive pulses that can shut down technique timing.",
    door_lockdown: "Turns the room itself hostile, reinforcing exits while it fights.",
  };
  return details[trait] || "This monster carries a distinct combat pattern.";
}

function dccEnemyDamageLabel(enemy) {
  if (!enemy || typeof enemy !== "object") {
    return "Damage: unknown";
  }
  let low = Math.max(1, Number(enemy.attack) || 1);
  let high = low + 3;
  const trait = safeText(enemy.trait);
  if (trait === "opening_strike" || trait === "ambush") {
    high += 3;
  }
  if (trait === "armor_bite" || trait === "bleed_bite") {
    high += 2;
  }
  if (trait === "corridor_power") {
    low += 1;
    high += 1;
  }
  return `Damage: ${Math.round(low)}-${Math.round(high)}`;
}

function dccEnemyTraitTooltip(enemy) {
  if (!enemy || typeof enemy !== "object") {
    return "";
  }
  const label = dccEnemyTraitLabel(enemy.trait);
  const range = Math.max(1, Number(enemy.range) || 1);
  return [
    label,
    dccEnemyDamageLabel(enemy),
    `Range: ${range}`,
    dccEnemyTraitDetail(enemy),
  ].join("\n");
}

function dccEnemyTraitTooltipMarkup(enemy) {
  if (!enemy || typeof enemy !== "object") {
    return "";
  }
  return `
    <div class="dcc-ability-tooltip-card dcc-enemy-trait-tooltip" aria-hidden="true">
      <div class="dcc-ability-tooltip-title">${escapeHtml(dccEnemyTraitLabel(enemy.trait))}</div>
      <div class="dcc-ability-tooltip-left">
        <p>${escapeHtml(dccEnemyDamageLabel(enemy))}</p>
        <p>Range: ${escapeHtml(String(Math.max(1, Number(enemy.range) || 1)))}</p>
      </div>
      <div class="dcc-ability-tooltip-right">
        <p>${escapeHtml(dccEnemyTraitDetail(enemy))}</p>
      </div>
    </div>
  `;
}

function abilityTomeEntries(meta) {
  const ids = Array.isArray(meta && meta.encounteredAbilityIds) ? meta.encounteredAbilityIds : [];
  const entries = ids
    .map((abilityId) => ABILITIES[safeText(abilityId)])
    .filter(Boolean);
  return [ABILITIES.basic, ...entries.filter((entry) => entry && entry.id !== "basic")];
}

function dccEquipmentEffectSummary(item) {
  if (!item || typeof item !== "object") {
    return "No stat bonuses.";
  }
  if (safeText(item.effectSummary)) {
    return safeText(item.effectSummary);
  }
  const parts = [];
  if (Number(item.hpBonus || 0)) {
    parts.push(`Max HP +${Math.round(Number(item.hpBonus || 0))}`);
  }
  if (Number(item.attackBonus || 0)) {
    parts.push(`Attack +${Number(item.attackBonus || 0).toFixed(0)}`);
  }
  if (Number(item.staminaBonus || 0)) {
    parts.push(`Stamina +${Number(item.staminaBonus || 0).toFixed(0)}`);
  }
  if (Number(item.abilitySlotBonus || 0)) {
    parts.push(`Ability slots +${Math.round(Number(item.abilitySlotBonus || 0))}`);
  }
  if (Array.isArray(item.abilityUnlocks) && item.abilityUnlocks.length) {
    parts.push(`Unlocks ${item.abilityUnlocks.length} ability${item.abilityUnlocks.length === 1 ? "" : "ies"}`);
  }
  return parts.length ? parts.join(" | ") : "No stat bonuses.";
}

function enemySheetMarkup(run) {
  const enemies = run && run.combat ? activeCombatEnemies(run.combat) : [];
  const roomState = roomStateFromRun(run);
  if (!enemies.length || !roomState) {
    return "";
  }
  const roomType = currentRoom(run) && currentRoom(run).type ? currentRoom(run).type : "";
  return `
    <section class="card dcc-enemy-sheet${roomType === "boss" ? " is-boss" : roomType === "miniBoss" ? " is-mini-boss" : ""}">
      <h4>${escapeHtml(enemies.length > 1 ? `Enemy Pack (${enemies.length})` : enemies[0].name)}</h4>
      <div class="dcc-enemy-pack">
        ${enemies.map((enemy) => {
          const distance = manhattanDistance(roomState.player.x, roomState.player.y, enemy.x, enemy.y);
          return `
            <article class="dcc-enemy-pack-card">
              <h5>${escapeHtml(enemy.name)}</h5>
              <div class="dcc-enemy-grid">
                <article class="dcc-enemy-chip">
                  <span>HP</span>
                  <strong>${escapeHtml(String(enemy.hp))}/${escapeHtml(String(enemy.maxHp))}</strong>
                </article>
                <article class="dcc-enemy-chip">
                  <span>Range</span>
                  <strong>${escapeHtml(String(Math.max(1, Number(enemy.range) || 1)))}</strong>
                </article>
                <article class="dcc-enemy-chip">
                  <span>Distance</span>
                  <strong>${escapeHtml(String(distance))}</strong>
                </article>
                <article class="dcc-enemy-chip">
                  <span>Trait</span>
                  <strong class="dcc-tooltip-anchor">
                    ${escapeHtml(dccEnemyTraitLabel(enemy.trait))}
                    ${dccEnemyTraitTooltipMarkup(enemy)}
                  </strong>
                </article>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function generateFloorMap(seed, floor) {
  const rand = createRng(seed + floor * 101);
  const size = mapSizeForFloor(floor);
  const roomTarget = roomCountForFloor(floor, size);
  const center = roomKey(Math.floor(size / 2), Math.floor(size / 2));
  const openRooms = new Set([center]);
  let current = center;

  while (openRooms.size < roomTarget) {
    const neighbors = collectNeighbors(new Set(
      Array.from({ length: size * size }, (_, index) => {
        const x = index % size;
        const y = Math.floor(index / size);
        return roomKey(x, y);
      }),
    ), current, size).map((entry) => entry.targetKey);
    current = randomPick(rand, neighbors) || center;
    openRooms.add(current);
  }

  const ranked = farthestRooms(center, openRooms);
  const bossRoomId = ranked[0] || center;
  const stairsRoomId = ranked.find((key) => key !== bossRoomId) || center;
  const miniBossRoomId = floor >= 4
    ? ranked.find((key) => key !== bossRoomId && key !== stairsRoomId && key !== center) || ""
    : "";
  const specialExcluded = new Set([center, bossRoomId, stairsRoomId, miniBossRoomId]);

  const candidateRooms = ranked.filter((key) => !specialExcluded.has(key));
  const shopRoomId = randomPick(rand, candidateRooms) || "";
  const remainingCandidates = candidateRooms.filter((key) => key !== shopRoomId);
  const lootRooms = new Set(remainingCandidates.slice(0, 3));
  const encounterRooms = new Set(remainingCandidates.slice(3, 7));

  const rooms = {};
  for (const key of openRooms) {
    const position = parseRoomKey(key);
    const neighbors = collectNeighbors(openRooms, key, size);
    let type = "monster";
    if (key === center) {
      type = "start";
    } else if (key === bossRoomId) {
      type = "boss";
    } else if (key === miniBossRoomId) {
      type = "miniBoss";
    } else if (key === stairsRoomId) {
      type = "stairs";
    } else if (key === shopRoomId) {
      type = "shop";
    } else if (lootRooms.has(key)) {
      type = "loot";
    } else if (encounterRooms.has(key)) {
      type = "encounter";
    }

    rooms[key] = {
      id: key,
      x: position.x,
      y: position.y,
      type,
      discovered: key === center,
      visited: key === center,
      cleared: key === center,
      rested: false,
      encounterId: type === "encounter" ? (chooseEncounterEntry(rand, floor) || ENCOUNTERS[0]).id : "",
      doors: Object.fromEntries(
        neighbors.map((entry) => [
          entry.direction,
          {
            to: entry.targetKey,
            lockId: [key, entry.targetKey].sort().join("|"),
          },
        ]),
      ),
    };
  }

  const lockState = {};
  for (const room of Object.values(rooms)) {
    for (const door of Object.values(room.doors || {})) {
      if (!door || !door.lockId || lockState[door.lockId]) {
        continue;
      }
      const shouldLock = rand() < 0.16 && door.to !== center && room.id !== center;
      lockState[door.lockId] = {
        locked: shouldLock,
        opened: !shouldLock,
        keyType: shouldLock ? (randomPick(rand, KEY_DEFINITIONS) || KEY_DEFINITIONS[0]).itemId : "",
      };
    }
  }

  // Guarantee floor completion: keep at least one unlocked route from start to boss.
  const queue = [center];
  const visited = new Set([center]);
  const parentByRoom = {};
  while (queue.length) {
    const roomId = queue.shift();
    if (roomId === bossRoomId) {
      break;
    }
    const room = rooms[roomId];
    const doors = room && room.doors && typeof room.doors === "object" ? room.doors : {};
    for (const door of Object.values(doors)) {
      if (!door || !door.to || visited.has(door.to)) {
        continue;
      }
      visited.add(door.to);
      parentByRoom[door.to] = roomId;
      queue.push(door.to);
    }
  }

  if (visited.has(bossRoomId)) {
    const path = [];
    let cursor = bossRoomId;
    while (cursor) {
      path.push(cursor);
      if (cursor === center) {
        break;
      }
      cursor = parentByRoom[cursor] || "";
    }
    path.reverse();
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index];
      const to = path[index + 1];
      const lockId = [from, to].sort().join("|");
      if (!lockState[lockId]) {
        continue;
      }
      lockState[lockId].locked = false;
      lockState[lockId].opened = true;
      lockState[lockId].keyType = "";
    }
  }

  return {
    floor,
    size,
    startRoomId: center,
    bossRoomId,
    miniBossRoomId,
    stairsRoomId,
    rooms,
    lockState,
  };
}

function normalizeRuntime(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const inventoryTabCandidate = String(source.inventoryTab || "potions").trim().toLowerCase();
  return {
    solved: Boolean(source.solved),
    abilityTomeOpen: Boolean(source.abilityTomeOpen),
    inventoryOpen: Boolean(source.inventoryOpen),
    inventoryTab: ["potions", "keys", "tomes", "misc"].includes(inventoryTabCandidate)
      ? inventoryTabCandidate
      : "potions",
    lootEvents: Array.isArray(source.lootEvents) ? source.lootEvents.filter((entry) => entry && typeof entry === "object") : [],
    pendingLootRemovals: Array.isArray(source.pendingLootRemovals)
      ? source.pendingLootRemovals.map((entry) => String(entry || "")).filter((entry) => entry)
      : [],
    pendingRewards: Array.isArray(source.pendingRewards) ? source.pendingRewards.map((entry) => String(entry || "")).filter((entry) => entry) : [],
    meta: withDefaultMeta(source.meta),
    run: source.run && typeof source.run === "object" ? source.run : null,
    lastMessage: String(source.lastMessage || ""),
    selectedLootItemId: String(source.selectedLootItemId || ""),
  };
}

function createInitialRuntime() {
  return {
    solved: false,
    abilityTomeOpen: false,
    inventoryOpen: false,
    inventoryTab: "potions",
    lootEvents: [],
    pendingLootRemovals: [],
    pendingRewards: [],
    meta: withDefaultMeta({}),
    run: null,
    lastMessage: "Welcome to Floor 1. Build a run and survive the crawl.",
  };
}

function withLootEventsFromBagGrowth(previousRuntime, nextRuntime, actionType) {
  const before = previousRuntime && previousRuntime.run && Array.isArray(previousRuntime.run.bag)
    ? previousRuntime.run.bag.length
    : 0;
  const after = nextRuntime && nextRuntime.run && Array.isArray(nextRuntime.run.bag)
    ? nextRuntime.run.bag.length
    : 0;
  const growth = Math.max(0, after - before);
  if (!growth) {
    return {
      ...nextRuntime,
      lootEvents: [],
    };
  }

  const eligible = new Set(["dcc-combat-use", "dcc-encounter-option", "dcc-move", "dcc-descend"]);
  if (!eligible.has(String(actionType || ""))) {
    return {
      ...nextRuntime,
      lootEvents: [],
    };
  }

  const run = nextRuntime && nextRuntime.run && typeof nextRuntime.run === "object" ? nextRuntime.run : {};
  const floor = Math.max(1, Math.floor(Number(run.floor) || 1));
  const floorDepth = Math.max(0, floor - 1);
  const rarityBias = currentFloorRareBonus(run);
  const dropChance = Math.min(0.6, 0.35 + floorDepth * 0.03);
  const outRegionChance = Math.min(0.38, 0.2 + floorDepth * 0.02);
  const events = Array.from({ length: growth }, () => ({
    sourceRegion: "dcc",
    triggerType: "crawl-drop",
    dropChance,
    outRegionChance,
    rarityBias,
  }));

  return {
    ...nextRuntime,
    lootEvents: events,
  };
}

function cloneRun(run) {
  return JSON.parse(JSON.stringify(run));
}

function currentRoom(run) {
  return run && run.map && run.map.rooms ? run.map.rooms[run.currentRoomId] || null : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function manhattanDistance(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function hashText(value) {
  const text = String(value || "");
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function doorTileForDirection(direction) {
  const midX = Math.floor(ROOM_WIDTH / 2);
  const midY = Math.floor(ROOM_HEIGHT / 2);
  if (direction === "up") {
    return { x: midX, y: 0 };
  }
  if (direction === "down") {
    return { x: midX, y: ROOM_HEIGHT - 1 };
  }
  if (direction === "left") {
    return { x: 0, y: midY };
  }
  return { x: ROOM_WIDTH - 1, y: midY };
}

function randomRoomPoint(rand, blocked = new Set()) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const x = randomInt(rand, 1, ROOM_WIDTH - 2);
    const y = randomInt(rand, 1, ROOM_HEIGHT - 2);
    const key = roomKey(x, y);
    if (!blocked.has(key)) {
      return { x, y };
    }
  }
  return { x: Math.floor(ROOM_WIDTH / 2), y: Math.floor(ROOM_HEIGHT / 2) };
}

function buildRoomState(run, room, entryDoorDirection = "") {
  const state = {
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    player: {
      x: Math.floor(ROOM_WIDTH / 2),
      y: Math.floor(ROOM_HEIGHT / 2),
    },
    doors: [],
    chest: null,
    encounterMarker: null,
    shop: null,
    stairs: null,
  };
  if (!room) {
    return state;
  }

  const rand = createRng((Number(run.seed) || 1) + hashText(room.id) + (run.floor * 131));
  state.doors = Object.entries(room.doors || {}).map(([direction, door]) => {
    const tile = doorTileForDirection(direction);
    return {
      direction,
      to: door.to,
      lockId: door.lockId,
      x: tile.x,
      y: tile.y,
    };
  });

  const spawnDoor = entryDoorDirection
    ? state.doors.find((door) => door.direction === String(entryDoorDirection || ""))
    : null;
  if (spawnDoor) {
    state.player.x = spawnDoor.x;
    state.player.y = spawnDoor.y;
  }

  const blocked = new Set(state.doors.map((door) => roomKey(door.x, door.y)));
  blocked.add(roomKey(state.player.x, state.player.y));

  if (room.type === "loot" && !room.cleared) {
    state.chest = randomRoomPoint(rand, blocked);
    blocked.add(roomKey(state.chest.x, state.chest.y));
  }

  if (room.type === "encounter" && !room.cleared) {
    state.encounterMarker = randomRoomPoint(rand, blocked);
    blocked.add(roomKey(state.encounterMarker.x, state.encounterMarker.y));
  }

  if (room.type === "shop") {
    state.shop = randomRoomPoint(rand, blocked);
    blocked.add(roomKey(state.shop.x, state.shop.y));
  }

  if (room.type === "stairs") {
    state.stairs = randomRoomPoint(rand, blocked);
  }

  return state;
}

function makeEnemy(rand, roomType, floor = 1) {
  const template = roomType === "boss"
    ? (randomPick(rand, BOSS_ENEMIES) || BOSS_ENEMIES[0])
    : roomType === "miniBoss"
      ? (randomPick(rand, MINI_BOSS_ENEMIES) || MINI_BOSS_ENEMIES[0])
      : (randomPick(rand, MINOR_ENEMIES) || MINOR_ENEMIES[0]);
  const depth = Math.max(0, Math.floor(Number(floor) || 1) - 1);
  const hpScale = roomType === "boss"
    ? 1 + (depth * 0.38)
    : roomType === "miniBoss"
      ? 1 + (depth * 0.28)
      : 1 + (depth * 0.22);
  const attackScale = roomType === "boss"
    ? 1 + (depth * 0.24)
    : roomType === "miniBoss"
      ? 1 + (depth * 0.18)
      : 1 + (depth * 0.15);
  const scaledHp = Math.max(1, Math.round(template.hp * hpScale));
  const scaledAttack = Math.max(1, Math.round(template.attack * attackScale));
  const scaledRange = Math.max(
    1,
    Number(template.range) || 1,
  ) + (
    roomType === "boss"
      ? Math.floor(depth / 3)
      : roomType === "miniBoss"
        ? Math.floor(depth / 4)
        : Math.floor(depth / 5)
  );
  return {
    name: template.name,
    trait: template.trait,
    maxHp: scaledHp,
    hp: scaledHp,
    attack: scaledAttack,
    range: scaledRange,
    goldMin: template.goldMin,
    goldMax: template.goldMax,
    acted: 0,
    blinded: false,
    stunned: false,
    swarm: 0,
    lockdownTriggered: false,
    tier: roomType === "boss" ? "boss" : roomType === "miniBoss" ? "miniBoss" : "enemy",
    x: 1,
    y: 1,
  };
}

function combatEnemyCountForRoom(roomType, floor, rand) {
  const depth = Math.max(1, Math.floor(Number(floor) || 1));
  if (roomType === "boss") {
    return 1;
  }
  if (depth < 3) {
    return 1;
  }
  if (roomType === "miniBoss") {
    if (depth >= 5 && rand() < 0.45) {
      return 2;
    }
    return rand() < 0.3 ? 2 : 1;
  }
  if (depth >= 5 && rand() < 0.38) {
    return 3;
  }
  return rand() < 0.62 ? 2 : 1;
}

function activeCombatEnemies(combat) {
  const source = combat && Array.isArray(combat.enemies)
    ? combat.enemies
    : combat && combat.enemy
      ? [combat.enemy]
      : [];
  return source.filter((enemy) => enemy && Number(enemy.hp || 0) > 0);
}

function syncCombatEnemies(combat) {
  if (!combat || typeof combat !== "object") {
    return [];
  }
  const living = activeCombatEnemies(combat);
  combat.enemies = living;
  combat.enemy = living[0] || null;
  if (!Number.isInteger(combat.turnCursor) || combat.turnCursor < 0) {
    combat.turnCursor = 0;
  }
  if (living.length) {
    combat.turnCursor %= living.length;
  } else {
    combat.turnCursor = 0;
  }
  return living;
}

function startCombat(run, roomType, seedOffset = 0) {
  const roomState = run.roomState || buildRoomState(run, currentRoom(run));
  const blocked = new Set([roomKey(roomState.player.x, roomState.player.y)]);
  const rand = createRng(Date.now() + seedOffset + run.floor * 31 + hashText(run.currentRoomId));
  const enemyCount = combatEnemyCountForRoom(roomType, run.floor, rand);
  const enemies = [];
  for (let index = 0; index < enemyCount; index += 1) {
    const enemy = makeEnemy(rand, roomType, run.floor);
    const spawn = randomRoomPoint(rand, blocked);
    enemy.x = spawn.x;
    enemy.y = spawn.y;
    blocked.add(roomKey(enemy.x, enemy.y));
    enemies.push(enemy);
  }
  run.combat = {
    enemies,
    enemy: enemies[0] || null,
    turnCursor: 0,
    round: 1,
    block: 0,
    silenced: false,
  };
  run.nextEnemyActAt = Date.now() + ENEMY_ACTION_INTERVAL_MS;
}

function ensureRunActionable(run) {
  if (!run) {
    return false;
  }
  return true;
}

function startFloor(runtime, state, floor = 1) {
  const modifiers = dccModifiers(state);
  const stats = deriveBaseStats(runtime.meta, modifiers);
  const seed = Date.now() + floor * 7919;
  const map = generateFloorMap(seed, floor);
  const progress = dccProgressFromState(state);
  const slots = Array.from({ length: stats.slotCount }, () => "");
  if (modifiers.startWithSponsorSkill) {
    slots[0] = "sponsor_blast";
    runtime.meta = withDefaultMeta({
      ...(runtime && runtime.meta ? runtime.meta : {}),
      encounteredAbilityIds: [
        ...((runtime && runtime.meta && Array.isArray(runtime.meta.encounteredAbilityIds)) ? runtime.meta.encounteredAbilityIds : []),
        "sponsor_blast",
      ],
    });
  }
  const gearUse = consumePreparedEquipmentForRun(runtime && runtime.meta ? runtime.meta.preparedEquipment : null);
  if (runtime && runtime.meta) {
    runtime.meta = withDefaultMeta({
      ...runtime.meta,
      preparedEquipment: gearUse.nextPrepared,
    });
  }
  if (runtime) {
    const pending = Array.isArray(runtime.pendingLootRemovals) ? runtime.pendingLootRemovals.slice() : [];
    for (const itemId of gearUse.expiredItemIds) {
      if (itemId && !pending.includes(itemId)) {
        pending.push(itemId);
      }
    }
    runtime.pendingLootRemovals = pending;
  }

  const run = {
    active: true,
    floor,
    seed,
    map,
    currentRoomId: map.startRoomId,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    stamina: stats.maxStamina,
    maxStamina: stats.maxStamina,
    attack: stats.attack,
    baseMaxHp: stats.maxHp,
    baseMaxStamina: stats.maxStamina,
    baseAttack: stats.attack,
    rareBonus: stats.rareBonus,
    goldMultiplier: stats.goldMultiplier,
    damageReduction: modifiers.damageReduction,
    shopPriceDivider: modifiers.shopPriceDivider,
    tomeDropChanceBonus: modifiers.tomeDropChanceBonus,
    skillDamageMultiplier: modifiers.skillDamageMultiplier,
    potionHealingMultiplier: modifiers.potionHealingMultiplier,
    bonusLootRollChance: modifiers.bonusLootRollChance,
    bag: [],
    hasFloorMap: createRng(seed + 97)() < Math.max(0, modifiers.mapRevealChanceBonus),
    abilitySlots: slots,
    abilityRefinements: {},
    combat: null,
    event: null,
    equipment: gearUse.runEquipment,
    roomState: null,
    nextEnemyActAt: 0,
    bossDefeated: false,
    log: [`Floor ${floor} opens. Keep moving.`],
  };
  if (progress.checkpointFloor >= 3 && floor >= 3) {
    const rand = createRng(seed + 4111);
    const checkpointBoosts = randomCheckpointBasicBoosts(rand);
    applyAbilityBoosts(run, "basic", checkpointBoosts);
    run.log = [
      `Checkpoint momentum sharpens Basic Attack: ${checkpointBoosts.map((boost) => `${titleCaseWords(boost.stat)} ${boost.amount >= 0 ? "+" : ""}${boost.amount}`).join(", ")}.`,
      ...run.log,
    ].slice(0, 20);
  }
  if (modifiers.startBasicAttackRefinements > 0) {
    const refineRand = createRng(seed + 9127);
    for (let index = 0; index < modifiers.startBasicAttackRefinements; index += 1) {
      applyAbilityBoosts(run, "basic", [randomBasicRefinement(refineRand)]);
    }
  }
  for (let index = 0; index < modifiers.startingHealingPotions; index += 1) {
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "health_potion",
      label: "Health Potion",
    });
  }
  applyEquipmentToRun(run);
  if (runtime && runtime.meta) {
    runtime.meta.gold = Math.max(0, Number(runtime.meta.gold || 0)) + modifiers.startingGoldBonus;
  }
  run.hp = run.maxHp;
  run.stamina = run.maxStamina;
  return run;
}

function addLog(run, line) {
  run.log = [String(line || ""), ...(Array.isArray(run.log) ? run.log : [])].slice(0, 20);
}

const NOTIFICATION_CHARS_PER_LINE = 34;
const NOTIFICATION_MAX_LINES = 11;

function estimatedNotificationLines(message) {
  const text = String(message || "");
  if (!text) {
    return 1;
  }
  const hardLines = text.split(/\r?\n/);
  return hardLines.reduce((sum, line) => {
    const length = Math.max(1, line.length);
    return sum + Math.max(1, Math.ceil(length / NOTIFICATION_CHARS_PER_LINE));
  }, 0);
}

function notificationsFit(entries) {
  const list = Array.isArray(entries) ? entries : [];
  let usedLines = 0;
  for (const entry of list) {
    const lines = estimatedNotificationLines(entry);
    usedLines += lines;
    if (usedLines > NOTIFICATION_MAX_LINES) {
      return false;
    }
  }
  return true;
}

function visibleNotifications(logEntries) {
  const source = Array.isArray(logEntries) ? logEntries : [];
  let count = source.length;
  while (count > 0) {
    const candidate = source.slice(0, count);
    if (notificationsFit(candidate)) {
      return candidate;
    }
    count -= 1;
  }
  return [];
}

function startEncounter(run, encounterId) {
  const entry = ENCOUNTER_BY_ID[encounterId] || ENCOUNTERS[0];
  run.event = {
    id: entry.id,
    title: entry.title,
    text: entry.text,
    options: entry.options.map((option) => ({ ...option })),
  };
}

function shopValueForItem(item) {
  if (!item || typeof item !== "object") {
    return 1;
  }
  if (item.type === "consumable") {
    return 2;
  }
  if (item.type === "key") {
    if (item.itemId === "obsidian_key") {
      return 8;
    }
    if (item.itemId === "silver_key") {
      return 5;
    }
    return 3;
  }
  if (item.type === "book") {
    return 7;
  }
  if (item.type === "utility") {
    return 4;
  }
  return 2;
}

function shopStackKey(item) {
  if (!item || typeof item !== "object") {
    return "misc::item";
  }
  return [
    inventoryCategory(item),
    String(item.type || ""),
    String(item.itemId || ""),
    String(item.label || ""),
    String(item.abilityId || ""),
  ].join("::");
}

function startShopEvent(run) {
  const bag = Array.isArray(run && run.bag) ? run.bag : [];
  const activeTab =
    run &&
    run.event &&
    typeof run.event === "object" &&
    ["all", "potions", "keys", "tomes", "misc"].includes(String(run.event.shopTab || "").toLowerCase())
      ? String(run.event.shopTab).toLowerCase()
      : "all";
  const stackMap = new Map();
  for (let index = 0; index < bag.length; index += 1) {
    const item = bag[index];
    if (!item || typeof item !== "object") {
      continue;
    }
    const key = shopStackKey(item);
    if (!stackMap.has(key)) {
      stackMap.set(key, {
        item,
        indices: [],
      });
    }
    stackMap.get(key).indices.push(index);
  }
  const sellOptions = [];
  for (const [key, entry] of stackMap.entries()) {
    const item = entry.item;
    const indices = Array.isArray(entry.indices) ? entry.indices.slice() : [];
    const value = shopValueForItem(item);
    const quantity = indices.length;
    if (!quantity) {
      continue;
    }
    sellOptions.push({
      id: `sell-${key}-1`,
      label: `Sell ${item.label} (+${value} gold)`,
      effect: "sell",
      itemLabel: item.label,
      itemCategory: inventoryCategory(item),
      itemIndices: indices.slice(0, 1),
      gold: value,
      quantity,
      unitValue: value,
    });
    if (quantity > 5) {
      sellOptions.push({
        id: `sell-${key}-5`,
        label: `Sell 5 ${item.label} (+${value * 5} gold)`,
        effect: "sell",
        itemLabel: item.label,
        itemCategory: inventoryCategory(item),
        itemIndices: indices.slice(0, 5),
        gold: value * 5,
        quantity,
        unitValue: value,
        bulkSize: 5,
      });
    }
    if (quantity > 10) {
      sellOptions.push({
        id: `sell-${key}-10`,
        label: `Sell 10 ${item.label} (+${value * 10} gold)`,
        effect: "sell",
        itemLabel: item.label,
        itemCategory: inventoryCategory(item),
        itemIndices: indices.slice(0, 10),
        gold: value * 10,
        quantity,
        unitValue: value,
        bulkSize: 10,
      });
    }
  }
  run.event = {
    id: "shop",
    mode: "shop",
    shopTab: activeTab,
    title: "Pop-Up Bazaar",
    text: "A vendor appears between floors, buying almost anything at a bad rate.",
    options: [
      ...sellOptions,
      {
        id: "leave-shop",
        label: "Leave shop",
        effect: "leave-shop",
      },
    ],
  };
}

function closeEncounterModal(runtime) {
  const run = runtime.run;
  if (!run || !run.event) {
    return "No active encounter.";
  }
  const mode = String(run.event.mode || "");
  run.event = null;
  if (mode === "shop") {
    addLog(run, "You step away from the pop-up bazaar.");
    return "Shop closed.";
  }
  addLog(run, "You step away from the encounter.");
  return "Encounter closed.";
}

function enterRoom(run, roomId, entryDoorDirection = "") {
  run.currentRoomId = roomId;
  const room = currentRoom(run);
  if (!room) {
    return;
  }
  room.discovered = true;
  room.visited = true;
  run.event = null;
  run.combat = null;
  run.roomState = buildRoomState(run, room, entryDoorDirection);
  run.nextEnemyActAt = 0;

  if (room.type === "monster" || room.type === "miniBoss" || room.type === "boss") {
    if (!room.cleared) {
      startCombat(run, room.type, room.x + room.y);
      const enemyCount = run.combat ? activeCombatEnemies(run.combat).length : 0;
      addLog(
        run,
        `Encountered ${
          room.type === "boss"
            ? "a boss"
            : room.type === "miniBoss"
              ? enemyCount > 1 ? `a mini-boss pack (${enemyCount})` : "a mini-boss"
              : enemyCount > 1 ? `a monster pack (${enemyCount})` : "a monster"
        } in room ${room.id}.`,
      );
    }
    return;
  }

  if (room.type === "encounter") {
    addLog(run, "You hear the scrape of scripted danger.");
  }
  if (room.type === "loot" && !room.cleared) {
    addLog(run, "A chest sits in the room. Step onto it to open.");
  }
  if (room.type === "stairs") {
    if (run.bossDefeated) {
      addLog(run, "The stairs are active. Step onto them to descend.");
    } else {
      addLog(run, "Stairs are present, but sealed by the floor boss.");
    }
  } else if (room.type === "shop") {
    addLog(run, "A pop-up bazaar has appeared in this room.");
  }
}

function roomStateFromRun(run) {
  const roomState = run && run.roomState && typeof run.roomState === "object" ? run.roomState : null;
  if (!roomState) {
    return null;
  }
  if (!roomState.player || typeof roomState.player !== "object") {
    return null;
  }
  return roomState;
}

function resolveDeath(runtime) {
  runtime.meta.totalDeaths += 1;
  runtime.run = null;
  runtime.inventoryOpen = false;
  return "You died. Loot and learned abilities were lost, but your gold remains.";
}

function resolveRoomVictory(runtime, run) {
  const room = currentRoom(run);
  if (!room) {
    return;
  }
  const defeatedEnemies = run && run.combat && Array.isArray(run.combat.enemies)
    ? run.combat.enemies.map((enemy) => ({ ...enemy }))
    : run.combat && run.combat.enemy
      ? [{ ...run.combat.enemy }]
      : [];
  const rewardEnemy = defeatedEnemies.find((enemy) => enemy) || null;
  room.cleared = true;
  if (room.type === "boss") {
    run.bossDefeated = true;
    const floorNumber = Math.max(1, Math.floor(Number(run.floor) || 1));
    const reward = FLOOR_BOSS_REWARD_ARTIFACTS[floorNumber];
    if (reward) {
      const claimed = runtime.meta && runtime.meta.bossRewardsClaimed && typeof runtime.meta.bossRewardsClaimed === "object"
        ? runtime.meta.bossRewardsClaimed
        : {};
      if (!claimed[floorNumber] && !claimed[String(floorNumber)]) {
        runtime.meta = {
          ...runtime.meta,
          bossRewardsClaimed: {
            ...claimed,
            [floorNumber]: true,
          },
        };
        const pending = Array.isArray(runtime.pendingRewards) ? runtime.pendingRewards.slice() : [];
        if (!pending.includes(reward)) {
          pending.push(reward);
        }
        runtime.pendingRewards = pending;
        addLog(run, `Milestone reward recovered: ${reward}.`);
      }
    }
  }
  run.combat = null;
  run.nextEnemyActAt = 0;
  const rand = createRng(Date.now() + run.floor * 313);
  const floorDepth = Math.max(0, Math.floor(Number(run.floor) || 1) - 1);
  const goldLow = Math.max(
    8,
    defeatedEnemies.length
      ? defeatedEnemies.reduce((sum, enemy) => sum + Math.max(1, Number(enemy && enemy.goldMin ? enemy.goldMin : 10)), 0)
      : Number(rewardEnemy && rewardEnemy.goldMin ? rewardEnemy.goldMin : 10),
  );
  const goldHigh = Math.max(
    goldLow,
    defeatedEnemies.length
      ? defeatedEnemies.reduce((sum, enemy) => sum + Math.max(1, Number(enemy && enemy.goldMax ? enemy.goldMax : 18)), 0)
      : Number(rewardEnemy && rewardEnemy.goldMax ? rewardEnemy.goldMax : 18),
  );
  const floorGoldBoost = 1 + floorDepth * 0.12;
  const tierBoost = room.type === "boss"
    ? 1.35 + floorDepth * 0.05
    : room.type === "miniBoss"
      ? 1.16 + floorDepth * 0.045
      : 1 + floorDepth * 0.04;
  const goldGain = Math.max(
    1,
    Math.round(randomInt(rand, goldLow, goldHigh) * tierBoost * floorGoldBoost * run.goldMultiplier),
  );
  runtime.meta.gold += goldGain;
  addLog(run, `Victory. +${goldGain} gold.`);

  const dropCount = room.type === "boss"
    ? 3 + Math.floor(floorDepth / 2)
    : room.type === "miniBoss"
      ? 2 + Math.floor(floorDepth / 3)
      : 1 + (floorDepth >= 4 ? 1 : 0);
  const packBonus = Math.max(0, defeatedEnemies.length - 1);
  const tierRareBonus = room.type === "boss"
    ? 0.25 + floorDepth * 0.03
    : room.type === "miniBoss"
      ? 0.12 + floorDepth * 0.025
      : floorDepth * 0.02;
  const dropChance = room.type === "boss"
    ? 1
    : room.type === "miniBoss"
      ? Math.min(0.94, 0.78 + floorDepth * 0.03)
      : Math.min(0.82, 0.62 + floorDepth * 0.04);
  for (let index = 0; index < dropCount + packBonus; index += 1) {
    if (rand() < dropChance) {
      const item = chooseLootDrop(
        rand,
        currentFloorRareBonus(run, tierRareBonus),
        run.floor,
        run.tomeDropChanceBonus,
      );
      run.bag.push(item);
      addLog(run, `Loot drop: ${item.label}.`);
    }
  }
  if (rand() < Math.max(0, Number(run.bonusLootRollChance || 0))) {
    const bonusItem = chooseLootDrop(
      rand,
      currentFloorRareBonus(run, tierRareBonus + 0.04),
      run.floor,
      run.tomeDropChanceBonus,
    );
    run.bag.push(bonusItem);
    addLog(run, `Scavenger instinct finds ${bonusItem.label}.`);
  }
}

function enemyMoveTowardPlayer(run, rand, actingEnemy = null) {
  if (!run || !run.combat || !run.combat.enemy) {
    return;
  }
  const enemy = actingEnemy || run.combat.enemy;
  const roomState = roomStateFromRun(run);
  if (!roomState) {
    return;
  }
  const player = roomState.player;
  const occupied = new Set(
    activeCombatEnemies(run.combat)
      .filter((other) => other !== enemy)
      .map((other) => roomKey(other.x, other.y)),
  );
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const moveXFirst = Math.abs(dx) >= Math.abs(dy) ? true : rand() < 0.5;
  const stepAxis = (axis) => {
    if (axis === "x" && dx !== 0) {
      const nextX = clamp(enemy.x + (dx > 0 ? 1 : -1), 1, ROOM_WIDTH - 2);
      const targetKey = roomKey(nextX, enemy.y);
      if (!occupied.has(targetKey)) {
        enemy.x = nextX;
        return true;
      }
    }
    if (axis === "y" && dy !== 0) {
      const nextY = clamp(enemy.y + (dy > 0 ? 1 : -1), 1, ROOM_HEIGHT - 2);
      const targetKey = roomKey(enemy.x, nextY);
      if (!occupied.has(targetKey)) {
        enemy.y = nextY;
        return true;
      }
    }
    return false;
  };
  if (moveXFirst) {
    if (!stepAxis("x")) {
      stepAxis("y");
    }
  } else if (!stepAxis("y")) {
    stepAxis("x");
  }
}

function enemyAct(runtime, now, enemyIndex = null) {
  const run = runtime.run;
  if (!run || !run.combat) {
    return "";
  }

  const combat = run.combat;
  const livingEnemies = syncCombatEnemies(combat);
  if (!livingEnemies.length) {
    return "";
  }
  const resolvedIndex = Number.isInteger(enemyIndex)
    ? Math.max(0, Math.min(livingEnemies.length - 1, enemyIndex))
    : Math.max(0, Math.min(livingEnemies.length - 1, Number(combat.turnCursor || 0)));
  const enemy = livingEnemies[resolvedIndex];
  const roomState = roomStateFromRun(run);
  if (!roomState) {
    return "";
  }
  const player = roomState.player;
  combat.enemy = enemy;
  const rand = createRng((Number(now) || Date.now()) + run.floor * 137 + enemy.acted * 31 + resolvedIndex * 83);

  if (enemy.stunned) {
    enemy.stunned = false;
    enemy.acted += 1;
    combat.turnCursor = livingEnemies.length ? (resolvedIndex + 1) % livingEnemies.length : 0;
    return "";
  }

  if (enemy.trait === "self_patch" && enemy.hp < enemy.maxHp && rand() < 0.2) {
    const heal = randomInt(rand, 2, 6);
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
  }

  if (enemy.trait === "swarm_summoner" && enemy.acted > 0 && enemy.acted % 3 === 0) {
    enemy.swarm = Math.min(4, (Number(enemy.swarm) || 0) + 1);
    addLog(run, `${enemy.name} summons reinforcements (${enemy.swarm}).`);
  }

  if (enemy.trait === "door_lockdown" && !enemy.lockdownTriggered && enemy.acted >= 1) {
    const room = currentRoom(run);
    const doorIds = room && room.doors ? Object.values(room.doors).map((door) => door.lockId) : [];
    const candidates = doorIds.filter((lockId) => {
      const lock = run.map && run.map.lockState ? run.map.lockState[lockId] : null;
      return lock && !lock.opened;
    });
    const picked = randomPick(rand, candidates);
    if (picked && run.map && run.map.lockState && run.map.lockState[picked]) {
      run.map.lockState[picked].locked = true;
      if (!run.map.lockState[picked].keyType) {
        run.map.lockState[picked].keyType = (randomPick(rand, KEY_DEFINITIONS) || KEY_DEFINITIONS[0]).itemId;
      }
      enemy.lockdownTriggered = true;
      addLog(run, `${enemy.name} hardens the room locks.`);
    }
  }

  const distance = manhattanDistance(player.x, player.y, enemy.x, enemy.y);
  const effectiveRange = Math.max(1, Number(enemy.range) || 1);
  if (distance > effectiveRange) {
    enemyMoveTowardPlayer(run, rand, enemy);
    if (enemy.trait === "thief_lunge" && distance > 2 && rand() < 0.4) {
      enemyMoveTowardPlayer(run, rand, enemy);
    }
    enemy.acted += 1;
    combat.turnCursor = livingEnemies.length ? (resolvedIndex + 1) % livingEnemies.length : 0;
    return "";
  }

  if (enemy.blinded) {
    enemy.blinded = false;
    if (rand() < 0.75) {
      enemy.acted += 1;
      combat.turnCursor = livingEnemies.length ? (resolvedIndex + 1) % livingEnemies.length : 0;
      return "";
    }
  }

  let base = enemy.attack + randomInt(rand, 0, 3);
  if (enemy.trait === "opening_strike" && enemy.acted === 0) {
    base += 4;
  }
  if (enemy.trait === "corridor_power") {
    base += 1;
  }
  if (enemy.trait === "armor_bite" && rand() < 0.4) {
    base += 2;
  }
  if (enemy.trait === "bleed_bite" && rand() < 0.35) {
    base += 2;
  }
  if (enemy.trait === "ambush" && enemy.acted === 0) {
    base += 3;
  }
  if (enemy.trait === "swarm_summoner") {
    base += Number(enemy.swarm) || 0;
  }
  if (enemy.trait === "silence_pulse" && rand() < 0.25) {
    combat.silenced = true;
  }

  enemy.acted += 1;
  const blocked = Math.min(base, Math.max(0, Number(combat.block) || 0));
  combat.block = Math.max(0, (Number(combat.block) || 0) - blocked);
  const rawDamage = Math.max(0, base - blocked);
  const damage = Math.max(
    0,
    Math.round(rawDamage * (1 - Math.min(0.8, Math.max(0, Number(run.damageReduction || 0))))),
  );
  run.hp = Math.max(0, run.hp - damage);

  if (enemy.trait === "leech_hit" && damage > 0 && rand() < 0.3) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.max(1, Math.floor(damage / 2)));
  }

  if (run.hp <= 0) {
    return resolveDeath(runtime);
  }
  combat.turnCursor = livingEnemies.length ? (resolvedIndex + 1) % livingEnemies.length : 0;
  return "";
}

function runEnemyTimeline(runtime, now, forceSingle = false) {
  const run = runtime.run;
  if (!run || !run.combat) {
    return "";
  }

  if (!run.nextEnemyActAt || !Number.isFinite(Number(run.nextEnemyActAt))) {
    run.nextEnemyActAt = now + ENEMY_ACTION_INTERVAL_MS;
  }

  const enemyCount = Math.max(1, activeCombatEnemies(run.combat).length);
  const actionLimit = forceSingle ? enemyCount : enemyCount * 3;
  let message = "";
  let count = 0;
  while (runtime.run && runtime.run.combat && count < actionLimit) {
    if (!forceSingle && now < run.nextEnemyActAt) {
      break;
    }
    message = enemyAct(runtime, now) || message;
    if (!runtime.run || !runtime.run.combat) {
      break;
    }
    run.nextEnemyActAt = (forceSingle ? now : run.nextEnemyActAt) + ENEMY_ACTION_INTERVAL_MS;
    count += 1;
  }
  return message;
}

function useItemInRun(run, itemIndex) {
  const bag = Array.isArray(run.bag) ? run.bag : [];
  let index = -1;
  if (typeof itemIndex === "string") {
    index = bag.findIndex((entry) => entry && String(entry.id || "") === itemIndex);
  } else {
    index = Math.floor(Number(itemIndex));
  }
  if (!Number.isInteger(index) || index < 0 || index >= bag.length) {
    return "Invalid item selection.";
  }
  const item = bag[index];
  if (!item) {
    return "Item not found.";
  }
  if (item.type === "consumable" && item.itemId === "health_potion") {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(28 * Math.max(1, Number(run.potionHealingMultiplier || 1))));
    bag.splice(index, 1);
    return "Health restored.";
  }
  if (item.type === "consumable" && item.itemId === "greater_health_potion") {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(55 * Math.max(1, Number(run.potionHealingMultiplier || 1))));
    bag.splice(index, 1);
    return "Greater health restored.";
  }
  if (item.type === "consumable" && item.itemId === "legend_health_potion") {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(95 * Math.max(1, Number(run.potionHealingMultiplier || 1))));
    bag.splice(index, 1);
    return "Legendary health restored.";
  }
  if (item.type === "consumable" && item.itemId === "stamina_potion") {
    run.stamina = Math.min(run.maxStamina, run.stamina + 4);
    bag.splice(index, 1);
    return "Stamina restored.";
  }
  if (item.type === "consumable" && item.itemId === "greater_stamina_potion") {
    run.stamina = Math.min(run.maxStamina, run.stamina + 7);
    bag.splice(index, 1);
    return "Greater stamina restored.";
  }
  if (item.type === "consumable" && item.itemId === "legend_stamina_potion") {
    run.stamina = Math.min(run.maxStamina, run.stamina + 10);
    bag.splice(index, 1);
    return "Legendary stamina restored.";
  }
  if (item.type === "key") {
    return "Keys are used automatically on matching locks.";
  }
  if (item.type === "book") {
    return "Choose an ability slot to learn this book.";
  }
  if (item.type === "utility" && item.itemId === "floor_map") {
    run.hasFloorMap = true;
    bag.splice(index, 1);
    return "You can now read the floor map while this run lasts.";
  }
  return "Item has no usable effect.";
}

function pushSimpleBagItem(run, item) {
  if (!run || !Array.isArray(run.bag) || !item || typeof item !== "object") {
    return;
  }
  run.bag.push({
    id: `${safeText(item.itemId || item.label || "item")}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: safeText(item.type),
    itemId: safeText(item.itemId),
    label: safeText(item.label),
    abilityId: safeText(item.abilityId),
    bookMode: safeText(item.bookMode),
    boosts: cloneBoosts(item.boosts),
  });
}

function consumeMatchingKeyFromBag(run, keyType) {
  const desired = String(keyType || "");
  if (!desired) {
    return false;
  }
  const bag = Array.isArray(run && run.bag) ? run.bag : [];
  const index = bag.findIndex((entry) => entry && entry.type === "key" && entry.itemId === desired);
  if (index < 0) {
    return false;
  }
  bag.splice(index, 1);
  return true;
}

function learnBook(run, itemIndex, slotIndex) {
  const bag = Array.isArray(run.bag) ? run.bag : [];
  let index = -1;
  if (typeof itemIndex === "string") {
    index = bag.findIndex((entry) => entry && String(entry.id || "") === itemIndex);
  } else {
    index = Math.floor(Number(itemIndex));
  }
  if (!Number.isInteger(index) || index < 0 || index >= bag.length) {
    return "Invalid book selection.";
  }
  const item = bag[index];
  if (!item || item.type !== "book" || !ABILITIES[item.abilityId]) {
    return "Selected item is not a valid ability book.";
  }

  const abilityId = safeText(item.abilityId);
  const mode = safeText(item.bookMode || "learn").toLowerCase();
  const boosts = cloneBoosts(item.boosts);
  const slots = Array.isArray(run.abilitySlots) ? run.abilitySlots : [];

  if (mode === "enhance") {
    if (!slots.includes(abilityId) && abilityId !== "basic") {
      return "Learn that technique before enhancing it.";
    }
    applyAbilityBoosts(run, abilityId, boosts);
    bag.splice(index, 1);
    return `${ABILITIES[abilityId].label} gains a new refinement.`;
  }

  if (slots.includes(abilityId) || abilityId === "basic") {
    return "You already know that technique.";
  }
  let resolvedSlot = Math.floor(Number(slotIndex));
  if (!Number.isInteger(resolvedSlot) || resolvedSlot < 0 || resolvedSlot >= slots.length) {
    resolvedSlot = slots.findIndex((entry) => !entry);
  }
  if (resolvedSlot < 0 || resolvedSlot >= slots.length) {
    return "No empty ability slots.";
  }

  slots[resolvedSlot] = abilityId;
  applyAbilityBoosts(run, abilityId, boosts);
  bag.splice(index, 1);
  return `${ABILITIES[abilityId].label} learned in slot ${resolvedSlot + 1}.`;
}

function resolveCombatAction(runtime, abilityIndex) {
  const run = runtime.run;
  if (!run || !run.combat) {
    return "No active combat.";
  }
  const combat = run.combat;
  const enemies = syncCombatEnemies(combat);
  if (!enemies.length) {
    return "No enemy target.";
  }

  const index = Math.max(0, Math.floor(Number(abilityIndex) || 0));
  const abilityId = index === 0
    ? "basic"
    : Array.isArray(run.abilitySlots) && run.abilitySlots[index - 1]
      ? run.abilitySlots[index - 1]
      : "";
  if (!abilityId || !ABILITIES[abilityId]) {
    return "No ability bound to that slot.";
  }
  if (combat.silenced && abilityId !== "basic") {
    combat.silenced = false;
    return "Your technique fizzles under silence.";
  }

  const ability = scaledAbility(run, abilityId);
  if (run.stamina < ability.staminaCost) {
    return "Not enough stamina.";
  }
  const roomState = roomStateFromRun(run);
  if (!roomState) {
    return "Room state unavailable.";
  }
  const inRangeEnemies = enemies.filter((enemy) => manhattanDistance(
    roomState.player.x,
    roomState.player.y,
    enemy.x,
    enemy.y,
  ) <= (Number(ability.range) || 1));
  if (!inRangeEnemies.length) {
    return `${enemies[0].name} is out of range.`;
  }
  run.stamina -= ability.staminaCost;

  const rand = createRng(Date.now() + run.floor * 147 + index * 17);
  const hitSummaries = [];
  for (const enemy of inRangeEnemies) {
    if (enemy.trait === "dodge_after_move" && enemy.acted === 0 && rand() < 0.22) {
      hitSummaries.push(`${enemy.name} slips clear`);
      continue;
    }
    const damage = Math.max(
      1,
      Math.round(
        ((run.attack * ability.multiplier) + ability.bonusDamage + randomInt(rand, 0, 3))
          * Math.max(1, Number(run.skillDamageMultiplier || 1)),
      ),
    );
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (ability.inflictBlind) {
      enemy.blinded = true;
    }
    if (ability.inflictStun) {
      enemy.stunned = true;
    }
    hitSummaries.push(`${enemy.name} -${damage}`);
  }
  if (ability.gainBlock) {
    combat.block = Math.max(0, Number(combat.block) || 0) + ability.gainBlock;
  }
  if (ability.healSelf) {
    run.hp = Math.min(run.maxHp, run.hp + Math.max(0, Number(ability.healSelf) || 0));
  }
  if (ability.restoreStamina) {
    run.stamina = Math.min(run.maxStamina, run.stamina + Math.max(0, Number(ability.restoreStamina) || 0));
  }

  const remainingEnemies = enemies.filter((enemy) => Number(enemy.hp || 0) > 0);
  if (!remainingEnemies.length) {
    combat.enemies = enemies;
    combat.enemy = enemies[0] || null;
    resolveRoomVictory(runtime, run);
    return hitSummaries.length ? `${hitSummaries.join(", ")}. Room cleared.` : "Room cleared.";
  }
  combat.enemies = remainingEnemies;
  syncCombatEnemies(combat);

  return runEnemyTimeline(runtime, Date.now(), true) || (hitSummaries.length ? hitSummaries.join(", ") : "Technique resolved.");
}

function resolveEncounter(runtime, optionId) {
  const run = runtime.run;
  if (!run || !run.event) {
    return "No active encounter.";
  }

  const event = run.event;
  if (event.mode === "shop") {
    if (optionId === "leave-shop") {
      run.event = null;
      addLog(run, "You leave the pop-up bazaar.");
      return "Shop closed.";
    }
    const sellOption = (event.options || []).find((entry) => entry.id === optionId && entry.effect === "sell");
    if (!sellOption) {
      return "Shop option unavailable.";
    }
    const bag = Array.isArray(run.bag) ? run.bag : [];
    const itemIndices = Array.isArray(sellOption.itemIndices)
      ? sellOption.itemIndices
        .map((value) => Math.floor(Number(value)))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < bag.length)
      : [];
    if (!itemIndices.length) {
      startShopEvent(run);
      return "That item is no longer available.";
    }
    const item = bag[itemIndices[0]];
    const bulkSize = Math.max(1, itemIndices.length);
    const value = Math.max(1, Number(sellOption.gold) || (shopValueForItem(item) * bulkSize));
    itemIndices
      .slice()
      .sort((a, b) => b - a)
      .forEach((index) => {
        bag.splice(index, 1);
      });
    runtime.meta.gold += value;
    addLog(run, `Sold ${bulkSize > 1 ? `${bulkSize}x ` : ""}${item.label} for ${value} gold.`);
    startShopEvent(run);
    return `Sold ${bulkSize > 1 ? `${bulkSize}x ` : ""}${item.label}.`;
  }

  const option = (event.options || []).find((entry) => entry.id === optionId);
  if (!option) {
    return "Encounter option unavailable.";
  }

  const room = currentRoom(run);
  const rand = createRng(Date.now() + run.floor * 521);
  if (option.effect === "loot") {
    const item = chooseLootDrop(rand, currentFloorRareBonus(run), run.floor, run.tomeDropChanceBonus);
    run.bag.push(item);
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: ${item.label}.`);
    return "You recovered hidden loot.";
  }
  if (option.effect === "buy_supply") {
    if (runtime.meta.gold < 12) {
      return "Need 12 gold.";
    }
    runtime.meta.gold -= 12;
    run.bag.push({
      id: `health_potion-${Date.now()}`,
      type: "consumable",
      itemId: "health_potion",
      label: "Health Potion",
      abilityId: "",
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter resolved: you bought supplies.");
    return "Supply purchased.";
  }
  if (option.effect === "loot_plus") {
    const first = chooseLootDrop(rand, currentFloorRareBonus(run, 0.08), run.floor, run.tomeDropChanceBonus);
    const second = chooseLootDrop(rand, currentFloorRareBonus(run, 0.14), run.floor, run.tomeDropChanceBonus);
    run.bag.push(first);
    run.bag.push(second);
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: ${first.label}.`);
    addLog(run, `Encounter reward: ${second.label}.`);
    return "You recover a richer cache.";
  }
  if (option.effect === "gain_map") {
    pushSimpleBagItem(run, {
      type: "utility",
      itemId: "floor_map",
      label: "Floor Map",
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter reward: Floor Map.");
    return "You piece together the floor layout.";
  }
  if (option.effect === "gain_key_cache") {
    const firstKey = randomPick(rand, KEY_DEFINITIONS) || KEY_DEFINITIONS[0];
    const secondKey = randomPick(rand, KEY_DEFINITIONS) || KEY_DEFINITIONS[1] || KEY_DEFINITIONS[0];
    pushSimpleBagItem(run, {
      type: "key",
      itemId: firstKey.itemId,
      label: firstKey.label,
    });
    pushSimpleBagItem(run, {
      type: "key",
      itemId: secondKey.itemId,
      label: secondKey.label,
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: ${firstKey.label} and ${secondKey.label}.`);
    return "You slip out with a pocket full of keys.";
  }
  if (option.effect === "gain_stamina_potion") {
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "greater_stamina_potion",
      label: "Greater Stamina Potion",
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter reward: Greater Stamina Potion.");
    return "You leave with sponsor-baited momentum.";
  }
  if (option.effect === "gain_gold_cache") {
    const gold = randomInt(rand, 14, 28) + Math.max(0, run.floor - 1) * 3;
    runtime.meta.gold += gold;
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: +${gold} gold.`);
    return "You strip the cart for sellable salvage.";
  }
  if (option.effect === "gain_loot_or_gold") {
    if (rand() < 0.5) {
      const item = chooseLootDrop(rand, currentFloorRareBonus(run, 0.1), run.floor, run.tomeDropChanceBonus);
      run.bag.push(item);
      room.cleared = true;
      run.event = null;
      if (run.roomState) {
        run.roomState.encounterMarker = null;
      }
      addLog(run, `Encounter reward: ${item.label}.`);
      return "The sponsor drone drops real loot.";
    }
    const gold = randomInt(rand, 18, 34) + Math.max(0, run.floor - 1) * 3;
    runtime.meta.gold += gold;
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: +${gold} gold.`);
    return "The drone pays out in gold instead.";
  }
  if (option.effect === "gain_block_tonic") {
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "stamina_potion",
      label: "Stamina Potion",
    });
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "health_potion",
      label: "Health Potion",
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter reward: field tonics.");
    return "You cobble together a small emergency kit.";
  }
  if (option.effect === "gain_random_book") {
    const currentFloor = Math.max(1, Math.floor(Number(run.floor) || 1));
    const pool = ABILITY_BOOKS.filter((book) => currentFloor >= Math.max(1, Math.floor(Number(book.minFloor) || 1)));
    const book = randomPick(rand, pool) || ABILITY_BOOKS[0];
    pushSimpleBagItem(run, {
      type: "book",
      itemId: book.itemId,
      label: book.label,
      abilityId: book.abilityId,
      bookMode: book.mode,
      boosts: book.boosts,
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: ${book.label}.`);
    return "The package contains a usable technique manual.";
  }
  if (option.effect === "gain_gold_big") {
    const gold = randomInt(rand, 26, 44) + Math.max(0, run.floor - 1) * 4;
    runtime.meta.gold += gold;
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: +${gold} gold.`);
    return "You sell the drop before anyone can argue about provenance.";
  }
  if (option.effect === "gain_health_potion") {
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "greater_health_potion",
      label: "Greater Health Potion",
    });
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter reward: Greater Health Potion.");
    return "You bottle something useful and leave quickly.";
  }
  if (option.effect === "gain_premium_potions") {
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "greater_health_potion",
      label: "Greater Health Potion",
    });
    pushSimpleBagItem(run, {
      type: "consumable",
      itemId: "greater_stamina_potion",
      label: "Greater Stamina Potion",
    });
    if (Math.max(1, run.floor) >= 5) {
      pushSimpleBagItem(run, {
        type: "consumable",
        itemId: "legend_health_potion",
        label: "Legend Health Potion",
      });
    }
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, "Encounter reward: premium apothecary stock.");
    return "You crack the locker and take the best medicine.";
  }
  if (option.effect === "heal_or_ambush") {
    if (rand() < 0.62) {
      run.hp = Math.min(run.maxHp, run.hp + Math.round(30 * Math.max(1, Number(run.potionHealingMultiplier || 1))));
      room.cleared = true;
      run.event = null;
      if (run.roomState) {
        run.roomState.encounterMarker = null;
      }
      addLog(run, "The fountain mends more than it maims.");
      return "You recover a surprising amount of health.";
    }
    room.cleared = true;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    startCombat(run, "miniBoss", 177);
    run.event = null;
    addLog(run, "Something wakes in the blood-slick chamber.");
    return "The fountain was bait. Combat begins.";
  }
  if (option.effect === "buy_rare_supply") {
    const price = Math.max(1, Math.round(28 / Math.max(1, Number(run.shopPriceDivider || 1))));
    if (runtime.meta.gold < price) {
      return `Need ${price} gold.`;
    }
    runtime.meta.gold -= price;
    const premium = chooseLootDrop(rand, currentFloorRareBonus(run, 0.2), Math.max(4, run.floor), run.tomeDropChanceBonus);
    run.bag.push(premium);
    room.cleared = true;
    run.event = null;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    addLog(run, `Encounter reward: ${premium.label}.`);
    return "You overpay for something that might be worth it.";
  }
  if (option.effect === "steal_loot_or_fight") {
    if (rand() < 0.55) {
      const stolen = chooseLootDrop(rand, currentFloorRareBonus(run, 0.18), Math.max(4, run.floor), run.tomeDropChanceBonus);
      run.bag.push(stolen);
      room.cleared = true;
      run.event = null;
      if (run.roomState) {
        run.roomState.encounterMarker = null;
      }
      addLog(run, `Encounter reward: ${stolen.label}.`);
      return "You slip away with premium salvage.";
    }
    room.cleared = true;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    startCombat(run, "miniBoss", 233);
    run.event = null;
    addLog(run, "The private auction turns ugly.");
    return "The room catches you. Combat begins.";
  }
  if (option.effect === "steal_key") {
    if (rand() < 0.6) {
      const key = randomPick(rand, KEY_DEFINITIONS) || KEY_DEFINITIONS[0];
      run.bag.push({
        id: `${key.itemId}-${Date.now()}-${randomInt(rand, 1000, 9999)}`,
        type: "key",
        itemId: key.itemId,
        label: key.label,
        abilityId: "",
      });
      room.cleared = true;
      run.event = null;
      if (run.roomState) {
        run.roomState.encounterMarker = null;
      }
      addLog(run, `Encounter resolved: you stole ${key.label}.`);
      return `You snatched ${key.label}.`;
    }
    room.cleared = true;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    startCombat(run, "monster", 77);
    run.event = null;
    addLog(run, "Encounter turned hostile.");
    return "You were spotted. Combat begins.";
  }
  if (option.effect === "fight_mimic" || option.effect === "fight_warden" || option.effect === "ambush") {
    room.cleared = true;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    startCombat(run, "monster", 101);
    run.event = null;
    addLog(run, "Encounter turned into combat.");
    return "Combat begins.";
  }
  if (option.effect === "fight_elite") {
    room.cleared = true;
    if (run.roomState) {
      run.roomState.encounterMarker = null;
    }
    startCombat(run, "miniBoss", 149);
    run.event = null;
    addLog(run, "You tear the shrine open and something elite answers.");
    return "Combat begins.";
  }
  room.cleared = true;
  run.event = null;
  if (run.roomState) {
    run.roomState.encounterMarker = null;
  }
  addLog(run, "Encounter concluded. You moved on.");
  return "You leave the encounter behind.";
}

function descendFloor(runtime, state) {
  const run = runtime.run;
  if (!run || run.combat || run.event) {
    return "Cannot descend right now.";
  }

  const room = currentRoom(run);
  const roomState = roomStateFromRun(run);
  if (!roomState || !roomState.stairs) {
    return "No stairs in this room.";
  }
  const onStairs =
    roomState.player.x === roomState.stairs.x &&
    roomState.player.y === roomState.stairs.y;
  if (!onStairs) {
    return "Stand on the stairs tile to descend.";
  }
  if (!room) {
    return "You are not at the stairs.";
  }
  if (!run.bossDefeated) {
    return "The stairs remain sealed until the floor boss falls.";
  }

  const nextFloor = run.floor + 1;
  const progress = dccProgressFromState(state);
  if (!isExternalFloorUnlocked(progress, nextFloor)) {
    const artifactName = externalFloorArtifactName(nextFloor);
    return artifactName
      ? `A sealed gate blocks descent. Seek ${artifactName}.`
      : "A sealed gate blocks descent.";
  }
  runtime.solved = true;
  runtime.meta.bestFloor = Math.max(runtime.meta.bestFloor, nextFloor);
  const nextRun = {
    ...run,
    floor: nextFloor,
    seed: Date.now() + nextFloor * 7919,
    map: generateFloorMap(Date.now() + nextFloor * 7919, nextFloor),
    currentRoomId: "",
    combat: null,
    event: null,
    roomState: null,
    nextEnemyActAt: 0,
    bossDefeated: false,
    hasFloorMap: false,
    log: [`Floor ${nextFloor} opens. Keep moving.`],
  };
  nextRun.currentRoomId = nextRun.map.startRoomId;
  enterRoom(nextRun, nextRun.currentRoomId);
  runtime.run = nextRun;
  return `Descended to floor ${nextFloor}.`;
}

function resolveTileInteraction(runtime, contextState) {
  const run = runtime.run;
  if (!run) {
    return "";
  }
  const room = currentRoom(run);
  const roomState = roomStateFromRun(run);
  if (!room || !roomState) {
    return "";
  }
  const player = roomState.player;

  if (roomState.chest && player.x === roomState.chest.x && player.y === roomState.chest.y && !room.cleared) {
    const rand = createRng(Date.now() + run.floor * 977 + hashText(room.id));
    const item = chooseLootDrop(rand, currentFloorRareBonus(run), run.floor, run.tomeDropChanceBonus);
    run.bag.push(item);
    room.cleared = true;
    roomState.chest = null;
    addLog(run, `Opened chest: ${item.label}.`);
    return `Found ${item.label}.`;
  }

  if (roomState.encounterMarker && player.x === roomState.encounterMarker.x && player.y === roomState.encounterMarker.y) {
    if (!run.event && !room.cleared) {
      startEncounter(run, room.encounterId);
      addLog(run, "A scripted encounter begins.");
      return "Encounter started.";
    }
  }

  if (roomState.shop && player.x === roomState.shop.x && player.y === roomState.shop.y) {
    if (!run.event) {
      startShopEvent(run);
      return "Shop opened.";
    }
  }

  if (roomState.stairs && player.x === roomState.stairs.x && player.y === roomState.stairs.y) {
    const stairMessage = descendFloor(runtime, contextState);
    if (stairMessage) {
      addLog(runtime.run || run, stairMessage);
    }
    return stairMessage;
  }

  const touchedDoor = (roomState.doors || []).find((door) => player.x === door.x && player.y === door.y);
  if (!touchedDoor) {
    return "";
  }
  if (run.combat) {
    return "The enemy blocks your escape.";
  }
  if (run.event) {
    return "Resolve the encounter first.";
  }
  const lock = run.map && run.map.lockState ? run.map.lockState[touchedDoor.lockId] : null;
  if (lock && lock.locked && !lock.opened) {
    const keyType = String(lock.keyType || "bronze_key");
    if (!consumeMatchingKeyFromBag(run, keyType)) {
      const label = KEY_LABEL_BY_ID[keyType] || "Key";
      const message = `Door is sealed. ${label} required.`;
      addLog(run, message);
      return message;
    }
    lock.opened = true;
    addLog(run, `Unlocked a sealed door with ${KEY_LABEL_BY_ID[keyType] || "a key"}.`);
  }

  const entryDoorDirection = OPPOSITE_DIRECTION[touchedDoor.direction] || "";
  enterRoom(run, touchedDoor.to, entryDoorDirection);
  return `Moved into room ${touchedDoor.to}.`;
}

function moveDirection(runtime, direction, contextState) {
  const run = runtime.run;
  if (!run || !ensureRunActionable(run)) {
    return "No active crawl.";
  }
  if (run.event) {
    return "Resolve the encounter first.";
  }
  const vector = DIRECTIONS[direction];
  if (!vector) {
    return "Invalid direction.";
  }
  const roomState = roomStateFromRun(run);
  if (!roomState) {
    return "Room state unavailable.";
  }

  const nextX = clamp(roomState.player.x + vector.dx, 0, ROOM_WIDTH - 1);
  const nextY = clamp(roomState.player.y + vector.dy, 0, ROOM_HEIGHT - 1);
  if (nextX === roomState.player.x && nextY === roomState.player.y) {
    return "";
  }
  const wallTile = nextX === 0 || nextY === 0 || nextX === ROOM_WIDTH - 1 || nextY === ROOM_HEIGHT - 1;
  const doorTile = (roomState.doors || []).some((door) => door.x === nextX && door.y === nextY);
  if (wallTile && !doorTile) {
    return "";
  }
  roomState.player.x = nextX;
  roomState.player.y = nextY;
  const interactionMessage = resolveTileInteraction(runtime, contextState);
  if (!runtime.run) {
    return interactionMessage;
  }
  if (runtime.run.combat) {
    const pressure = runEnemyTimeline(runtime, Date.now(), true);
    if (pressure) {
      return pressure;
    }
  }
  return interactionMessage;
}

function upgradeCost(meta, upgradeId) {
  const level = meta && meta.upgrades ? Number(meta.upgrades[upgradeId] || 0) : 0;
  if (upgradeId === "hp") {
    return 40 * (level + 1);
  }
  if (upgradeId === "attack") {
    return 50 * (level + 1);
  }
  if (upgradeId === "stamina") {
    return 34 * (level + 1);
  }
  if (upgradeId === "slots") {
    return 160 * (level + 1);
  }
  if (upgradeId === "rare") {
    return 120 * (level + 1);
  }
  return 999999;
}

function reduceDccRuntime(runtime, action, context = {}) {
  const current = normalizeRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "dcc-toggle-inventory") {
    return withLootEventsFromBagGrowth(current, {
      ...current,
      inventoryOpen: !current.inventoryOpen,
      abilityTomeOpen: false,
      lastMessage: "",
    }, action.type);
  }

  if (action.type === "dcc-open-ability-tome") {
    return {
      ...current,
      abilityTomeOpen: true,
      inventoryOpen: false,
    };
  }

  if (action.type === "dcc-close-ability-tome") {
    return {
      ...current,
      abilityTomeOpen: false,
    };
  }

  if (action.type === "dcc-exit-encounter") {
    const next = {
      ...current,
      run: current.run ? cloneRun(current.run) : null,
    };
    const message = closeEncounterModal(next);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: message,
    }, action.type);
  }

  if (action.type === "dcc-open-inventory-tab") {
    const tab = String(action.tab || "").trim().toLowerCase();
    return {
      ...current,
      inventoryTab: ["potions", "keys", "tomes", "misc"].includes(tab) ? tab : current.inventoryTab,
    };
  }

  if (action.type === "dcc-open-shop-tab") {
    const tab = String(action.tab || "").trim().toLowerCase();
    const next = {
      ...current,
      run: current.run ? cloneRun(current.run) : null,
    };
    if (!next.run || !next.run.event || next.run.event.mode !== "shop") {
      return current;
    }
    next.run.event = {
      ...next.run.event,
      shopTab: ["all", "potions", "keys", "tomes", "misc"].includes(tab) ? tab : "all",
    };
    return next;
  }

  if (action.type === "dcc-enter-floor") {
    if (current.run && current.run.active) {
      return {
        ...current,
        lastMessage: "A run is already active.",
      };
    }
    const progress = dccProgressFromState(context.state);
    const requestedFloor = Math.max(1, Math.floor(Number(action.startFloor) || progress.checkpointFloor || 1));
    const startAt = requestedFloor >= 3 && !progress.floor3Unlocked ? 1 : requestedFloor;
    const nextRun = startFloor(current, context.state, startAt);
    enterRoom(nextRun, nextRun.currentRoomId);
    return withLootEventsFromBagGrowth(current, {
      ...current,
      meta: {
        ...current.meta,
        totalRuns: current.meta.totalRuns + 1,
      },
      run: nextRun,
      abilityTomeOpen: false,
      inventoryOpen: false,
      inventoryTab: "potions",
      lastMessage: `Floor ${startAt} generated.`,
    }, action.type);
  }

  if (action.type === "dcc-unlock-floor-gate") {
    const floor = Math.max(2, Math.floor(Number(action.floor) || 0));
    if (action.atGate !== true) {
      return {
        ...current,
        lastMessage: `Reach the sealed stair gate on Floor ${Math.max(1, floor - 1)} first.`,
      };
    }
    if (action.ready !== true) {
      return {
        ...current,
        lastMessage: `You need ${externalFloorArtifactName(floor)} selected to unlock this gate.`,
      };
    }
    return {
      ...current,
      lastMessage: `The floor-${floor} gate unlocks with a deep mechanical shudder.`,
    };
  }

  if (action.type === "dcc-apply-checkpoint-pyramid") {
    if (action.ready !== true) {
      return {
        ...current,
        lastMessage: "You need the Checkpoint Pyramid selected to anchor this checkpoint.",
      };
    }
    if (action.floor3Unlocked !== true) {
      return {
        ...current,
        lastMessage: "You must unlock Floor 3 before setting this checkpoint.",
      };
    }
    return {
      ...current,
      lastMessage: "Checkpoint stabilized at Floor 3.",
    };
  }

  if (action.type === "dcc-buy-upgrade") {
    if (current.run && current.run.active) {
      return {
        ...current,
        lastMessage: "Upgrade purchases are only available outside a run.",
      };
    }
    const upgradeId = String(action.upgradeId || "");
    if (!Object.prototype.hasOwnProperty.call(current.meta.upgrades, upgradeId)) {
      return {
        ...current,
        lastMessage: "Unknown upgrade.",
      };
    }
    const cost = upgradeCost(current.meta, upgradeId);
    if (current.meta.gold < cost) {
      return {
        ...current,
        lastMessage: `Need ${cost} gold.`,
      };
    }
    const nextMeta = withDefaultMeta({
      ...current.meta,
      gold: current.meta.gold - cost,
      upgrades: {
        ...current.meta.upgrades,
        [upgradeId]: (current.meta.upgrades[upgradeId] || 0) + 1,
      },
    });
    return withLootEventsFromBagGrowth(current, {
      ...current,
      meta: nextMeta,
      lastMessage: `Upgraded ${upgradeId}.`,
    }, action.type);
  }

  if (action.type === "dcc-reset-run") {
    return withLootEventsFromBagGrowth(current, {
      ...current,
      run: null,
      inventoryOpen: false,
      inventoryTab: "potions",
      lastMessage: "Run abandoned.",
    }, action.type);
  }

  if (!current.run) {
    return current;
  }

  const next = {
    ...current,
    run: cloneRun(current.run),
  };

  if (action.type === "dcc-move") {
    const direction = String(action.direction || "");
    const message = moveDirection(next, direction, context.state);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: message,
    }, action.type);
  }

  if (action.type === "dcc-rest") {
    if (next.run.combat || next.run.event) {
      return {
        ...next,
        lastMessage: "Cannot rest during combat or an encounter.",
      };
    }
    const room = currentRoom(next.run);
    if (room && room.rested) {
      addLog(next.run, "You have already rested in this room.");
      return {
        ...next,
        lastMessage: "You have already rested in this room.",
      };
    }
    next.run.stamina = Math.min(next.run.maxStamina, next.run.stamina + 2);
    next.run.hp = Math.min(next.run.maxHp, next.run.hp + 4);
    if (room) {
      room.rested = true;
    }
    addLog(next.run, "You recover a little health and stamina.");
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: "Recovered a little health and stamina.",
    }, action.type);
  }

  if (action.type === "dcc-descend") {
    const message = descendFloor(next, context.state);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: message,
    }, action.type);
  }

  if (action.type === "dcc-use-item") {
    const message = useItemInRun(next.run, action.itemId || action.itemIndex);
    addLog(next.run, message);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: message,
    }, action.type);
  }

  if (action.type === "dcc-learn-book") {
    const bag = next.run && Array.isArray(next.run.bag) ? next.run.bag : [];
    const bookEntry = bag.find((entry) => entry && String(entry.id || "") === String(action.itemId || ""));
    const learnedAbilityId = bookEntry && bookEntry.type === "book" ? safeText(bookEntry.abilityId) : "";
    const message = learnBook(next.run, action.itemId || action.itemIndex, action.slotIndex);
    const learnedSuccessfully = /(learned in slot|gains a new refinement)/u.test(String(message || "")) && learnedAbilityId && ABILITIES[learnedAbilityId];
    const nextMeta = learnedSuccessfully
      ? withDefaultMeta({
          ...next.meta,
          encounteredAbilityIds: [...(next.meta.encounteredAbilityIds || []), learnedAbilityId],
        })
      : next.meta;
    addLog(next.run, message);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      meta: nextMeta,
      lastMessage: message,
    }, action.type);
  }

  if (action.type === "dcc-combat-use") {
    const message = resolveCombatAction(next, action.abilityIndex);
    return {
      ...next,
      lastMessage: message,
    };
  }

  if (action.type === "dcc-encounter-option") {
    const message = resolveEncounter(next, action.optionId);
    return withLootEventsFromBagGrowth(current, {
      ...next,
      lastMessage: message,
    }, action.type);
  }

  return withLootEventsFromBagGrowth(current, next, action.type);
}

function roomSymbol(room, run) {
  if (!room) {
    return "";
  }
  if (run.currentRoomId === room.id) {
    return "@";
  }
  if (!room.discovered) {
    return "";
  }
  if (room.type === "start") {
    return "S";
  }
  if (room.type === "stairs") {
    return ">";
  }
  if (room.type === "boss") {
    return room.cleared ? "b" : "B";
  }
  if (room.type === "miniBoss") {
    return room.cleared ? "m" : "V";
  }
  if (room.type === "loot") {
    return room.cleared ? "l" : "L";
  }
  if (room.type === "encounter") {
    return room.cleared ? "e" : "E";
  }
  return room.cleared ? "." : "M";
}

function discoveredMapMarkup(run) {
  if (!run.hasFloorMap) {
    return "";
  }
  const cells = [];
  for (let y = 0; y < run.map.size; y += 1) {
    for (let x = 0; x < run.map.size; x += 1) {
      const key = roomKey(x, y);
      const room = run.map.rooms[key] || null;
      const discovered = room && room.discovered;
      const active = room && run.currentRoomId === room.id;
      const classes = ["dcc-map-cell"];
      if (!room) {
        classes.push("is-empty");
      } else if (!discovered) {
        classes.push("is-undiscovered");
      } else {
        classes.push("is-discovered");
      }
      if (active) {
        classes.push("is-active");
      }
      cells.push(`
        <div class="${classes.join(" ")}" title="${escapeHtml(room ? `${room.id} (${room.type})` : "Void")}">
          <span>${escapeHtml(roomSymbol(room, run))}</span>
        </div>
      `);
    }
  }
  return `
    <section class="card dcc-floor-map">
      <h4>Floor Map</h4>
      <section class="dcc-map-grid" style="grid-template-columns: repeat(${escapeHtml(String(Math.max(1, Number(run.map.size) || BASE_MAP_SIZE)))}, minmax(0, 1fr));">${cells.join("")}</section>
    </section>
  `;
}

function roomViewMarkup(run) {
  const roomState = roomStateFromRun(run);
  const room = currentRoom(run);
  if (!roomState || !room) {
    return "";
  }

  const doorAt = Object.fromEntries(
    (roomState.doors || []).map((door) => [roomKey(door.x, door.y), door]),
  );
  const enemies = run.combat ? activeCombatEnemies(run.combat) : [];
  const cells = [];

  for (let y = 0; y < ROOM_HEIGHT; y += 1) {
    for (let x = 0; x < ROOM_WIDTH; x += 1) {
      let glyph = ".";
      let kind = "empty";
      const key = roomKey(x, y);
      const isWall = x === 0 || y === 0 || x === ROOM_WIDTH - 1 || y === ROOM_HEIGHT - 1;
      const door = doorAt[key] || null;
      if (isWall) {
        glyph = "#";
        kind = "wall";
      }
      if (door) {
        const lock = run.map && run.map.lockState ? run.map.lockState[door.lockId] : null;
        const locked = lock && lock.locked && !lock.opened;
        glyph = locked ? "L" : "D";
        kind = locked ? "door-locked" : "door";
      }
      if (roomState.stairs && x === roomState.stairs.x && y === roomState.stairs.y) {
        glyph = ">";
        kind = "stairs";
      }
      if (roomState.encounterMarker && x === roomState.encounterMarker.x && y === roomState.encounterMarker.y) {
        glyph = "?";
        kind = "encounter";
      }
      if (roomState.shop && x === roomState.shop.x && y === roomState.shop.y) {
        glyph = "$";
        kind = "shop";
      }
      if (roomState.chest && x === roomState.chest.x && y === roomState.chest.y) {
        glyph = "C";
        kind = "chest";
      }
      const enemyAtTile = enemies.find((enemy) => x === enemy.x && y === enemy.y);
      if (enemyAtTile) {
        glyph = room.type === "boss" ? "B" : room.type === "miniBoss" ? "V" : enemies.length > 1 ? "W" : "M";
        kind = room.type === "boss" ? "boss" : room.type === "miniBoss" ? "mini-boss" : enemies.length > 1 ? "enemy-pack" : "enemy";
      }
      if (x === roomState.player.x && y === roomState.player.y) {
        glyph = "@";
        kind = "player";
      }

      cells.push(`<div class="dcc-room-cell is-${escapeHtml(kind)}">${escapeHtml(glyph)}</div>`);
    }
  }

  return `
    <section class="card dcc-room">
      <h4>Active Room</h4>
      <div class="dcc-room-grid">${cells.join("")}</div>
    </section>
  `;
}

function combatMarkup(run) {
  const enemies = run && run.combat ? activeCombatEnemies(run.combat) : [];
  const basicAbility = scaledAbility(run, "basic");
  const abilityButtons = [
    {
      index: 0,
      label: `1: ${basicAbility.label}`,
      detail: dccAbilityTooltip(basicAbility, run && run.attack),
      empty: false,
      ability: basicAbility,
    },
    ...(Array.isArray(run && run.abilitySlots) ? run.abilitySlots : []).map((abilityId, slotIndex) => {
      const ability = scaledAbility(run, abilityId);
      return {
        index: slotIndex + 1,
        label: `${slotIndex + 2}: ${ability ? ability.label : "Empty Slot"}`,
        detail: ability ? dccAbilityTooltip(ability, run && run.attack) : "Empty slot\nLearn a book to fill this slot.",
        empty: !ability,
        ability,
      };
    }),
  ];

  return `
    <section class="card dcc-combat">
      <h4>Abilities</h4>
      ${enemies.length ? "" : `<p class="muted">No active enemy in this room.</p>`}
      <div class="dcc-ability-grid">
        ${abilityButtons.map((entry) => `
          <button
            type="button"
            class="dcc-ability-button"
            data-node-id="${NODE_ID}"
            data-node-action="dcc-combat-use"
            data-ability-index="${entry.index}"
            ${entry.empty || !enemies.length ? "disabled" : ""}
          >
            ${escapeHtml(entry.label)}
            ${dccAbilityTooltipMarkup(entry.ability, run && run.attack)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function encounterMarkup(run) {
  if (!run.event) {
    return "";
  }
  if (run.event.mode === "shop") {
    const sellOptions = (run.event.options || []).filter((option) => option && option.effect === "sell");
    const shopTab = String(run.event.shopTab || "all");
    const shopTabs = [
      { id: "all", label: "All" },
      { id: "potions", label: "Potions" },
      { id: "keys", label: "Keys" },
      { id: "tomes", label: "Tomes" },
      { id: "misc", label: "Misc" },
    ];
    const groupedSellRows = new Map();
    sellOptions.forEach((option) => {
      const key = `${String(option.itemCategory || "misc")}::${String(option.itemLabel || option.label || option.id || "item")}`;
      if (!groupedSellRows.has(key)) {
        groupedSellRows.set(key, {
          category: String(option.itemCategory || "misc"),
          label: String(option.itemLabel || option.label || "Item"),
          quantity: Math.max(1, Number(option.quantity) || 1),
          unitValue: Math.max(1, Number(option.unitValue) || 1),
          sell1: null,
          sell5: null,
          sell10: null,
        });
      }
      const row = groupedSellRows.get(key);
      const bulkSize = Math.max(1, Number(option.bulkSize) || 1);
      if (bulkSize >= 10) {
        row.sell10 = option;
      } else if (bulkSize >= 5) {
        row.sell5 = option;
      } else {
        row.sell1 = option;
      }
    });
    const filteredSellRows = Array.from(groupedSellRows.values()).filter((row) => (
      shopTab === "all" ? true : row.category === shopTab
    ));
    return `
      <div class="dcc-modal-backdrop" role="dialog" aria-label="${escapeHtml(run.event.title)}">
        <section class="card dcc-modal dcc-encounter-modal dcc-shop-modal">
          <header class="dcc-modal-header">
            <div>
              <h3>${escapeHtml(run.event.title)}</h3>
              <p class="muted">${escapeHtml(run.event.text)}</p>
            </div>
            <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="dcc-exit-encounter">Leave</button>
          </header>
          <div class="dcc-shop-panel">
            <div class="dcc-shop-summary">
              <span>Sellable Items</span>
              <strong>${escapeHtml(String(filteredSellRows.length))}</strong>
            </div>
            <div class="dcc-shop-tabs" role="tablist" aria-label="Shop categories">
              ${shopTabs.map((tab) => `
                <button
                  type="button"
                  class="ghost ${shopTab === tab.id ? "is-active" : ""}"
                  data-node-id="${NODE_ID}"
                  data-node-action="dcc-open-shop-tab"
                  data-tab="${escapeHtml(tab.id)}"
                >
                  ${escapeHtml(tab.label)}
                </button>
              `).join("")}
            </div>
            <div class="dcc-shop-list">
              ${
                filteredSellRows.length
                  ? filteredSellRows.map((row) => {
                    return `
                      <article class="dcc-shop-row">
                        <div class="dcc-shop-item-copy">
                          <h4>${escapeHtml(row.label)}${row.quantity > 1 ? ` x${row.quantity}` : ""}</h4>
                          <p>${escapeHtml(row.category)}</p>
                        </div>
                        <div class="dcc-shop-item-value">
                          <span>${escapeHtml(String(Math.max(1, Number(row.unitValue) || 1)))} gold each</span>
                          <div class="toolbar dcc-shop-actions">
                            ${
                              row.sell1
                                ? `
                                  <button
                                    type="button"
                                    data-node-id="${NODE_ID}"
                                    data-node-action="dcc-encounter-option"
                                    data-option-id="${escapeHtml(row.sell1.id)}"
                                  >
                                    Sell 1
                                  </button>
                                `
                                : ""
                            }
                            ${
                              row.sell5
                                ? `
                                  <button
                                    type="button"
                                    data-node-id="${NODE_ID}"
                                    data-node-action="dcc-encounter-option"
                                    data-option-id="${escapeHtml(row.sell5.id)}"
                                  >
                                    Sell 5
                                  </button>
                                `
                                : ""
                            }
                            ${
                              row.sell10
                                ? `
                                  <button
                                    type="button"
                                    data-node-id="${NODE_ID}"
                                    data-node-action="dcc-encounter-option"
                                    data-option-id="${escapeHtml(row.sell10.id)}"
                                  >
                                    Sell 10
                                  </button>
                                `
                                : ""
                            }
                          </div>
                        </div>
                      </article>
                    `;
                  }).join("")
                  : `<p class="muted">Nothing in this tab is worth pawning right now.</p>`
              }
            </div>
          </div>
        </section>
      </div>
    `;
  }
  return `
    <div class="dcc-modal-backdrop" role="dialog" aria-label="${escapeHtml(run.event.title)}">
      <section class="card dcc-modal dcc-encounter-modal">
        <header class="dcc-modal-header">
          <div>
            <h3>${escapeHtml(run.event.title)}</h3>
            <p class="muted">${escapeHtml(run.event.text)}</p>
          </div>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="dcc-exit-encounter">Close</button>
        </header>
        <div class="dcc-encounter-options">
        ${(run.event.options || []).map((option) => `
          <button
            type="button"
            class="dcc-encounter-option-card"
            data-node-id="${NODE_ID}"
            data-node-action="dcc-encounter-option"
            data-option-id="${escapeHtml(option.id)}"
          >
            <span>${escapeHtml(option.label)}</span>
          </button>
        `).join("")}
        </div>
      </section>
    </div>
  `;
}

function inventoryCategory(item) {
  if (!item || typeof item !== "object") {
    return "misc";
  }
  if (item.type === "consumable") {
    return "potions";
  }
  if (item.type === "key") {
    return "keys";
  }
  if (item.type === "book") {
    return "tomes";
  }
  return "misc";
}

function groupedInventoryRows(run) {
  const bag = Array.isArray(run.bag) ? run.bag : [];
  const grouped = {
    potions: [],
    keys: [],
    tomes: [],
    misc: [],
  };
  const stackMap = new Map();
  for (let index = 0; index < bag.length; index += 1) {
    const item = bag[index];
    if (!item || typeof item !== "object") {
      continue;
    }
    const key = `${inventoryCategory(item)}::${String(item.itemId || item.label || item.id || "item")}`;
    if (!stackMap.has(key)) {
      stackMap.set(key, {
        item,
        quantity: 0,
      });
    }
    const entry = stackMap.get(key);
    entry.quantity += 1;
  }
  for (const [key, value] of stackMap.entries()) {
    const [category] = key.split("::");
    if (grouped[category]) {
      grouped[category].push(value);
    }
  }
  return grouped;
}

function bookBoostSummary(item) {
  const boosts = cloneBoosts(item && item.boosts);
  if (!boosts.length) {
    return "";
  }
  return boosts
    .map((boost) => `${titleCaseWords(boost.stat)} ${Number(boost.amount) >= 0 ? "+" : ""}${Number(boost.amount)}`)
    .join(", ");
}

function inventoryModalMarkup(run, open, activeTab = "potions") {
  if (!open) {
    return "";
  }
  const grouped = groupedInventoryRows(run);
  const tab = ["potions", "keys", "tomes", "misc"].includes(String(activeTab || "").toLowerCase())
    ? String(activeTab).toLowerCase()
    : "potions";
  const rows = grouped[tab];
  const canLearnAbilityIds = new Set((Array.isArray(run.abilitySlots) ? run.abilitySlots : []).filter(Boolean));
  const hasEmptyAbilitySlot = (Array.isArray(run.abilitySlots) ? run.abilitySlots : []).some((entry) => !entry);

  const tabButton = (value, label) => `
    <button
      type="button"
      ${tab === value ? "disabled" : ""}
      data-node-id="${NODE_ID}"
      data-node-action="dcc-open-inventory-tab"
      data-tab="${value}"
    >
      ${label}
    </button>
  `;

  return `
    <div class="dcc-modal-backdrop" role="dialog" aria-label="Run Inventory">
      <section class="card dcc-modal dcc-encounter-modal dcc-inventory-modal">
        <header class="dcc-modal-header">
          <div>
            <h3>Run Inventory</h3>
          </div>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="dcc-toggle-inventory">Close</button>
        </header>
        <div class="dcc-shop-panel">
          <div class="dcc-shop-summary">
            <span>Items In Pack</span>
            <strong>${escapeHtml(String(Object.values(grouped).reduce((sum, list) => sum + list.length, 0)))}</strong>
          </div>
          <div class="dcc-shop-tabs" role="tablist" aria-label="Inventory categories">
            ${tabButton("potions", "Potions")}
            ${tabButton("keys", "Keys")}
            ${tabButton("tomes", "Tomes")}
            ${tabButton("misc", "Misc")}
          </div>
          <div class="dcc-shop-list">
            ${
              rows.length
                ? rows.map(({ item, quantity }) => `
                  <article class="dcc-shop-row dcc-inventory-row">
                    <div class="dcc-shop-item-copy">
                      <h4>${escapeHtml(item.label)}${quantity > 1 ? ` x${quantity}` : ""}</h4>
                      <p>${escapeHtml(inventoryCategory(item))}</p>
                    </div>
                    <div class="dcc-shop-item-value">
                      <span>${escapeHtml(item.type === "book"
                        ? `${safeText(item.bookMode || "learn").toLowerCase() === "enhance" ? "Enhancement Tome" : "Technique Tome"}${bookBoostSummary(item) ? ` • ${bookBoostSummary(item)}` : ""}`
                        : item.type === "key" ? "Auto-use" : item.type === "utility" ? "Field tool" : "Consumable")}</span>
                      <div class="toolbar dcc-shop-actions">
                        ${
                          item.type === "consumable" || (item.type === "utility" && item.itemId === "floor_map")
                            ? `
                              <button
                                type="button"
                                data-node-id="${NODE_ID}"
                                data-node-action="dcc-use-item"
                                data-item-id="${escapeHtml(String(item.id || ""))}"
                              >
                                Use
                              </button>
                            `
                            : ""
                        }
                        ${
                          item.type === "book"
                            ? (() => {
                              const isEnhance = safeText(item.bookMode || "learn").toLowerCase() === "enhance";
                              const disableLearn = !isEnhance
                                && (canLearnAbilityIds.has(item.abilityId) || !hasEmptyAbilitySlot);
                              const disableEnhance = isEnhance
                                && (!canLearnAbilityIds.has(item.abilityId) && item.abilityId !== "basic");
                              return `
                                <button
                                  type="button"
                                  data-node-id="${NODE_ID}"
                                  data-node-action="dcc-learn-book"
                                  data-item-id="${escapeHtml(String(item.id || ""))}"
                                  ${disableLearn || disableEnhance ? "disabled" : ""}
                                >
                                  ${isEnhance ? "Enhance" : "Learn"}
                                </button>
                              `;
                            })()
                            : ""
                        }
                      </div>
                    </div>
                  </article>
                `).join("")
                : `<p class="muted">Nothing in this tab right now.</p>`
            }
          </div>
        </div>
      </section>
    </div>
  `;
}

function quickPotionMarkup(run) {
  const grouped = groupedInventoryRows(run);
  const potions = grouped.potions || [];
  if (!potions.length) {
    return `
      <section class="card dcc-quick-potions">
        <h4>Quick Potions</h4>
        <p class="muted">No potions ready.</p>
      </section>
    `;
  }
  return `
    <section class="card dcc-quick-potions">
      <h4>Quick Potions</h4>
      <div class="dcc-quick-potion-list">
        ${potions.map(({ item, quantity }) => `
          <article class="dcc-quick-potion-row">
            <div class="dcc-quick-potion-copy">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(quantity > 1 ? `x${quantity}` : "1 ready")}</span>
            </div>
            <button
              type="button"
              data-node-id="${NODE_ID}"
              data-node-action="dcc-use-item"
              data-item-id="${escapeHtml(String(item.id || ""))}"
            >
              Use
            </button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function abilitySlotMarkup(run) {
  return `
    <ul class="dcc-slot-list">
      ${run.abilitySlots.map((abilityId, index) => {
        const ability = ABILITIES[abilityId];
        return `
          <li>
            <strong>Slot ${index + 1}:</strong>
            ${escapeHtml(ability ? ability.label : "Empty")}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function dccLootPanelMarkup(runtime, state) {
  const equipment = runtime && runtime.run
    ? normalizeEquipment(runtime.run.equipment)
    : normalizeEquipment(runtime && runtime.meta ? runtime.meta.preparedEquipment : null);
  const rows = [
    { slot: "head", label: "Head" },
    { slot: "chest", label: "Chest" },
    { slot: "legs", label: "Legs" },
    { slot: "trinket", label: "Trinket" },
  ];
  const lootState = lootInventoryFromState(state || {}, Date.now());
  const selectedLootItemId = String(runtime && runtime.selectedLootItemId ? runtime.selectedLootItemId : "");
  const selectedLoot = selectedLootItemId ? lootState.items[selectedLootItemId] : null;
  const selectedIsSocketable = Boolean(selectedLoot && isManualSocketLootItem(selectedLoot, "dcc"));
  const canInteract = Boolean(runtime && !runtime.run);
  const ringSlots = rows.map((row) => {
    const item = equipment[row.slot];
    const lives = item ? Math.max(1, Math.floor(Number(item.remainingRunLifespan ?? item.runLifespan ?? 1) || 1)) : 0;
    const details = item
      ? `${row.label}: ${item.label || "Armor"} (${item.rarity || "common"})${item.enchantLabel ? ` | Enchant: ${item.enchantLabel}` : ""} | ${lives} run${lives === 1 ? "" : "s"} left\n${dccEquipmentEffectSummary(item)}`
      : `${row.label}: empty`;
    const attrs = {};
    let clickable = false;
    if (canInteract && selectedIsSocketable) {
      clickable = true;
      attrs["data-action"] = "loot-equip-target";
      attrs["data-region"] = "dcc";
      attrs["data-slot-id"] = row.slot;
      attrs["data-target-id"] = row.slot;
    } else if (canInteract && item) {
      clickable = true;
      attrs["data-action"] = "loot-unequip-target";
      attrs["data-region"] = "dcc";
      attrs["data-slot-id"] = row.slot;
      attrs["data-target-id"] = row.slot;
    }
    return {
      filled: Boolean(item),
      clickable,
      title: details,
      ariaLabel: `${row.label} gear slot`,
      symbolHtml: item
        ? renderArtifactSymbol({
            artifactName: item.label || row.label,
            className: "slot-ring-symbol artifact-symbol",
          })
        : renderArtifactSymbol({
            artifactName: `${row.label} Slot`,
            className: "slot-ring-symbol artifact-symbol is-slot-ghost",
          }),
      attrs,
    };
  });

  return `
    <section class="card dcc-sheet">
      <h4>Run-Limited Gear</h4>
      ${renderSlotRing({
        slots: ringSlots,
        className: "dcc-gear-slot-ring",
        radiusPct: 42,
        centerHtml: renderRegionSymbol({
          section: "Dungeon Crawler Carl",
          className: "slot-ring-center-symbol",
        }),
        ariaLabel: "Dungeon Crawler Carl gear slots",
      })}
      ${selectedIsSocketable && canInteract ? `<p class="muted">Click a slot to set run gear.</p>` : ""}
      <div class="toolbar">
        <button type="button" data-action="toggle-widget" data-widget="loot">Open Loot Panel</button>
      </div>
    </section>
  `;
}

function abilityTomeButtonMarkup() {
  return `
    <button
      type="button"
      class="dcc-tome-button"
      data-node-id="${NODE_ID}"
      data-node-action="dcc-open-ability-tome"
      aria-label="Open Tome of Abilities"
      title="Tome of Abilities"
    >
      <span class="dcc-book-icon" aria-hidden="true"></span>
    </button>
  `;
}

function abilityTomeModalMarkup(runtime, attackValue = 0) {
  if (!runtime.abilityTomeOpen) {
    return "";
  }
  const entries = abilityTomeEntries(runtime.meta);
  return `
    <div class="dcc-modal-backdrop" role="dialog" aria-label="Tome of Abilities">
      <section class="card dcc-modal dcc-tome-modal">
        <header class="dcc-modal-header">
          <h3>Tome of Abilities</h3>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="dcc-close-ability-tome">Close</button>
        </header>
        ${
          entries.length
            ? `
              <div class="dcc-tome-list">
                ${entries.map((ability) => `
                  <article class="dcc-tome-entry">
                    <div class="dcc-ability-tooltip-card dcc-tome-entry-card">
                      <div class="dcc-ability-tooltip-title">${escapeHtml(ability.label)}</div>
                      ${dccAbilityCardBodyMarkup(ability, attackValue)}
                    </div>
                  </article>
                `).join("")}
              </div>
            `
            : `<p class="muted">No learned techniques have been recorded yet.</p>`
        }
      </section>
    </div>
  `;
}

function dccCharacterSheetMarkup(stats, meta, runtime, state) {
  const progress = dccProgressFromState(state);
  const bestFloor = Math.max(progress.checkpointFloor, meta.bestFloor || 1);
  const preparedBonuses = equippedBonuses({ equipment: meta.preparedEquipment });
  const upgradeRows = [
    { id: "hp", label: "Max HP", value: stats.maxHp, level: meta.upgrades.hp, gearBonus: preparedBonuses.hp },
    { id: "attack", label: "Attack", value: stats.attack, level: meta.upgrades.attack, gearBonus: preparedBonuses.attack },
    { id: "stamina", label: "Max Stamina", value: stats.maxStamina, level: meta.upgrades.stamina, gearBonus: preparedBonuses.stamina },
    { id: "slots", label: "Ability Slots", value: stats.slotCount, level: meta.upgrades.slots, gearBonus: preparedBonuses.abilitySlots },
    { id: "rare", label: "Loot Rarity", value: `${Math.round((stats.rareBonus || 0) * 100)}%`, level: meta.upgrades.rare },
  ];
  return `
    <section class="card dcc-sheet dcc-hero-sheet">
      <div class="dcc-hero-sheet-head">
        <h4>Character Sheet</h4>
        <div class="dcc-meta-row">
          <article class="dcc-meta-chip"><span>Runs</span><strong>${escapeHtml(String(meta.totalRuns))}</strong></article>
          <article class="dcc-meta-chip"><span>Deepest Floor</span><strong>${escapeHtml(String(bestFloor))}</strong></article>
        </div>
      </div>
      <div class="dcc-hero-sheet-body">
        <section class="dcc-stat-column">
          ${upgradeRows.map((row) => {
            const cost = upgradeCost(meta, row.id);
            return `
            <article class="dcc-stat-chip">
              <div class="dcc-stat-chip-copy">
                <span>${escapeHtml(row.label)}</span>
                <div class="dcc-stat-chip-mainline">
                  <strong>${escapeHtml(String(row.value))}</strong>
                  ${row.gearBonus ? `<span class="dcc-gear-bonus">+ Gear ${escapeHtml(String(row.gearBonus))}</span>` : ""}
                </div>
              </div>
              <div class="dcc-upgrade-stack">
                <small>Lv ${escapeHtml(String(row.level))}</small>
                <button
                  type="button"
                  class="dcc-upgrade-button"
                  data-node-id="${NODE_ID}"
                  data-node-action="dcc-buy-upgrade"
                  data-upgrade-id="${escapeHtml(row.id)}"
                  ${meta.gold >= cost ? "" : "disabled"}
                >
                  Upgrade ${escapeHtml(String(cost))}g
                </button>
              </div>
            </article>
          `;
          }).join("")}
        </section>
        <section class="dcc-gear-artboard">
          ${dccLootPanelMarkup(runtime, state)}
        </section>
      </div>
    </section>
  `;
}

function compactGearSummaryMarkup(run) {
  const equipment = normalizeEquipment(run && run.equipment);
  const entries = [
    { slot: "head", label: "Head" },
    { slot: "chest", label: "Chest" },
    { slot: "legs", label: "Legs" },
    { slot: "trinket", label: "Trinket" },
  ];
  const slots = entries.map((entry) => {
    const item = equipment[entry.slot];
    const lives = item ? Math.max(1, Math.floor(Number(item.remainingRunLifespan ?? item.runLifespan ?? 1) || 1)) : 0;
    const title = item
      ? `${entry.label}: ${item.label || "Armor"} (${item.rarity || "common"})${item.enchantLabel ? ` | Enchant: ${item.enchantLabel}` : ""} | ${lives} run${lives === 1 ? "" : "s"} left\n${dccEquipmentEffectSummary(item)}`
      : `${entry.label}: empty`;
    return {
      filled: Boolean(item),
      clickable: false,
      title,
      ariaLabel: `${entry.label} gear slot`,
      symbolHtml: item
        ? renderArtifactSymbol({
            artifactName: item.label || entry.label,
            className: "slot-ring-symbol artifact-symbol",
          })
        : "",
      attrs: {},
    };
  });
  return `
    <div class="dcc-gear-mini" aria-label="Run gear summary">
      ${renderSlotRing({
        slots,
        className: "dcc-gear-mini-ring",
        radiusPct: 41,
        centerHtml: renderRegionSymbol({
          section: "Dungeon Crawler Carl",
          className: "slot-ring-center-symbol",
        }),
        ariaLabel: "Run gear slots",
      })}
    </div>
  `;
}

function outsideMarkup(runtime, state, selectedArtifact = "") {
  const meta = runtime.meta;
  const modifiers = dccModifiers(state);
  const stats = deriveBaseStats(meta, modifiers);
  const progress = dccProgressFromState(state);
  const rewards =
    state && state.inventory && state.inventory.rewards && typeof state.inventory.rewards === "object"
      ? state.inventory.rewards
      : {};
  const hasCheckpointPyramid = Boolean(rewards["Checkpoint Pyramid"]);
  const artifact = safeText(selectedArtifact);
  const pyramidSelected = artifact === "Checkpoint Pyramid";
  const canSetCheckpoint = pyramidSelected && progress.floor3Unlocked;
  const showCheckpointButton = hasCheckpointPyramid && progress.floor3Unlocked;
  return `
    <section class="card dcc-outside">
      <div class="dcc-outside-head">
        <div>
          <div class="dcc-title-row">
            <h3>Outside The Dungeon</h3>
            <div class="dcc-gold-chip"><span>Gold</span><strong>${escapeHtml(String(meta.gold))}</strong></div>
          </div>
        </div>
      </div>
      <div class="toolbar">
        <button type="button" data-node-id="${NODE_ID}" data-node-action="dcc-enter-floor">Enter Floor ${escapeHtml(String(dccProgressFromState(state).checkpointFloor))}</button>
        ${
          showCheckpointButton
            ? `
              <button
                type="button"
                data-node-id="${NODE_ID}"
                data-node-action="dcc-apply-checkpoint-pyramid"
                data-artifact="${escapeHtml(artifact)}"
                data-ready="${canSetCheckpoint ? "true" : "false"}"
                data-floor3-unlocked="${progress.floor3Unlocked ? "true" : "false"}"
              >
                Set Checkpoint: Floor 3
              </button>
            `
            : ""
        }
      </div>
    </section>
    ${dccCharacterSheetMarkup(stats, meta, runtime, state)}
  `;
}

function runMarkup(runtime, state, selectedArtifact = "") {
  const run = runtime.run;
  if (!run) {
    return "";
  }
  const progress = dccProgressFromState(state);
  const artifact = safeText(selectedArtifact);
  const room = currentRoom(run);
  const roomState = roomStateFromRun(run);
  const onStairs = Boolean(
    roomState &&
    roomState.stairs &&
    roomState.player &&
    roomState.player.x === roomState.stairs.x &&
    roomState.player.y === roomState.stairs.y,
  );
  const nextFloor = run.floor + 1;
  const lockedNextFloor = onStairs && !isExternalFloorUnlocked(progress, nextFloor) ? nextFloor : 0;
  const nextFloorArtifact = lockedNextFloor ? externalFloorArtifactName(lockedNextFloor) : "";
  const keySelected = nextFloorArtifact ? artifact === nextFloorArtifact : false;
  const enemy = run.combat && run.combat.enemy ? run.combat.enemy : null;
  const distance = enemy && roomState
    ? manhattanDistance(roomState.player.x, roomState.player.y, enemy.x, enemy.y)
    : 0;
  const feedEntries = visibleNotifications(run.log || []);
  const controlButtons = `
    <button type="button" data-node-id="${NODE_ID}" data-node-action="dcc-rest" ${run.combat || run.event ? "disabled" : ""}>Rest (R)</button>
    <button type="button" data-node-id="${NODE_ID}" data-node-action="dcc-toggle-inventory">Inventory (I)</button>
    ${
      lockedNextFloor
        ? `
          <button
            type="button"
            class="dcc-gate-button"
            data-node-id="${NODE_ID}"
            data-node-action="dcc-unlock-floor-gate"
            data-artifact="${escapeHtml(artifact)}"
            data-ready="${keySelected ? "true" : "false"}"
            data-at-gate="${onStairs ? "true" : "false"}"
            data-floor="${escapeHtml(String(lockedNextFloor))}"
            ${keySelected ? "" : "disabled"}
          >
            ${nextFloorArtifact ? renderArtifactSymbol({
              artifactName: nextFloorArtifact,
              className: "dcc-gate-symbol artifact-symbol",
            }) : ""}
            Unlock Floor ${escapeHtml(String(lockedNextFloor))}
          </button>
        `
        : ""
    }
    <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="dcc-reset-run">Abandon Run</button>
  `;

  return `
    <section class="dcc-run-layout">
      <div class="dcc-run-main">
        <section class="card dcc-status dcc-run-status-card">
          <div class="dcc-run-status-head">
            <div class="dcc-run-status-copy">
              <div class="dcc-title-row">
                <h3>Floor ${escapeHtml(String(run.floor))}</h3>
              </div>
              <p>Current Room: ${escapeHtml(room ? room.id : "Unknown")}</p>
              <div class="dcc-run-stat-row">
                <article class="dcc-stat-chip"><span>HP</span><strong>${escapeHtml(String(run.hp))}/${escapeHtml(String(run.maxHp))}</strong></article>
                <article class="dcc-stat-chip"><span>Stamina</span><strong>${escapeHtml(String(run.stamina))}/${escapeHtml(String(run.maxStamina))}</strong></article>
                <article class="dcc-stat-chip"><span>Gold</span><strong>${escapeHtml(String(runtime.meta.gold))}</strong></article>
                <article class="dcc-stat-chip"><span>Block</span><strong>${escapeHtml(String(Math.max(0, Number((run.combat && run.combat.block) || 0) || 0)))}</strong></article>
              </div>
            </div>
            <div class="dcc-status-right">
              ${compactGearSummaryMarkup(run)}
              ${abilityTomeButtonMarkup()}
            </div>
          </div>
          <div class="toolbar dcc-run-controls">
            ${controlButtons}
          </div>
        </section>

        ${encounterMarkup(run)}
        ${roomViewMarkup(run)}
        ${combatMarkup(run)}
        ${discoveredMapMarkup(run)}
      </div>

      <aside class="card dcc-feed">
        ${enemySheetMarkup(run)}
        <h4>Notifications</h4>
        <div class="dcc-feed-scroll">
          <ul>
            ${feedEntries.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
          </ul>
        </div>
        ${quickPotionMarkup(run)}
      </aside>
    </section>
    ${inventoryModalMarkup(run, runtime.inventoryOpen, runtime.inventoryTab)}
  `;
}

function renderDcc01(context) {
  const runtime = normalizeRuntime(context.runtime);
  const selectedArtifact = String(context && context.selectedArtifactReward ? context.selectedArtifactReward : "");

  return `
    <article class="dcc01-node" data-node-id="${NODE_ID}">
      <section class="card dcc-head">
        <h3>The Crawl</h3>
      </section>
      ${runtime.run ? runMarkup(runtime, context.state, selectedArtifact) : outsideMarkup(runtime, context.state, selectedArtifact)}
      ${abilityTomeModalMarkup(runtime, runtime.run ? runtime.run.attack : deriveBaseStats(runtime.meta, dccModifiers(context.state)).attack)}
    </article>
  `;
}

function actionFromElement(element) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  const common = { at: Date.now() };
  if (actionName === "dcc-enter-floor") {
    return { type: "dcc-enter-floor", ...common };
  }
  if (actionName === "dcc-buy-upgrade") {
    return {
      type: "dcc-buy-upgrade",
      upgradeId: element.getAttribute("data-upgrade-id") || "",
      ...common,
    };
  }
  if (actionName === "dcc-reset-run") {
    return { type: "dcc-reset-run", ...common };
  }
  if (actionName === "dcc-toggle-inventory") {
    return { type: "dcc-toggle-inventory", ...common };
  }
  if (actionName === "dcc-open-ability-tome") {
    return { type: "dcc-open-ability-tome", ...common };
  }
  if (actionName === "dcc-close-ability-tome") {
    return { type: "dcc-close-ability-tome", ...common };
  }
  if (actionName === "dcc-move") {
    return {
      type: "dcc-move",
      direction: element.getAttribute("data-direction") || "",
      ...common,
    };
  }
  if (actionName === "dcc-rest") {
    return { type: "dcc-rest", ...common };
  }
  if (actionName === "dcc-descend") {
    return { type: "dcc-descend", ...common };
  }
  if (actionName === "dcc-unlock-floor-gate") {
    return {
      type: "dcc-unlock-floor-gate",
      artifact: element.getAttribute("data-artifact") || "",
      ready: element.getAttribute("data-ready") === "true",
      atGate: element.getAttribute("data-at-gate") === "true",
      floor: Number(element.getAttribute("data-floor") || 0),
      ...common,
    };
  }
  if (actionName === "dcc-apply-checkpoint-pyramid") {
    return {
      type: "dcc-apply-checkpoint-pyramid",
      artifact: element.getAttribute("data-artifact") || "",
      ready: element.getAttribute("data-ready") === "true",
      floor3Unlocked: element.getAttribute("data-floor3-unlocked") === "true",
      ...common,
    };
  }
  if (actionName === "dcc-use-item") {
    return {
      type: "dcc-use-item",
      itemId: element.getAttribute("data-item-id") || "",
      ...common,
    };
  }
  if (actionName === "dcc-learn-book") {
    return {
      type: "dcc-learn-book",
      itemId: element.getAttribute("data-item-id") || "",
      slotIndex: Number(element.getAttribute("data-slot-index") || -1),
      ...common,
    };
  }
  if (actionName === "dcc-open-inventory-tab") {
    return {
      type: "dcc-open-inventory-tab",
      tab: element.getAttribute("data-tab") || "",
      ...common,
    };
  }
  if (actionName === "dcc-open-shop-tab") {
    return {
      type: "dcc-open-shop-tab",
      tab: element.getAttribute("data-tab") || "",
      ...common,
    };
  }
  if (actionName === "dcc-combat-use") {
    return {
      type: "dcc-combat-use",
      abilityIndex: Number(element.getAttribute("data-ability-index") || 0),
      ...common,
    };
  }
  if (actionName === "dcc-encounter-option") {
    return {
      type: "dcc-encounter-option",
      optionId: element.getAttribute("data-option-id") || "",
      ...common,
    };
  }
  if (actionName === "dcc-exit-encounter") {
    return { type: "dcc-exit-encounter", ...common };
  }
  return null;
}

function keyAction(event, runtime) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  const current = normalizeRuntime(runtime);
  const lowerKey = String(event.key || "").toLowerCase();
  const common = { at: Date.now() };

  if (!current.run) {
    if (event.key === "Enter") {
      return { type: "dcc-enter-floor", ...common };
    }
    return null;
  }

  if (lowerKey === "i") {
    return { type: "dcc-toggle-inventory", ...common };
  }
  if (lowerKey === "r") {
    return { type: "dcc-rest", ...common };
  }
  if (lowerKey === "e") {
    return { type: "dcc-descend", ...common };
  }
  if (event.key === "Escape" && current.inventoryOpen) {
    return { type: "dcc-toggle-inventory", ...common };
  }
  if (event.key === "Escape" && current.abilityTomeOpen) {
    return { type: "dcc-close-ability-tome", ...common };
  }
  if (event.key === "Escape" && current.run.event) {
    return { type: "dcc-exit-encounter", ...common };
  }
  if (Object.prototype.hasOwnProperty.call(DIRECTION_BY_KEY, lowerKey)) {
    return {
      type: "dcc-move",
      direction: DIRECTION_BY_KEY[lowerKey],
      ...common,
    };
  }

  if (current.run.combat && /^Digit[1-9]$/.test(event.code || "")) {
    const index = Math.max(0, Number((event.code || "").replace("Digit", "")) - 1);
    return {
      type: "dcc-combat-use",
      abilityIndex: index,
      ...common,
    };
  }

  return null;
}

function synchronizeDccRuntime(runtime, context = {}) {
  const current = normalizeRuntime(runtime);
  const selectedLootItemId = String(context.selectedLootItemId || "");
  const synced = {
    ...current,
    selectedLootItemId,
  };
  if (!synced.run) {
    return synced;
  }

  const next = {
    ...synced,
    run: cloneRun(synced.run),
  };
  if (!roomStateFromRun(next.run)) {
    enterRoom(next.run, next.run.currentRoomId);
  }

  const now = Number(context.now) || Date.now();
  if (next.inventoryOpen || next.abilityTomeOpen || next.run.event) {
    if (next.run.combat) {
      next.run.nextEnemyActAt = now + ENEMY_ACTION_INTERVAL_MS;
    }
    return next;
  }

  const pressureMessage = runEnemyTimeline(next, now, false);
  if (pressureMessage) {
    next.lastMessage = pressureMessage;
  }
  return next;
}

export const DCC01_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: createInitialRuntime,
  render: renderDcc01,
  reduceRuntime(runtime, action, context) {
    return reduceDccRuntime(runtime, action, context || {});
  },
  validateRuntime(runtime) {
    const normalized = normalizeRuntime(runtime);
    return Boolean(normalized.solved);
  },
  buildActionFromElement(element) {
    return actionFromElement(element);
  },
  buildKeyAction(event, runtime) {
    return keyAction(event, runtime);
  },
  synchronizeRuntime(runtime, context = {}) {
    return synchronizeDccRuntime(runtime, context);
  },
};
