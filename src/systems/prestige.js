const PRESTIGE_REGIONS = Object.freeze([
  Object.freeze({
    id: "cradle",
    label: "Cradle",
    currencyLabel: "Madra",
    pointLabel: "Condensed Madra",
    baseResetCost: 180,
    growth: 2.1,
    firstPayoutThreshold: 0.5,
    payoutStep: 3.2,
  }),
  Object.freeze({
    id: "worm",
    label: "Worm",
    currencyLabel: "Clout",
    pointLabel: "Shard",
    baseResetCost: 100,
    growth: 2.02,
    firstPayoutThreshold: 0.22,
    payoutStep: 2.15,
  }),
  Object.freeze({
    id: "dcc",
    label: "Dungeon Crawler Carl",
    currencyLabel: "Gold",
    pointLabel: "Sponsor",
    baseResetCost: 420,
    growth: 2.08,
    firstPayoutThreshold: 0.24,
    payoutStep: 2.45,
  }),
]);

const PRESTIGE_REGION_BY_ID = Object.freeze(
  Object.fromEntries(PRESTIGE_REGIONS.map((region) => [region.id, region])),
);

const PRESTIGE_TIER_COSTS = Object.freeze({
  1: Object.freeze([1, 2, 3, 5, 8]),
  2: Object.freeze([3, 5, 8, 12]),
  3: Object.freeze([6, 10, 15]),
});

function makeUpgrade({
  id,
  label,
  branch,
  tier,
  effect,
  prereqs = [],
  regionGate = "",
  shape = "hex",
  costs: overrideCosts = null,
  uncapped = false,
  repeatableCost = null,
} = {}) {
  const fallbackCosts =
    (PRESTIGE_TIER_COSTS[Math.max(1, Math.min(3, Number(tier) || 1))] || PRESTIGE_TIER_COSTS[1]).slice();
  const normalizedOverrideCosts = Array.isArray(overrideCosts)
    ? overrideCosts
      .map((value) => Math.max(1, Math.floor(Number(value) || 0)))
      .filter((value) => Number.isFinite(value) && value > 0)
    : [];
  const costs = normalizedOverrideCosts.length ? normalizedOverrideCosts : fallbackCosts;
  const normalizedRepeatableCost = repeatableCost && typeof repeatableCost === "object"
    ? {
      base: Math.max(1, Math.floor(Number(repeatableCost.base) || 1)),
      growth: Math.max(1.01, Number(repeatableCost.growth) || 1.12),
    }
    : null;
  const isUncapped = Boolean(uncapped);
  return Object.freeze({
    id: String(id || "").trim().toLowerCase(),
    label: String(label || "").trim() || "Unnamed Upgrade",
    branch: String(branch || "").trim().toLowerCase(),
    tier: Math.max(1, Math.min(3, Math.floor(Number(tier) || 1))),
    maxLevel: isUncapped ? Number.POSITIVE_INFINITY : costs.length,
    costs: Object.freeze(costs),
    uncapped: isUncapped,
    repeatableCost: normalizedRepeatableCost ? Object.freeze(normalizedRepeatableCost) : null,
    effect: String(effect || "").trim(),
    prereqs: Object.freeze(
      (Array.isArray(prereqs) ? prereqs : []).map((entry) =>
        Object.freeze({
          id: String(entry && entry.id ? entry.id : "").trim().toLowerCase(),
          level: Math.max(1, Math.floor(Number(entry && entry.level) || 1)),
        }),
      ),
    ),
    regionGate: String(regionGate || "").trim().toLowerCase(),
    shape: String(shape || "hex").trim().toLowerCase(),
  });
}

function branchNode({ regionGate = "", branch, tier, id, label, effect, shape, prereqs: extraPrereqs = [], costs = null } = {}) {
  const normalizedBranch = String(branch || "").trim().toLowerCase();
  const normalizedTier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
  const mergedPrereqs = Array.isArray(extraPrereqs) ? extraPrereqs : [];
  return makeUpgrade({
    id,
    label,
    branch: normalizedBranch,
    tier: normalizedTier,
    effect,
    prereqs: mergedPrereqs,
    regionGate,
    shape,
    costs,
  });
}

function endlessNode({
  regionGate = "",
  branch,
  tier = 3,
  id,
  label,
  effect,
  shape = "star",
  prereqs = [],
  baseCost = 20,
  growth = 1.18,
} = {}) {
  return makeUpgrade({
    id,
    label,
    branch,
    tier,
    effect,
    prereqs,
    regionGate,
    shape,
    uncapped: true,
    repeatableCost: {
      base: baseCost,
      growth,
    },
  });
}

function prestigeUpgradeMaxLevel(upgrade) {
  if (upgrade && upgrade.uncapped) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(1, Math.floor(Number(upgrade && upgrade.maxLevel) || 1));
}

function prestigeUpgradeCostAtLevel(upgrade, level) {
  const currentLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (upgrade && upgrade.uncapped) {
    const repeatable = upgrade.repeatableCost && typeof upgrade.repeatableCost === "object"
      ? upgrade.repeatableCost
      : { base: 20, growth: 1.18 };
    return Math.max(1, Math.round(repeatable.base * Math.pow(repeatable.growth, currentLevel)));
  }
  const costs = Array.isArray(upgrade && upgrade.costs) ? upgrade.costs : [];
  return Math.max(0, Math.floor(Number(costs[currentLevel]) || 0));
}

const PRESTIGE_UPGRADES = Object.freeze({
  cradle: Object.freeze([
    branchNode({
      id: "remnant-seed",
      label: "Remnant Seed",
      branch: "aura",
      tier: 1,
      shape: "circle",
      effect: "Begin each Cradle loop with extra madra already pooled in your core.",
    }),
    branchNode({
      id: "madra-surge",
      label: "Madra Surge",
      branch: "aura",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "remnant-seed", level: 2 }, { id: "manual-echo", level: 1 }],
      effect: "Increase passive madra gain across the Madra Well.",
    }),
    branchNode({
      id: "cycle-economy",
      label: "Cycle Economy",
      branch: "aura",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "madra-surge", level: 2 }, { id: "breakthrough-memory", level: 1 }],
      effect: "Reduce the cost of cycling-technique upgrades in the Well.",
    }),
    branchNode({
      id: "combat-edge",
      label: "Combat Edge",
      branch: "combat",
      tier: 1,
      shape: "circle",
      effect: "Sharpen combat strikes throughout Cradle encounters.",
    }),
    branchNode({
      id: "soul-cloak-memory",
      label: "Soul Cloak Memory",
      branch: "combat",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "combat-edge", level: 2 }, { id: "remnant-seed", level: 1 }],
      effect: "Improve dodge windows and ease technique madra costs.",
    }),
    branchNode({
      id: "empty-palm-insight",
      label: "Empty Palm Insight",
      branch: "combat",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "soul-cloak-memory", level: 2 }, { id: "manual-echo", level: 1 }],
      effect: "Increase the odds that Empty Palm lands cleanly on stronger opponents.",
    }),
    branchNode({
      id: "manual-echo",
      label: "Manual Echo",
      branch: "continuity",
      tier: 1,
      shape: "circle",
      effect: "Improve the madra returned by manual cultivation.",
    }),
    branchNode({
      id: "breakthrough-memory",
      label: "Breakthrough Memory",
      branch: "continuity",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "manual-echo", level: 2 }, { id: "combat-edge", level: 1 }],
      effect: "Reduce breakthrough costs throughout the advancement ladder.",
    }),
    branchNode({
      id: "battle-memory-array",
      label: "Battle Memory Array",
      branch: "continuity",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "breakthrough-memory", level: 2 }, { id: "soul-cloak-memory", level: 1 }],
      effect: "Reduce incoming combat damage and create more enemy fumbles.",
    }),
    branchNode({
      id: "soulfire-surge",
      label: "Soulfire Surge",
      branch: "soulfire",
      tier: 1,
      regionGate: "underlord",
      shape: "circle",
      prereqs: [{ id: "battle-memory-array", level: 1 }],
      effect: "Increase soulfire generation once lord-level loops open.",
    }),
    branchNode({
      id: "soulfire-forge",
      label: "Soulfire Forge",
      branch: "soulfire",
      tier: 2,
      regionGate: "underlord",
      shape: "diamond",
      prereqs: [{ id: "soulfire-surge", level: 2 }, { id: "cycle-economy", level: 1 }],
      effect: "Reduce soulfire upgrade costs within the Madra Well.",
    }),
    branchNode({
      id: "soulfire-furnace",
      label: "Soulfire Furnace",
      branch: "soulfire",
      tier: 3,
      regionGate: "underlord",
      shape: "hex",
      prereqs: [{ id: "soulfire-forge", level: 2 }, { id: "battle-memory-array", level: 2 }],
      effect: "Increase passive soulfire output after reaching Underlord.",
    }),
    endlessNode({
      id: "unyielding-edge",
      label: "Unyielding Edge",
      branch: "apex",
      tier: 3,
      shape: "star",
      prereqs: [{ id: "empty-palm-insight", level: 2 }, { id: "soulfire-furnace", level: 1 }],
      baseCost: 20,
      growth: 1.18,
      effect: "Endless investment. Keep sharpening Cradle combat strength whenever the path grows steeper.",
    }),
  ]),
  worm: Object.freeze([
    branchNode({
      id: "clout-surge",
      label: "Clout Surge",
      branch: "reputation",
      tier: 1,
      shape: "circle",
      effect: "Raise clout gain from battles and contracts.",
    }),
    branchNode({
      id: "job-window",
      label: "Improved Job Window",
      branch: "reputation",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "clout-surge", level: 2 }, { id: "shard-lattice", level: 1 }],
      effect: "Improve the odds of pulling stronger capes from the basic board.",
    }),
    branchNode({
      id: "special-window-broker",
      label: "Special Window Broker",
      branch: "reputation",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "job-window", level: 2 }, { id: "street-medicine", level: 1 }],
      effect: "Improve the quality of special hiring windows.",
    }),
    branchNode({
      id: "street-medicine",
      label: "Street Medicine",
      branch: "recovery",
      tier: 1,
      shape: "circle",
      effect: "Speed up cape recovery in the Sickbay.",
    }),
    branchNode({
      id: "cape-conditioning",
      label: "Cape Conditioning",
      branch: "recovery",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "street-medicine", level: 2 }, { id: "trauma-plates", level: 1 }],
      effect: "Increase cape durability across every fight.",
    }),
    branchNode({
      id: "threat-drills",
      label: "Threat Drills",
      branch: "recovery",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "cape-conditioning", level: 2 }, { id: "job-window", level: 1 }],
      effect: "Increase cape damage output in Worm combat.",
    }),
    branchNode({
      id: "trauma-plates",
      label: "Trauma Plates",
      branch: "survival",
      tier: 1,
      shape: "circle",
      effect: "Reduce incoming damage in Worm combat.",
    }),
    branchNode({
      id: "sickbay-overflow",
      label: "Sickbay Overflow",
      branch: "survival",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "trauma-plates", level: 2 }, { id: "street-medicine", level: 1 }],
      effect: "Expand Sickbay capacity once the branch is deep enough.",
    }),
    branchNode({
      id: "compactifier-routines",
      label: "Compactifier Routines",
      branch: "survival",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "sickbay-overflow", level: 2 }, { id: "cape-conditioning", level: 1 }],
      effect: "Reduce the duplicate-copy cost of compactification.",
    }),
    branchNode({
      id: "shard-lattice",
      label: "Shard Lattice",
      branch: "spoils",
      tier: 1,
      shape: "circle",
      effect: "Increase the strength of shard-slot bonuses.",
    }),
    branchNode({
      id: "broker-network",
      label: "Broker Network",
      branch: "spoils",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "shard-lattice", level: 2 }, { id: "clout-surge", level: 1 }],
      effect: "Increase the chance that Worm victories also recover loot.",
    }),
    branchNode({
      id: "high-stakes-sponsors",
      label: "High-Stakes Sponsors",
      branch: "spoils",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "broker-network", level: 2 }, { id: "threat-drills", level: 1 }],
      effect: "Increase Worm loot rarity when drops do occur.",
    }),
    endlessNode({
      id: "escalation-instinct",
      label: "Escalation Instinct",
      branch: "apex",
      tier: 3,
      shape: "star",
      prereqs: [{ id: "high-stakes-sponsors", level: 2 }, { id: "compactifier-routines", level: 1 }],
      baseCost: 20,
      growth: 1.18,
      effect: "Endless investment. Push cape combat strength higher when the city refuses to yield.",
    }),
  ]),
  dcc: Object.freeze([
    branchNode({
      id: "sponsor-might",
      label: "Sponsor Might",
      branch: "body",
      tier: 1,
      shape: "circle",
      effect: "Permanent health and attack boosts at the start of each crawl.",
    }),
    branchNode({
      id: "conditioning-program",
      label: "Conditioning Program",
      branch: "body",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "sponsor-might", level: 2 }, { id: "field-medicine", level: 1 }],
      effect: "Increase starting stamina every run.",
    }),
    branchNode({
      id: "crowd-survival",
      label: "Crowd Survival",
      branch: "body",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "conditioning-program", level: 2 }, { id: "market-favors", level: 1 }],
      effect: "Reduce incoming damage in crawl combat.",
    }),
    branchNode({
      id: "sponsor-bounty",
      label: "Sponsor Bounty",
      branch: "wealth",
      tier: 1,
      shape: "circle",
      effect: "Increase gold gain and improve loot rarity.",
    }),
    branchNode({
      id: "market-favors",
      label: "Market Favors",
      branch: "wealth",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "sponsor-bounty", level: 2 }, { id: "sponsor-might", level: 1 }],
      effect: "Shop prices become more favorable.",
    }),
    branchNode({
      id: "floor-reader",
      label: "Floor Reader",
      branch: "wealth",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "market-favors", level: 2 }, { id: "skill-index", level: 1 }],
      effect: "Increase the odds of starting with map knowledge.",
    }),
    branchNode({
      id: "sponsor-arsenal",
      label: "Sponsor Arsenal",
      branch: "arsenal",
      tier: 1,
      shape: "circle",
      effect: "Begin each crawl with staged sponsor combat advantages.",
    }),
    branchNode({
      id: "skill-index",
      label: "Skill Index",
      branch: "arsenal",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "sponsor-arsenal", level: 2 }, { id: "sponsor-bounty", level: 1 }],
      effect: "Increase the chance of finding technique tomes.",
    }),
    branchNode({
      id: "execution-patterns",
      label: "Execution Patterns",
      branch: "arsenal",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "skill-index", level: 2 }, { id: "conditioning-program", level: 1 }],
      effect: "Increase the damage dealt by learned crawler abilities.",
    }),
    branchNode({
      id: "field-medicine",
      label: "Field Medicine",
      branch: "sustain",
      tier: 1,
      shape: "circle",
      effect: "Increase healing from consumable restoration items.",
    }),
    branchNode({
      id: "ration-cache",
      label: "Ration Cache",
      branch: "sustain",
      tier: 2,
      shape: "diamond",
      prereqs: [{ id: "field-medicine", level: 2 }, { id: "sponsor-might", level: 1 }],
      effect: "Start deeper crawls with extra supplies and a little gold.",
    }),
    branchNode({
      id: "scavenger-instinct",
      label: "Scavenger Instinct",
      branch: "sustain",
      tier: 3,
      shape: "hex",
      prereqs: [{ id: "ration-cache", level: 2 }, { id: "sponsor-bounty", level: 2 }],
      effect: "Increase the odds that fights yield extra loot rolls.",
    }),
    branchNode({
      id: "floor-five-clearance",
      label: "Floor Five Clearance",
      branch: "clearance",
      tier: 3,
      shape: "hex",
      costs: [18],
      prereqs: [{ id: "floor-reader", level: 2 }, { id: "execution-patterns", level: 2 }],
      effect: "Claim the DCC Floor-5 Key and open the final external floor gate.",
    }),
    endlessNode({
      id: "last-ditch-brutality",
      label: "Last-Ditch Brutality",
      branch: "apex",
      tier: 3,
      shape: "star",
      prereqs: [{ id: "execution-patterns", level: 2 }, { id: "scavenger-instinct", level: 1 }],
      baseCost: 20,
      growth: 1.18,
      effect: "Endless investment. Add raw crawl combat power when the late floors start to outrun everything else.",
    }),
  ]),
});

const PRESTIGE_UPGRADE_BY_REGION = Object.freeze(
  Object.fromEntries(
    Object.entries(PRESTIGE_UPGRADES).map(([regionId, upgrades]) => [
      regionId,
      Object.freeze(Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, upgrade]))),
    ]),
  ),
);

function safeText(value) {
  return String(value || "").trim().toLowerCase();
}

function safeFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function defaultRegionState(regionId) {
  const upgrades = Object.fromEntries(
    (PRESTIGE_UPGRADES[regionId] || []).map((upgrade) => [upgrade.id, 0]),
  );

  return {
    points: 0,
    resets: 0,
    upgrades,
  };
}

export function defaultPrestigeSystemState() {
  return {
    practicalGuideResets: 0,
    regions: Object.fromEntries(
      PRESTIGE_REGIONS.map((region) => [region.id, defaultRegionState(region.id)]),
    ),
  };
}

function normalizeRegionState(regionId, candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const base = defaultRegionState(regionId);
  const incomingUpgrades = source.upgrades && typeof source.upgrades === "object" ? source.upgrades : {};
  const regionDefs = PRESTIGE_UPGRADE_BY_REGION[regionId] || {};

  const upgrades = { ...base.upgrades };
  for (const [upgradeId] of Object.entries(upgrades)) {
    const definition = regionDefs[upgradeId];
    const maxLevel = prestigeUpgradeMaxLevel(definition);
    const normalizedLevel = Math.max(0, Math.floor(safeFinite(incomingUpgrades[upgradeId], 0)));
    upgrades[upgradeId] = Number.isFinite(maxLevel) ? Math.min(maxLevel, normalizedLevel) : normalizedLevel;
  }

  return {
    points: Math.max(0, Math.floor(safeFinite(source.points, 0))),
    resets: Math.max(0, Math.floor(safeFinite(source.resets, 0))),
    upgrades,
  };
}

export function normalizePrestigeSystemState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const regions = source.regions && typeof source.regions === "object" ? source.regions : {};

  return {
    practicalGuideResets: Math.max(0, Math.floor(safeFinite(source.practicalGuideResets, 0))),
    regions: Object.fromEntries(
      PRESTIGE_REGIONS.map((region) => [
        region.id,
        normalizeRegionState(region.id, regions[region.id]),
      ]),
    ),
  };
}

export function prestigeRegionDefinitions() {
  return PRESTIGE_REGIONS.slice();
}

export function prestigeRegionById(regionId) {
  return PRESTIGE_REGION_BY_ID[safeText(regionId)] || null;
}

export function prestigeUpgradesForRegion(regionId) {
  return (PRESTIGE_UPGRADES[safeText(regionId)] || []).slice();
}

function hasReachedUnderlord(state) {
  const solved = Array.isArray(state && state.solvedNodeIds) ? state.solvedNodeIds : [];
  if (solved.includes("CRD07") || solved.includes("CRD08")) {
    return true;
  }
  const crd02 =
    state && state.nodeRuntime && state.nodeRuntime.CRD02 && typeof state.nodeRuntime.CRD02 === "object"
      ? state.nodeRuntime.CRD02
      : {};
  const stage = String(crd02.cultivationStage || "").trim().toLowerCase();
  return ["underlord", "overlord", "archlord"].includes(stage);
}

function regionGateMet(state, regionId, upgrade) {
  if (!upgrade || typeof upgrade !== "object") {
    return false;
  }
  if (safeText(regionId) === "cradle" && safeText(upgrade.regionGate) === "underlord") {
    return hasReachedUnderlord(state);
  }
  return true;
}

function upgradeViewsForRegion(state, regionId, regionState) {
  const key = safeText(regionId);
  const upgrades = PRESTIGE_UPGRADES[key] || [];
  return upgrades.map((upgrade) => {
    const level = Math.max(0, Math.floor(Number(regionState && regionState.upgrades ? regionState.upgrades[upgrade.id] : 0) || 0));
    const maxLevel = prestigeUpgradeMaxLevel(upgrade);
    const prereqs = (upgrade.prereqs || []).map((entry) => {
      const currentLevel = Math.max(
        0,
        Math.floor(Number(regionState && regionState.upgrades ? regionState.upgrades[entry.id] : 0) || 0),
      );
      return {
        id: entry.id,
        level: entry.level,
        currentLevel,
        met: currentLevel >= entry.level,
      };
    });
    const prereqsMet = prereqs.every((entry) => entry.met);
    const maxed = Number.isFinite(maxLevel) ? level >= maxLevel : false;
    const nextCost = !maxed ? prestigeUpgradeCostAtLevel(upgrade, level) : null;
    const visible = regionGateMet(state, key, upgrade) && (level > 0 || upgrade.tier <= 1 || prereqsMet);
    const purchasable = visible && prereqsMet && !maxed;
    const affordable = purchasable && Number(regionState && regionState.points ? regionState.points : 0) >= Number(nextCost || 0);
    const status = !visible
      ? "hidden"
      : maxed
        ? "maxed"
        : affordable
          ? "available"
          : level > 0
            ? "owned"
            : "locked";
    return {
      ...upgrade,
      level,
      nextCost,
      visible,
      gated: !visible,
      prereqs,
      prereqsMet,
      purchasable,
      affordable,
      acquired: level > 0,
      maxed,
      status,
    };
  });
}

export function prestigeUpgradePurchased(prestigeState, regionId, upgradeId) {
  const normalized = normalizePrestigeSystemState(prestigeState);
  const region = normalized.regions[safeText(regionId)];
  if (!region) {
    return false;
  }
  return Number(region.upgrades[safeText(upgradeId)] || 0) > 0;
}

export function prestigeResetCost(regionId, resetCount = 0) {
  const region = prestigeRegionById(regionId);
  if (!region) {
    return Infinity;
  }
  return Math.max(1, Math.round(region.baseResetCost));
}

export function nextPrestigeResetCost(prestigeState, regionId) {
  const normalized = normalizePrestigeSystemState(prestigeState);
  const key = safeText(regionId);
  const region = normalized.regions[key];
  return prestigeResetCost(key, region ? region.resets : 0);
}

function crd02RuntimeFromState(state) {
  if (!state || !state.nodeRuntime || typeof state.nodeRuntime !== "object") {
    return null;
  }

  const runtime = state.nodeRuntime.CRD02;
  return runtime && typeof runtime === "object" ? runtime : null;
}

function cradleCurrencyAmount(state) {
  const runtime = crd02RuntimeFromState(state);
  return runtime ? Math.max(0, safeFinite(runtime.madra, 0)) : 0;
}

function wormCurrencyAmount(state) {
  const system = state && state.systems && state.systems.worm && typeof state.systems.worm === "object"
    ? state.systems.worm
    : {};
  return Math.max(0, safeFinite(system.clout, 0));
}

function dccRuntimeFromState(state) {
  if (!state || !state.nodeRuntime || typeof state.nodeRuntime !== "object") {
    return null;
  }
  const runtime = state.nodeRuntime.DCC01;
  return runtime && typeof runtime === "object" ? runtime : null;
}

function dccCurrencyAmount(state) {
  const runtime = dccRuntimeFromState(state);
  const meta = runtime && runtime.meta && typeof runtime.meta === "object" ? runtime.meta : {};
  return Math.max(0, safeFinite(meta.gold, 0));
}

export function prestigeCurrencyAmount(state, regionId) {
  const key = safeText(regionId);
  if (key === "cradle") {
    return cradleCurrencyAmount(state);
  }
  if (key === "worm") {
    return wormCurrencyAmount(state);
  }
  if (key === "dcc") {
    return dccCurrencyAmount(state);
  }
  return 0;
}

export function canAffordPrestigeReset(state, regionId) {
  return prestigeResetAward(state, regionId) > 0;
}

function prestigeResetPressure(regionId, resetCount) {
  if (safeText(regionId) !== "cradle") {
    return 1;
  }
  return 1 + (Math.log1p(Math.max(0, resetCount)) * 0.045);
}

function prestigeResetAwardFromValues(regionDef, amount, resetCount) {
  const region = regionDef && typeof regionDef === "object" ? regionDef : null;
  if (!region) {
    return 0;
  }
  const currency = Math.max(0, safeFinite(amount, 0));
  if (currency <= 0) {
    return 0;
  }
  const baseline = Math.max(1, prestigeResetCost(region.id, resetCount));
  const resetPressure = prestigeResetPressure(region.id, resetCount);
  const firstThreshold = Math.max(
    1,
    baseline * Math.max(0.01, safeFinite(region.firstPayoutThreshold, 0.2)) * resetPressure,
  );
  if (currency < firstThreshold) {
    return 0;
  }
  const payoutStep = Math.max(1.25, safeFinite(region.payoutStep, 2.2));
  const raw = Math.log(currency / firstThreshold) / Math.log(payoutStep);
  return Math.max(1, 1 + Math.floor(raw + 1e-9));
}

function prestigeNextAwardAt(regionDef, resetCount, award) {
  const region = regionDef && typeof regionDef === "object" ? regionDef : null;
  const currentAward = Math.max(0, Math.floor(safeFinite(award, 0)));
  if (!region) {
    return 1;
  }
  const baseline = Math.max(1, prestigeResetCost(region.id, resetCount));
  const resetPressure = prestigeResetPressure(region.id, resetCount);
  const firstThreshold = Math.max(
    1,
    baseline * Math.max(0.01, safeFinite(region.firstPayoutThreshold, 0.2)) * resetPressure,
  );
  if (currentAward <= 0) {
    return Math.ceil(firstThreshold);
  }
  const payoutStep = Math.max(1.25, safeFinite(region.payoutStep, 2.2));
  return Math.max(1, Math.ceil(firstThreshold * Math.pow(payoutStep, currentAward)));
}

export function prestigeResetAward(state, regionId) {
  const key = safeText(regionId);
  const regionDef = prestigeRegionById(key);
  if (!regionDef) {
    return 0;
  }
  const normalized = normalizePrestigeSystemState(state && state.systems ? state.systems.prestige : {});
  const regionState = normalized.regions[key] || defaultRegionState(key);
  const currency = prestigeCurrencyAmount(state, key);
  return prestigeResetAwardFromValues(regionDef, currency, regionState.resets);
}

export function prestigeRegionSnapshot(state, regionId) {
  const key = safeText(regionId);
  const regionDef = prestigeRegionById(key);
  const normalized = normalizePrestigeSystemState(state && state.systems ? state.systems.prestige : {});
  const regionState = normalized.regions[key] || defaultRegionState(key);
  const currency = prestigeCurrencyAmount(state, key);
  const nextCost = prestigeResetCost(key, regionState.resets);
  const award = prestigeResetAwardFromValues(regionDef, currency, regionState.resets);
  const nextAwardAt = prestigeNextAwardAt(regionDef, regionState.resets, award);

  return {
    regionId: key,
    regionDef,
    points: regionState.points,
    resets: regionState.resets,
    nextCost,
    currency,
    affordable: award > 0,
    award,
    nextAwardAt,
    upgrades: { ...regionState.upgrades },
    upgradeViews: upgradeViewsForRegion(state, key, regionState),
  };
}

function zeroUpgradeLevels(upgrades) {
  const source = upgrades && typeof upgrades === "object" ? upgrades : {};
  return Object.fromEntries(Object.keys(source).map((upgradeId) => [upgradeId, 0]));
}

function neutralBonusesForRegion(regionId) {
  const key = safeText(regionId);
  if (key === "cradle") {
    return {
      startingMadraBonus: 0,
      madraGainMultiplier: 1,
      cyclingCostDivider: 1,
      combatAttackMultiplier: 1,
      combatDodgeBonus: 0,
      techniqueMadraCostDivider: 1,
      emptyPalmBonus: 0,
      manualCultivationRewardMultiplier: 1,
      breakthroughCostDivider: 1,
      combatDamageReduction: 0,
      enemyFumbleChance: 0,
      soulfireGainMultiplier: 1,
      soulfireCostDivider: 1,
      passiveSoulfireRateMultiplier: 1,
    };
  }
  if (key === "worm") {
    return {
      cloutGainMultiplier: 1,
      jobWeightBaseMultiplier: 1,
      specialWindowWeightMultiplier: 1,
      sickbayHealMultiplier: 1,
      capeMaxHpMultiplier: 1,
      capeDamageMultiplier: 1,
      capeDamageReduction: 0,
      extraSickbaySlots: 0,
      compactifyCostDivider: 1,
      shardEffectMultiplier: 1,
      wormLootDropChanceBonus: 0,
      wormLootRarityBias: 0,
    };
  }
  if (key === "dcc") {
    return {
      maxHpBonus: 0,
      attackBonus: 0,
      maxStaminaBonus: 0,
      damageReduction: 0,
      goldGainBonus: 0,
      rareDropBonus: 0,
      shopPriceDivider: 1,
      shopSellMultiplier: 1,
      mapRevealChanceBonus: 0,
      startWithSponsorSkill: false,
      extraAbilitySlots: 0,
      startBasicAttackRefinements: 0,
      tomeDropChanceBonus: 0,
      skillDamageMultiplier: 1,
      potionHealingMultiplier: 1,
      startingHealingPotions: 0,
      startingGoldBonus: 0,
      bonusLootRollChance: 0,
    };
  }
  return {};
}

export function prestigePassiveBonuses(prestigeState, regionId) {
  const key = safeText(regionId);
  return neutralBonusesForRegion(key);
}

export function prestigePassiveBonusSummary(prestigeState, regionId) {
  return [];
}

function applyCradleReset(state, _cost, now) {
  const runtime = crd02RuntimeFromState(state);
  if (!runtime) {
    return {
      state,
      applied: false,
      message: "Madra Well must be unlocked before Cradle can reset.",
    };
  }

  const prestige = prestigeModifiersFromState(state);
  const startingMadraBonus = Math.max(
    0,
    Math.floor(Number(prestige && prestige.cradle && prestige.cradle.startingMadraBonus) || 0),
  );
  const seededMadra = startingMadraBonus;

  const manual = runtime.manual && typeof runtime.manual === "object" ? runtime.manual : {};
  const cycling = runtime.cycling && typeof runtime.cycling === "object" ? runtime.cycling : {};
  const soulfire = runtime.soulfire && typeof runtime.soulfire === "object" ? runtime.soulfire : {};
  const preservedStage = String(runtime.cultivationStage || "foundation").trim().toLowerCase() || "foundation";
  const keepsSoulfireUnlocked = Boolean(soulfire.unlocked);

  const nextRuntime = {
    ...runtime,
    cultivationStage: preservedStage,
    madra: seededMadra,
    cycling: {
      ...cycling,
      twinStarsLevel: 0,
      heavenEarthLevel: 0,
    },
    upgrades: zeroUpgradeLevels(runtime.upgrades),
    techniquesOpen: false,
    manual: {
      ...manual,
      open: false,
      streak: 0,
      lastBeatOrdinal: -1,
      flashUntil: 0,
      startedAt: now,
    },
    lastTickAt: now,
    totalMadraGenerated: seededMadra,
    manualCompletions: seededMadra > 0 ? 1 : 0,
    lastMessage: seededMadra > 0
      ? `The loop snaps shut. Your ${preservedStage} foundation remains, but your stores reset to ${seededMadra} madra.`
      : `The loop snaps shut. Your ${preservedStage} foundation remains, but your stores are emptied.`,
    soulfire: {
      ...soulfire,
      unlocked: keepsSoulfireUnlocked,
      amount: 0,
      totalGenerated: 0,
      madraCyclerLevel: 0,
      soulfireCyclerLevel: 0,
    },
  };

  return {
    state: {
      ...state,
      nodeRuntime: {
        ...(state.nodeRuntime || {}),
        CRD02: nextRuntime,
      },
    },
    applied: true,
    message: "Cradle reset complete.",
  };
}

function applyWormReset(state, _cost) {
  const worm = state && state.systems && state.systems.worm && typeof state.systems.worm === "object"
    ? state.systems.worm
    : null;

  if (!worm) {
    return {
      state,
      applied: false,
      message: "Worm system is unavailable.",
    };
  }

  const inventoryRoot = state && state.inventory && typeof state.inventory === "object"
    ? state.inventory
    : {};
  const lootRoot = inventoryRoot.loot && typeof inventoryRoot.loot === "object"
    ? inventoryRoot.loot
    : {};
  const loadouts = lootRoot.loadouts && typeof lootRoot.loadouts === "object"
    ? lootRoot.loadouts
    : {};
  const wormLoadouts = loadouts.worm && typeof loadouts.worm === "object"
    ? loadouts.worm
    : {};

  return {
    state: {
      ...state,
      systems: {
        ...(state.systems || {}),
        worm: {
          ...worm,
          clout: 0,
        },
      },
      inventory: {
        ...inventoryRoot,
        loot: {
          ...lootRoot,
          loadouts: {
            ...loadouts,
            worm: {
              ...wormLoadouts,
              shardSlotsByCape: {},
            },
          },
        },
      },
    },
    applied: true,
    message: "Worm reset complete.",
  };
}

function applyDccReset(state, _cost) {
  const runtime = dccRuntimeFromState(state);
  const sourceMeta = runtime && runtime.meta && typeof runtime.meta === "object" ? runtime.meta : {};
  const dungeonCrawlSystem =
    state && state.systems && state.systems.dungeonCrawl && typeof state.systems.dungeonCrawl === "object"
      ? state.systems.dungeonCrawl
      : {};
  const inventoryRoot =
    state && state.inventory && typeof state.inventory === "object"
      ? state.inventory
      : {};
  const rewardMap =
    inventoryRoot.rewards && typeof inventoryRoot.rewards === "object"
      ? inventoryRoot.rewards
      : {};
  const hadCheckpoint = Math.max(1, Math.floor(Number(dungeonCrawlSystem.checkpointFloor) || 1)) >= 3;
  const nextRuntime = {
    ...(runtime && typeof runtime === "object" ? runtime : {}),
    run: null,
    inventoryOpen: false,
    meta: {
      gold: 0,
      upgrades: {
        hp: 0,
        attack: 0,
        stamina: 0,
        rare: 0,
        slots: 0,
      },
      totalRuns: Math.max(0, Math.floor(safeFinite(sourceMeta.totalRuns, 0))),
      totalDeaths: Math.max(0, Math.floor(safeFinite(sourceMeta.totalDeaths, 0))),
      bestFloor: Math.max(1, Math.floor(safeFinite(sourceMeta.bestFloor, 1))),
    },
    lastMessage: "The crawl contract is void. You start over with empty pockets.",
  };

  return {
    state: {
      ...state,
      systems: {
        ...(state.systems || {}),
        dungeonCrawl: {
          ...dungeonCrawlSystem,
          checkpointFloor: 1,
          checkpointEligible: false,
        },
      },
      nodeRuntime: {
        ...(state.nodeRuntime || {}),
        DCC01: nextRuntime,
      },
      inventory: {
        ...inventoryRoot,
        rewards: hadCheckpoint
          ? {
              ...rewardMap,
              "Checkpoint Pyramid": rewardMap["Checkpoint Pyramid"] || {
                source: "SYSTEM",
                section: "Dungeon Crawler Carl",
                awardedAt: Date.now(),
              },
            }
          : rewardMap,
      },
    },
    applied: true,
    message: "Dungeon Crawler Carl reset complete.",
  };
}

function withPrestigeRegionAward(state, regionId, award = 1) {
  const normalized = normalizePrestigeSystemState(state && state.systems ? state.systems.prestige : {});
  const key = safeText(regionId);
  const region = normalized.regions[key];
  if (!region) {
    return state;
  }
  const pointAward = Math.max(0, Math.floor(safeFinite(award, 0)));

  return {
    ...state,
    systems: {
      ...(state.systems || {}),
      prestige: {
        practicalGuideResets: normalized.practicalGuideResets,
        regions: {
          ...normalized.regions,
          [key]: {
            ...region,
            points: region.points + pointAward,
            resets: region.resets + 1,
          },
        },
      },
    },
  };
}

export function applyPrestigeReset(state, regionId, now = Date.now()) {
  const key = safeText(regionId);
  const regionDef = prestigeRegionById(key);
  if (!regionDef) {
    return {
      nextState: state,
      applied: false,
      cost: 0,
      pointLabel: "",
      message: "Unknown reset target.",
    };
  }

  const snapshot = prestigeRegionSnapshot(state, key);
  if (!snapshot.affordable) {
    return {
      nextState: state,
      applied: false,
      cost: snapshot.nextCost,
      pointLabel: regionDef.pointLabel,
      message: `Push ${regionDef.label} a little further before collapsing the loop.`,
    };
  }

  const regionResult = key === "cradle"
    ? applyCradleReset(state, snapshot.nextCost, now)
    : key === "worm"
      ? applyWormReset(state, snapshot.nextCost)
      : applyDccReset(state, snapshot.nextCost);

  if (!regionResult.applied) {
    return {
      nextState: state,
      applied: false,
      cost: snapshot.nextCost,
      pointLabel: regionDef.pointLabel,
      message: regionResult.message,
    };
  }

  const awarded = withPrestigeRegionAward(regionResult.state, key, snapshot.award);
  return {
    nextState: awarded,
    applied: true,
    cost: snapshot.nextCost,
    pointLabel: regionDef.pointLabel,
    message: `${regionDef.label} reset complete. +${snapshot.award} ${regionDef.pointLabel}.`,
  };
}

export function applyPrestigeUpgradePurchase(state, regionId, upgradeId) {
  const key = safeText(regionId);
  const targetUpgradeId = safeText(upgradeId);
  const regionDef = prestigeRegionById(key);
  const upgrades = prestigeUpgradesForRegion(key);
  const upgrade = upgrades.find((entry) => entry.id === targetUpgradeId) || null;

  if (!regionDef || !upgrade) {
    return {
      nextState: state,
      applied: false,
      message: "Unknown prestige upgrade.",
    };
  }

  const normalized = normalizePrestigeSystemState(state && state.systems ? state.systems.prestige : {});
  const region = normalized.regions[key];
  const level = Math.max(0, Math.floor(Number(region && region.upgrades ? region.upgrades[targetUpgradeId] : 0) || 0));
  const maxLevel = prestigeUpgradeMaxLevel(upgrade);
  const visible = regionGateMet(state, key, upgrade);
  const prereqs = Array.isArray(upgrade.prereqs) ? upgrade.prereqs : [];
  const prereqsMet = prereqs.every((entry) => {
    const currentLevel = Math.max(0, Math.floor(Number(region && region.upgrades ? region.upgrades[entry.id] : 0) || 0));
    return currentLevel >= Math.max(1, Math.floor(Number(entry.level) || 1));
  });
  const nextCost = !(Number.isFinite(maxLevel) && level >= maxLevel) ? prestigeUpgradeCostAtLevel(upgrade, level) : 0;

  if (!visible) {
    return {
      nextState: state,
      applied: false,
      message: `${upgrade.label} is not available yet.`,
    };
  }

  if (Number.isFinite(maxLevel) && level >= maxLevel) {
    return {
      nextState: state,
      applied: false,
      message: `${upgrade.label} is already maxed.`,
    };
  }

  if (!prereqsMet) {
    return {
      nextState: state,
      applied: false,
      message: `${upgrade.label} is still locked behind its branch.`,
    };
  }

  if (!region || region.points < nextCost) {
    return {
      nextState: state,
      applied: false,
      message: `Need ${nextCost} ${regionDef.pointLabel} for ${upgrade.label}.`,
    };
  }

  const nextLevel = level + 1;
  const nextPrestige = {
    practicalGuideResets: normalized.practicalGuideResets,
    regions: {
      ...normalized.regions,
      [key]: {
        ...region,
        points: region.points - nextCost,
        upgrades: {
          ...region.upgrades,
          [targetUpgradeId]: nextLevel,
        },
      },
    },
  };

  return {
    nextState: {
      ...state,
      systems: {
        ...(state.systems || {}),
        prestige: nextPrestige,
      },
    },
    applied: true,
    message: Number.isFinite(maxLevel)
      ? `${upgrade.label} advanced to ${nextLevel}/${maxLevel}.`
      : `${upgrade.label} advanced to ${nextLevel}.`,
  };
}

export function prestigeModifiersFromState(state) {
  const normalized = normalizePrestigeSystemState(state && state.systems ? state.systems.prestige : {});
  const cradle = normalized.regions.cradle || defaultRegionState("cradle");
  const worm = normalized.regions.worm || defaultRegionState("worm");
  const dcc = normalized.regions.dcc || defaultRegionState("dcc");

  const cradleLevel = (upgradeId) => Math.max(0, Math.floor(Number(cradle.upgrades[upgradeId] || 0) || 0));
  const wormLevel = (upgradeId) => Math.max(0, Math.floor(Number(worm.upgrades[upgradeId] || 0) || 0));
  const dccLevel = (upgradeId) => Math.max(0, Math.floor(Number(dcc.upgrades[upgradeId] || 0) || 0));
  const rounded = (value) => Number(Number(value || 0).toFixed(3));
  const cradleEndless = cradleLevel("unyielding-edge");
  const wormEndless = wormLevel("escalation-instinct");
  const dccEndless = dccLevel("last-ditch-brutality");

  return {
    cradle: {
      startingMadraBonus: cradleLevel("remnant-seed") * 10,
      madraGainMultiplier: rounded(1 + 0.3 * cradleLevel("madra-surge")),
      cyclingCostDivider: rounded(1 + 0.22 * cradleLevel("cycle-economy")),
      combatAttackMultiplier: rounded((1 + 0.16 * cradleLevel("combat-edge")) * (1 + 0.08 * cradleEndless)),
      combatDodgeBonus: rounded(0.035 * cradleLevel("soul-cloak-memory")),
      techniqueMadraCostDivider: rounded(1 + 0.14 * cradleLevel("soul-cloak-memory")),
      emptyPalmBonus: rounded(0.07 * cradleLevel("empty-palm-insight")),
      manualCultivationRewardMultiplier: rounded(1 + 0.2 * cradleLevel("manual-echo")),
      breakthroughCostDivider: rounded(1 + 0.16 * cradleLevel("breakthrough-memory")),
      combatDamageReduction: rounded(0.06 * cradleLevel("battle-memory-array")),
      enemyFumbleChance: rounded(0.08 * cradleLevel("battle-memory-array")),
      soulfireGainMultiplier: rounded(1 + 0.24 * cradleLevel("soulfire-surge")),
      soulfireCostDivider: rounded(1 + 0.18 * cradleLevel("soulfire-forge")),
      passiveSoulfireRateMultiplier: rounded(1 + 0.3 * cradleLevel("soulfire-furnace")),
    },
    worm: {
      cloutGainMultiplier: rounded(1 + 0.18 * wormLevel("clout-surge")),
      jobWeightBaseMultiplier: rounded(1 + 0.18 * wormLevel("job-window")),
      specialWindowWeightMultiplier: rounded(1 + 0.22 * wormLevel("special-window-broker")),
      sickbayHealMultiplier: rounded(1 + 0.35 * wormLevel("street-medicine")),
      capeMaxHpMultiplier: rounded((1 + 0.1 * wormLevel("cape-conditioning")) * (1 + 0.035 * wormEndless)),
      capeDamageMultiplier: rounded((1 + 0.1 * wormLevel("threat-drills")) * (1 + 0.07 * wormEndless)),
      capeDamageReduction: rounded(0.06 * wormLevel("trauma-plates")),
      extraSickbaySlots: Math.max(0, wormLevel("sickbay-overflow") - 1),
      compactifyCostDivider: rounded(1 + 0.25 * wormLevel("compactifier-routines")),
      shardEffectMultiplier: rounded(1 + 0.2 * wormLevel("shard-lattice")),
      wormLootDropChanceBonus: rounded(0.08 * wormLevel("broker-network")),
      wormLootRarityBias: rounded(0.3 * wormLevel("high-stakes-sponsors")),
    },
    dcc: {
      maxHpBonus: (dccLevel("sponsor-might") * 10) + (dccEndless * 8),
      attackBonus: dccLevel("sponsor-might") + dccEndless,
      maxStaminaBonus: dccLevel("conditioning-program") * 2,
      damageReduction: rounded(0.06 * dccLevel("crowd-survival")),
      goldGainBonus: rounded(0.16 * dccLevel("sponsor-bounty")),
      rareDropBonus: rounded(0.04 * dccLevel("sponsor-bounty")),
      shopPriceDivider: rounded(1 + 0.16 * dccLevel("market-favors")),
      shopSellMultiplier: rounded(1 + 0.16 * dccLevel("market-favors")),
      mapRevealChanceBonus: rounded(0.18 * dccLevel("floor-reader")),
      startWithSponsorSkill: dccLevel("sponsor-arsenal") >= 1,
      extraAbilitySlots: dccLevel("sponsor-arsenal") >= 2 ? 1 : 0,
      startBasicAttackRefinements: dccLevel("sponsor-arsenal") >= 3 ? 1 : 0,
      tomeDropChanceBonus: rounded(0.09 * dccLevel("skill-index")),
      skillDamageMultiplier: rounded((1 + 0.1 * dccLevel("execution-patterns")) * (1 + 0.08 * dccEndless)),
      potionHealingMultiplier: rounded(1 + 0.22 * dccLevel("field-medicine")),
      startingHealingPotions: dccLevel("ration-cache") >= 3 ? 2 : dccLevel("ration-cache") >= 1 ? 1 : 0,
      startingGoldBonus: dccLevel("ration-cache") >= 2 ? 10 : 0,
      bonusLootRollChance: rounded(0.12 * dccLevel("scavenger-instinct")),
      floorFiveClearance: dccLevel("floor-five-clearance") >= 1,
    },
  };
}
