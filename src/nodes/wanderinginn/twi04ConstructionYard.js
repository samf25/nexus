import { escapeHtml } from "../../templates/shared.js";
import { lootInventoryFromState } from "../../systems/loot.js";

const NODE_ID = "TWI04";

export const UPGRADE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "common-room-benches",
    label: "Common Room Benches",
    category: "hospitality",
    kind: "major",
    cost: 8,
    tierGain: 1,
    description: "Adds seating and draws in more local guests.",
    repBonus: 1,
    visualKey: "benches",
  }),
  Object.freeze({
    id: "kitchen-firepit",
    label: "Kitchen Firepit",
    category: "service",
    kind: "major",
    cost: 14,
    tierGain: 1,
    description: "Better meals improve trust and quest quality.",
    lootChanceBonus: 0.03,
    visualKey: "firepit",
  }),
  Object.freeze({
    id: "guest-rooms",
    label: "Guest Rooms",
    category: "lodging",
    kind: "major",
    cost: 22,
    tierGain: 1,
    description: "Travelers stay longer and request larger favors.",
    questSlotBonus: 1,
    rarityBiasBonus: 0.03,
    visualKey: "rooms",
  }),
  Object.freeze({
    id: "courtyard-fence",
    label: "Courtyard Fence",
    category: "grounds",
    kind: "major",
    cost: 30,
    tierGain: 1,
    description: "Safer nights bring in rarer patrons.",
    questDifficultyBonus: 0.25,
    visualKey: "courtyard",
  }),
  Object.freeze({
    id: "messenger-board",
    label: "Messenger Board",
    category: "networking",
    kind: "major",
    cost: 42,
    tierGain: 2,
    description: "Wider requests begin arriving from distant regions.",
    questSlotBonus: 1,
    lootChanceBonus: 0.05,
    rarityBiasBonus: 0.04,
    visualKey: "board",
  }),
  Object.freeze({
    id: "hearthside-stage",
    label: "Hearthside Stage",
    category: "hospitality",
    kind: "major",
    cost: 56,
    tierGain: 1,
    description: "Stories and performances raise the inn's profile with memorable patrons.",
    repBonus: 2,
    lootChanceBonus: 0.02,
  }),
  Object.freeze({
    id: "spice-rack",
    label: "Spice Rack",
    category: "service",
    kind: "minor",
    cost: 36,
    tierGain: 0,
    description: "Distinctive meals make even ordinary requests worth better payment.",
    lootChanceBonus: 0.03,
  }),
  Object.freeze({
    id: "cellar-stores",
    label: "Cellar Stores",
    category: "service",
    kind: "major",
    cost: 68,
    tierGain: 1,
    description: "A deeper stockroom lets the inn field harder jobs without blinking.",
    questDifficultyBonus: 0.3,
    lootChanceBonus: 0.04,
  }),
  Object.freeze({
    id: "guest-ledger",
    label: "Guest Ledger",
    category: "networking",
    kind: "minor",
    cost: 52,
    tierGain: 0,
    description: "Careful records help the inn match favors to the people best able to pay them back.",
    repBonus: 1,
    rarityBiasBonus: 0.03,
  }),
  Object.freeze({
    id: "private-suites",
    label: "Private Suites",
    category: "lodging",
    kind: "major",
    cost: 82,
    tierGain: 1,
    description: "Reserved rooms entice influential guests to stay and ask for more delicate work.",
    questSlotBonus: 1,
    repBonus: 2,
    rarityBiasBonus: 0.05,
  }),
  Object.freeze({
    id: "watch-post",
    label: "Watch Post",
    category: "grounds",
    kind: "major",
    cost: 92,
    tierGain: 1,
    description: "Lookouts keep trouble from spilling into the inn while riskier jobs pass through.",
    questDifficultyBonus: 0.38,
    rarityBiasBonus: 0.03,
  }),
  Object.freeze({
    id: "courier-perch",
    label: "Courier Perch",
    category: "networking",
    kind: "major",
    cost: 110,
    tierGain: 1,
    description: "Messenger routes and return posts keep the request board crowded with opportunity.",
    lootChanceBonus: 0.05,
    repBonus: 1,
  }),
  Object.freeze({
    id: "lantern-garland",
    label: "Lantern Garland",
    category: "hospitality",
    kind: "minor",
    cost: 48,
    tierGain: 0,
    description: "A warmer glow makes the inn feel like a destination rather than a stopover.",
    repBonus: 1,
  }),
]);

const CATEGORY_LABELS = Object.freeze({
  hospitality: "Hospitality",
  service: "Kitchen & Service",
  lodging: "Lodging",
  grounds: "Grounds & Security",
  networking: "Notices & Routes",
});

const CATEGORY_ACCENTS = Object.freeze({
  hospitality: "#d48e62",
  service: "#b6855e",
  lodging: "#7aa3d6",
  grounds: "#6fa57d",
  networking: "#8f7bd2",
});

function safeText(value) {
  return String(value || "").trim();
}

function safeInt(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function categoryLabel(category) {
  return CATEGORY_LABELS[safeText(category).toLowerCase()] || "Inn Works";
}

function categoryAccent(category) {
  return CATEGORY_ACCENTS[safeText(category).toLowerCase()] || "#b99367";
}

function upgradeEffectsSummary(upgrade) {
  const parts = [];
  if (safeInt(upgrade.tierGain, 0) > 0) {
    parts.push(`Tier +${safeInt(upgrade.tierGain, 0)}`);
  }
  if (safeInt(upgrade.questSlotBonus, 0) > 0) {
    parts.push(`Slots +${safeInt(upgrade.questSlotBonus, 0)}`);
  }
  if (Number(upgrade.lootChanceBonus || 0) > 0) {
    parts.push(`Loot +${Math.round(Number(upgrade.lootChanceBonus || 0) * 100)}%`);
  }
  if (Number(upgrade.rarityBiasBonus || 0) > 0) {
    parts.push(`Rarity +${Math.round(Number(upgrade.rarityBiasBonus || 0) * 100)}`);
  }
  if (safeInt(upgrade.repBonus, 0) > 0) {
    parts.push(`Rep +${safeInt(upgrade.repBonus, 0)}`);
  }
  if (Number(upgrade.questDifficultyBonus || 0) > 0) {
    parts.push(`Harder Jobs`);
  }
  return parts;
}

export function summarizeTwiInn(upgrades, storedTier = 0) {
  const purchased = upgrades && typeof upgrades === "object" ? upgrades : {};
  const majorBuilt = [];
  const minorBuilt = [];
  const visuals = {
    benches: false,
    firepit: false,
    rooms: false,
    courtyard: false,
    board: false,
  };
  const result = {
    purchasedCount: 0,
    majorCount: 0,
    minorCount: 0,
    tier: Math.max(safeInt(storedTier, 0), 0),
    questSlots: 3,
    lootChanceBonus: 0,
    rarityBiasBonus: 0,
    repBonus: 0,
    questDifficultyBonus: 0,
    visuals,
    majorBuilt,
    minorBuilt,
  };

  for (const upgrade of UPGRADE_DEFINITIONS) {
    if (!purchased[upgrade.id]) {
      continue;
    }
    result.purchasedCount += 1;
    if (upgrade.kind === "major") {
      result.majorCount += 1;
      majorBuilt.push(upgrade.id);
    } else {
      result.minorCount += 1;
      minorBuilt.push(upgrade.id);
    }
    result.lootChanceBonus += Number(upgrade.lootChanceBonus || 0);
    result.rarityBiasBonus += Number(upgrade.rarityBiasBonus || 0);
    result.repBonus += safeInt(upgrade.repBonus, 0);
    result.questDifficultyBonus += Number(upgrade.questDifficultyBonus || 0);
    result.questSlots += safeInt(upgrade.questSlotBonus, 0);
    if (upgrade.visualKey && Object.prototype.hasOwnProperty.call(result.visuals, upgrade.visualKey)) {
      result.visuals[upgrade.visualKey] = true;
    }
  }

  result.questSlots = clamp(result.questSlots, 3, 6);
  return result;
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  return {
    purchased: source.purchased && typeof source.purchased === "object" ? { ...source.purchased } : {},
    lastMessage: safeText(source.lastMessage),
    solved: Boolean(source.solved),
  };
}

export function initialTwi04Runtime() {
  return normalizeRuntime({});
}

export function synchronizeTwi04Runtime(runtime, context = {}) {
  const current = normalizeRuntime(runtime);
  const loot = lootInventoryFromState(context.state || {}, Date.now());
  const upgrades = loot.progression && loot.progression.twiUpgrades && typeof loot.progression.twiUpgrades === "object"
    ? loot.progression.twiUpgrades
    : {};
  const solved = Object.keys(upgrades).length > 0;
  return {
    ...current,
    purchased: { ...upgrades },
    solved: current.solved || solved,
  };
}

export function validateTwi04Runtime(runtime) {
  return Boolean(normalizeRuntime(runtime).solved);
}

export function reduceTwi04Runtime(runtime, action, context = {}) {
  const current = synchronizeTwi04Runtime(runtime, context);
  if (!action || typeof action !== "object") {
    return current;
  }
  if (action.type !== "twi04-buy-upgrade") {
    return current;
  }
  if (!action.applied) {
    return {
      ...current,
      lastMessage: safeText(action.message) || "Unable to build upgrade.",
    };
  }
  const upgradeId = safeText(action.upgradeId);
  return {
    ...current,
    purchased: {
      ...current.purchased,
      [upgradeId]: 1,
    },
    solved: true,
    lastMessage: safeText(action.message) || "Upgrade complete.",
  };
}

export function renderTwi04Experience(context) {
  const runtime = synchronizeTwi04Runtime(context.runtime, context);
  const loot = lootInventoryFromState(context.state || {}, Date.now());
  const rep = safeInt(loot.progression && loot.progression.twiReputation, 0);
  const tier = safeInt(loot.progression && loot.progression.innTier, 0);
  const summary = summarizeTwiInn(
    loot.progression && loot.progression.twiUpgrades && typeof loot.progression.twiUpgrades === "object"
      ? loot.progression.twiUpgrades
      : {},
    tier,
  );

  return `
    <article class="twi04-node" data-node-id="${NODE_ID}">
      <section class="card twi04-surface">
        <div class="twi04-head">
          <div>
            <p class="twi04-kicker">The Wandering Inn</p>
            <h3>The Construction Yard</h3>
            <p class="muted">Spend reputation to improve quest quality in The Inn.</p>
          </div>
          <div class="twi04-stat-row">
            <div class="twi04-stat-pill">
              <span>Reputation</span>
              <strong>${rep}</strong>
            </div>
            <div class="twi04-stat-pill">
              <span>Inn Tier</span>
              <strong>${tier}</strong>
            </div>
          </div>
        </div>
        <div class="twi04-summary-row">
          <div class="twi04-summary-pill">
            <span>Quest Slots</span>
            <strong>${summary.questSlots}</strong>
          </div>
          <div class="twi04-summary-pill">
            <span>Major Blueprints</span>
            <strong>${summary.majorCount}</strong>
          </div>
          <div class="twi04-summary-pill">
            <span>Minor Blueprints</span>
            <strong>${summary.minorCount}</strong>
          </div>
          <div class="twi04-summary-pill">
            <span>Loot Bias</span>
            <strong>+${Math.round(summary.rarityBiasBonus * 100)}</strong>
          </div>
        </div>
      </section>
      <section class="twi04-yard-grid">
        ${UPGRADE_DEFINITIONS.map((upgrade) => {
          const purchased = Boolean(runtime.purchased[upgrade.id]);
          const affordable = rep >= upgrade.cost;
          const effects = upgradeEffectsSummary(upgrade);
          const category = categoryLabel(upgrade.category);
          const accent = categoryAccent(upgrade.category);
          return `
            <article class="card twi04-upgrade-card ${purchased ? "is-built" : ""} ${!purchased && !affordable ? "is-unaffordable" : ""}" style="--twi-upgrade-accent:${escapeHtml(accent)};">
              <div class="twi04-upgrade-head">
                <div>
                  <p class="twi04-upgrade-category">${escapeHtml(category)}</p>
                  <h4>${escapeHtml(upgrade.label)}</h4>
                </div>
                <span class="twi04-upgrade-badge">${purchased ? "Built" : upgrade.kind === "major" ? "Major" : "Minor"}</span>
              </div>
              <div class="twi04-upgrade-blueprint" aria-hidden="true"></div>
              <p>${escapeHtml(upgrade.description)}</p>
              <div class="twi04-upgrade-stats">
                <span>Cost <strong>${upgrade.cost}</strong></span>
                <span>Tier <strong>+${upgrade.tierGain}</strong></span>
              </div>
              <div class="twi04-upgrade-effects">
                ${effects.map((effect) => `<span class="twi04-upgrade-effect">${escapeHtml(effect)}</span>`).join("")}
              </div>
              <button
                type="button"
                data-node-id="${NODE_ID}"
                data-node-action="twi04-buy-upgrade"
                data-upgrade-id="${escapeHtml(upgrade.id)}"
                data-cost="${escapeHtml(String(upgrade.cost))}"
                data-tier-gain="${escapeHtml(String(upgrade.tierGain))}"
                ${purchased || !affordable ? "disabled" : ""}
              >
                ${purchased ? "Constructed" : !affordable ? "Insufficient Reputation" : "Construct"}
              </button>
            </article>
          `;
        }).join("")}
      </section>
    </article>
  `;
}

export function buildTwi04ActionFromElement(element) {
  const actionName = element.getAttribute("data-node-action");
  if (actionName !== "twi04-buy-upgrade") {
    return null;
  }
  return {
    type: "twi04-buy-upgrade",
    upgradeId: safeText(element.getAttribute("data-upgrade-id")),
    cost: safeInt(element.getAttribute("data-cost"), 0),
    tierGain: safeInt(element.getAttribute("data-tier-gain"), 0),
    at: Date.now(),
  };
}

export const TWI04_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialTwi04Runtime,
  synchronizeRuntime: synchronizeTwi04Runtime,
  render: renderTwi04Experience,
  reduceRuntime: reduceTwi04Runtime,
  validateRuntime: validateTwi04Runtime,
  buildActionFromElement: buildTwi04ActionFromElement,
};
