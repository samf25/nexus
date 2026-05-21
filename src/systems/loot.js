import { normalizeArcaneSystemState } from "./arcaneAscension.js";
import { prestigeModifiersFromState } from "./prestige.js";

const LOOT_REGIONS = Object.freeze(["crd", "worm", "dcc", "aa"]);

const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

const RARITY_CONFIG = Object.freeze({
  common: Object.freeze({ label: "Common", weight: 55, biasStep: -6, scalar: 1 }),
  uncommon: Object.freeze({ label: "Uncommon", weight: 27, biasStep: -2, scalar: 1.2 }),
  rare: Object.freeze({ label: "Rare", weight: 12, biasStep: 3, scalar: 1.45 }),
  epic: Object.freeze({ label: "Epic", weight: 5, biasStep: 7, scalar: 1.8 }),
  legendary: Object.freeze({ label: "Legendary", weight: 1, biasStep: 11, scalar: 2.25 }),
});

const SLOT_CAPS = Object.freeze({
  crdSoulCrystalSlots: 6,
  wormShardSlotsPerCape: 3,
  wormSickbaySlots: 4,
  wormHiringRarityBonus: 3,
});

const LOOT_TABLES = Object.freeze({
  crd: Object.freeze([
    Object.freeze({
      templateId: "crd_madra_surge",
      label: "Cycling Surge Draft",
      kind: "consumable_boost",
      stackable: true,
      weight: 4.4,
      effects: Object.freeze([
        Object.freeze({ key: "madra_gain_mult", type: "mult", base: 1.5, perTier: 0.35 }),
      ]),
      durationMinutes: 60,
    }),
    Object.freeze({
      templateId: "crd_focus_draft",
      label: "Refiner's Focus Draft",
      kind: "consumable_boost",
      stackable: true,
      weight: 3.9,
      effects: Object.freeze([
        Object.freeze({ key: "cycling_cost_divider", type: "mult", base: 1.3, perTier: 0.2 }),
      ]),
      durationMinutes: 15,
    }),
    Object.freeze({
      templateId: "crd_soul_crystal",
      label: "Soul Crystal",
      kind: "soul_crystal",
      stackable: false,
      weight: 1,
      effects: Object.freeze([
        Object.freeze({ key: "madra_gain_mult", type: "mult", base: 1.2, perTier: 0.15 }),
        Object.freeze({ key: "cycling_cost_divider", type: "mult", base: 1.08, perTier: 0.08 }),
        Object.freeze({ key: "crd_attack_mult", type: "mult", base: 1.05, perTier: 0.07 }),
      ]),
    }),
    Object.freeze({
      templateId: "crd_soul_slot_token",
      label: "Deep Well Socket",
      kind: "slot_expansion",
      stackable: true,
      weight: 0.55,
      effects: Object.freeze([
        Object.freeze({ key: "crd_soul_slot_plus", type: "flat", base: 1, perTier: 0 }),
      ]),
    }),
    Object.freeze({
      templateId: "crd_combat_relic",
      label: "Combat Relic",
      kind: "combat_item",
      stackable: false,
      weight: 0.9,
      effects: Object.freeze([
        Object.freeze({ key: "crd_attack_mult", type: "mult", base: 1.08, perTier: 0.09 }),
      ]),
    }),
  ]),
  worm: Object.freeze([
    Object.freeze({
      templateId: "worm_shard_enhancement",
      label: "Shard Enhancement",
      kind: "worm_enhancement",
      stackable: false,
      weight: 4.5,
      effects: Object.freeze([
        Object.freeze({ key: "attack", type: "flat", base: 1, perTier: 1 }),
        Object.freeze({ key: "defense", type: "flat", base: 1, perTier: 1 }),
        Object.freeze({ key: "info", type: "flat", base: 1, perTier: 1 }),
      ]),
    }),
    Object.freeze({
      templateId: "worm_shard_slot_token",
      label: "Shard Lattice Socket",
      kind: "slot_expansion",
      stackable: true,
      weight: 0.75,
      effects: Object.freeze([
        Object.freeze({ key: "worm_shard_slot_plus", type: "flat", base: 1, perTier: 0 }),
      ]),
    }),
    Object.freeze({
      templateId: "worm_sickbay_slot_token",
      label: "Sickbay Expansion Permit",
      kind: "slot_expansion",
      stackable: true,
      weight: 0.7,
      effects: Object.freeze([
        Object.freeze({ key: "worm_sickbay_slot_plus", type: "flat", base: 1, perTier: 0 }),
      ]),
    }),
    Object.freeze({
      templateId: "worm_hiring_window_token",
      label: "Basic Window Favor",
      kind: "consumable_boost",
      stackable: true,
      weight: 3.8,
      effects: Object.freeze([
        Object.freeze({ key: "worm_basic_window_weight_mult", type: "mult", base: 1.75, perTier: 0.2 }),
      ]),
      durationMinutes: 15,
    }),
  ]),
  dcc: Object.freeze([
    Object.freeze({
      templateId: "dcc_armor",
      label: "Crawler Armor",
      kind: "dcc_armor",
      stackable: false,
      weight: 1,
      effects: Object.freeze([
        Object.freeze({ key: "dcc_run_hp_bonus", type: "flat", base: 8, perTier: 6 }),
      ]),
    }),
  ]),
  aa: Object.freeze([
    Object.freeze({
      templateId: "aa_mana_capacitor",
      label: "Aether Capacitor",
      kind: "aa_focus_matrix",
      stackable: false,
      weight: 3.6,
      effects: Object.freeze([
        Object.freeze({ key: "aa_mana_max_flat", type: "flat", base: 10, perTier: 8 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_precision_lens",
      label: "Precision Lens",
      kind: "aa_focus",
      stackable: false,
      weight: 3.2,
      effects: Object.freeze([
        Object.freeze({ key: "aa_accuracy_flat", type: "flat", base: 2, perTier: 1 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_regen_coil",
      label: "Regeneration Coil",
      kind: "aa_focus_matrix",
      stackable: false,
      weight: 3.2,
      effects: Object.freeze([
        Object.freeze({ key: "aa_mana_regen_pct", type: "flat", base: 0.06, perTier: 0.03 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_workshop_slot_token",
      label: "Auxiliary Workshop Armature",
      kind: "aa_upgrade",
      stackable: true,
      weight: 0.6,
      effects: Object.freeze([
        Object.freeze({ key: "aa_extra_workshop_slot", type: "flat", base: 1, perTier: 0 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_market_seal",
      label: "Court Market Seal",
      kind: "aa_focus_matrix",
      stackable: false,
      weight: 2.6,
      effects: Object.freeze([
        Object.freeze({ key: "aa_sell_bonus_pct", type: "flat", base: 0.04, perTier: 0.02 }),
        Object.freeze({ key: "aa_buy_discount_pct", type: "flat", base: 0.02, perTier: 0.01 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_attunement_lattice",
      label: "Attunement Lattice",
      kind: "aa_focus_matrix",
      stackable: false,
      weight: 0.72,
      effects: Object.freeze([
        Object.freeze({ key: "aa_mana_growth_pct", type: "flat", base: 0.06, perTier: 0.04 }),
        Object.freeze({ key: "aa_rarity_bias_flat", type: "flat", base: 0.04, perTier: 0.025 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_focus_charm",
      label: "Glyphwork Focus Charm",
      kind: "aa_focus",
      stackable: false,
      weight: 0.95,
      effects: Object.freeze([
        Object.freeze({ key: "aa_accuracy_flat", type: "flat", base: 2, perTier: 2 }),
      ]),
    }),
    Object.freeze({
      templateId: "aa_junk_fragment",
      label: "Junk Enchantment Fragment",
      kind: "aa_junk",
      stackable: true,
      weight: 1.35,
      effects: Object.freeze([]),
    }),
  ]),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeText(value) {
  return String(value || "").trim();
}

function titleCaseFromSnake(value) {
  return safeText(value)
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function dccAbilityDisplayName(abilityId) {
  const key = safeText(abilityId).toLowerCase();
  const known = {
    basic: "Basic Attack",
    pocket_sand: "Pocket Sand",
    door_kick: "Door Kicking",
    footwork: "Unreasonable Footwork",
    threat_call: "Threat Management",
    sponsor_blast: "Sponsor Blast",
    improvised_bomb: "Improvised Bombardment",
    heel_hook: "Heel Hook Hell",
    second_wind: "Second Wind",
    sponsor_sweep: "Sponsor Sweep",
    killbox_geometry: "Killbox Geometry",
    crowdbreaker: "Crowdbreaker",
  };
  return known[key] || titleCaseFromSnake(key);
}

function signedNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "+0.00";
  }
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(digits)}`;
}

function effectSummaryLabelAndValue(effect) {
  const key = safeText(effect && effect.key);
  const value = safeFinite(effect && effect.value, 0);
  if (!key) {
    return null;
  }
  const percent = `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

  const known = {
    madra_gain_mult: { label: "Madra gain", value: `x${Number(value).toFixed(2)}` },
    cycling_cost_divider: { label: "Cycling cost", value: `/${Number(value).toFixed(2)}` },
    crd_attack_mult: { label: "Cradle attack", value: `x${Number(value).toFixed(2)}` },
    crd_soul_slot_plus: { label: "Soul slots", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    worm_shard_slot_plus: { label: "Shard slots", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    worm_sickbay_slot_plus: { label: "Sickbay slots", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    worm_hiring_rarity_plus: { label: "Hiring quality", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    worm_basic_window_weight_mult: { label: "Basic window favor", value: `x${Number(value).toFixed(2)}` },
    dcc_run_hp_bonus: { label: "Max HP", value: signedNumber(value, 0) },
    dcc_run_attack_bonus: { label: "Attack", value: signedNumber(value, 2) },
    dcc_run_stamina_bonus: { label: "Stamina", value: signedNumber(value, 2) },
    dcc_ability_slot_plus: { label: "Ability slots", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    dcc_run_lifespan_plus: { label: "Run lifespan", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    dcc_ability_unlock: { label: "Ability unlock", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    aa_mana_max_flat: { label: "Mana", value: signedNumber(value, 0) },
    aa_accuracy_flat: { label: "Rune accuracy", value: signedNumber(value, 2) },
    aa_mana_regen_pct: { label: "Mana regen", value: percent },
    aa_mana_growth_pct: { label: "Mana growth", value: percent },
    aa_extra_workshop_slot: { label: "Workshop slots", value: `${Math.round(value) >= 0 ? "+" : ""}${Math.round(value)}` },
    aa_sell_bonus_pct: { label: "Sell value", value: percent },
    aa_buy_discount_pct: { label: "Shop discount", value: percent },
    aa_rarity_bias_flat: { label: "Craft rarity", value: percent },
    attack: { label: "Attack", value: signedNumber(value, 2) },
    defense: { label: "Defense", value: signedNumber(value, 2) },
    endurance: { label: "Endurance", value: signedNumber(value, 2) },
    info: { label: "Info", value: signedNumber(value, 2) },
    manipulation: { label: "Manipulation", value: signedNumber(value, 2) },
    range: { label: "Range", value: signedNumber(value, 2) },
    speed: { label: "Speed", value: signedNumber(value, 2) },
    stealth: { label: "Stealth", value: signedNumber(value, 2) },
  };
  if (known[key]) {
    if (key === "dcc_ability_unlock" && safeText(effect && effect.abilityId)) {
      return {
        label: "Ability unlock",
        value: dccAbilityDisplayName(effect && effect.abilityId),
      };
    }
    return known[key];
  }
  if (key === "dcc_ability_refine") {
    const abilityLabel = dccAbilityDisplayName(effect && effect.abilityId);
    const statKey = safeText(effect && effect.stat).toLowerCase();
    const statLabel = {
      damage: "damage",
      stamina: "stamina",
      block: "block",
      range: "range",
    }[statKey] || titleCaseFromSnake(statKey).toLowerCase();
    return {
      label: `${abilityLabel} ${statLabel}`,
      value: signedNumber(value, 0),
    };
  }
  if (key === "aa_craft_mark") {
    return null;
  }
  return {
    label: titleCaseFromSnake(key),
    value: signedNumber(value, 2),
  };
}

export function formatLootItemEffectSummary(item, options = {}) {
  const source = item && typeof item === "object" ? item : {};
  const effects = Array.isArray(source.effects) ? source.effects : [];
  const maxEffects = Math.max(1, Math.floor(safeFinite(options.maxEffects, 3)));
  const entries = effects
    .map((effect) => effectSummaryLabelAndValue(effect))
    .filter(Boolean)
    .slice(0, maxEffects);
  if (!entries.length) {
    return "No listed effects";
  }
  return entries
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join(" | ");
}

export function isDirectUseLootItem(item) {
  const source = item && typeof item === "object" ? item : {};
  const kind = safeText(source.kind).toLowerCase();
  const durationMs = Math.max(0, Math.floor(safeFinite(source.durationMs, 0)));
  if (kind === "consumable_boost" && durationMs > 0) {
    return true;
  }
  if (safeText(source.templateId) === "worm_shard_slot_token") {
    return false;
  }
  if (kind === "aa_upgrade") {
    return safeText(source.templateId) === "aa_workshop_slot_token";
  }
  return kind === "slot_expansion";
}

export function isManualSocketLootItem(item, region = "") {
  const source = item && typeof item === "object" ? item : {};
  const regionKey = normalizeRegion(region || source.region);
  if (regionKey === "crd") {
    return source.kind === "soul_crystal" || source.kind === "combat_item";
  }
  if (regionKey === "worm") {
    return source.kind === "worm_enhancement" || safeText(source.templateId) === "worm_shard_slot_token";
  }
  if (regionKey === "dcc") {
    return source.kind === "dcc_armor";
  }
  if (regionKey === "aa") {
    return source.kind === "aa_focus"
      || source.kind === "aa_focus_matrix"
      || (source.kind === "aa_upgrade" && safeText(source.templateId) !== "aa_workshop_slot_token");
  }
  return false;
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

function randomPick(rng, values) {
  const list = Array.isArray(values) ? values : [];
  if (!list.length) {
    return null;
  }
  const index = Math.floor(rng() * list.length);
  return list[Math.max(0, Math.min(list.length - 1, index))];
}

function weightedPick(rng, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const total = list.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (!total) {
    return list[0] || null;
  }
  let roll = rng() * total;
  for (const entry of list) {
    roll -= Math.max(0, Number(entry.weight) || 0);
    if (roll <= 0) {
      return entry;
    }
  }
  return list[list.length - 1] || null;
}

function rarityIndex(rarity) {
  const index = RARITY_ORDER.indexOf(safeText(rarity).toLowerCase());
  return index >= 0 ? index : 0;
}

function scaledEffect(effect, rarity) {
  const tier = rarityIndex(rarity);
  const base = safeFinite(effect && effect.base, 0);
  const perTier = safeFinite(effect && effect.perTier, 0);
  if (safeText(effect && effect.type).toLowerCase() === "mult") {
    return Number((base + (perTier * tier)).toFixed(4));
  }
  return Math.round(base + (perTier * tier));
}

function wormShardDescriptor(statKey) {
  const key = safeText(statKey).toLowerCase();
  const table = {
    attack: "Ravager",
    defense: "Bulwark",
    endurance: "Titan",
    info: "Oracle",
    manipulation: "Puppeteer",
    range: "Longshot",
    speed: "Rapidstep",
    stealth: "Shadowveil",
  };
  return table[key] || "Runed";
}

const DCC_ENCHANT_CHANCE_BY_RARITY = Object.freeze({
  common: 0.08,
  uncommon: 0.16,
  rare: 0.28,
  epic: 0.45,
  legendary: 0.65,
});

const DCC_ENCHANT_TEMPLATES = Object.freeze([
  Object.freeze({
    id: "reinforced",
    label: "Reinforced",
    weight: 1.7,
    effectKey: "dcc_run_hp_bonus",
    valueForRarity: (rarity) => 4 + rarityIndex(rarity) * 4,
  }),
  Object.freeze({
    id: "razored",
    label: "Razored",
    weight: 1.35,
    effectKey: "dcc_run_attack_bonus",
    valueForRarity: (rarity) => 1 + rarityIndex(rarity),
  }),
  Object.freeze({
    id: "springloaded",
    label: "Springloaded",
    weight: 1.25,
    effectKey: "dcc_run_stamina_bonus",
    valueForRarity: (rarity) => 1 + Math.floor((rarityIndex(rarity) + 1) / 2),
  }),
  Object.freeze({
    id: "deep_pockets",
    label: "Deep Pockets",
    minRarity: "rare",
    weight: 0.75,
    effectKey: "dcc_ability_slot_plus",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "reinforced_straps",
    label: "Reinforced Straps",
    minRarity: "uncommon",
    weight: 1,
    effectKey: "dcc_run_lifespan_plus",
    valueForRarity: (rarity) => (rarity === "legendary" ? 2 : 1),
  }),
  Object.freeze({
    id: "manual_pocket_sand",
    label: "Pocket Sand Lining",
    minRarity: "uncommon",
    weight: 0.85,
    effectKey: "dcc_ability_unlock",
    abilityId: "pocket_sand",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_door_kick",
    label: "Door-Kicker Greaves",
    minRarity: "rare",
    weight: 0.75,
    effectKey: "dcc_ability_unlock",
    abilityId: "door_kick",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_footwork",
    label: "Footwork Threading",
    minRarity: "rare",
    weight: 0.7,
    effectKey: "dcc_ability_unlock",
    abilityId: "footwork",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_threat",
    label: "Threat-Call Stitching",
    minRarity: "uncommon",
    weight: 0.85,
    effectKey: "dcc_ability_unlock",
    abilityId: "threat_call",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_bombardment",
    label: "Bombardier Harness",
    minRarity: "rare",
    weight: 0.48,
    effectKey: "dcc_ability_unlock",
    abilityId: "improvised_bomb",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_heel_hook",
    label: "Takedown Weave",
    minRarity: "rare",
    weight: 0.48,
    effectKey: "dcc_ability_unlock",
    abilityId: "heel_hook",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "manual_second_wind",
    label: "Breathkeeper Mesh",
    minRarity: "epic",
    weight: 0.22,
    effectKey: "dcc_ability_unlock",
    abilityId: "second_wind",
    valueForRarity: () => 1,
  }),
  Object.freeze({
    id: "crusher_plates",
    label: "Crusher Plates",
    minRarity: "rare",
    weight: 0.5,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "basic", stat: "damage", value: 2 + rarityIndex(rarity) },
    ],
  }),
  Object.freeze({
    id: "quickdraw_mesh",
    label: "Quickdraw Mesh",
    minRarity: "epic",
    weight: 0.3,
    effectsForRarity: () => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "basic", stat: "stamina", value: -1 },
    ],
  }),
  Object.freeze({
    id: "sand_glove",
    label: "Sand Glove",
    minRarity: "epic",
    weight: 0.24,
    effectsForRarity: () => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "pocket_sand", stat: "range", value: 1 },
    ],
  }),
  Object.freeze({
    id: "sand_charge",
    label: "Sand Charge Coil",
    minRarity: "rare",
    weight: 0.35,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "pocket_sand", stat: "damage", value: 2 + Math.floor(rarityIndex(rarity) / 2) },
    ],
  }),
  Object.freeze({
    id: "threat_baffles",
    label: "Threat Baffles",
    minRarity: "rare",
    weight: 0.42,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "threat_call", stat: "block", value: 2 + Math.min(2, rarityIndex(rarity)) },
    ],
  }),
  Object.freeze({
    id: "footwork_balancers",
    label: "Footwork Balancers",
    minRarity: "rare",
    weight: 0.34,
    effectsForRarity: () => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "footwork", stat: "block", value: 2 },
      { key: "dcc_ability_refine", type: "flat", abilityId: "footwork", stat: "stamina", value: -1 },
    ],
  }),
  Object.freeze({
    id: "doorshock_rig",
    label: "Doorshock Rig",
    minRarity: "epic",
    weight: 0.28,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "door_kick", stat: "damage", value: 4 + Math.max(0, rarityIndex(rarity) - 3) },
    ],
  }),
  Object.freeze({
    id: "bomb_satchel",
    label: "Bomb Satchel",
    minRarity: "epic",
    weight: 0.22,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "improvised_bomb", stat: "damage", value: 3 + Math.max(0, rarityIndex(rarity) - 2) },
    ],
  }),
  Object.freeze({
    id: "hook_pivot",
    label: "Hook Pivot",
    minRarity: "epic",
    weight: 0.22,
    effectsForRarity: (rarity) => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "heel_hook", stat: "damage", value: 3 + Math.max(0, rarityIndex(rarity) - 2) },
    ],
  }),
  Object.freeze({
    id: "breathkeeper_frame",
    label: "Breathkeeper Frame",
    minRarity: "legendary",
    weight: 0.12,
    effectsForRarity: () => [
      { key: "dcc_ability_refine", type: "flat", abilityId: "second_wind", stat: "stamina", value: -1 },
      { key: "dcc_ability_refine", type: "flat", abilityId: "second_wind", stat: "block", value: 3 },
    ],
  }),
]);

function buildDccEnchantment(template, rarity) {
  const generatedEffects = typeof template.effectsForRarity === "function"
    ? template.effectsForRarity(rarity)
    : [{
        key: template.effectKey,
        type: "flat",
        abilityId: safeText(template.abilityId),
        value: Math.max(1, Math.floor(safeFinite(template.valueForRarity(rarity), 1))),
      }];
  const effects = Array.isArray(generatedEffects)
    ? generatedEffects.map((effect) => ({
        key: safeText(effect && effect.key),
        type: safeText(effect && effect.type) || "flat",
        abilityId: safeText(effect && effect.abilityId),
        stat: safeText(effect && effect.stat).toLowerCase(),
        value: safeFinite(effect && effect.value, 0),
      })).filter((effect) => effect.key)
    : [];
  return {
    id: template.id,
    label: template.label,
    abilityId: safeText(template.abilityId),
    effects,
  };
}

function rollDccArmorEnchantments(rng, rarity) {
  const enchantments = [];
  let chance = DCC_ENCHANT_CHANCE_BY_RARITY[rarity] || DCC_ENCHANT_CHANCE_BY_RARITY.common;
  const rarityTier = rarityIndex(rarity);
  while (enchantments.length < 4 && rng() < chance) {
    const usedIds = new Set(enchantments.map((entry) => entry.id));
    const pool = DCC_ENCHANT_TEMPLATES
      .filter((entry) => !usedIds.has(entry.id))
      .filter((entry) => rarityTier >= rarityIndex(entry.minRarity || "common"))
      .map((entry) => ({
        ...entry,
        weight: Math.max(0.05, safeFinite(entry.weight, 1)),
      }));
    const template = weightedPick(rng, pool);
    if (!template) {
      break;
    }
    enchantments.push(buildDccEnchantment(template, rarity));
    chance /= 3;
  }
  return enchantments;
}

function buildDccArmorDrop({ rng, template, rarity, targetRegion, normalizedSource, triggerType, isOutRegion, now }) {
  const rarityLabel = (RARITY_CONFIG[rarity] || RARITY_CONFIG.common).label;
  const baseEffects = (template.effects || []).map((effect) => ({
    key: effect.key,
    type: effect.type || "flat",
    value: scaledEffect(effect, rarity),
  }));
  const enchantments = rollDccArmorEnchantments(rng, rarity);
  const enchantmentEffects = enchantments.flatMap((entry) => entry.effects || []);
  const runLifespan = 1 + enchantmentEffects
    .filter((effect) => effect.key === "dcc_run_lifespan_plus")
    .reduce((sum, effect) => sum + Math.max(0, Math.floor(safeFinite(effect.value, 0))), 0);
  const enchantmentLabel = enchantments.length
    ? ` [${enchantments.map((entry) => entry.label).join(", ")}]`
    : "";
  return {
    templateId: template.templateId,
    label: `${template.label} (${rarityLabel})${enchantmentLabel}`,
    region: targetRegion,
    rarity,
    kind: template.kind,
    stackable: Boolean(template.stackable),
    effects: [...baseEffects, ...enchantmentEffects],
    enchantments,
    runLifespan,
    sourceRegion: normalizedSource,
    triggerType: safeText(triggerType),
    outOfRegion: isOutRegion,
    createdAt: Math.floor(safeFinite(now, Date.now())),
    durationMs: 0,
  };
}

function normalizeEffect(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    key: safeText(source.key),
    type: safeText(source.type) || "flat",
    abilityId: safeText(source.abilityId),
    stat: safeText(source.stat).toLowerCase(),
    value: safeFinite(source.value, 0),
  };
}

function normalizeDccEnchantment(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    id: safeText(source.id),
    label: safeText(source.label) || "Crawler Enchantment",
    abilityId: safeText(source.abilityId),
    effects: Array.isArray(source.effects) ? source.effects.map(normalizeEffect).filter((effect) => effect.key) : [],
  };
}

function normalizeItem(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const region = safeText(source.region).toLowerCase();
  const kind = safeText(source.kind);
  const enchantments = Array.isArray(source.enchantments)
    ? source.enchantments.map(normalizeDccEnchantment).filter((entry) => entry.id || entry.effects.length || entry.abilityId)
    : [];
  return {
    id: safeText(source.id),
    templateId: safeText(source.templateId),
    label: safeText(source.label) || "Loot",
    region: LOOT_REGIONS.includes(region) ? region : "crd",
    rarity: RARITY_ORDER.includes(safeText(source.rarity).toLowerCase()) ? safeText(source.rarity).toLowerCase() : "common",
    kind,
    stackable: Boolean(source.stackable),
    quantity: Math.max(1, Math.floor(safeFinite(source.quantity, 1))),
    effects: Array.isArray(source.effects) ? source.effects.map(normalizeEffect).filter((e) => e.key) : [],
    enchantments,
    runLifespan: kind === "dcc_armor" ? Math.max(1, Math.floor(safeFinite(source.runLifespan, 1))) : 0,
    sourceRegion: safeText(source.sourceRegion).toLowerCase(),
    triggerType: safeText(source.triggerType),
    outOfRegion: Boolean(source.outOfRegion),
    createdAt: Math.max(0, Math.floor(safeFinite(source.createdAt, Date.now()))),
    durationMs: Math.max(0, Math.floor(safeFinite(source.durationMs, 0))),
  };
}

function normalizeActiveEffect(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    id: safeText(source.id),
    sourceItemId: safeText(source.sourceItemId),
    sourceLabel: safeText(source.sourceLabel),
    sourceSummary: safeText(source.sourceSummary),
    region: safeText(source.region).toLowerCase(),
    key: safeText(source.key),
    type: safeText(source.type) || "flat",
    value: safeFinite(source.value, 0),
    expiresAt: Math.max(0, Math.floor(safeFinite(source.expiresAt, 0))),
  };
}

function normalizeCradleLoadout(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const incomingSlots = Array.isArray(source.soulCrystalSlots) ? source.soulCrystalSlots : [];
  const slots = Array.from({ length: SLOT_CAPS.crdSoulCrystalSlots }, (_, index) => safeText(incomingSlots[index]) || null);
  return {
    soulCrystalSlots: slots,
    combatItemId: safeText(source.combatItemId) || null,
  };
}

function normalizeWormLoadout(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const byCape = source.shardSlotsByCape && typeof source.shardSlotsByCape === "object" ? source.shardSlotsByCape : {};
  const normalized = {};
  for (const [cardId, slots] of Object.entries(byCape)) {
    const cleanCardId = safeText(cardId);
    if (!cleanCardId) {
      continue;
    }
    const list = Array.isArray(slots) ? slots : [];
    normalized[cleanCardId] = Array.from({ length: SLOT_CAPS.wormShardSlotsPerCape }, (_, index) => safeText(list[index]) || null);
  }
  return {
    shardSlotsByCape: normalized,
  };
}

function normalizeDccLoadout(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    persistentHint: safeText(source.persistentHint),
  };
}

function normalizeAaLoadout(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const incomingSlots = Array.isArray(source.workshopSlots) ? source.workshopSlots : [];
  const slots = Array.from({ length: 6 }, (_, index) => safeText(incomingSlots[index]) || null);
  return {
    workshopSlots: slots,
  };
}

function aaWorkshopCoreBonuses(items, equippedIds) {
  const itemMap = items && typeof items === "object" ? items : {};
  const ids = Array.isArray(equippedIds) ? equippedIds : [];
  let manaMaxFlat = 0;
  let extraWorkshopSlots = 0;
  for (const itemId of ids) {
    const item = itemMap[safeText(itemId)];
    if (!item) {
      continue;
    }
    const effects = Array.isArray(item.effects) ? item.effects : [];
    for (const effect of effects) {
      if (effect.key === "aa_mana_max_flat") {
        manaMaxFlat += Math.max(0, Math.floor(safeFinite(effect.value, 0)));
      }
      if (effect.key === "aa_extra_workshop_slot") {
        extraWorkshopSlots += Math.max(0, Math.floor(safeFinite(effect.value, 0)));
      }
    }
  }
  return {
    manaMaxFlat,
    extraWorkshopSlots,
  };
}

export function defaultLootInventoryState() {
  return {
    items: {},
    loadouts: {
      cradle: {
        soulCrystalSlots: Array.from({ length: SLOT_CAPS.crdSoulCrystalSlots }, () => null),
        combatItemId: null,
      },
      worm: {
        shardSlotsByCape: {},
      },
      dcc: {
        persistentHint: "run-limited",
      },
      aa: {
        workshopSlots: Array.from({ length: 6 }, () => null),
      },
    },
    progression: {
      crdSoulCrystalSlots: 3,
      wormShardSlotsPerCape: 1,
      wormShardSlotCountsByCape: {},
      wormSickbaySlots: 1,
      wormHiringRarityBonus: 0,
      twiReputation: 0,
      innTier: 0,
      twiUpgrades: {},
    },
    activeEffects: [],
    nextItemOrdinal: 1,
  };
}

function normalizeProgression(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const rawCapeCounts = source.wormShardSlotCountsByCape && typeof source.wormShardSlotCountsByCape === "object"
    ? source.wormShardSlotCountsByCape
    : {};
  const wormShardSlotCountsByCape = {};
  for (const [cardId, count] of Object.entries(rawCapeCounts)) {
    const cleanCardId = safeText(cardId);
    if (!cleanCardId) {
      continue;
    }
    wormShardSlotCountsByCape[cleanCardId] = clamp(
      Math.floor(safeFinite(count, 1)),
      1,
      SLOT_CAPS.wormShardSlotsPerCape,
    );
  }
  return {
    crdSoulCrystalSlots: clamp(Math.floor(safeFinite(source.crdSoulCrystalSlots, 3)), 3, SLOT_CAPS.crdSoulCrystalSlots),
    wormShardSlotsPerCape: clamp(Math.floor(safeFinite(source.wormShardSlotsPerCape, 1)), 1, SLOT_CAPS.wormShardSlotsPerCape),
    wormShardSlotCountsByCape,
    wormSickbaySlots: clamp(Math.floor(safeFinite(source.wormSickbaySlots, 1)), 1, SLOT_CAPS.wormSickbaySlots),
    wormHiringRarityBonus: clamp(Math.floor(safeFinite(source.wormHiringRarityBonus, 0)), 0, SLOT_CAPS.wormHiringRarityBonus),
    twiReputation: Math.max(0, Math.floor(safeFinite(source.twiReputation, 0))),
    innTier: Math.max(0, Math.floor(safeFinite(source.innTier, 0))),
    twiUpgrades: source.twiUpgrades && typeof source.twiUpgrades === "object" ? { ...source.twiUpgrades } : {},
  };
}

function wormShardSlotCountFromProgression(progression, cardId = "") {
  const source = progression && typeof progression === "object" ? progression : {};
  const cleanCardId = safeText(cardId);
  const byCape = source.wormShardSlotCountsByCape && typeof source.wormShardSlotCountsByCape === "object"
    ? source.wormShardSlotCountsByCape
    : {};
  if (cleanCardId && Object.prototype.hasOwnProperty.call(byCape, cleanCardId)) {
    return clamp(Math.floor(safeFinite(byCape[cleanCardId], 1)), 1, SLOT_CAPS.wormShardSlotsPerCape);
  }
  return 1;
}

export function normalizeLootInventoryState(candidate, now = Date.now()) {
  const base = defaultLootInventoryState();
  const source = candidate && typeof candidate === "object" ? candidate : {};

  const items = {};
  const incomingItems = source.items && typeof source.items === "object" ? source.items : {};
  for (const [itemId, itemValue] of Object.entries(incomingItems)) {
    const normalized = normalizeItem({ ...itemValue, id: itemId });
    if (!normalized.id) {
      continue;
    }
    items[normalized.id] = normalized;
  }

  const progression = normalizeProgression(source.progression);
  const cradle = normalizeCradleLoadout(source.loadouts && source.loadouts.cradle ? source.loadouts.cradle : {});
  const worm = normalizeWormLoadout(source.loadouts && source.loadouts.worm ? source.loadouts.worm : {});
  const dcc = normalizeDccLoadout(source.loadouts && source.loadouts.dcc ? source.loadouts.dcc : {});
  const aa = normalizeAaLoadout(source.loadouts && source.loadouts.aa ? source.loadouts.aa : {});

  const activeEffects = (Array.isArray(source.activeEffects) ? source.activeEffects : [])
    .map(normalizeActiveEffect)
    .filter((effect) => effect.id && effect.expiresAt > now);

  return {
    ...base,
    ...source,
    items,
    loadouts: {
      cradle,
      worm,
      dcc,
      aa,
    },
    progression,
    activeEffects,
    nextItemOrdinal: Math.max(1, Math.floor(safeFinite(source.nextItemOrdinal, 1))),
  };
}

function buildItemId(lootState, region) {
  const ordinal = Math.max(1, Math.floor(safeFinite(lootState.nextItemOrdinal, 1)));
  const prefix = safeText(region).toLowerCase() || "loot";
  return `${prefix}-${ordinal}`;
}

function normalizeRegion(regionId) {
  const key = safeText(regionId).toLowerCase();
  if (key === "cradle") {
    return "crd";
  }
  if (key === "dungeoncrawlercarl" || key === "dungeon crawler carl") {
    return "dcc";
  }
  if (key === "worm") {
    return "worm";
  }
  if (key === "aa" || key === "arcane" || key === "arcane ascension" || key === "arcane-ascension") {
    return "aa";
  }
  if (LOOT_REGIONS.includes(key)) {
    return key;
  }
  return key;
}

function buildRarityEntry(rarity, bias) {
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const adjusted = Math.max(1, config.weight + (config.biasStep * bias));
  return {
    rarity,
    weight: adjusted,
  };
}

function buildTemplateEntry(template) {
  const source = template && typeof template === "object" ? template : {};
  return {
    template: source,
    weight: Math.max(0.05, safeFinite(source.weight, 1)),
  };
}

export function rollRegionalLoot({
  sourceRegion,
  triggerType = "",
  rarityBias = 0,
  minRarity = "",
  outRegionChance = 0,
  dropChance = 1,
  forceOutRegion = false,
  now = Date.now(),
  seed = 0,
} = {}) {
  const normalizedSource = normalizeRegion(sourceRegion);
  const triggerKey = safeText(triggerType).toLowerCase();
  const includeAaRegion = normalizedSource === "aa" || triggerKey.startsWith("aa03");
  const regionUniverse = includeAaRegion ? LOOT_REGIONS : LOOT_REGIONS.filter((regionId) => regionId !== "aa");
  const numericBias = safeFinite(rarityBias, 0);
  const rng = createRng((hashText(`${normalizedSource}:${triggerType}:${now}`) + (Number(seed) || 0)) >>> 0);

  if (rng() > clamp(dropChance, 0, 1)) {
    return null;
  }

  const isOutRegion = forceOutRegion || (rng() < clamp(outRegionChance, 0, 1));
  const sourceInPool = regionUniverse.includes(normalizedSource);
  const regionPool = isOutRegion
    ? regionUniverse.filter((regionId) => !sourceInPool || regionId !== normalizedSource)
    : [sourceInPool ? normalizedSource : "crd"];
  const targetRegion = randomPick(rng, regionPool) || (sourceInPool ? normalizedSource : "crd");

  const rarityEntry = weightedPick(
    rng,
    RARITY_ORDER
      .filter((rarity) => rarityIndex(rarity) >= rarityIndex(minRarity || "common"))
      .map((rarity) => buildRarityEntry(rarity, numericBias)),
  );
  const rarity = rarityEntry ? rarityEntry.rarity : "common";
  const table = LOOT_TABLES[targetRegion] || [];
  const templateEntry = weightedPick(rng, table.map((entry) => buildTemplateEntry(entry)));
  const template = templateEntry ? templateEntry.template : null;
  if (!template) {
    return null;
  }

  const scalar = (RARITY_CONFIG[rarity] || RARITY_CONFIG.common).scalar;
  let effects = (template.effects || []).map((effect) => ({
    key: effect.key,
    type: effect.type || "flat",
    value: scaledEffect(effect, rarity),
  }));
  if (template.templateId === "worm_shard_enhancement") {
    const statKeys = ["attack", "defense", "endurance", "info", "manipulation", "range", "speed", "stealth"];
    const key = randomPick(rng, statKeys) || "attack";
    const valueByRarity = {
      common: 1,
      uncommon: 1,
      rare: 2,
      epic: 2,
      legendary: 3,
    };
    effects = [{
      key,
      type: "flat",
      value: valueByRarity[rarity] || 1,
    }];
    const descriptor = wormShardDescriptor(key);
    return {
      templateId: template.templateId,
      label: `${descriptor} Shard Enhancement (${(RARITY_CONFIG[rarity] || RARITY_CONFIG.common).label})`,
      region: targetRegion,
      rarity,
      kind: template.kind,
      stackable: Boolean(template.stackable),
      effects,
      sourceRegion: normalizedSource,
      triggerType: safeText(triggerType),
      outOfRegion: isOutRegion,
      createdAt: Math.floor(safeFinite(now, Date.now())),
      durationMs: template.durationMinutes ? Math.round(template.durationMinutes * 60000 * scalar) : 0,
    };
  }

  if (template.templateId === "dcc_armor") {
    return buildDccArmorDrop({
      rng,
      template,
      rarity,
      targetRegion,
      normalizedSource,
      triggerType,
      isOutRegion,
      now,
    });
  }

  return {
    templateId: template.templateId,
    label: `${template.label} (${(RARITY_CONFIG[rarity] || RARITY_CONFIG.common).label})`,
    region: targetRegion,
    rarity,
    kind: template.kind,
    stackable: Boolean(template.stackable),
    effects,
    sourceRegion: normalizedSource,
    triggerType: safeText(triggerType),
    outOfRegion: isOutRegion,
    createdAt: Math.floor(safeFinite(now, Date.now())),
    durationMs: template.durationMinutes ? Math.round(template.durationMinutes * 60000 * scalar) : 0,
  };
}

function assignStackItemId(items, lootDrop) {
  const buildStackSignature = (entry) => JSON.stringify({
    templateId: safeText(entry && entry.templateId),
    region: safeText(entry && entry.region).toLowerCase(),
    rarity: safeText(entry && entry.rarity).toLowerCase(),
    kind: safeText(entry && entry.kind),
    durationMs: Math.max(0, Math.floor(safeFinite(entry && entry.durationMs, 0))),
    runLifespan: Math.max(0, Math.floor(safeFinite(entry && entry.runLifespan, 0))),
    effects: (Array.isArray(entry && entry.effects) ? entry.effects : [])
      .map(normalizeEffect)
      .filter((effect) => effect.key)
      .sort((left, right) => `${left.key}:${left.type}:${left.abilityId}:${left.stat}:${left.value}`.localeCompare(`${right.key}:${right.type}:${right.abilityId}:${right.stat}:${right.value}`)),
    enchantments: (Array.isArray(entry && entry.enchantments) ? entry.enchantments : [])
      .map(normalizeDccEnchantment)
      .filter((effect) => effect.id || effect.effects.length || effect.abilityId)
      .sort((left, right) => `${left.id}:${left.label}:${left.abilityId}`.localeCompare(`${right.id}:${right.label}:${right.abilityId}`)),
  });
  const targetSignature = buildStackSignature(lootDrop);
  for (const [itemId, item] of Object.entries(items)) {
    if (!item.stackable) {
      continue;
    }
    if (buildStackSignature(item) !== targetSignature) {
      continue;
    }
    return itemId;
  }
  return "";
}

export function applyLootDrop(state, lootDrop) {
  if (!lootDrop || typeof lootDrop !== "object") {
    return state;
  }

  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  const normalizedLoot = normalizeLootInventoryState(inventoryRoot.loot, Date.now());
  const items = { ...normalizedLoot.items };
  const normalizedDrop = normalizeItem(lootDrop);

  let itemId = "";
  if (normalizedDrop.stackable) {
    itemId = assignStackItemId(items, normalizedDrop);
  }

  if (itemId) {
    items[itemId] = {
      ...items[itemId],
      quantity: Math.max(1, Math.floor(safeFinite(items[itemId].quantity, 1))) + 1,
      createdAt: normalizedDrop.createdAt,
    };
  } else {
    const newId = buildItemId(normalizedLoot, normalizedDrop.region);
    items[newId] = {
      ...normalizedDrop,
      id: newId,
      quantity: Math.max(1, Math.floor(safeFinite(normalizedDrop.quantity, 1))),
    };
    normalizedLoot.nextItemOrdinal += 1;
    itemId = newId;
  }

  const nextLoot = {
    ...normalizedLoot,
    items,
  };

  return {
    ...sourceState,
    inventory: {
      ...inventoryRoot,
      loot: nextLoot,
    },
    lastLootDrop: {
      itemId,
      region: normalizedDrop.region,
      label: normalizedDrop.label,
      outOfRegion: normalizedDrop.outOfRegion,
    },
  };
}

function decrementOrRemoveItem(items, itemId) {
  const item = items[itemId];
  if (!item) {
    return items;
  }
  if (item.quantity > 1) {
    return {
      ...items,
      [itemId]: {
        ...item,
        quantity: item.quantity - 1,
      },
    };
  }
  const next = { ...items };
  delete next[itemId];
  return next;
}

function withLootState(state, lootState) {
  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  return {
    ...sourceState,
    inventory: {
      ...inventoryRoot,
      loot: lootState,
    },
  };
}

function effectListFromItem(item) {
  return Array.isArray(item && item.effects) ? item.effects.map(normalizeEffect).filter((effect) => effect.key) : [];
}

export function consumeLootItem(state, itemInstanceId, now = Date.now()) {
  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  const lootState = normalizeLootInventoryState(inventoryRoot.loot, now);
  const itemId = safeText(itemInstanceId);
  const item = lootState.items[itemId];
  if (!item) {
    return {
      nextState: sourceState,
      changed: false,
      message: "Loot item not found.",
    };
  }

  const nextLoot = {
    ...lootState,
    items: { ...lootState.items },
    progression: { ...lootState.progression },
    activeEffects: Array.isArray(lootState.activeEffects) ? lootState.activeEffects.slice() : [],
  };

  let message = "Item used.";
  if (item.kind === "consumable_boost") {
    const effects = effectListFromItem(item);
    const activated = effects.map((effect, index) => ({
      id: `${itemId}-fx-${now}-${index}`,
      sourceItemId: itemId,
      sourceLabel: item.label,
      sourceSummary: formatLootItemEffectSummary(item, { maxEffects: 6 }),
      region: item.region,
      key: effect.key,
      type: effect.type,
      value: effect.value,
      expiresAt: now + Math.max(1000, Math.floor(safeFinite(item.durationMs, 0))),
    }));
    nextLoot.activeEffects = [...nextLoot.activeEffects, ...activated];
    nextLoot.items = decrementOrRemoveItem(nextLoot.items, itemId);
    message = `${item.label} activated.`;
  } else if (item.templateId === "worm_shard_slot_token") {
    return {
      nextState: sourceState,
      changed: false,
      message: "Shard Lattice Sockets must be applied to a specific cape in The Undersiders' Loft.",
    };
  } else if (item.templateId === "worm_hiring_window_token") {
    const activated = [{
      id: `${itemId}-fx-${now}-0`,
      sourceItemId: itemId,
      sourceLabel: item.label,
      sourceSummary: formatLootItemEffectSummary(item, { maxEffects: 6 }),
      region: item.region,
      key: "worm_basic_window_weight_mult",
      type: "mult",
      value: Math.max(1, Number(effectListFromItem(item)[0]?.value || 1.75)),
      expiresAt: now + Math.max(1000, Math.floor(safeFinite(item.durationMs, 0))),
    }];
    nextLoot.activeEffects = [...nextLoot.activeEffects, ...activated];
    nextLoot.items = decrementOrRemoveItem(nextLoot.items, itemId);
    message = "Basic Window favor invoked.";
  } else if (item.kind === "slot_expansion") {
    const effects = effectListFromItem(item);
    let handled = false;
    for (const effect of effects) {
      if (effect.key === "crd_soul_slot_plus") {
        nextLoot.progression.crdSoulCrystalSlots = clamp(
          nextLoot.progression.crdSoulCrystalSlots + Math.max(1, Math.floor(effect.value || 0)),
          3,
          SLOT_CAPS.crdSoulCrystalSlots,
        );
        message = "Cradle soul crystal slot capacity increased.";
        handled = true;
      }
      if (effect.key === "worm_sickbay_slot_plus") {
        nextLoot.progression.wormSickbaySlots = clamp(
          nextLoot.progression.wormSickbaySlots + Math.max(1, Math.floor(effect.value || 0)),
          1,
          SLOT_CAPS.wormSickbaySlots,
        );
        message = "Worm sickbay capacity increased.";
        handled = true;
      }
      if (effect.key === "worm_hiring_rarity_plus") {
        nextLoot.progression.wormHiringRarityBonus = clamp(
          nextLoot.progression.wormHiringRarityBonus + Math.max(1, Math.floor(effect.value || 0)),
          0,
          SLOT_CAPS.wormHiringRarityBonus,
        );
        message = "Worm hiring window quality increased.";
        handled = true;
      }
    }
    if (!handled) {
      return {
        nextState: sourceState,
        changed: false,
        message: "This slot expansion must be applied in its matching region.",
      };
    }
    nextLoot.items = decrementOrRemoveItem(nextLoot.items, itemId);
  } else if (item.kind === "aa_upgrade") {
    const arcane = normalizeArcaneSystemState(sourceState && sourceState.systems ? sourceState.systems.arcane : {}, now);
    const effects = effectListFromItem(item);
    let workshopSlots = 0;
    for (const effect of effects) {
      if (effect.key === "aa_extra_workshop_slot") {
        workshopSlots += Math.max(0, Math.floor(effect.value || 0));
      }
    }
    if (!workshopSlots) {
      return {
        nextState: sourceState,
        changed: false,
        message: "This Arcane Ascension loot belongs in workshop slots, not as a direct upgrade.",
      };
    }
    const nextArcane = normalizeArcaneSystemState({
      ...arcane,
      workshop: {
        ...arcane.workshop,
        equipSlotCount: clamp(arcane.workshop.equipSlotCount + workshopSlots, 2, 6),
      },
      bonuses: {
        ...arcane.bonuses,
        accuracyFlat: arcane.bonuses.accuracyFlat,
        manaRegenPct: arcane.bonuses.manaRegenPct,
        sellBonusPct: arcane.bonuses.sellBonusPct,
        buyDiscountPct: arcane.bonuses.buyDiscountPct,
      },
    }, now);
    nextLoot.items = decrementOrRemoveItem(nextLoot.items, itemId);
    return {
      nextState: {
        ...withLootState(sourceState, nextLoot),
        systems: {
          ...(sourceState.systems || {}),
          arcane: nextArcane,
        },
      },
      changed: true,
      message: "Arcane workshop upgrade applied.",
    };
  } else {
    return {
      nextState: sourceState,
      changed: false,
      message: "This loot item must be equipped, not consumed.",
    };
  }

  return {
    nextState: withLootState(sourceState, nextLoot),
    changed: true,
    message,
  };
}

function clearItemFromAllSlots(loadouts, itemId) {
  const cleaned = {
    cradle: {
      ...loadouts.cradle,
      soulCrystalSlots: (loadouts.cradle.soulCrystalSlots || []).map((slotItemId) => (slotItemId === itemId ? null : slotItemId)),
      combatItemId: loadouts.cradle.combatItemId === itemId ? null : loadouts.cradle.combatItemId,
    },
    worm: {
      ...loadouts.worm,
      shardSlotsByCape: {},
    },
    dcc: {
      ...loadouts.dcc,
    },
    aa: {
      ...loadouts.aa,
      workshopSlots: (loadouts.aa && loadouts.aa.workshopSlots ? loadouts.aa.workshopSlots : []).map((slotItemId) => (slotItemId === itemId ? null : slotItemId)),
    },
  };

  const byCape = loadouts.worm && loadouts.worm.shardSlotsByCape && typeof loadouts.worm.shardSlotsByCape === "object"
    ? loadouts.worm.shardSlotsByCape
    : {};
  for (const [cardId, slots] of Object.entries(byCape)) {
    cleaned.worm.shardSlotsByCape[cardId] = (Array.isArray(slots) ? slots : []).map((slotItemId) => (slotItemId === itemId ? null : slotItemId));
  }
  return cleaned;
}

export function equipLootItem(state, { region, targetId = "", slotId, itemInstanceId } = {}) {
  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  const lootState = normalizeLootInventoryState(inventoryRoot.loot, Date.now());
  const itemId = safeText(itemInstanceId);
  const item = lootState.items[itemId];
  if (!item) {
    return {
      nextState: sourceState,
      changed: false,
      message: "Loot item not found.",
    };
  }

  const regionKey = normalizeRegion(region || item.region);
  const nextLoadouts = clearItemFromAllSlots(lootState.loadouts, itemId);

  if (regionKey === "crd") {
    if (item.kind !== "soul_crystal" && item.kind !== "combat_item") {
      return {
        nextState: sourceState,
        changed: false,
        message: "Only Cradle soul crystals/combat items can be equipped here.",
      };
    }

    if (item.kind === "combat_item") {
      nextLoadouts.cradle.combatItemId = itemId;
      return {
        nextState: withLootState(sourceState, {
          ...lootState,
          loadouts: nextLoadouts,
        }),
        changed: true,
        message: "Cradle combat item equipped.",
      };
    }

    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, SLOT_CAPS.crdSoulCrystalSlots - 1);
    const unlocked = Math.max(1, lootState.progression.crdSoulCrystalSlots);
    if (slotIndex >= unlocked) {
      return {
        nextState: sourceState,
        changed: false,
        message: "That soul crystal slot is locked.",
      };
    }
    nextLoadouts.cradle.soulCrystalSlots[slotIndex] = itemId;
    return {
      nextState: withLootState(sourceState, {
        ...lootState,
        loadouts: nextLoadouts,
      }),
      changed: true,
      message: `Soul crystal equipped to slot ${slotIndex + 1}.`,
    };
  }

  if (regionKey === "worm") {
    const cardId = safeText(targetId);
    if (!cardId) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Select a cape before using Worm shard loot.",
      };
    }
    if (item.templateId === "worm_shard_slot_token") {
      const unlocked = wormShardSlotCountFromProgression(lootState.progression, cardId);
      if (unlocked >= SLOT_CAPS.wormShardSlotsPerCape) {
        return {
          nextState: sourceState,
          changed: false,
          message: "That cape already has the maximum shard lattice capacity.",
        };
      }
      const nextCounts = {
        ...(lootState.progression.wormShardSlotCountsByCape || {}),
        [cardId]: unlocked + 1,
      };
      return {
        nextState: withLootState(sourceState, {
          ...lootState,
          items: decrementOrRemoveItem({ ...lootState.items }, itemId),
          loadouts: nextLoadouts,
          progression: {
            ...lootState.progression,
            wormShardSlotCountsByCape: nextCounts,
          },
        }),
        changed: true,
        message: `Shard lattice socket added to ${cardId}.`,
      };
    }
    if (item.kind !== "worm_enhancement") {
      return {
        nextState: sourceState,
        changed: false,
        message: "Only shard enhancements or lattice sockets can be equipped to capes.",
      };
    }
    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, SLOT_CAPS.wormShardSlotsPerCape - 1);
    const unlocked = wormShardSlotCountFromProgression(lootState.progression, cardId);
    if (slotIndex >= unlocked) {
      return {
        nextState: sourceState,
        changed: false,
        message: "That shard enhancement slot is locked.",
      };
    }

    const currentSlots = Array.isArray(nextLoadouts.worm.shardSlotsByCape[cardId])
      ? nextLoadouts.worm.shardSlotsByCape[cardId].slice(0, SLOT_CAPS.wormShardSlotsPerCape)
      : Array.from({ length: SLOT_CAPS.wormShardSlotsPerCape }, () => null);
    while (currentSlots.length < SLOT_CAPS.wormShardSlotsPerCape) {
      currentSlots.push(null);
    }
    currentSlots[slotIndex] = itemId;
    nextLoadouts.worm.shardSlotsByCape[cardId] = currentSlots;

    return {
      nextState: withLootState(sourceState, {
        ...lootState,
        loadouts: nextLoadouts,
      }),
      changed: true,
      message: `Shard enhancement equipped to ${cardId}.`,
    };
  }

  if (regionKey === "aa") {
    const aaEquippable = item.region === "aa" && (
      item.kind === "aa_focus"
      || item.kind === "aa_focus_matrix"
      || (item.kind === "aa_upgrade" && safeText(item.templateId) !== "aa_workshop_slot_token")
    );
    if (!aaEquippable) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Only Arcane Ascension socketed workshop loot can be equipped in workshop slots.",
      };
    }
    const arcane = normalizeArcaneSystemState(sourceState && sourceState.systems ? sourceState.systems.arcane : {}, Date.now());
    const slotCap = Math.max(2, Math.floor(safeFinite(arcane.workshop.equipSlotCount, 2)));
    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, slotCap - 1);
    const beforeIds = Array.from({ length: slotCap }, (_, index) => safeText(arcane.workshop.equippedLootIds[index]) || null).filter(Boolean);
    const beforeBonus = aaWorkshopCoreBonuses(lootState.items, beforeIds);
    const slots = Array.from({ length: slotCap }, (_, index) => safeText(arcane.workshop.equippedLootIds[index]) || null);
    for (let index = 0; index < slots.length; index += 1) {
      if (slots[index] === itemId) {
        slots[index] = null;
      }
    }
    slots[slotIndex] = itemId;
    const afterIds = slots.filter(Boolean);
    const afterBonus = aaWorkshopCoreBonuses(lootState.items, afterIds);
    const manaBase = Math.max(arcane.attunements.enchanter ? 25 : 0, arcane.workshop.manaMax - beforeBonus.manaMaxFlat);
    const nextManaMax = Math.max(arcane.attunements.enchanter ? 25 : 0, manaBase + afterBonus.manaMaxFlat);
    const manaDelta = afterBonus.manaMaxFlat - beforeBonus.manaMaxFlat;
    const slotBase = Math.max(2, arcane.workshop.equipSlotCount - beforeBonus.extraWorkshopSlots);
    const nextSlotCap = Math.max(afterIds.length, clamp(slotBase + afterBonus.extraWorkshopSlots, 2, 6));

    nextLoadouts.aa.workshopSlots = Array.from({ length: 6 }, (_, index) => slots[index] || null);
    const nextState = withLootState(sourceState, {
      ...lootState,
      loadouts: nextLoadouts,
    });
    return {
      nextState: {
        ...nextState,
        systems: {
          ...(nextState.systems || {}),
          arcane: {
            ...arcane,
            workshop: {
              ...arcane.workshop,
              equippedLootIds: afterIds,
              equipSlotCount: nextSlotCap,
              manaMax: nextManaMax,
              manaCurrent: clamp(arcane.workshop.manaCurrent + manaDelta, 0, nextManaMax),
            },
          },
        },
      },
      changed: true,
      message: `Workshop slot ${slotIndex + 1} equipped.`,
    };
  }

  return {
    nextState: sourceState,
    changed: false,
    message: "This region does not support manual equip.",
  };
}

export function unequipLootItem(state, { region, targetId = "", slotId } = {}) {
  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  const lootState = normalizeLootInventoryState(inventoryRoot.loot, Date.now());
  const regionKey = normalizeRegion(region);

  const nextLoadouts = {
    cradle: {
      ...lootState.loadouts.cradle,
      soulCrystalSlots: (lootState.loadouts.cradle.soulCrystalSlots || []).slice(),
      combatItemId: lootState.loadouts.cradle.combatItemId,
    },
    worm: {
      ...lootState.loadouts.worm,
      shardSlotsByCape: {
        ...(lootState.loadouts.worm.shardSlotsByCape || {}),
      },
    },
    dcc: {
      ...lootState.loadouts.dcc,
    },
    aa: {
      ...lootState.loadouts.aa,
      workshopSlots: (lootState.loadouts.aa && lootState.loadouts.aa.workshopSlots ? lootState.loadouts.aa.workshopSlots : []).slice(),
    },
  };

  if (regionKey === "crd") {
    if (safeText(targetId).toLowerCase() === "combat") {
      if (!nextLoadouts.cradle.combatItemId) {
        return {
          nextState: sourceState,
          changed: false,
          message: "Combat gear slot already empty.",
        };
      }
      nextLoadouts.cradle.combatItemId = null;
      return {
        nextState: withLootState(sourceState, {
          ...lootState,
          loadouts: nextLoadouts,
        }),
        changed: true,
        message: "Cleared combat gear slot.",
      };
    }
    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, SLOT_CAPS.crdSoulCrystalSlots - 1);
    if (!nextLoadouts.cradle.soulCrystalSlots[slotIndex]) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Slot already empty.",
      };
    }
    nextLoadouts.cradle.soulCrystalSlots[slotIndex] = null;
    return {
      nextState: withLootState(sourceState, {
        ...lootState,
        loadouts: nextLoadouts,
      }),
      changed: true,
      message: `Cleared soul crystal slot ${slotIndex + 1}.`,
    };
  }

  if (regionKey === "worm") {
    const cardId = safeText(targetId);
    const slots = Array.isArray(nextLoadouts.worm.shardSlotsByCape[cardId])
      ? nextLoadouts.worm.shardSlotsByCape[cardId].slice(0, SLOT_CAPS.wormShardSlotsPerCape)
      : [];
    while (slots.length < SLOT_CAPS.wormShardSlotsPerCape) {
      slots.push(null);
    }
    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, SLOT_CAPS.wormShardSlotsPerCape - 1);
    if (!slots[slotIndex]) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Slot already empty.",
      };
    }
    slots[slotIndex] = null;
    nextLoadouts.worm.shardSlotsByCape[cardId] = slots;
    return {
      nextState: withLootState(sourceState, {
        ...lootState,
        loadouts: nextLoadouts,
      }),
      changed: true,
      message: `Cleared shard slot ${slotIndex + 1} for ${cardId}.`,
    };
  }

  if (regionKey === "aa") {
    const arcane = normalizeArcaneSystemState(sourceState && sourceState.systems ? sourceState.systems.arcane : {}, Date.now());
    const slotCap = Math.max(2, Math.floor(safeFinite(arcane.workshop.equipSlotCount, 2)));
    const slots = Array.from({ length: slotCap }, (_, index) => safeText(arcane.workshop.equippedLootIds[index]) || null);
    const beforeIds = slots.filter(Boolean);
    const beforeBonus = aaWorkshopCoreBonuses(lootState.items, beforeIds);
    const slotIndex = clamp(Math.floor(safeFinite(slotId, 0)), 0, slotCap - 1);
    if (!slots[slotIndex]) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Slot already empty.",
      };
    }
    slots[slotIndex] = null;
    const afterIds = slots.filter(Boolean);
    const afterBonus = aaWorkshopCoreBonuses(lootState.items, afterIds);
    const manaBase = Math.max(arcane.attunements.enchanter ? 25 : 0, arcane.workshop.manaMax - beforeBonus.manaMaxFlat);
    const nextManaMax = Math.max(arcane.attunements.enchanter ? 25 : 0, manaBase + afterBonus.manaMaxFlat);
    const manaDelta = afterBonus.manaMaxFlat - beforeBonus.manaMaxFlat;
    const slotBase = Math.max(2, arcane.workshop.equipSlotCount - beforeBonus.extraWorkshopSlots);
    const nextSlotCap = Math.max(afterIds.length, clamp(slotBase + afterBonus.extraWorkshopSlots, 2, 6));
    nextLoadouts.aa.workshopSlots = Array.from({ length: 6 }, (_, index) => slots[index] || null);
    const nextState = withLootState(sourceState, {
      ...lootState,
      loadouts: nextLoadouts,
    });
    return {
      nextState: {
        ...nextState,
        systems: {
          ...(nextState.systems || {}),
          arcane: {
            ...arcane,
            workshop: {
              ...arcane.workshop,
              equippedLootIds: afterIds,
              equipSlotCount: nextSlotCap,
              manaMax: nextManaMax,
              manaCurrent: clamp(arcane.workshop.manaCurrent + manaDelta, 0, nextManaMax),
            },
          },
        },
      },
      changed: true,
      message: `Cleared workshop slot ${slotIndex + 1}.`,
    };
  }

  if (regionKey === "dcc") {
    const slotKey = safeText(slotId || targetId).toLowerCase();
    if (!["head", "chest", "legs", "trinket"].includes(slotKey)) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Choose a valid Dungeon Crawler Carl gear slot.",
      };
    }
    const runtime = sourceState && sourceState.nodeRuntime && sourceState.nodeRuntime.DCC01 && typeof sourceState.nodeRuntime.DCC01 === "object"
      ? sourceState.nodeRuntime.DCC01
      : {};
    const meta = runtime.meta && typeof runtime.meta === "object" ? runtime.meta : {};
    const preparedEquipment = meta.preparedEquipment && typeof meta.preparedEquipment === "object"
      ? meta.preparedEquipment
      : {};
    if (!preparedEquipment[slotKey]) {
      return {
        nextState: sourceState,
        changed: false,
        message: "Gear slot already empty.",
      };
    }
    const nextPreparedEquipment = {
      head: preparedEquipment.head ?? null,
      chest: preparedEquipment.chest ?? null,
      legs: preparedEquipment.legs ?? null,
      trinket: preparedEquipment.trinket ?? null,
      [slotKey]: null,
    };
    return {
      nextState: {
        ...sourceState,
        nodeRuntime: {
          ...(sourceState.nodeRuntime || {}),
          DCC01: {
            ...runtime,
            meta: {
              ...meta,
              preparedEquipment: nextPreparedEquipment,
            },
          },
        },
      },
      changed: true,
      message: `Cleared ${slotKey} gear slot.`,
    };
  }

  return {
    nextState: sourceState,
    changed: false,
    message: "Nothing to unequip for this region.",
  };
}

function aggregateEffects(list, now) {
  const source = Array.isArray(list) ? list : [];
  return source
    .filter((entry) => entry && typeof entry === "object")
    .filter((entry) => !Number.isFinite(entry.expiresAt) || entry.expiresAt > now)
    .map((entry) => ({
      key: safeText(entry.key),
      type: safeText(entry.type) || "flat",
      value: safeFinite(entry.value, 0),
      region: safeText(entry.region).toLowerCase(),
    }))
    .filter((entry) => entry.key);
}

function collectItemEffects(lootState, itemIds) {
  const ids = Array.isArray(itemIds) ? itemIds : [];
  const effects = [];
  for (const itemId of ids) {
    const item = lootState.items[itemId];
    if (!item) {
      continue;
    }
    effects.push(...effectListFromItem(item).map((effect) => ({
      ...effect,
      region: item.region,
    })));
  }
  return effects;
}

export function lootInventoryFromState(state, now = Date.now()) {
  const sourceState = state && typeof state === "object" ? state : {};
  const inventoryRoot = sourceState.inventory && typeof sourceState.inventory === "object" ? sourceState.inventory : {};
  return normalizeLootInventoryState(inventoryRoot.loot, now);
}

export function lootItemsByRegion(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const groups = {
    crd: [],
    worm: [],
    dcc: [],
    aa: [],
  };
  for (const item of Object.values(loot.items)) {
    const key = normalizeRegion(item.region);
    groups[key].push(item);
  }
  for (const regionId of LOOT_REGIONS) {
    groups[regionId].sort((left, right) => {
      const rarityDelta = rarityIndex(right.rarity) - rarityIndex(left.rarity);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
      return left.label.localeCompare(right.label);
    });
  }
  return groups;
}

export function getCradleLootModifiers(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const crystalSlots = loot.loadouts.cradle.soulCrystalSlots || [];
  const equipped = crystalSlots.filter(Boolean);
  const combatItemId = loot.loadouts.cradle.combatItemId ? [loot.loadouts.cradle.combatItemId] : [];
  const staticEffects = collectItemEffects(loot, [...equipped, ...combatItemId]);
  const activeEffects = aggregateEffects(loot.activeEffects, now).filter((effect) => effect.region === "crd");

  const combined = [...staticEffects, ...activeEffects];
  const result = {
    madraGainMultiplier: 1,
    cyclingCostDivider: 1,
    combatAttackMultiplier: 1,
  };

  for (const effect of combined) {
    if (effect.key === "madra_gain_mult") {
      result.madraGainMultiplier *= Math.max(1, effect.value);
    }
    if (effect.key === "cycling_cost_divider") {
      result.cyclingCostDivider *= Math.max(1, effect.value);
    }
    if (effect.key === "crd_attack_mult") {
      result.combatAttackMultiplier *= Math.max(1, effect.value);
    }
  }

  return result;
}

export function formatDurationRemaining(ms) {
  const duration = Math.max(0, Math.floor(safeFinite(ms, 0)));
  const totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function getCradleActiveBoosts(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const active = (Array.isArray(loot.activeEffects) ? loot.activeEffects : [])
    .filter((entry) => entry && entry.region === "crd" && entry.expiresAt > now);
  const grouped = new Map();
  active.forEach((entry) => {
    const key = safeText(entry.sourceItemId) || safeText(entry.id);
    if (!grouped.has(key)) {
      grouped.set(key, {
        label: safeText(entry.sourceLabel) || "Cradle Draft",
        summary: safeText(entry.sourceSummary),
        expiresAt: Math.max(0, Number(entry.expiresAt) || 0),
      });
    } else {
      const existing = grouped.get(key);
      existing.expiresAt = Math.max(existing.expiresAt, Math.max(0, Number(entry.expiresAt) || 0));
      if (!existing.summary && safeText(entry.sourceSummary)) {
        existing.summary = safeText(entry.sourceSummary);
      }
    }
  });
  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      remainingMs: Math.max(0, entry.expiresAt - now),
    }))
    .sort((left, right) => left.remainingMs - right.remainingMs);
}

export function getWormSickbaySlotCount(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  return clamp(Math.floor(safeFinite(loot.progression.wormSickbaySlots, 1)), 1, SLOT_CAPS.wormSickbaySlots);
}

export function getWormHiringWeightModifier(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const active = aggregateEffects(loot.activeEffects, now);
  let multiplier = 1;
  for (const effect of active) {
    if (effect.key === "worm_basic_window_weight_mult") {
      multiplier *= Math.max(1, safeFinite(effect.value, 1));
    }
  }
  return multiplier;
}

export function getWormActiveHiringBoosts(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const active = (Array.isArray(loot.activeEffects) ? loot.activeEffects : [])
    .filter((entry) => entry && entry.expiresAt > now);
  const grouped = new Map();

  active.forEach((entry) => {
    const key = safeText(entry.sourceItemId) || safeText(entry.id);
    const effectKey = safeText(entry.key);
    let appliesTo = "";
    let summary = safeText(entry.sourceSummary);

    if (effectKey === "worm_basic_window_weight_mult") {
      appliesTo = "basic";
      summary = summary || `Basic window favor x${Number(entry.value || 1).toFixed(2)}`;
    }

    if (!appliesTo) {
      return;
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        label: safeText(entry.sourceLabel) || "Hiring Favor",
        summary,
        appliesTo,
        expiresAt: Math.max(0, Number(entry.expiresAt) || 0),
      });
    } else {
      const existing = grouped.get(key);
      existing.expiresAt = Math.max(existing.expiresAt, Math.max(0, Number(entry.expiresAt) || 0));
      if (!existing.summary && summary) {
        existing.summary = summary;
      }
    }
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      remainingMs: Math.max(0, entry.expiresAt - now),
    }))
    .sort((left, right) => left.remainingMs - right.remainingMs);
}

export function getWormShardSlotCount(state, cardIdOrNow = "", now = Date.now()) {
  const oldStyleNow = Number.isFinite(Number(cardIdOrNow)) && safeText(cardIdOrNow) !== "";
  const resolvedNow = oldStyleNow ? Number(cardIdOrNow) : now;
  const cardId = oldStyleNow ? "" : safeText(cardIdOrNow);
  const loot = lootInventoryFromState(state, resolvedNow);
  return wormShardSlotCountFromProgression(loot.progression, cardId);
}

export function getWormCapeLootBonuses(state, cardId, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const cleanCardId = safeText(cardId);
  const unlocked = wormShardSlotCountFromProgression(loot.progression, cleanCardId);
  const slots = cleanCardId && Array.isArray(loot.loadouts.worm.shardSlotsByCape[cleanCardId])
    ? loot.loadouts.worm.shardSlotsByCape[cleanCardId].slice(0, unlocked)
    : [];
  const effects = collectItemEffects(loot, slots.filter(Boolean));
  const wormPrestige = prestigeModifiersFromState(state || {}).worm || {};
  const shardMultiplier = Math.max(1, safeFinite(wormPrestige.shardEffectMultiplier, 1));
  const bonuses = {
    attack: 0,
    defense: 0,
    endurance: 0,
    info: 0,
    manipulation: 0,
    range: 0,
    speed: 0,
    stealth: 0,
    maxHpMultiplier: Math.max(1, safeFinite(wormPrestige.capeMaxHpMultiplier, 1)),
    damageMultiplier: Math.max(1, safeFinite(wormPrestige.capeDamageMultiplier, 1)),
    damageReduction: Math.max(0, safeFinite(wormPrestige.capeDamageReduction, 0)),
  };

  for (const effect of effects) {
    if (Object.prototype.hasOwnProperty.call(bonuses, effect.key)) {
      bonuses[effect.key] += Math.max(0, Math.floor(safeFinite(effect.value, 0) * shardMultiplier));
    }
  }

  return bonuses;
}

export function getArcaneLootModifiers(state, now = Date.now()) {
  const sourceState = state && typeof state === "object" ? state : {};
  const loot = lootInventoryFromState(sourceState, now);
  const arcane = normalizeArcaneSystemState(sourceState && sourceState.systems ? sourceState.systems.arcane : {}, now);
  const equippedFromSystem = Array.isArray(arcane.workshop.equippedLootIds) ? arcane.workshop.equippedLootIds : [];
  const equippedFromLoadout = Array.isArray(loot.loadouts.aa && loot.loadouts.aa.workshopSlots)
    ? loot.loadouts.aa.workshopSlots.filter(Boolean)
    : [];
  const equippedIds = Array.from(new Set([...equippedFromSystem, ...equippedFromLoadout].map((entry) => safeText(entry)).filter(Boolean)));
  const effects = collectItemEffects(loot, equippedIds);

  const result = {
    accuracyFlat: Math.max(0, safeFinite(arcane.bonuses.accuracyFlat, 0)),
    manaRegenPct: Math.max(0, safeFinite(arcane.bonuses.manaRegenPct, 0)),
    buyDiscountPct: clamp(safeFinite(arcane.bonuses.buyDiscountPct, 0), 0, 0.5),
    sellBonusPct: clamp(safeFinite(arcane.bonuses.sellBonusPct, 0), 0, 1),
    manaGrowthPct: 0,
    rarityBiasFlat: 0,
    manaMaxFlat: 0,
    extraWorkshopSlots: 0,
  };

  for (const effect of effects) {
    if (effect.key === "aa_accuracy_flat") {
      result.accuracyFlat += Math.max(0, safeFinite(effect.value, 0));
    }
    if (effect.key === "aa_mana_regen_pct") {
      result.manaRegenPct += Math.max(0, safeFinite(effect.value, 0));
    }
    if (effect.key === "aa_mana_growth_pct") {
      result.manaGrowthPct += Math.max(0, safeFinite(effect.value, 0));
    }
    if (effect.key === "aa_rarity_bias_flat") {
      result.rarityBiasFlat += Math.max(0, safeFinite(effect.value, 0));
    }
    if (effect.key === "aa_buy_discount_pct") {
      result.buyDiscountPct = clamp(result.buyDiscountPct + Math.max(0, safeFinite(effect.value, 0)), 0, 0.5);
    }
    if (effect.key === "aa_sell_bonus_pct") {
      result.sellBonusPct = clamp(result.sellBonusPct + Math.max(0, safeFinite(effect.value, 0)), 0, 1);
    }
    if (effect.key === "aa_mana_max_flat") {
      result.manaMaxFlat += Math.max(0, safeFinite(effect.value, 0));
    }
    if (effect.key === "aa_extra_workshop_slot") {
      result.extraWorkshopSlots += Math.max(0, Math.floor(safeFinite(effect.value, 0)));
    }
  }

  return result;
}

export function getCradleSlotSummaryEntries(state, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const crystalSlots = loot.loadouts.cradle.soulCrystalSlots || [];
  const equipped = crystalSlots.filter(Boolean);
  const staticEffects = collectItemEffects(loot, equipped);
  let madraGainMultiplier = 1;
  let cyclingCostDivider = 1;
  let combatAttackMultiplier = 1;
  for (const effect of staticEffects) {
    if (effect.key === "madra_gain_mult") {
      madraGainMultiplier *= Math.max(1, effect.value);
    }
    if (effect.key === "cycling_cost_divider") {
      cyclingCostDivider *= Math.max(1, effect.value);
    }
    if (effect.key === "crd_attack_mult") {
      combatAttackMultiplier *= Math.max(1, effect.value);
    }
  }
  const entries = [];
  if (Math.abs(madraGainMultiplier - 1) > 0.001) {
    entries.push({ label: "Madra gain", value: `x${madraGainMultiplier.toFixed(2)}` });
  }
  if (Math.abs(cyclingCostDivider - 1) > 0.001) {
    entries.push({ label: "Cycling cost", value: `/${cyclingCostDivider.toFixed(2)}` });
  }
  if (Math.abs(combatAttackMultiplier - 1) > 0.001) {
    entries.push({ label: "Cradle attack", value: `x${combatAttackMultiplier.toFixed(2)}` });
  }
  return entries;
}

export function getWormCapeShardSummaryEntries(state, cardId, now = Date.now()) {
  const loot = lootInventoryFromState(state, now);
  const cleanCardId = safeText(cardId);
  const unlocked = wormShardSlotCountFromProgression(loot.progression, cleanCardId);
  const slots = cleanCardId && Array.isArray(loot.loadouts.worm.shardSlotsByCape[cleanCardId])
    ? loot.loadouts.worm.shardSlotsByCape[cleanCardId].slice(0, unlocked)
    : [];
  const effects = collectItemEffects(loot, slots.filter(Boolean));
  const wormPrestige = prestigeModifiersFromState(state || {}).worm || {};
  const shardMultiplier = Math.max(1, safeFinite(wormPrestige.shardEffectMultiplier, 1));
  const totals = {
    attack: 0,
    defense: 0,
    endurance: 0,
    info: 0,
    manipulation: 0,
    range: 0,
    speed: 0,
    stealth: 0,
  };
  for (const effect of effects) {
    if (Object.prototype.hasOwnProperty.call(totals, effect.key)) {
      totals[effect.key] += Math.max(0, Math.floor(safeFinite(effect.value, 0) * shardMultiplier));
    }
  }
  return Object.entries(totals)
    .filter(([, value]) => Math.abs(Number(value) || 0) > 0.001)
    .map(([key, value]) => effectSummaryLabelAndValue({ key, value }))
    .filter(Boolean);
}

export function getArcaneWorkshopSlotSummaryEntries(state, now = Date.now()) {
  const mods = getArcaneLootModifiers(state, now);
  const entries = [];
  if (Math.abs(mods.manaMaxFlat) > 0.001) {
    entries.push({ label: "Mana", value: signedNumber(mods.manaMaxFlat, 0) });
  }
  if (Math.abs(mods.accuracyFlat) > 0.001) {
    entries.push({ label: "Rune accuracy", value: signedNumber(mods.accuracyFlat, 2) });
  }
  if (Math.abs(mods.manaRegenPct) > 0.0001) {
    entries.push({ label: "Mana regen", value: `+${(mods.manaRegenPct * 100).toFixed(1)}%` });
  }
  if (Math.abs(mods.manaGrowthPct) > 0.0001) {
    entries.push({ label: "Mana growth", value: `+${(mods.manaGrowthPct * 100).toFixed(1)}%` });
  }
  if (Math.abs(mods.rarityBiasFlat) > 0.0001) {
    entries.push({ label: "Craft rarity", value: `+${(mods.rarityBiasFlat * 100).toFixed(1)}%` });
  }
  if (Math.abs(mods.buyDiscountPct) > 0.0001) {
    entries.push({ label: "Shop discount", value: `+${(mods.buyDiscountPct * 100).toFixed(1)}%` });
  }
  if (Math.abs(mods.sellBonusPct) > 0.0001) {
    entries.push({ label: "Sell value", value: `+${(mods.sellBonusPct * 100).toFixed(1)}%` });
  }
  if (Math.abs(mods.extraWorkshopSlots) > 0.001) {
    entries.push({ label: "Workshop slots", value: `${Math.round(mods.extraWorkshopSlots) >= 0 ? "+" : ""}${Math.round(mods.extraWorkshopSlots)}` });
  }
  return entries;
}

export function addTwiReputation(state, amount) {
  const delta = Math.max(0, Math.floor(safeFinite(amount, 0)));
  if (!delta) {
    return state;
  }
  const loot = lootInventoryFromState(state, Date.now());
  const nextLoot = {
    ...loot,
    progression: {
      ...loot.progression,
      twiReputation: loot.progression.twiReputation + delta,
    },
  };
  return withLootState(state, nextLoot);
}

export function spendTwiReputation(state, amount) {
  const cost = Math.max(0, Math.floor(safeFinite(amount, 0)));
  const loot = lootInventoryFromState(state, Date.now());
  if (loot.progression.twiReputation < cost) {
    return {
      nextState: state,
      changed: false,
      message: "Not enough Inn reputation.",
    };
  }

  const nextLoot = {
    ...loot,
    progression: {
      ...loot.progression,
      twiReputation: loot.progression.twiReputation - cost,
    },
  };
  return {
    nextState: withLootState(state, nextLoot),
    changed: true,
    message: `Spent ${cost} Inn reputation.`,
  };
}

export function applyTwiUpgradePurchase(state, upgradeId, cost, tierGain = 1) {
  const purchase = spendTwiReputation(state, cost);
  if (!purchase.changed) {
    return purchase;
  }

  const loot = lootInventoryFromState(purchase.nextState, Date.now());
  const nextUpgrades = {
    ...(loot.progression.twiUpgrades || {}),
    [safeText(upgradeId)]: 1,
  };
  const nextLoot = {
    ...loot,
    progression: {
      ...loot.progression,
      innTier: Math.max(0, loot.progression.innTier + Math.max(0, Math.floor(safeFinite(tierGain, 0)))),
      twiUpgrades: nextUpgrades,
    },
  };

  return {
    nextState: withLootState(purchase.nextState, nextLoot),
    changed: true,
    message: `${safeText(upgradeId)} constructed.`,
  };
}

export function estimateLootShopPrice(item, economyContext = {}) {
  const normalized = normalizeItem(item);
  const rarityScale = {
    common: 1,
    uncommon: 1.6,
    rare: 2.6,
    epic: 4.2,
    legendary: 7.2,
  };
  const kindScale = {
    consumable_boost: 0.9,
    soul_crystal: 1.8,
    slot_expansion: 2.4,
    combat_item: 2.1,
    worm_enhancement: 2.0,
    dcc_armor: 1.7,
    dcc_enchant: 1.5,
    aa_upgrade: 1.9,
    aa_focus: 2.2,
    aa_focus_matrix: 2.5,
    aa_junk: 0.00001,
  };
  const base = 12;
  const rarityMult = rarityScale[normalized.rarity] || 1;
  const kindMult = kindScale[normalized.kind] || 1.3;
  const regionDiscount = normalized.region === "dcc" ? 0.38 : 1;
  const spent = Math.max(0, Math.floor(safeFinite(economyContext.totalSpentAtCourt, 0)));
  const progressionMult = 1 + Math.min(2.4, Math.log10(1 + spent) * 0.35);
  const discount = clamp(safeFinite(economyContext.buyDiscountPct, 0), 0, 0.5);
  const regionInflation = safeText(economyContext.shopRegion).toLowerCase() === "aa" ? 1.7 : 1;
  const raw = base * rarityMult * kindMult * regionDiscount * progressionMult * regionInflation * (1 - discount);
  return Math.max(1, Math.floor(raw));
}

export function isLootItemEquipped(state, itemId) {
  const targetId = safeText(itemId);
  if (!targetId) {
    return false;
  }

  const loot = lootInventoryFromState(state, Date.now());
  const cradleSlots = Array.isArray(loot.loadouts.cradle && loot.loadouts.cradle.soulCrystalSlots)
    ? loot.loadouts.cradle.soulCrystalSlots
    : [];
  if (cradleSlots.includes(targetId)) {
    return true;
  }
  if (safeText(loot.loadouts.cradle && loot.loadouts.cradle.combatItemId) === targetId) {
    return true;
  }

  const wormByCape = loot.loadouts.worm && loot.loadouts.worm.shardSlotsByCape && typeof loot.loadouts.worm.shardSlotsByCape === "object"
    ? loot.loadouts.worm.shardSlotsByCape
    : {};
  for (const slots of Object.values(wormByCape)) {
    const slotList = Array.isArray(slots) ? slots : [];
    if (slotList.includes(targetId)) {
      return true;
    }
  }

  const dccRuntime = state && state.nodeRuntime && state.nodeRuntime.DCC01 && typeof state.nodeRuntime.DCC01 === "object"
    ? state.nodeRuntime.DCC01
    : {};
  const runtimeEquipment = dccRuntime.run && dccRuntime.run.equipment && typeof dccRuntime.run.equipment === "object"
    ? dccRuntime.run.equipment
    : {};
  const preparedEquipment = dccRuntime.meta && dccRuntime.meta.preparedEquipment && typeof dccRuntime.meta.preparedEquipment === "object"
    ? dccRuntime.meta.preparedEquipment
    : {};
  const equipment = { ...preparedEquipment, ...runtimeEquipment };
  if (Object.values(equipment).some((entry) => {
    if (!entry || typeof entry !== "object") {
      return safeText(entry) === targetId;
    }
    return safeText(entry.itemId) === targetId || safeText(entry.enchantItemId) === targetId;
  })) {
    return true;
  }

  const arcane = normalizeArcaneSystemState(state && state.systems ? state.systems.arcane : {}, Date.now());
  const workshopSlots = Array.isArray(arcane.workshop.equippedLootIds) ? arcane.workshop.equippedLootIds : [];
  return workshopSlots.some((entry) => safeText(entry) === targetId);
}

export function removeLootItemInstance(state, itemId, quantity = 1) {
  const targetId = safeText(itemId);
  const removeCount = Math.max(1, Math.floor(safeFinite(quantity, 1)));
  const sourceState = state && typeof state === "object" ? state : {};
  const loot = lootInventoryFromState(sourceState, Date.now());
  const current = loot.items[targetId];
  if (!current) {
    return {
      nextState: sourceState,
      changed: false,
      message: "Loot item not found.",
    };
  }

  const nextLoot = {
    ...loot,
    items: { ...loot.items },
  };
  if (current.quantity > removeCount) {
    nextLoot.items[targetId] = {
      ...current,
      quantity: current.quantity - removeCount,
    };
  } else {
    delete nextLoot.items[targetId];
  }

  return {
    nextState: withLootState(sourceState, nextLoot),
    changed: true,
    message: "Loot item removed.",
  };
}

export function clampLootDropValue(value) {
  return clamp(safeFinite(value, 0), 0, 1);
}
