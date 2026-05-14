import { escapeHtml } from "../../templates/shared.js";
import { normalizeWormSystemState, wormOwnedCards } from "../../systems/wormDeck.js";
import { lootInventoryFromState } from "../../systems/loot.js";
import { wormCardById } from "../worm/wormData.js";
import { getNodeRuntime } from "../../core/state.js";
import { summarizeTwiInn } from "./twi04ConstructionYard.js";

const NODE_ID = "TWI03";
const BASE_QUEST_SLOTS = 3;
export const TWI03_SPECIAL_REWARD_SEQUENCE = Object.freeze([
  "DCC Floor-2 Key",
  "Cape Compactifier",
  "x10 Hiring Access",
  "Wave-III Passkey",
  "The Transient, Ephemeral, Fleeting Vault of the Mortal World. The Evanescent Safe of Passing Moments, the Faded Chest of Then and Them. The Box of Incontinuity",
]);

export const TWI03_SPECIAL_REWARD_THRESHOLDS = Object.freeze([
  4,
  10,
  20,
  36,
  52,
]);

const SPECIAL_GUEST_TIER_GATES = Object.freeze([1, 3, 5, 7, 9]);

const CHARACTER_BANDS = Object.freeze([
  Object.freeze({
    minTier: 0,
    characters: Object.freeze(["Erin Solstice", "Lyonette du Marquin", "Pisces Jealnet", "Ceria Springwalker", "Ishkr"]),
  }),
  Object.freeze({
    minTier: 1,
    characters: Object.freeze(["Klbkch", "Olesm Swifttail", "Bird", "Pawn", "Krshia Silverfang", "Selys Shivertail"]),
  }),
  Object.freeze({
    minTier: 2,
    characters: Object.freeze(["Numbtongue", "Rags", "Relc Grasstongue", "Yvlon Byres", "Montressa du Valeross"]),
  }),
  Object.freeze({
    minTier: 3,
    characters: Object.freeze(["Ryoka Griffin", "Mrsha du Marquin", "Ilvriss Gemscale", "Saliss of Lights", "Grimalkin"]),
  }),
  Object.freeze({
    minTier: 4,
    characters: Object.freeze(["Niers Astoragon", "Magnolia Reinhart", "Az'kerash", "Fetohep of Reim", "Teriarch"]),
  }),
]);

const SPECIAL_REWARD_GUESTS = Object.freeze([
  Object.freeze({
    character: "Klbkch",
    reward: "DCC Floor-2 Key",
    requirementType: "gold",
    amount: 120,
    repReward: 18,
    title: "Bring sanctioned supplies for a dangerous route.",
  }),
  Object.freeze({
    character: "Saliss of Lights",
    reward: "Cape Compactifier",
    requirementType: "clout",
    amount: 180,
    repReward: 28,
    title: "Acquire volatile favors for an inadvisable experiment.",
  }),
  Object.freeze({
    character: "Magnolia Reinhart",
    reward: "x10 Hiring Access",
    requirementType: "gold",
    amount: 420,
    repReward: 42,
    title: "Fund a broader network of retainers and responses.",
  }),
  Object.freeze({
    character: "Niers Astoragon",
    reward: "Wave-III Passkey",
    requirementType: "madra",
    amount: 480,
    repReward: 60,
    title: "Provision a campaign that spans more than one world.",
  }),
  Object.freeze({
    character: "Teriarch",
    reward: "The Transient, Ephemeral, Fleeting Vault of the Mortal World. The Evanescent Safe of Passing Moments, the Faded Chest of Then and Them. The Box of Incontinuity",
    requirementType: "sacrifice_int",
    amount: 1,
    repReward: 90,
    title: "Pay a rare price for something that should not remain.",
  }),
]);

const QUEST_TYPES = Object.freeze([
  Object.freeze({ type: "madra", baseAmount: 30, growth: 25, label: "Madra" }),
  Object.freeze({ type: "clout", baseAmount: 18, growth: 14, label: "Clout" }),
  Object.freeze({ type: "gold", baseAmount: 28, growth: 22, label: "Gold" }),
  Object.freeze({ type: "sacrifice_int", baseAmount: 1, growth: 0, label: "Cape Sacrifice" }),
]);

const GUEST_PALETTES = Object.freeze([
  Object.freeze({ accent: "#d87f61", soft: "#4b241f", glow: "#f4b091", trait: "fireside" }),
  Object.freeze({ accent: "#7fa8d8", soft: "#1f2f48", glow: "#b9d7ff", trait: "scholar" }),
  Object.freeze({ accent: "#83b889", soft: "#203b2b", glow: "#c3f2c6", trait: "steady" }),
  Object.freeze({ accent: "#b18ae0", soft: "#302346", glow: "#dfcbff", trait: "strange" }),
  Object.freeze({ accent: "#d7b169", soft: "#433318", glow: "#ffe3af", trait: "merchant" }),
  Object.freeze({ accent: "#6fc4bc", soft: "#173a3d", glow: "#b8f3eb", trait: "traveler" }),
]);

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

function randomIndex(seed, size) {
  const count = Math.max(1, Math.floor(Number(size) || 1));
  const state = Math.abs(Math.floor(Number(seed) || 0));
  return state % count;
}

function hashText(value) {
  const source = safeText(value);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function guestPalette(character, isSpecial = false) {
  if (isSpecial) {
    return {
      accent: "#e3bd74",
      soft: "#4a2f17",
      glow: "#ffe4ad",
      trait: "valued guest",
    };
  }
  return GUEST_PALETTES[hashText(character) % GUEST_PALETTES.length] || GUEST_PALETTES[0];
}

function guestPreferredType(character, tier, seed) {
  const choices = ["madra", "clout", "gold"];
  if (tier >= 3) {
    choices.push("sacrifice_int");
  }
  const palette = guestPalette(character);
  if (palette.trait === "scholar") {
    return "madra";
  }
  if (palette.trait === "merchant") {
    return "gold";
  }
  if (palette.trait === "strange" && tier >= 3) {
    return randomIndex(seed + 91, 2) === 0 ? "clout" : "sacrifice_int";
  }
  if (palette.trait === "traveler") {
    return "clout";
  }
  return choices[randomIndex(seed + 43, choices.length)] || "gold";
}

function tierGateForSpecial(index) {
  return SPECIAL_GUEST_TIER_GATES[index] || SPECIAL_GUEST_TIER_GATES[SPECIAL_GUEST_TIER_GATES.length - 1] || 1;
}

function difficultyLabel(value) {
  if (value >= 5) {
    return "Perilous";
  }
  if (value >= 4) {
    return "Demanding";
  }
  if (value >= 3) {
    return "Notable";
  }
  if (value >= 2) {
    return "Busy";
  }
  return "Quiet";
}

function capacityForInn(summary) {
  return Math.max(BASE_QUEST_SLOTS, Math.min(6, safeInt(summary && summary.questSlots, BASE_QUEST_SLOTS)));
}

function characterPoolForTier(tier) {
  return CHARACTER_BANDS
    .filter((band) => tier >= band.minTier)
    .flatMap((band) => band.characters);
}

function nextSpecialGuest(index) {
  return SPECIAL_REWARD_GUESTS[index] || null;
}

function specialQuestForIndex(index) {
  const guest = nextSpecialGuest(index);
  if (!guest) {
    return null;
  }
  const palette = guestPalette(guest.character, true);
  return {
    id: `special-${index}`,
    character: guest.character,
    requirementType: guest.requirementType,
    requirementLabel:
      guest.requirementType === "madra"
        ? "Madra"
        : guest.requirementType === "clout"
          ? "Clout"
          : guest.requirementType === "gold"
            ? "Gold"
            : "Cape Sacrifice",
    amount: guest.amount,
    repReward: guest.repReward,
    lootChance: 0.35,
    outRegionChance: 1,
    rarityBias: 0.18 + (index * 0.05),
    specialReward: guest.reward,
    isSpecial: true,
    requestText: guest.title,
    difficulty: 4 + Math.min(index, 1),
    difficultyLabel: index >= 3 ? "Legendary Guest" : "Valued Guest",
    traitLabel: palette.trait,
    palette,
  };
}

function createQuest(seed, tier, completedCount, reputation = 0, summary = {}) {
  const pool = characterPoolForTier(tier);
  const character = pool[randomIndex(seed + 31, pool.length)] || "Guest";
  const preferredType = guestPreferredType(character, tier, seed);
  const availableTypes = QUEST_TYPES.filter((entry) => entry.type !== "sacrifice_int" || (tier + Number(summary.questDifficultyBonus || 0)) >= 3);
  const fallbackType = availableTypes[randomIndex(seed + 17, availableTypes.length)] || QUEST_TYPES[0];
  const typeDef = availableTypes.find((entry) => entry.type === preferredType) || fallbackType;
  const bonusDifficulty = Number(summary.questDifficultyBonus || 0);
  const depth = Math.max(0, tier - 1) + Math.floor(Math.max(0, reputation) / 20) + Math.floor(Math.max(0, completedCount) / 8) + bonusDifficulty;
  const difficulty = clamp(1 + Math.floor(depth), 1, 5);
  const amount = typeDef.type === "sacrifice_int"
    ? 1
    : Math.max(1, typeDef.baseAmount + (typeDef.growth * depth));
  const repReward = Math.max(
    4,
    6 + (tier * 3) + Math.floor(completedCount / 2) + Math.floor(reputation / 12) + safeInt(summary.repBonus, 0) + difficulty,
  );
  const lootChance = clamp(0.14 + (difficulty * 0.06) + Number(summary.lootChanceBonus || 0), 0.14, 0.88);
  const rarityBias = clamp((difficulty - 1) * 0.05 + Number(summary.rarityBiasBonus || 0), 0, 0.75);
  const questId = `quest-${seed}-${tier}-${completedCount}`;
  const palette = guestPalette(character, false);
  return {
    id: questId,
    character,
    requirementType: typeDef.type,
    requirementLabel: typeDef.label,
    amount,
    repReward,
    lootChance,
    outRegionChance: 1,
    rarityBias,
    specialReward: "",
    isSpecial: false,
    requestText: "",
    difficulty,
    difficultyLabel: difficultyLabel(difficulty),
    traitLabel: palette.trait,
    palette,
  };
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const quests = Array.isArray(source.quests) ? source.quests.filter((quest) => quest && typeof quest === "object") : [];
  return {
    quests: quests.slice(0, 6),
    selectedQuestId: safeText(source.selectedQuestId),
    specialRewardIndex: Math.max(0, safeInt(source.specialRewardIndex, 0)),
    totalCompleted: Math.max(0, safeInt(source.totalCompleted, 0)),
    totalCanceled: Math.max(0, safeInt(source.totalCanceled, 0)),
    generationNonce: Math.max(0, safeInt(source.generationNonce, 0)),
    lootEvents: Array.isArray(source.lootEvents) ? source.lootEvents.filter((entry) => entry && typeof entry === "object") : [],
    rewardPopupOpen: source.rewardPopupOpen !== false && Boolean(source.rewardSummary && typeof source.rewardSummary === "object"),
    rewardSummary: source.rewardSummary && typeof source.rewardSummary === "object"
      ? {
        character: safeText(source.rewardSummary.character),
        requirementText: safeText(source.rewardSummary.requirementText),
        repReward: Math.max(0, safeInt(source.rewardSummary.repReward, 0)),
        specialReward: safeText(source.rewardSummary.specialReward),
        lootDrops: Array.isArray(source.rewardSummary.lootDrops)
          ? source.rewardSummary.lootDrops.filter((entry) => entry && typeof entry === "object").map((entry) => ({
            label: safeText(entry.label),
            rarity: safeText(entry.rarity),
            region: safeText(entry.region),
            details: safeText(entry.details),
          }))
          : [],
      }
      : null,
    lastMessage: safeText(source.lastMessage),
    solved: Boolean(source.solved) || Math.max(0, safeInt(source.totalCompleted, 0)) > 0,
  };
}

function pendingSpecialInfo(runtime, tier) {
  const nextRewardIndex = Math.max(0, safeInt(runtime.specialRewardIndex, 0));
  const nextThreshold = TWI03_SPECIAL_REWARD_THRESHOLDS[nextRewardIndex] || null;
  const gateTier = tierGateForSpecial(nextRewardIndex);
  const guest = nextSpecialGuest(nextRewardIndex);
  if (!guest || nextThreshold == null || runtime.totalCompleted < nextThreshold || tier >= gateTier) {
    return null;
  }
  return {
    character: guest.character,
    reward: guest.reward,
    requiredTier: gateTier,
    progress: `${runtime.totalCompleted}/${nextThreshold}`,
  };
}

function refillQuests(runtime, tier, reputation = 0, summary = {}) {
  const capacity = capacityForInn(summary);
  const quests = Array.isArray(runtime.quests) ? runtime.quests.slice(0, capacity) : [];
  let nonce = Math.max(0, safeInt(runtime.generationNonce, 0));
  const nextRewardIndex = Math.max(0, safeInt(runtime.specialRewardIndex, 0));
  const nextThreshold = TWI03_SPECIAL_REWARD_THRESHOLDS[nextRewardIndex] || null;
  const specialNeeded = nextThreshold != null && runtime.totalCompleted >= nextThreshold && tier >= tierGateForSpecial(nextRewardIndex);
  const hasSpecial = quests.some((quest) => Boolean(quest && quest.isSpecial));

  if (specialNeeded && !hasSpecial) {
    quests.unshift(specialQuestForIndex(nextRewardIndex));
  }

  const trimmed = quests.filter(Boolean).slice(0, capacity);
  while (trimmed.length < capacity) {
    const seed = Date.now() + (nonce * 97) + (tier * 311);
    trimmed.push(createQuest(seed, tier, runtime.totalCompleted, reputation, summary));
    nonce += 1;
  }
  return {
    ...runtime,
    quests: trimmed,
    generationNonce: nonce,
  };
}

export function initialTwi03Runtime() {
  return refillQuests(normalizeRuntime({}), 0, 0, summarizeTwiInn({}, 0));
}

export function synchronizeTwi03Runtime(runtime, context = {}) {
  const loot = lootInventoryFromState(context.state || {}, Date.now());
  const tier = Math.max(0, safeInt(loot.progression && loot.progression.innTier, 0));
  const reputation = Math.max(0, safeInt(loot.progression && loot.progression.twiReputation, 0));
  const upgrades = loot.progression && loot.progression.twiUpgrades && typeof loot.progression.twiUpgrades === "object"
    ? loot.progression.twiUpgrades
    : {};
  return refillQuests(normalizeRuntime(runtime), tier, reputation, summarizeTwiInn(upgrades, tier));
}

export function validateTwi03Runtime(runtime) {
  const normalized = normalizeRuntime(runtime);
  return normalized.solved || normalized.totalCompleted > 0;
}

export function reduceTwi03Runtime(runtime, action, context = {}) {
  const current = synchronizeTwi03Runtime(runtime, context);
  if (!action || typeof action !== "object") {
    return {
      ...current,
      lootEvents: [],
    };
  }

  if (action.type === "twi03-select-quest") {
    return {
      ...current,
      selectedQuestId: safeText(action.questId),
      lootEvents: [],
    };
  }

  if (action.type === "twi03-fulfill-quest") {
    if (!action.applied) {
      return {
        ...current,
        lootEvents: [],
        lastMessage: safeText(action.message) || "Quest requirements not met.",
      };
    }
    const questId = safeText(action.questId);
    const nextQuests = current.quests.filter((quest) => quest.id !== questId);
    const next = refillQuests({
      ...current,
      selectedQuestId: "",
      quests: nextQuests,
      specialRewardIndex: Math.max(
        current.specialRewardIndex,
        Math.max(0, safeInt(action.specialRewardIndex, current.specialRewardIndex)),
      ),
      totalCompleted: current.totalCompleted + 1,
      solved: true,
      lastMessage: safeText(action.message) || "Quest completed.",
    }, Math.max(0, safeInt(action.innTier, 0)), Math.max(0, safeInt(action.reputationAfter, 0)), summarizeTwiInn(action.upgrades || {}, Math.max(0, safeInt(action.innTier, 0))));
    return {
      ...next,
      lootEvents: action.lootEligible
        ? [
            {
              sourceRegion: "twi",
              triggerType: "inn-quest",
              dropChance: Number(action.lootChance) || 0.2,
              outRegionChance: Number(action.outRegionChance) || 1,
              rarityBias: Number(action.rarityBias) || 0.05,
              forceOutRegion: true,
            },
          ]
        : [],
    };
  }

  if (action.type === "twi03-close-reward") {
    return {
      ...current,
      rewardPopupOpen: false,
      rewardSummary: null,
    };
  }

  if (action.type === "twi03-cancel-quest") {
    const questId = safeText(action.questId);
    const quest = current.quests.find((entry) => entry && entry.id === questId);
    if (quest && quest.isSpecial) {
      return {
        ...current,
        lootEvents: [],
        lastMessage: "Valued guests stay on the board until fulfilled.",
      };
    }
    const nextQuests = current.quests.filter((quest) => quest.id !== questId);
    const next = refillQuests({
      ...current,
      selectedQuestId: "",
      quests: nextQuests,
      totalCanceled: current.totalCanceled + 1,
      lastMessage: safeText(action.message) || "Quest canceled.",
    }, Math.max(0, safeInt(action.innTier, 0)), Math.max(0, safeInt(action.reputationAfter, 0)), summarizeTwiInn(action.upgrades || {}, Math.max(0, safeInt(action.innTier, 0))));
    return {
      ...next,
      lootEvents: [],
    };
  }

  return {
    ...current,
    lootEvents: [],
  };
}

function requirementText(quest) {
  if (safeText(quest.requestText)) {
    return safeText(quest.requestText);
  }
  if (quest.requirementType === "madra") {
    return `Deliver ${quest.amount} Madra`;
  }
  if (quest.requirementType === "clout") {
    return `Deliver ${quest.amount} Clout`;
  }
  if (quest.requirementType === "gold") {
    return `Deliver ${quest.amount} Gold`;
  }
  return "Sacrifice a cape with INT > 5";
}

function eligibleSacrificeCards(state) {
  const wormState = normalizeWormSystemState(state && state.systems ? state.systems.worm : {}, Date.now());
  const owned = wormOwnedCards(wormState, Date.now());
  return owned.filter((entry) => {
    const card = wormCardById(entry.cardId);
    return card && Number(card.info || 0) > 5;
  });
}

function ownedAmountForRequirement(state, quest) {
  if (!quest) {
    return 0;
  }
  if (quest.requirementType === "madra") {
    const crd = getNodeRuntime(state || {}, "CRD02", () => ({}));
    return Number(crd && crd.madra ? crd.madra : 0);
  }
  if (quest.requirementType === "clout") {
    const wormState = state && state.systems && state.systems.worm ? state.systems.worm : {};
    return Number(wormState.clout || 0);
  }
  if (quest.requirementType === "gold") {
    const dcc = getNodeRuntime(state || {}, "DCC01", () => ({}));
    const meta = dcc && dcc.meta && typeof dcc.meta === "object" ? dcc.meta : {};
    return Number(meta.gold || 0);
  }
  return eligibleSacrificeCards(state || {}).length;
}

function questPopupMarkup(quest, context, innTier) {
  if (!quest) {
    return "";
  }
  const palette = quest.palette || guestPalette(quest.character, quest.isSpecial);
  const eligible = eligibleSacrificeCards(context.state || {});
  const needsCape = quest.requirementType === "sacrifice_int";
  const sacrificeOptions = eligible
    .map((entry) => `<option value="${escapeHtml(entry.cardId)}">${escapeHtml(entry.card.heroName)}</option>`)
    .join("");
  const owned = ownedAmountForRequirement(context.state || {}, quest);
  const canFulfill = needsCape
    ? eligible.length > 0
    : owned >= Number(quest.amount || 0);
  return `
    <div class="crd02-tech-modal" role="dialog" aria-label="Inn Quest">
      <section class="crd02-tech-surface twi03-quest-modal" style="--twi-guest-accent:${escapeHtml(palette.accent)};--twi-guest-glow:${escapeHtml(palette.glow)};">
        <header>
          <h3>${escapeHtml(quest.character)}'s Request</h3>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="twi03-select-quest" data-quest-id="">Close</button>
        </header>
        <div class="twi03-quest-sheet">
          <div class="twi03-quest-brief">
            <span>Request</span>
            <strong>${escapeHtml(requirementText(quest))}</strong>
          </div>
          <div class="twi03-quest-facts">
            <div class="twi03-quest-fact">
              <span>You Have</span>
              <strong>${escapeHtml(String(Math.floor(owned)))} ${escapeHtml(quest.requirementLabel)}</strong>
            </div>
            <div class="twi03-quest-fact">
              <span>Reputation</span>
              <strong>+${quest.repReward}</strong>
            </div>
            <div class="twi03-quest-fact">
              <span>Difficulty</span>
              <strong>${escapeHtml(safeText(quest.difficultyLabel) || "Quiet")}</strong>
            </div>
            <div class="twi03-quest-fact">
              <span>Loot Chance</span>
              <strong>${Math.round(Number(quest.lootChance || 0) * 100)}%</strong>
            </div>
            <div class="twi03-quest-fact">
              <span>Loot Bias</span>
              <strong>+${Math.round(Number(quest.rarityBias || 0) * 100)}</strong>
            </div>
            <div class="twi03-quest-fact">
              <span>Inn Tier</span>
              <strong>${innTier}</strong>
            </div>
          </div>
          ${quest.isSpecial ? `<div class="twi03-quest-special"><span>Valued Guest Reward</span><strong>${escapeHtml(quest.specialReward)}</strong></div>` : ""}
        </div>
        ${
          needsCape
            ? `
              <label>
                <span class="muted">Cape</span>
                <select data-twi03-sacrifice="${escapeHtml(quest.id)}">
                  ${sacrificeOptions}
                </select>
              </label>
            `
            : ""
        }
        <div class="toolbar">
          <button
            type="button"
            data-node-id="${NODE_ID}"
            data-node-action="twi03-fulfill-quest"
            data-quest-id="${escapeHtml(quest.id)}"
            data-character="${escapeHtml(quest.character)}"
            data-requirement-text="${escapeHtml(requirementText(quest))}"
            data-requirement-type="${escapeHtml(quest.requirementType)}"
            data-amount="${escapeHtml(String(quest.amount))}"
            data-rep-reward="${escapeHtml(String(quest.repReward))}"
            data-loot-chance="${escapeHtml(String(quest.lootChance))}"
            data-out-region-chance="${escapeHtml(String(quest.outRegionChance))}"
            data-rarity-bias="${escapeHtml(String(quest.rarityBias || 0))}"
            data-special-reward="${escapeHtml(String(quest.specialReward || ""))}"
            ${canFulfill ? "" : "disabled"}
          >
            Fulfill
          </button>
          ${
            quest.isSpecial
              ? ""
              : `
                <button
                  type="button"
                  class="ghost"
                  data-node-id="${NODE_ID}"
                  data-node-action="twi03-cancel-quest"
                  data-quest-id="${escapeHtml(quest.id)}"
                >
                  Cancel Quest
                </button>
              `
          }
        </div>
      </section>
    </div>
  `;
}

function rewardPopupMarkup(runtime) {
  if (!runtime.rewardPopupOpen || !runtime.rewardSummary) {
    return "";
  }
  const summary = runtime.rewardSummary;
  return `
    <div class="worm02-picker-overlay" role="dialog" aria-label="Quest rewards">
      <section class="card twi03-reward-modal">
        <div class="twi03-reward-head">
          <div>
            <p class="twi03-kicker">Quest Fulfilled</p>
            <h3>${escapeHtml(summary.character || "Guest Request")}</h3>
          </div>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="twi03-close-reward">Close</button>
        </div>
        <div class="twi03-reward-grid">
          <div class="twi03-reward-primary">
            <div class="twi03-reward-summary">
              <span>Request</span>
              <strong>${escapeHtml(summary.requirementText || "Completed request")}</strong>
            </div>
            <div class="twi03-reward-summary">
              <span>Inn Reputation</span>
              <strong>+${escapeHtml(String(summary.repReward || 0))}</strong>
            </div>
            ${
              summary.specialReward
                ? `
                  <div class="twi03-reward-summary twi03-reward-summary-special">
                    <span>Valued Guest Reward</span>
                    <strong>${escapeHtml(summary.specialReward)}</strong>
                  </div>
                `
                : ""
            }
          </div>
          <div class="twi03-reward-loot">
            <h4>Recovered Loot</h4>
            ${
              summary.lootDrops && summary.lootDrops.length
                ? summary.lootDrops.map((entry) => `
                    <article class="twi03-reward-loot-card">
                      <div class="twi03-reward-loot-top">
                        <strong>${escapeHtml(entry.label || "Loot")}</strong>
                        <span>${escapeHtml(entry.rarity || "Unknown")}</span>
                      </div>
                      <div class="twi03-reward-loot-meta">
                        <span>${escapeHtml(entry.region || "Unknown Region")}</span>
                      </div>
                      ${entry.details ? `<p>${escapeHtml(entry.details)}</p>` : ""}
                    </article>
                  `).join("")
                : `<p class="muted">No region loot was recovered this time.</p>`
            }
          </div>
        </div>
      </section>
    </div>
  `;
}

function innBackdropClass(innTier) {
  if (innTier >= 5) {
    return "twi-inn-tier-5";
  }
  if (innTier >= 3) {
    return "twi-inn-tier-3";
  }
  if (innTier >= 1) {
    return "twi-inn-tier-1";
  }
  return "twi-inn-tier-0";
}

function innVisualTierClass(innTier) {
  if (innTier >= 5) {
    return "twi03-inn-visual-tier-5";
  }
  if (innTier >= 3) {
    return "twi03-inn-visual-tier-3";
  }
  if (innTier >= 1) {
    return "twi03-inn-visual-tier-1";
  }
  return "twi03-inn-visual-tier-0";
}

function innUpgradeVisuals(upgrades) {
  return summarizeTwiInn(upgrades || {}, 0).visuals;
}

function nextRewardThreshold(index) {
  return TWI03_SPECIAL_REWARD_THRESHOLDS[index] || null;
}

export function renderTwi03Experience(context) {
  const runtime = synchronizeTwi03Runtime(context.runtime, context);
  const loot = lootInventoryFromState(context.state || {}, Date.now());
  const innTier = clamp(safeInt(loot.progression && loot.progression.innTier, 0), 0, 99);
  const rep = Math.max(0, safeInt(loot.progression && loot.progression.twiReputation, 0));
  const upgrades = loot.progression && loot.progression.twiUpgrades && typeof loot.progression.twiUpgrades === "object"
    ? loot.progression.twiUpgrades
    : {};
  const summary = summarizeTwiInn(upgrades, innTier);
  const visuals = innUpgradeVisuals(upgrades);
  const selectedQuest = runtime.quests.find((quest) => quest.id === runtime.selectedQuestId) || null;
  const rewardProgress = Math.min(runtime.specialRewardIndex, TWI03_SPECIAL_REWARD_SEQUENCE.length);
  const nextThreshold = nextRewardThreshold(rewardProgress);
  const milestoneProgress = nextThreshold ? `${Math.min(runtime.totalCompleted, nextThreshold)}/${nextThreshold}` : "Complete";
  const waitingSpecial = pendingSpecialInfo(runtime, innTier);

  return `
    <article class="twi03-node" data-node-id="${NODE_ID}">
      <section class="card twi03-surface ${innBackdropClass(innTier)}">
        <div class="twi03-head">
          <div>
            <p class="twi03-kicker">The Wandering Inn</p>
            <h3>The Inn</h3>
          </div>
          <div class="twi03-stat-row">
            <div class="twi03-stat-pill">
              <span>Reputation</span>
              <strong>${rep}</strong>
            </div>
            <div class="twi03-stat-pill">
              <span>Tier</span>
              <strong>${innTier}</strong>
            </div>
            <div class="twi03-stat-pill">
              <span>Open Requests</span>
              <strong>${summary.questSlots}</strong>
            </div>
          </div>
        </div>
        <div class="twi03-board">
          <section class="twi03-visual-panel">
            <div class="twi03-progress-row">
              <div class="twi03-progress-card">
                <span>Valued Guests</span>
                <strong>${rewardProgress}/${TWI03_SPECIAL_REWARD_SEQUENCE.length}</strong>
              </div>
              <div class="twi03-progress-card">
                <span>Next Reward</span>
                <strong>${escapeHtml(milestoneProgress)}</strong>
              </div>
              <div class="twi03-progress-card">
                <span>Loot Bias</span>
                <strong>+${Math.round(summary.rarityBiasBonus * 100)}</strong>
              </div>
            </div>
            <div class="twi03-inn-visual ${innVisualTierClass(innTier)}" aria-hidden="true">
              ${visuals.rooms ? `<span class="twi03-beam twi03-beam-a"></span><span class="twi03-beam twi03-beam-b"></span>` : ""}
              ${visuals.firepit ? `<span class="twi03-hearth"></span>` : ""}
              ${visuals.benches ? `<span class="twi03-table"></span>` : ""}
              ${visuals.courtyard ? `<span class="twi03-lantern twi03-lantern-a"></span><span class="twi03-lantern twi03-lantern-b"></span>` : ""}
              ${visuals.board ? `<span class="twi03-stair"></span>` : ""}
            </div>
          </section>
          <section class="twi03-quest-board">
            <div class="twi03-quest-board-head">
              <div>
                <h4>Guest Requests</h4>
                <p class="muted">Harder requests bring better odds at off-region loot.</p>
              </div>
            </div>
            ${
              waitingSpecial
                ? `
                  <div class="twi03-valued-preview">
                    <strong>${escapeHtml(waitingSpecial.character)}</strong>
                    <span>Valued guest waiting on Tier ${escapeHtml(String(waitingSpecial.requiredTier))}</span>
                    <em>Quest progress ${escapeHtml(waitingSpecial.progress)}</em>
                  </div>
                `
                : ""
            }
            <div class="twi03-quest-grid">
              ${runtime.quests.map((quest) => `
                <button
                  type="button"
                  class="twi03-quest-chip ${runtime.selectedQuestId === quest.id ? "is-selected" : ""} ${quest.isSpecial ? "is-special" : ""}"
                  style="--twi-guest-accent:${escapeHtml((quest.palette && quest.palette.accent) || "#b98f65")};--twi-guest-soft:${escapeHtml((quest.palette && quest.palette.soft) || "#2b1f16")};--twi-guest-glow:${escapeHtml((quest.palette && quest.palette.glow) || "#f1d8b4")};"
                  data-node-id="${NODE_ID}"
                  data-node-action="twi03-select-quest"
                  data-quest-id="${escapeHtml(quest.id)}"
                >
                  <span>${escapeHtml(quest.character)}</span>
                  <div class="twi03-quest-chip-tags">
                    <small>${escapeHtml(safeText(quest.difficultyLabel) || (quest.isSpecial ? "Valued Guest" : "Quiet"))}</small>
                    <small>${escapeHtml(quest.isSpecial ? "Pinned Request" : `Loot ${Math.round(Number(quest.lootChance || 0) * 100)}%`)}</small>
                  </div>
                  <strong>${escapeHtml(requirementText(quest))}</strong>
                </button>
              `).join("")}
            </div>
          </section>
        </div>
      </section>
      ${questPopupMarkup(selectedQuest, context, innTier)}
      ${rewardPopupMarkup(runtime)}
    </article>
  `;
}

export function buildTwi03ActionFromElement(element) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }

  if (actionName === "twi03-select-quest") {
    return {
      type: "twi03-select-quest",
      questId: safeText(element.getAttribute("data-quest-id")),
      at: Date.now(),
    };
  }

  if (actionName === "twi03-fulfill-quest") {
    const questId = safeText(element.getAttribute("data-quest-id"));
    const requirementType = safeText(element.getAttribute("data-requirement-type"));
    const character = safeText(element.getAttribute("data-character"));
    const requirementTextValue = safeText(element.getAttribute("data-requirement-text"));
    const amount = safeInt(element.getAttribute("data-amount"), 0);
    const repReward = safeInt(element.getAttribute("data-rep-reward"), 0);
    const lootChance = Number(element.getAttribute("data-loot-chance") || 0.2);
    const outRegionChance = Number(element.getAttribute("data-out-region-chance") || 1);
    const rarityBias = Number(element.getAttribute("data-rarity-bias") || 0);
    const specialReward = safeText(element.getAttribute("data-special-reward"));
    const root = element.closest(".twi03-node");
    const capeSelect = root ? root.querySelector(`[data-twi03-sacrifice=\"${questId}\"]`) : null;
    const sacrificeCardId = capeSelect && "value" in capeSelect ? safeText(capeSelect.value) : "";
    return {
      type: "twi03-fulfill-quest",
      questId,
      character,
      requirementText: requirementTextValue,
      requirementType,
      amount,
      repReward,
      lootChance,
      outRegionChance,
      rarityBias,
      specialReward,
      sacrificeCardId,
      at: Date.now(),
    };
  }

  if (actionName === "twi03-cancel-quest") {
    return {
      type: "twi03-cancel-quest",
      questId: safeText(element.getAttribute("data-quest-id")),
      at: Date.now(),
    };
  }

  if (actionName === "twi03-close-reward") {
    return {
      type: "twi03-close-reward",
      at: Date.now(),
    };
  }

  return null;
}

export const TWI03_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialTwi03Runtime,
  synchronizeRuntime: synchronizeTwi03Runtime,
  render: renderTwi03Experience,
  reduceRuntime: reduceTwi03Runtime,
  validateRuntime: validateTwi03Runtime,
  buildActionFromElement: buildTwi03ActionFromElement,
};
