import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderSlotRing } from "../../ui/slotRing.js";
import {
  createWormBattleState,
  infoDebuffStatKeys,
  renderWormCombatEventCard,
  resolveWormRound,
  selectableWormActions,
} from "./wormCombatSystem.js";
import { renderWormCard } from "./wormCardRenderer.js";
import { loadWormCardCatalog } from "./wormData.js";
import { normalizeWormSystemState, wormDrawWindowPack, wormOwnedCards } from "../../systems/wormDeck.js";
import { getWormCapeLootBonuses } from "../../systems/loot.js";

const ACTION_LABELS = Object.freeze({
  attack: "Attack",
  defense: "Defense",
  info: "Info",
  manipulation: "Manipulation",
  speed: "Speed",
  stealth: "Stealth",
});

const WORM05_NODE_ID = "WORM05";
const WORM06_NODE_ID = "WORM06";
const WORM07_NODE_ID = "WORM07";
const WORM08_NODE_ID = "WORM08";

const SIMURGH_BRACELET = "Simurgh Summoning Bracelet";
const BEHEMOTH_ANKLET = "Behemoth Summoning Anklet";
const LEVIATHAN_SIGIL = "Leviathan Core Sigil";
const SIMURGH_SIGIL = "Simurgh Feather Sigil";
const BEHEMOTH_SIGIL = "Behemoth Ember Sigil";
const LOADOUT_SLOTS = Object.freeze([
  { slotId: "slot-1", label: "Slot I" },
  { slotId: "slot-2", label: "Slot II" },
]);

const SIMURGH_CARD = Object.freeze({
  id: "worm-boss-simurgh",
  heroName: "Simurgh",
  power: "Winged Endbringer that predicts and rewrites battle flow through precision aerial pressure.",
  powerFull: "The Simurgh is an aerial Endbringer with predictive control, sonic disruption, and relentless tactical pressure.",
  attack: 13,
  defense: 11,
  endurance: 14,
  info: 12,
  manipulation: 13,
  range: 14,
  speed: 12,
  stealth: 11,
  rarity: 7.6,
  rarityTier: "mythic",
});

const BEHEMOTH_CARD = Object.freeze({
  id: "worm-boss-behemoth",
  heroName: "Behemoth",
  power: "Cataclysmic Endbringer of seismic force, heat bloom, and molten devastation.",
  powerFull: "Behemoth crushes fronts with seismic force, thermal surges, and overwhelming brute pressure.",
  attack: 16,
  defense: 14,
  endurance: 18,
  info: 9,
  manipulation: 8,
  range: 12,
  speed: 9,
  stealth: 5,
  rarity: 8.5,
  rarityTier: "mythic",
});

const SCION_CARD = Object.freeze({
  id: "worm-final-scion",
  heroName: "Scion",
  power: "A being of light whose strikes erase certainty and overwhelm all conventional opposition.",
  powerFull: "Scion is a near-unkillable entity of light and force projection, capable of ending battlefields in moments.",
  attack: 22,
  defense: 18,
  endurance: 24,
  info: 17,
  manipulation: 17,
  range: 20,
  speed: 18,
  stealth: 12,
  rarity: 10,
  rarityTier: "mythic",
});

const WORM06_DIFFICULTY_CONFIG = Object.freeze({
  easy: Object.freeze({ label: "Easy Cleanup", weightBase: 0.125, cloutMult: 4 }),
  medium: Object.freeze({ label: "Medium Cleanup", weightBase: 0.5, cloutMult: 9 }),
  hard: Object.freeze({ label: "Hard Cleanup", weightBase: 2, cloutMult: 20 }),
});

function safeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeBattle(value) {
  return value && typeof value === "object" ? value : null;
}

function normalizeDifficulty(value) {
  const key = safeText(value).toLowerCase();
  return Object.prototype.hasOwnProperty.call(WORM06_DIFFICULTY_CONFIG, key) ? key : "easy";
}

function applyCardBonus(card, bonus) {
  const source = bonus && typeof bonus === "object" ? bonus : {};
  const keys = ["attack", "defense", "endurance", "info", "manipulation", "range", "speed", "stealth"];
  const next = { ...card };
  for (const key of keys) {
    next[key] = Math.max(0, Number(card[key] || 0) + Math.max(0, Number(source[key] || 0)));
  }
  next.maxHpMultiplier = Math.max(1, Number(source.maxHpMultiplier || card.maxHpMultiplier || 1));
  next.damageMultiplier = Math.max(1, Number(source.damageMultiplier || card.damageMultiplier || 1));
  next.damageReduction = Math.max(0, Number(source.damageReduction || card.damageReduction || 0));
  return next;
}

function topPlayerCards(wormState, contextState) {
  const owned = wormOwnedCards(wormState, Date.now())
    .filter((entry) => Number(entry.currentHp || 0) > 0)
    .sort((a, b) => {
      if (Number(b.card.rarity || 0) !== Number(a.card.rarity || 0)) {
        return Number(b.card.rarity || 0) - Number(a.card.rarity || 0);
      }
      return String(a.card.heroName || "").localeCompare(String(b.card.heroName || ""));
    });

  return owned.slice(0, 2).map((entry) => {
    const bonus = getWormCapeLootBonuses(contextState || {}, entry.cardId, Date.now());
    return applyCardBonus(
      {
        ...entry.card,
        currentHp: Number(entry.currentHp || 0),
      },
      bonus,
    );
  });
}

function ensureLoadout(runtime, ownedCardIds) {
  const uniqueOwned = ownedCardIds.filter((cardId, index, list) => cardId && list.indexOf(cardId) === index);
  const selected = (runtime.playerLoadout || []).filter((cardId) => uniqueOwned.includes(cardId)).slice(0, 2);
  while (selected.length < 2) {
    selected.push("");
  }
  return selected.slice(0, 2);
}

function loadoutEntryById(owned) {
  const byId = {};
  for (const entry of owned) {
    if (!entry || !entry.cardId) {
      continue;
    }
    byId[entry.cardId] = entry;
  }
  return byId;
}

function loadoutMetaMarkup(entry) {
  const rarity = Number(entry && entry.card && entry.card.rarity);
  const currentHp = Math.max(0, Math.round(Number(entry && entry.currentHp ? entry.currentHp : 0)));
  return `
    <span class="worm02-loadout-slot-meta-line">
      <span class="worm02-loadout-meta-chip worm02-loadout-meta-chip-rarity">Rarity ${escapeHtml(Number.isFinite(rarity) ? rarity.toFixed(1) : "0.0")}</span>
      <span class="worm02-loadout-meta-chip worm02-loadout-meta-chip-hp">HP ${escapeHtml(String(currentHp))}</span>
    </span>
  `;
}

function loadoutSlotMarkup(nodeId, actionName, slot, selectedEntry, pickerOpen, locked) {
  const hasCard = Boolean(selectedEntry && selectedEntry.card);
  return `
    <button
      type="button"
      class="worm02-loadout-slot ${hasCard ? "is-filled" : "is-empty"} ${pickerOpen ? "is-active" : ""}"
      data-node-id="${escapeHtml(nodeId)}"
      data-node-action="${escapeHtml(actionName)}"
      data-slot-id="${escapeHtml(slot.slotId)}"
      data-boss-loadout-slot="${escapeHtml(slot.slotId)}"
      data-card-id="${escapeHtml(hasCard ? selectedEntry.cardId : "")}"
      data-current-hp="${escapeHtml(hasCard ? String(Math.max(0, Math.round(Number(selectedEntry.currentHp || 0)))) : "0")}"
      ${locked ? "disabled" : ""}
      aria-label="${escapeHtml(`Select cape for ${slot.label}`)}"
    >
      <span class="worm02-loadout-slot-title">${escapeHtml(slot.label)}</span>
      ${
        hasCard
          ? `
              <span class="worm02-loadout-slot-name">${escapeHtml(selectedEntry.card.heroName)}</span>
              ${loadoutMetaMarkup(selectedEntry)}
            `
          : `<span class="worm02-loadout-slot-empty">Select Cape</span>`
      }
    </button>
  `;
}

function pickerCardMarkup(nodeId, actionName, entry, slotId, activeLoadout) {
  const otherSlotCardId = (activeLoadout || []).find((cardId, index) => {
    const lookupSlot = LOADOUT_SLOTS[index] ? LOADOUT_SLOTS[index].slotId : "";
    return lookupSlot !== slotId && cardId;
  }) || "";
  const disabled = Boolean(otherSlotCardId && otherSlotCardId === entry.cardId);
  return `
    <button
      type="button"
      class="worm02-picker-card ${disabled ? "is-disabled" : ""}"
      data-node-id="${escapeHtml(nodeId)}"
      data-node-action="${escapeHtml(actionName)}"
      data-slot-id="${escapeHtml(slotId)}"
      data-card-id="${escapeHtml(entry.cardId)}"
      ${disabled ? "disabled" : ""}
      aria-label="${escapeHtml(`Choose ${entry.card.heroName}`)}"
    >
      <strong>${escapeHtml(entry.card.heroName)}</strong>
      ${loadoutMetaMarkup(entry)}
    </button>
  `;
}

function pickerMarkup(nodeId, closeAction, pickAction, runtime, owned, activeLoadout) {
  if (!runtime.pickerSlot) {
    return "";
  }
  const slot = LOADOUT_SLOTS.find((entry) => entry.slotId === runtime.pickerSlot);
  if (!slot) {
    return "";
  }
  return `
    <section class="worm02-picker-overlay" aria-modal="true" role="dialog">
      <section class="card worm02-picker-panel">
        <header class="worm02-picker-header">
          <h4>Select Cape for ${escapeHtml(slot.label)}</h4>
          <button type="button" class="ghost" data-node-id="${escapeHtml(nodeId)}" data-node-action="${escapeHtml(closeAction)}">Close</button>
        </header>
        <div class="worm02-picker-grid">
          ${owned.map((entry) => pickerCardMarkup(nodeId, pickAction, entry, slot.slotId, activeLoadout)).join("")}
        </div>
      </section>
    </section>
  `;
}

function normalizePreferenceForActor(combatant, enemyTeam, preference) {
  const preferredType = safeText(preference && preference.type).toLowerCase();
  const actionType = selectableWormActions().includes(preferredType) ? preferredType : "attack";
  const preferredTarget = safeText(preference && preference.targetId);
  const targetId = enemyTeam.some((enemy) => enemy.combatantId === preferredTarget)
    ? preferredTarget
    : enemyTeam[0]
      ? enemyTeam[0].combatantId
      : "";
  const preferredInfo = safeText(preference && preference.infoStat).toLowerCase();
  const infoStat = infoDebuffStatKeys().includes(preferredInfo) ? preferredInfo : "attack";

  return {
    actorId: combatant.combatantId,
    type: actionType,
    targetId,
    infoStat,
  };
}

function actionNeedsTarget(actionType) {
  const type = safeText(actionType).toLowerCase();
  return type === "attack" || type === "info" || type === "manipulation";
}

function normalizeOrderPrefs(orders, battle) {
  const next = {};
  const source = orders && typeof orders === "object" ? orders : {};
  const validTypes = selectableWormActions();
  const validInfo = infoDebuffStatKeys();
  const playerTeam = battle && Array.isArray(battle.playerTeam) ? battle.playerTeam : [];
  const enemyTeam = battle && Array.isArray(battle.enemyTeam) ? battle.enemyTeam.filter((c) => c.hp > 0) : [];
  const defaultTarget = enemyTeam[0] ? enemyTeam[0].combatantId : "";

  for (const combatant of playerTeam) {
    const actorId = safeText(combatant.combatantId);
    if (!actorId) {
      continue;
    }
    const pref = source[actorId] && typeof source[actorId] === "object" ? source[actorId] : {};
    const type = validTypes.includes(safeText(pref.type).toLowerCase()) ? safeText(pref.type).toLowerCase() : "attack";
    const targetId = enemyTeam.some((enemy) => enemy.combatantId === safeText(pref.targetId))
      ? safeText(pref.targetId)
      : defaultTarget;
    const infoStat = validInfo.includes(safeText(pref.infoStat).toLowerCase()) ? safeText(pref.infoStat).toLowerCase() : "attack";
    next[actorId] = {
      type,
      targetId,
      infoStat,
    };
  }

  return next;
}

function playerOrderMarkup(combatant, enemyTeam, preference) {
  const aliveEnemies = enemyTeam.filter((enemy) => enemy.hp > 0);
  const normalized = normalizePreferenceForActor(combatant, aliveEnemies, preference);
  const showTarget = actionNeedsTarget(normalized.type);
  const actionOptions = selectableWormActions()
    .map(
      (action) =>
        `<option value="${escapeHtml(action)}" ${action === normalized.type ? "selected" : ""}>${escapeHtml(ACTION_LABELS[action] || action)}</option>`,
    )
    .join("");
  const targetOptions = aliveEnemies
    .map(
      (enemy) =>
        `<option value="${escapeHtml(enemy.combatantId)}" ${enemy.combatantId === normalized.targetId ? "selected" : ""}>${escapeHtml(enemy.heroName)}</option>`,
    )
    .join("");
  const infoOptions = infoDebuffStatKeys()
    .map(
      (statKey) =>
        `<option value="${escapeHtml(statKey)}" ${statKey === normalized.infoStat ? "selected" : ""}>${escapeHtml(statKey.toUpperCase())}</option>`,
    )
    .join("");

  return `
    <article class="worm02-order-row" data-worm04-order-row data-actor-id="${escapeHtml(combatant.combatantId)}">
      <h4>${escapeHtml(combatant.heroName)}</h4>
      <label>
        <span>Action</span>
        <select class="worm02-select" data-worm04-order-type>
          ${actionOptions}
        </select>
      </label>
      <label data-worm04-target-wrap ${showTarget ? "" : "hidden"}>
        <span>Target</span>
        <select class="worm02-select" data-worm04-order-target>
          ${targetOptions}
        </select>
      </label>
      <label data-worm04-info-wrap ${normalized.type === "info" ? "" : "hidden"}>
        <span>Info Debuff</span>
        <select class="worm02-select" data-worm04-order-info>
          ${infoOptions}
        </select>
      </label>
    </article>
  `;
}

function teamCardsMarkup(team, role) {
  const living = (Array.isArray(team) ? team : []).filter((combatant) => Number(combatant && combatant.hp) > 0);
  return living
    .map((combatant) =>
      renderWormCard(
        {
          heroName: combatant.heroName,
          power: combatant.power,
          powerFull: combatant.powerFull || combatant.power,
          attack: combatant.stats.attack,
          defense: combatant.stats.defense,
          endurance: combatant.stats.endurance,
          info: combatant.stats.info,
          manipulation: combatant.stats.manipulation,
          range: combatant.stats.range,
          speed: combatant.stats.speed,
          stealth: combatant.stats.stealth,
          rarity: combatant.rarity,
          rarityTier: combatant.rarityTier,
        },
        {
          combatant,
          role,
        },
      ),
    )
    .join("");
}

function battleMarkup(nodeId, runtime, enemyHeading, resolveAction, resetAction, claimAction) {
  const battle = runtime.battle;
  if (!battle) {
    return "";
  }

  const playerTeam = Array.isArray(battle.playerTeam) ? battle.playerTeam : [];
  const enemyTeam = Array.isArray(battle.enemyTeam) ? battle.enemyTeam : [];
  const playerAlive = playerTeam.filter((combatant) => combatant.hp > 0);
  const enemyAlive = enemyTeam.filter((combatant) => combatant.hp > 0);
  const visiblePlayers = playerAlive.length ? playerAlive : playerTeam;
  const visibleEnemies = enemyAlive.length ? enemyAlive : enemyTeam;
  const canResolve = !battle.winner && playerAlive.length > 0;
  const winnerLabel = battle.winner
    ? battle.winner === "player"
      ? "Player victory"
      : battle.winner === "enemy"
        ? "Enemy victory"
        : "Draw"
    : "In progress";
  const turnNumber = Math.max(1, Number(battle.round || 1) - 1);
  const turnEvents = Array.isArray(battle.lastRoundEvents) && battle.lastRoundEvents.length
    ? battle.lastRoundEvents
    : ["Turn resolves without momentum shift."];

  return `
    <section class="worm02-battle">
      <section class="worm02-board worm02-board-lanes">
        <section class="worm02-team-column">
          <h3>Your Team</h3>
          <div class="worm02-card-grid">
            ${teamCardsMarkup(visiblePlayers, "player")}
          </div>
        </section>
        <section class="worm02-center-column">
          <section class="worm02-controls">
            <h3>Turn Orders</h3>
            <div class="worm02-order-grid">
              ${playerAlive
    .map((combatant) => playerOrderMarkup(combatant, enemyAlive, runtime.orderPrefs[combatant.combatantId] || null))
    .join("")}
            </div>
            <div class="toolbar">
              <button type="button" data-node-id="${nodeId}" data-node-action="${resolveAction}" ${canResolve ? "" : "disabled"}>Resolve Turn</button>
              <button type="button" class="ghost" data-node-id="${nodeId}" data-node-action="${resetAction}">Retreat</button>
              ${battle.winner ? `<button type="button" data-node-id="${nodeId}" data-node-action="${claimAction}">Claim Outcome</button>` : ""}
            </div>
          </section>
        </section>
        <section class="worm02-team-column">
          <h3>${escapeHtml(enemyHeading)}</h3>
          <div class="worm02-card-grid">
            ${teamCardsMarkup(visibleEnemies, "enemy")}
          </div>
        </section>
      </section>
      <section class="card worm02-turn-panel">
        <h3>Combat Turn ${escapeHtml(String(turnNumber))}</h3>
        <div class="worm02-turn-grid">
          ${turnEvents.map((line, index) => renderWormCombatEventCard(line, index)).join("")}
        </div>
      </section>
    </section>
  `;
}

function outcomePopupMarkup(nodeId, closeAction, popupState) {
  const popup = popupState && typeof popupState === "object" ? popupState : null;
  if (!popup) {
    return "";
  }
  const lines = Array.isArray(popup.lines) ? popup.lines : [];
  const lootDrops = Array.isArray(popup.lootDrops) ? popup.lootDrops : [];
  const artifactRewards = Array.isArray(popup.artifactRewards) ? popup.artifactRewards : [];
  const cloutAward = Math.max(0, Number(popup.cloutAward || 0));
  return `
    <section class="worm02-picker-overlay" aria-modal="true" role="dialog">
      <section class="card worm02-picker-panel worm02-outcome-panel">
        <header class="worm02-picker-header">
          <h4>${escapeHtml(String(popup.title || "Outcome"))}</h4>
        </header>
        <div class="worm02-outcome-grid">
          <section class="worm02-outcome-section">
            <span class="worm02-outcome-label">Clout</span>
            <strong class="worm02-outcome-value">${cloutAward > 0 ? `+${escapeHtml(String(cloutAward))}` : "None"}</strong>
          </section>
          <section class="worm02-outcome-section">
            <span class="worm02-outcome-label">Artifacts</span>
            <div class="worm02-outcome-list">
              ${artifactRewards.length
                ? artifactRewards.map((reward) => `<span class="worm02-outcome-chip">${escapeHtml(String(reward || ""))}</span>`).join("")
                : `<span class="worm02-outcome-empty">None</span>`}
            </div>
          </section>
          <section class="worm02-outcome-section is-wide">
            <span class="worm02-outcome-label">Loot Recovered</span>
            <div class="worm02-outcome-list is-blocks">
              ${lootDrops.length
                ? lootDrops.map((drop) => `<span class="worm02-outcome-drop">${escapeHtml(String(drop || ""))}</span>`).join("")
                : `<span class="worm02-outcome-empty">No loot recovered.</span>`}
            </div>
          </section>
          ${lines.length ? `
            <section class="worm02-outcome-section is-wide">
              <span class="worm02-outcome-label">Notes</span>
              <div class="worm02-outcome-notes">
                ${lines.map((line) => `<p>${escapeHtml(String(line || ""))}</p>`).join("")}
              </div>
            </section>
          ` : ""}
        </div>
        <div class="toolbar">
          <button type="button" data-node-id="${escapeHtml(nodeId)}" data-node-action="${escapeHtml(closeAction)}">Close</button>
        </div>
      </section>
    </section>
  `;
}

function gatherOrdersFromSurface(surface) {
  const rows = [...surface.querySelectorAll("[data-worm04-order-row]")];
  const orders = {};
  for (const row of rows) {
    const actorId = safeText(row.getAttribute("data-actor-id"));
    if (!actorId) {
      continue;
    }
    const typeInput = row.querySelector("[data-worm04-order-type]");
    const targetInput = row.querySelector("[data-worm04-order-target]");
    const infoInput = row.querySelector("[data-worm04-order-info]");
    orders[actorId] = {
      type: typeInput && "value" in typeInput ? safeText(typeInput.value) : "attack",
      targetId: targetInput && "value" in targetInput ? safeText(targetInput.value) : "",
      infoStat: infoInput && "value" in infoInput ? safeText(infoInput.value) : "attack",
    };
  }
  return orders;
}

function randomEnhanceCard(card, seed = Date.now(), count = 1) {
  const next = { ...card };
  const statKeys = ["attack", "defense", "endurance", "info", "manipulation", "range", "speed", "stealth"];
  const iterations = Math.max(1, Math.floor(Number(count) || 1));
  for (let index = 0; index < iterations; index += 1) {
    const key = statKeys[(seed + index * 19) % statKeys.length];
    const delta = 1 + ((seed + index * 13) % 2);
    next[key] = Math.max(0, Number(next[key] || 0) + delta);
  }
  return next;
}

function catalogCardByName(name) {
  const target = safeText(name).toLowerCase();
  if (!target) {
    return null;
  }
  const catalog = loadWormCardCatalog();
  for (const card of catalog) {
    const heroName = safeText(card.heroName).toLowerCase();
    if (heroName === target) {
      return card;
    }
    const aliasHead = heroName.split("/")[0].trim();
    if (aliasHead === target) {
      return card;
    }
    if (heroName.startsWith(`${target} /`) || heroName.startsWith(`${target}/`)) {
      return card;
    }
  }
  return null;
}

function toBattleResults(runtime) {
  return runtime && runtime.battle && Array.isArray(runtime.battle.playerTeam)
    ? runtime.battle.playerTeam.map((combatant) => ({
      cardId: combatant.cardId,
      hp: combatant.hp,
    }))
    : [];
}

function normalizeBossRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  return {
    summoned: Boolean(source.summoned),
    battle: normalizeBattle(source.battle),
    playerLoadout: Array.isArray(source.playerLoadout)
      ? source.playerLoadout.map((cardId) => safeText(cardId)).slice(0, 2)
      : [],
    pickerSlot: LOADOUT_SLOTS.some((entry) => entry.slotId === source.pickerSlot) ? source.pickerSlot : "",
    orderPrefs: source.orderPrefs && typeof source.orderPrefs === "object" ? source.orderPrefs : {},
    solved: Boolean(source.solved),
    pendingCloutAward: Math.max(0, Number(source.pendingCloutAward) || 0),
    lootEvents: Array.isArray(source.lootEvents) ? source.lootEvents.filter((entry) => entry && typeof entry === "object") : [],
    outcomePopup: source.outcomePopup && typeof source.outcomePopup === "object" ? { ...source.outcomePopup } : null,
    lastMessage: safeText(source.lastMessage),
  };
}

function reduceBossRuntime(current, action, context, config) {
  if (action.type === config.openPickerAction) {
    return {
      ...current,
      pickerSlot: LOADOUT_SLOTS.some((entry) => entry.slotId === action.slotId) ? action.slotId : "",
    };
  }

  if (action.type === config.closePickerAction) {
    return {
      ...current,
      pickerSlot: "",
    };
  }

  if (action.type === config.pickLoadoutAction) {
    const slot = LOADOUT_SLOTS.some((entry) => entry.slotId === action.slotId) ? action.slotId : "";
    const cardId = safeText(action.cardId);
    if (!slot || !cardId) {
      return current;
    }
    const nextLoadout = Array.isArray(current.playerLoadout) ? current.playerLoadout.slice(0, 2) : [];
    while (nextLoadout.length < 2) {
      nextLoadout.push("");
    }
    const slotIndex = LOADOUT_SLOTS.findIndex((entry) => entry.slotId === slot);
    if (slotIndex < 0) {
      return current;
    }
    const otherIndex = slotIndex === 0 ? 1 : 0;
    if (nextLoadout[otherIndex] === cardId) {
      nextLoadout[otherIndex] = "";
    }
    nextLoadout[slotIndex] = cardId;
    return {
      ...current,
      playerLoadout: nextLoadout,
      pickerSlot: "",
    };
  }

  if (action.type === config.closeOutcomeAction) {
    return {
      ...current,
      outcomePopup: null,
    };
  }

  if (action.type === config.summonAction) {
    if (current.solved) {
      return {
        ...current,
        lastMessage: `${config.bossName} is already defeated.`,
      };
    }
    if (!action.ready) {
      return {
        ...current,
        lastMessage: `${config.artifactName} does not respond.`,
      };
    }
    return {
      ...current,
      summoned: true,
      outcomePopup: null,
      lastMessage: config.summonMessage,
    };
  }

  if (action.type === config.startAction) {
    if (!current.summoned || current.solved) {
      return current;
    }
    const requestedPlayerCards = Array.isArray(action.playerCards) ? action.playerCards : [];
    const bonusesByCardId = action.capeBonusesByCardId && typeof action.capeBonusesByCardId === "object"
      ? action.capeBonusesByCardId
      : {};
    const requestedLoadout = requestedPlayerCards.length
      ? requestedPlayerCards.map((entry) => safeText(entry.cardId)).slice(0, 2)
      : current.playerLoadout;
    const playerCards = requestedPlayerCards
      .map((entry) => {
        const cardId = safeText(entry && entry.cardId);
        const card = loadWormCardCatalog().find((candidate) => safeText(candidate.id) === cardId);
        if (!card) {
          return null;
        }
        const currentHp = Number(entry && entry.currentHp);
        const bonus = bonusesByCardId[cardId] || getWormCapeLootBonuses(context.state || {}, cardId, Date.now());
        return applyCardBonus({
          ...card,
          currentHp: Number.isFinite(currentHp) ? Math.max(0, Math.round(currentHp)) : undefined,
        }, bonus);
      })
      .filter((card) => card && typeof card === "object")
      .slice(0, 2);
    if (playerCards.length < 2) {
      return {
        ...current,
        lastMessage: `You need two healthy capes to fight ${config.bossName}.`,
      };
    }

    return {
      ...current,
      playerLoadout: requestedLoadout,
      pickerSlot: "",
      battle: createWormBattleState({
        playerCards,
        enemyCards: [config.bossCard],
        seed: Date.now() >>> 0,
        enemyAiMode: "boss",
      }),
      orderPrefs: {},
      outcomePopup: null,
      lastMessage: config.startMessage,
    };
  }

  if (action.type === config.resolveAction) {
    if (!current.battle || current.battle.winner) {
      return current;
    }
    const orders = action.orders && typeof action.orders === "object" ? action.orders : {};
    const nextBattle = resolveWormRound(current.battle, {
      playerOrders: orders,
    });
    return {
      ...current,
      battle: nextBattle,
      orderPrefs: normalizeOrderPrefs(orders, nextBattle),
      lastMessage: nextBattle.winner
        ? nextBattle.winner === "player"
          ? `${config.bossName} is collapsing. Claim your outcome.`
          : "Your team is forced out. Regroup and try again."
        : current.lastMessage,
    };
  }

  if (action.type === config.resetAction) {
    return {
      ...current,
      battle: null,
      pickerSlot: "",
      orderPrefs: {},
      outcomePopup: null,
      lastMessage: config.retreatMessage,
    };
  }

  if (action.type === config.claimAction) {
    if (!current.battle || !current.battle.winner) {
      return current;
    }
    const won = current.battle.winner === "player";
    return {
      ...current,
      battle: null,
      pickerSlot: "",
      orderPrefs: {},
      solved: won || current.solved,
      pendingCloutAward: won ? config.cloutReward : 0,
      lootEvents: won ? config.lootEvents : [],
      outcomePopup: {
        title: won ? `${config.bossName} Defeated` : `${config.bossName} Repelled You`,
        lines: won
          ? [
            "The battlefield finally goes quiet.",
            "Your capes survive the impossible exchange.",
          ]
          : ["No clout awarded.", "No artifact rewards.", "Regroup and attempt again."],
      },
      lastMessage: won ? config.victoryMessage : "Defeat recorded.",
    };
  }

  return current;
}

function buildBossActionFromElement(element, runtime, config) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  const surface = element.closest(`.${config.rootClass}`);
  if (!surface) {
    return null;
  }

  if (actionName === config.summonAction) {
    return {
      type: config.summonAction,
      artifact: element.getAttribute("data-artifact") || "",
      ready: element.getAttribute("data-ready") === "true",
      at: Date.now(),
    };
  }
  if (actionName === config.openPickerAction) {
    return {
      type: config.openPickerAction,
      slotId: element.getAttribute("data-slot-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === config.closePickerAction) {
    return {
      type: config.closePickerAction,
      at: Date.now(),
    };
  }
  if (actionName === config.pickLoadoutAction) {
    return {
      type: config.pickLoadoutAction,
      slotId: element.getAttribute("data-slot-id") || "",
      cardId: element.getAttribute("data-card-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === config.startAction) {
    const payload = LOADOUT_SLOTS.map((slot) => {
      const slotEl = surface.querySelector(`[data-boss-loadout-slot="${slot.slotId}"]`);
      const cardId = safeText(slotEl && slotEl.getAttribute("data-card-id"));
      const currentHp = Number(slotEl && slotEl.getAttribute("data-current-hp"));
      return {
        cardId,
        currentHp: Number.isFinite(currentHp) ? Math.max(0, Math.round(currentHp)) : 0,
      };
    });
    return {
      type: config.startAction,
      playerCards: payload,
      at: Date.now(),
    };
  }
  if (actionName === config.resetAction) {
    return {
      type: config.resetAction,
      at: Date.now(),
    };
  }
  if (actionName === config.closeOutcomeAction) {
    return {
      type: config.closeOutcomeAction,
      at: Date.now(),
    };
  }
  if (actionName === config.claimAction) {
    const current = normalizeBossRuntime(runtime);
    return {
      type: config.claimAction,
      winner: current && current.battle ? current.battle.winner : "",
      playerResults: toBattleResults(current),
      at: Date.now(),
    };
  }
  if (actionName === config.resolveAction) {
    return {
      type: config.resolveAction,
      orders: gatherOrdersFromSurface(surface),
      at: Date.now(),
    };
  }

  return null;
}

function renderBossExperience(context, config) {
  const runtime = normalizeBossRuntime(context.runtime);
  const selectedArtifact = safeText(context.selectedArtifactReward);
  const hasArtifactSelected = selectedArtifact === config.artifactName;
  const wormState = normalizeWormSystemState(context.state.systems.worm, Date.now());
  const owned = wormOwnedCards(wormState, Date.now()).filter((entry) => Number(entry.currentHp || 0) > 0);
  const loadout = ensureLoadout(runtime, owned.map((entry) => entry.cardId));
  const selectedById = loadoutEntryById(owned);
  const loadoutComplete = loadout.every((cardId) => Boolean(cardId));

  return `
    <article class="${config.rootClass}" data-node-id="${config.nodeId}">
      <section class="card worm03-intro">
        <h3>${escapeHtml(config.title)}</h3>
        <p>${escapeHtml(config.introText)}</p>
        ${
  runtime.solved
    ? `<p class="muted">${escapeHtml(config.solvedText)}</p>`
    : !runtime.summoned
      ? `
              ${renderSlotRing({
      slots: [
        {
          filled: runtime.summoned,
          clickable: !runtime.summoned,
          ready: hasArtifactSelected,
          title: runtime.summoned
            ? `${config.artifactName} consumed.`
            : hasArtifactSelected
              ? "Socket selected artifact."
              : `Select ${config.artifactName}.`,
          ariaLabel: `${config.bossName} summon socket`,
          symbolHtml: renderArtifactSymbol({
            artifactName: config.artifactName,
            className: "slot-ring-symbol artifact-symbol",
          }),
          attrs: {
            "data-node-id": config.nodeId,
            "data-node-action": config.summonAction,
            "data-artifact": selectedArtifact,
            "data-ready": hasArtifactSelected ? "true" : "false",
          },
        },
      ],
      className: "worm03-amulet-slot-ring",
      ariaLabel: `${config.bossName} summon socket`,
    })}
            `
      : !runtime.battle
        ? `
              <section class="worm-boss-prep worm-boss-prep--endbringer">
                <div class="worm-boss-prep-head">
                  <h4>${escapeHtml(config.bossName)} Terrorizes the Region</h4>
                  <p>${escapeHtml(config.prepText || `Choose two healthy capes to challenge ${config.bossName}.`)}</p>
                </div>
                <div class="worm02-loadout-slot-grid">
                  ${LOADOUT_SLOTS.map((slot, index) => loadoutSlotMarkup(config.nodeId, config.openPickerAction, slot, selectedById[loadout[index]], runtime.pickerSlot === slot.slotId, false)).join("")}
                </div>
                <div class="toolbar worm-boss-prep-actions">
                  <button type="button" data-node-id="${config.nodeId}" data-node-action="${config.startAction}" ${loadoutComplete ? "" : "disabled"}>
                    Engage ${escapeHtml(config.bossName)} (2v1)
                  </button>
                </div>
              </section>
            `
        : ""
}
        ${runtime.lastMessage ? `<p class="muted">${escapeHtml(runtime.lastMessage)}</p>` : ""}
      </section>
      ${battleMarkup(config.nodeId, runtime, config.bossName, config.resolveAction, config.resetAction, config.claimAction)}
      ${outcomePopupMarkup(config.nodeId, config.closeOutcomeAction, runtime.outcomePopup)}
      ${pickerMarkup(config.nodeId, config.closePickerAction, config.pickLoadoutAction, runtime, owned, loadout)}
    </article>
  `;
}

const WORM05_CONFIG = Object.freeze({
  nodeId: WORM05_NODE_ID,
  rootClass: "worm05-node",
  title: "Simurgh Engagement",
  introText: "A pressure front builds over the coast. Feathers of static spiral in the air.",
  solvedText: "Simurgh is down. The forecast line has gone silent.",
  bossName: "Simurgh",
  artifactName: SIMURGH_BRACELET,
  bossCard: SIMURGH_CARD,
  summonAction: "worm05-summon-simurgh",
  startAction: "worm05-start-battle",
  resolveAction: "worm05-resolve-round",
  resetAction: "worm05-reset-battle",
  claimAction: "worm05-claim-outcome",
  closeOutcomeAction: "worm05-close-outcome-popup",
  openPickerAction: "worm05-open-picker",
  closePickerAction: "worm05-close-picker",
  pickLoadoutAction: "worm05-pick-loadout",
  summonMessage: "The Simurgh descends on a screaming wind.",
  startMessage: "Simurgh sweeps into combat range.",
  retreatMessage: "You break line-of-sight and retreat.",
  victoryMessage: "Simurgh breaks apart in a storm of shattered futures.",
  prepText: "The Simurgh is scissoring through the skyline on a chorus of broken glass. Choose two capes to contest the airspace.",
  cloutReward: 420,
  lootEvents: Object.freeze([
    {
      sourceRegion: "worm",
      triggerType: "simurgh-victory",
      dropChance: 1,
      outRegionChance: 1,
      forceOutRegion: true,
      rarityBias: 1,
    },
    {
      sourceRegion: "crd",
      triggerType: "simurgh-victory",
      dropChance: 1,
      outRegionChance: 0,
      rarityBias: 0.95,
    },
    {
      sourceRegion: "dcc",
      triggerType: "simurgh-victory",
      dropChance: 1,
      outRegionChance: 0,
      rarityBias: 0.95,
    },
  ]),
});

const WORM07_CONFIG = Object.freeze({
  nodeId: WORM07_NODE_ID,
  rootClass: "worm07-node",
  title: "Behemoth Engagement",
  introText: "The ground splits under red light. Heat distorts every edge of the horizon.",
  solvedText: "Behemoth is defeated. The seismic storm has ended.",
  bossName: "Behemoth",
  artifactName: BEHEMOTH_ANKLET,
  bossCard: BEHEMOTH_CARD,
  summonAction: "worm07-summon-behemoth",
  startAction: "worm07-start-battle",
  resolveAction: "worm07-resolve-round",
  resetAction: "worm07-reset-battle",
  claimAction: "worm07-claim-outcome",
  closeOutcomeAction: "worm07-close-outcome-popup",
  openPickerAction: "worm07-open-picker",
  closePickerAction: "worm07-close-picker",
  pickLoadoutAction: "worm07-pick-loadout",
  summonMessage: "Behemoth tears up through molten stone.",
  startMessage: "Behemoth begins the endgame clash.",
  retreatMessage: "You fall back from the lava line.",
  victoryMessage: "Behemoth falls, and the earth finally stills.",
  prepText: "Behemoth is ripping the battlefield apart with heat bloom and seismic force. Choose two capes to hold the line.",
  cloutReward: 640,
  lootEvents: Object.freeze([
    {
      sourceRegion: "worm",
      triggerType: "behemoth-victory",
      dropChance: 1,
      outRegionChance: 1,
      forceOutRegion: true,
      rarityBias: 1,
    },
    {
      sourceRegion: "crd",
      triggerType: "behemoth-victory",
      dropChance: 1,
      outRegionChance: 0,
      rarityBias: 1,
    },
    {
      sourceRegion: "dcc",
      triggerType: "behemoth-victory",
      dropChance: 1,
      outRegionChance: 0,
      rarityBias: 1,
    },
  ]),
});

export function initialWorm05Runtime() {
  return normalizeBossRuntime({
    summoned: false,
    battle: null,
    orderPrefs: {},
    solved: false,
    pendingCloutAward: 0,
    lootEvents: [],
    outcomePopup: null,
    lastMessage: "",
  });
}

export function synchronizeWorm05Runtime(runtime) {
  return normalizeBossRuntime(runtime);
}

export function validateWorm05Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceWorm05Runtime(runtime, action, context = {}) {
  const current = normalizeBossRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }
  return reduceBossRuntime(current, action, context, WORM05_CONFIG);
}

export function buildWorm05ActionFromElement(element, runtime) {
  return buildBossActionFromElement(element, runtime, WORM05_CONFIG);
}

export function renderWorm05Experience(context) {
  return renderBossExperience(context, WORM05_CONFIG);
}

export const WORM05_NODE_EXPERIENCE = {
  nodeId: WORM05_NODE_ID,
  initialState: initialWorm05Runtime,
  synchronizeRuntime: synchronizeWorm05Runtime,
  render: renderWorm05Experience,
  reduceRuntime: reduceWorm05Runtime,
  validateRuntime: validateWorm05Runtime,
  buildActionFromElement: buildWorm05ActionFromElement,
};

function normalizeWorm06Runtime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  return {
    introSeen: Boolean(source.introSeen),
    battle: normalizeBattle(source.battle),
    battleMode: safeText(source.battleMode).toLowerCase() === "boss" ? "boss" : "cleanup",
    activeDifficulty: normalizeDifficulty(source.activeDifficulty),
    orderPrefs: source.orderPrefs && typeof source.orderPrefs === "object" ? source.orderPrefs : {},
    pendingCloutReward: Math.max(0, Number(source.pendingCloutReward) || 0),
    pendingCloutAward: Math.max(0, Number(source.pendingCloutAward) || 0),
    bossCleared: Boolean(source.bossCleared),
    solved: Boolean(source.solved),
    lootEvents: Array.isArray(source.lootEvents) ? source.lootEvents.filter((entry) => entry && typeof entry === "object") : [],
    outcomePopup: source.outcomePopup && typeof source.outcomePopup === "object" ? { ...source.outcomePopup } : null,
    lastMessage: safeText(source.lastMessage),
  };
}

function chooseNationalCleanupEnemies(difficulty) {
  const config = WORM06_DIFFICULTY_CONFIG[difficulty] || WORM06_DIFFICULTY_CONFIG.easy;
  const draws = wormDrawWindowPack(2, {
    weightBase: config.weightBase,
    minRarity: 6,
    maxRarity: 10,
  }).map((card) => ({ ...card }));

  while (draws.length < 2) {
    const fallback = wormDrawWindowPack(1, {
      weightBase: config.weightBase,
      minRarity: 6,
      maxRarity: 10,
    })[0];
    if (!fallback) {
      break;
    }
    draws.push({ ...fallback });
  }

  if (draws.length < 2) {
    const fallbackElites = [
      {
        id: "worm-cleanup-elite-1",
        heroName: "National Threat Vector",
        power: "High-output composite cape profile adapted for disaster zones.",
        powerFull: "A high-output cape profile assembled from elite regional threats.",
        attack: 12,
        defense: 11,
        endurance: 13,
        info: 9,
        manipulation: 9,
        range: 11,
        speed: 10,
        stealth: 8,
        rarity: 6.3,
        rarityTier: "legendary",
      },
      {
        id: "worm-cleanup-elite-2",
        heroName: "Continental Breaker",
        power: "Escalation-class combatant built for prolonged front-line destruction.",
        powerFull: "An escalation-class combatant profile with sustained offense and endurance.",
        attack: 13,
        defense: 12,
        endurance: 14,
        info: 8,
        manipulation: 8,
        range: 10,
        speed: 9,
        stealth: 7,
        rarity: 6.6,
        rarityTier: "legendary",
      },
    ];
    for (const card of fallbackElites) {
      if (draws.length >= 2) {
        break;
      }
      draws.push({ ...card });
    }
  }

  return draws.map((card, index) => randomEnhanceCard(card, Date.now() + index * 37, 3));
}

function triumvirateCards() {
  const names = ["Eidolon", "Alexandria", "Legend"];
  const fallback = {
    Eidolon: {
      id: "worm-boss-eidolon",
      heroName: "Eidolon",
      power: "Adaptive power suite that shifts to meet threats.",
      powerFull: "Eidolon deploys shifting power sets with massive versatility and pressure.",
      attack: 15,
      defense: 14,
      endurance: 16,
      info: 12,
      manipulation: 12,
      range: 14,
      speed: 11,
      stealth: 8,
      rarity: 9.2,
      rarityTier: "mythic",
    },
    Alexandria: {
      id: "worm-boss-alexandria",
      heroName: "Alexandria",
      power: "Invulnerable brute with overwhelming speed and force.",
      powerFull: "Alexandria combines near-invulnerability, flight, and crushing physical dominance.",
      attack: 14,
      defense: 17,
      endurance: 18,
      info: 9,
      manipulation: 8,
      range: 9,
      speed: 14,
      stealth: 6,
      rarity: 9,
      rarityTier: "mythic",
    },
    Legend: {
      id: "worm-boss-legend",
      heroName: "Legend",
      power: "High-velocity flight and precision energy projection.",
      powerFull: "Legend controls the battlefield with speed, angles, and continuous energy-fire pressure.",
      attack: 16,
      defense: 12,
      endurance: 14,
      info: 11,
      manipulation: 9,
      range: 18,
      speed: 16,
      stealth: 9,
      rarity: 9.1,
      rarityTier: "mythic",
    },
  };

  return names.map((name, index) => {
    const catalog = catalogCardByName(name);
    const base = catalog ? { ...catalog } : { ...fallback[name] };
    return randomEnhanceCard(base, Date.now() + index * 53, 5);
  });
}

export function initialWorm06Runtime() {
  return normalizeWorm06Runtime({
    introSeen: false,
    battle: null,
    battleMode: "cleanup",
    activeDifficulty: "easy",
    orderPrefs: {},
    pendingCloutReward: 0,
    pendingCloutAward: 0,
    bossCleared: false,
    solved: false,
    lootEvents: [],
    outcomePopup: null,
    lastMessage: "",
  });
}

export function synchronizeWorm06Runtime(runtime) {
  return normalizeWorm06Runtime(runtime);
}

export function validateWorm06Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceWorm06Runtime(runtime, action, context = {}) {
  const current = normalizeWorm06Runtime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "worm06-ack-intro") {
    return {
      ...current,
      introSeen: true,
    };
  }

  if (action.type === "worm06-start-job") {
    if (current.solved) {
      return current;
    }
    const difficulty = normalizeDifficulty(action.difficulty);
    const wormState = normalizeWormSystemState(
      context && context.state && context.state.systems ? context.state.systems.worm : {},
      Date.now(),
    );
    const playerCards = topPlayerCards(wormState, context.state || {});
    if (playerCards.length < 2) {
      return {
        ...current,
        lastMessage: "You need two healthy capes for national cleanup jobs.",
      };
    }

    const enemies = chooseNationalCleanupEnemies(difficulty);
    const battle = createWormBattleState({
      playerCards,
      enemyCards: enemies,
      seed: Date.now() >>> 0,
      enemyAiMode: "boss",
    });

    const baseClout = Math.max(1, Number(action.baseCloutReward) || 60);
    const mult = WORM06_DIFFICULTY_CONFIG[difficulty].cloutMult;

    return {
      ...current,
      introSeen: true,
      battle,
      battleMode: "cleanup",
      activeDifficulty: difficulty,
      orderPrefs: {},
      pendingCloutReward: Math.round(baseClout * mult),
      outcomePopup: null,
      lastMessage: `${WORM06_DIFFICULTY_CONFIG[difficulty].label} initiated.`,
    };
  }

  if (action.type === "worm06-start-bosses") {
    if (current.solved || current.bossCleared || current.battle) {
      return current;
    }
    const wormState = normalizeWormSystemState(
      context && context.state && context.state.systems ? context.state.systems.worm : {},
      Date.now(),
    );
    const playerCards = topPlayerCards(wormState, context.state || {});
    if (playerCards.length < 2) {
      return {
        ...current,
        lastMessage: "You need two healthy capes to challenge the Triumvirate.",
      };
    }

    return {
      ...current,
      introSeen: true,
      battle: createWormBattleState({
        playerCards,
        enemyCards: triumvirateCards(),
        maxEnemyCards: 3,
        seed: Date.now() >>> 0,
        enemyAiMode: "boss",
      }),
      battleMode: "boss",
      orderPrefs: {},
      pendingCloutReward: 0,
      outcomePopup: null,
      lastMessage: "Triumvirate confrontation begins.",
    };
  }

  if (action.type === "worm06-resolve-round") {
    if (!current.battle || current.battle.winner) {
      return current;
    }
    const orders = action.orders && typeof action.orders === "object" ? action.orders : {};
    const nextBattle = resolveWormRound(current.battle, {
      playerOrders: orders,
    });
    return {
      ...current,
      battle: nextBattle,
      orderPrefs: normalizeOrderPrefs(orders, nextBattle),
      lastMessage: nextBattle.winner
        ? nextBattle.winner === "player"
          ? "National objective complete. Claim outcome."
          : "Your team is overrun."
        : current.lastMessage,
    };
  }

  if (action.type === "worm06-reset-battle") {
    return {
      ...current,
      battle: null,
      battleMode: "cleanup",
      orderPrefs: {},
      pendingCloutReward: 0,
      outcomePopup: null,
      lastMessage: "You disengage from the current operation.",
    };
  }

  if (action.type === "worm06-close-outcome-popup") {
    return {
      ...current,
      outcomePopup: null,
    };
  }

  if (action.type === "worm06-claim-outcome") {
    if (!current.battle || !current.battle.winner) {
      return current;
    }
    const won = current.battle.winner === "player";
    const isBoss = current.battleMode === "boss";
    return {
      ...current,
      battle: null,
      orderPrefs: {},
      battleMode: "cleanup",
      bossCleared: current.bossCleared || (won && isBoss),
      solved: current.solved || (won && isBoss),
      pendingCloutAward: won ? (isBoss ? 950 : current.pendingCloutReward) : 0,
      pendingCloutReward: 0,
      lootEvents: won
        ? isBoss
          ? [
            {
              sourceRegion: "worm",
              triggerType: "national-cleanup-boss",
              dropChance: 1,
              outRegionChance: 1,
              forceOutRegion: true,
              rarityBias: 1,
            },
            {
              sourceRegion: "crd",
              triggerType: "national-cleanup-boss",
              dropChance: 1,
              outRegionChance: 0,
              rarityBias: 1,
            },
            {
              sourceRegion: "dcc",
              triggerType: "national-cleanup-boss",
              dropChance: 1,
              outRegionChance: 0,
              rarityBias: 1,
            },
          ]
          : [
            {
              sourceRegion: "worm",
              triggerType: "national-cleanup-job",
              dropChance: 0.65,
              outRegionChance: 0.45,
              rarityBias: 0.9,
            },
          ]
        : [],
      outcomePopup: {
        title: won ? (isBoss ? "Triumvirate Defeated" : "Cleanup Complete") : "Mission Failed",
        lines: won
          ? [
            isBoss ? "The Triumvirate falls back under concentrated pressure." : "National response teams regain ground.",
            isBoss ? "A boss clear has been recorded." : "Field gains were secured on this run.",
          ]
          : ["No clout awarded.", "No artifact rewards.", "Regroup and retry."],
      },
      lastMessage: won
        ? isBoss
          ? "Triumvirate defeated. National cleanup secured."
          : "Cleanup mission successful."
        : "Mission failed.",
    };
  }

  return current;
}

export function buildWorm06ActionFromElement(element, runtime) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  const surface = element.closest(".worm06-node");
  if (!surface) {
    return null;
  }
  if (actionName === "worm06-ack-intro") {
    return { type: "worm06-ack-intro", at: Date.now() };
  }
  if (actionName === "worm06-start-job") {
    return {
      type: "worm06-start-job",
      difficulty: element.getAttribute("data-difficulty") || "easy",
      baseCloutReward: Number(element.getAttribute("data-base-clout-reward") || 60),
      at: Date.now(),
    };
  }
  if (actionName === "worm06-start-bosses") {
    return {
      type: "worm06-start-bosses",
      at: Date.now(),
    };
  }
  if (actionName === "worm06-reset-battle") {
    return {
      type: "worm06-reset-battle",
      at: Date.now(),
    };
  }
  if (actionName === "worm06-close-outcome-popup") {
    return {
      type: "worm06-close-outcome-popup",
      at: Date.now(),
    };
  }
  if (actionName === "worm06-claim-outcome") {
    const current = normalizeWorm06Runtime(runtime);
    return {
      type: "worm06-claim-outcome",
      winner: current && current.battle ? current.battle.winner : "",
      playerResults: toBattleResults(current),
      at: Date.now(),
    };
  }
  if (actionName === "worm06-resolve-round") {
    return {
      type: "worm06-resolve-round",
      orders: gatherOrdersFromSurface(surface),
      at: Date.now(),
    };
  }
  return null;
}

export function renderWorm06Experience(context) {
  const runtime = normalizeWorm06Runtime(context.runtime);
  const baseReward = 60;
  const enemyHeading = runtime.battleMode === "boss" ? "Triumvirate" : "National Targets";
  return `
    <article class="worm06-node" data-node-id="${WORM06_NODE_ID}">
      <section class="card">
        <h3>National Cleanup</h3>
        ${
  !runtime.introSeen
    ? `
              <p>Brockton Bay was only the beginning. You now stabilize crisis zones nationwide.</p>
              <button type="button" data-node-id="${WORM06_NODE_ID}" data-node-action="worm06-ack-intro">Begin National Cleanup</button>
            `
    : `
              <p><strong>Status:</strong> ${runtime.bossCleared ? "Triumvirate defeated" : "Operations ongoing"}</p>
              <div class="toolbar">
                <button type="button" data-node-id="${WORM06_NODE_ID}" data-node-action="worm06-start-job" data-difficulty="easy" data-base-clout-reward="${escapeHtml(String(baseReward))}" ${runtime.battle || runtime.solved ? "disabled" : ""}>Easy Cleanup</button>
                <button type="button" data-node-id="${WORM06_NODE_ID}" data-node-action="worm06-start-job" data-difficulty="medium" data-base-clout-reward="${escapeHtml(String(baseReward))}" ${runtime.battle || runtime.solved ? "disabled" : ""}>Medium Cleanup</button>
                <button type="button" data-node-id="${WORM06_NODE_ID}" data-node-action="worm06-start-job" data-difficulty="hard" data-base-clout-reward="${escapeHtml(String(baseReward))}" ${runtime.battle || runtime.solved ? "disabled" : ""}>Hard Cleanup</button>
                <button type="button" data-node-id="${WORM06_NODE_ID}" data-node-action="worm06-start-bosses" ${runtime.battle || runtime.bossCleared ? "disabled" : ""}>Fight The Bosses</button>
              </div>
            `
}
        ${runtime.lastMessage ? `<p class="muted">${escapeHtml(runtime.lastMessage)}</p>` : ""}
      </section>
      ${battleMarkup(WORM06_NODE_ID, runtime, enemyHeading, "worm06-resolve-round", "worm06-reset-battle", "worm06-claim-outcome")}
      ${outcomePopupMarkup(WORM06_NODE_ID, "worm06-close-outcome-popup", runtime.outcomePopup)}
    </article>
  `;
}

export const WORM06_NODE_EXPERIENCE = {
  nodeId: WORM06_NODE_ID,
  initialState: initialWorm06Runtime,
  synchronizeRuntime: synchronizeWorm06Runtime,
  render: renderWorm06Experience,
  reduceRuntime: reduceWorm06Runtime,
  validateRuntime: validateWorm06Runtime,
  buildActionFromElement: buildWorm06ActionFromElement,
};

export function initialWorm07Runtime() {
  return normalizeBossRuntime({
    summoned: false,
    battle: null,
    orderPrefs: {},
    solved: false,
    pendingCloutAward: 0,
    lootEvents: [],
    outcomePopup: null,
    lastMessage: "",
  });
}

export function synchronizeWorm07Runtime(runtime) {
  return normalizeBossRuntime(runtime);
}

export function validateWorm07Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceWorm07Runtime(runtime, action, context = {}) {
  const current = normalizeBossRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }
  return reduceBossRuntime(current, action, context, WORM07_CONFIG);
}

export function buildWorm07ActionFromElement(element, runtime) {
  return buildBossActionFromElement(element, runtime, WORM07_CONFIG);
}

export function renderWorm07Experience(context) {
  return renderBossExperience(context, WORM07_CONFIG);
}

export const WORM07_NODE_EXPERIENCE = {
  nodeId: WORM07_NODE_ID,
  initialState: initialWorm07Runtime,
  synchronizeRuntime: synchronizeWorm07Runtime,
  render: renderWorm07Experience,
  reduceRuntime: reduceWorm07Runtime,
  validateRuntime: validateWorm07Runtime,
  buildActionFromElement: buildWorm07ActionFromElement,
};

function normalizeWorm08Runtime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const sockets = source.sockets && typeof source.sockets === "object" ? source.sockets : {};
  return {
    sockets: {
      leviathan: Boolean(sockets.leviathan),
      simurgh: Boolean(sockets.simurgh),
      behemoth: Boolean(sockets.behemoth),
    },
    battle: normalizeBattle(source.battle),
    playerLoadout: Array.isArray(source.playerLoadout)
      ? source.playerLoadout.map((cardId) => safeText(cardId)).slice(0, 2)
      : [],
    pickerSlot: LOADOUT_SLOTS.some((entry) => entry.slotId === source.pickerSlot) ? source.pickerSlot : "",
    orderPrefs: source.orderPrefs && typeof source.orderPrefs === "object" ? source.orderPrefs : {},
    solved: Boolean(source.solved),
    pendingCloutAward: Math.max(0, Number(source.pendingCloutAward) || 0),
    lootEvents: Array.isArray(source.lootEvents) ? source.lootEvents.filter((entry) => entry && typeof entry === "object") : [],
    outcomePopup: source.outcomePopup && typeof source.outcomePopup === "object" ? { ...source.outcomePopup } : null,
    lastMessage: safeText(source.lastMessage),
  };
}

function sigilMeta() {
  return [
    { key: "leviathan", artifact: LEVIATHAN_SIGIL },
    { key: "simurgh", artifact: SIMURGH_SIGIL },
    { key: "behemoth", artifact: BEHEMOTH_SIGIL },
  ];
}

function canStartScion(runtime) {
  return runtime.sockets.leviathan && runtime.sockets.simurgh && runtime.sockets.behemoth;
}

export function initialWorm08Runtime() {
  return normalizeWorm08Runtime({
    sockets: { leviathan: false, simurgh: false, behemoth: false },
    battle: null,
    orderPrefs: {},
    solved: false,
    pendingCloutAward: 0,
    lootEvents: [],
    outcomePopup: null,
    lastMessage: "",
  });
}

export function synchronizeWorm08Runtime(runtime) {
  return normalizeWorm08Runtime(runtime);
}

export function validateWorm08Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceWorm08Runtime(runtime, action, context = {}) {
  const current = normalizeWorm08Runtime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "worm08-open-picker") {
    return {
      ...current,
      pickerSlot: LOADOUT_SLOTS.some((entry) => entry.slotId === action.slotId) ? action.slotId : "",
    };
  }

  if (action.type === "worm08-close-picker") {
    return {
      ...current,
      pickerSlot: "",
    };
  }

  if (action.type === "worm08-pick-loadout") {
    const slot = LOADOUT_SLOTS.some((entry) => entry.slotId === action.slotId) ? action.slotId : "";
    const cardId = safeText(action.cardId);
    if (!slot || !cardId) {
      return current;
    }
    const nextLoadout = Array.isArray(current.playerLoadout) ? current.playerLoadout.slice(0, 2) : [];
    while (nextLoadout.length < 2) {
      nextLoadout.push("");
    }
    const slotIndex = LOADOUT_SLOTS.findIndex((entry) => entry.slotId === slot);
    if (slotIndex < 0) {
      return current;
    }
    const otherIndex = slotIndex === 0 ? 1 : 0;
    if (nextLoadout[otherIndex] === cardId) {
      nextLoadout[otherIndex] = "";
    }
    nextLoadout[slotIndex] = cardId;
    return {
      ...current,
      playerLoadout: nextLoadout,
      pickerSlot: "",
    };
  }

  if (action.type === "worm08-socket-sigil") {
    const key = safeText(action.sigilType).toLowerCase();
    if (!["leviathan", "simurgh", "behemoth"].includes(key)) {
      return current;
    }
    if (!action.ready) {
      return {
        ...current,
        lastMessage: "The socket rejects the selected artifact.",
      };
    }
    return {
      ...current,
      sockets: {
        ...current.sockets,
        [key]: true,
      },
      lastMessage: "Sigil socketed.",
    };
  }

  if (action.type === "worm08-start-battle") {
    if (current.solved || current.battle || !canStartScion(current)) {
      return current;
    }
    const requestedPlayerCards = Array.isArray(action.playerCards) ? action.playerCards : [];
    const bonusesByCardId = action.capeBonusesByCardId && typeof action.capeBonusesByCardId === "object"
      ? action.capeBonusesByCardId
      : {};
    const requestedLoadout = requestedPlayerCards.length
      ? requestedPlayerCards.map((entry) => safeText(entry.cardId)).slice(0, 2)
      : current.playerLoadout;
    const playerCards = requestedPlayerCards
      .map((entry) => {
        const cardId = safeText(entry && entry.cardId);
        const card = loadWormCardCatalog().find((candidate) => safeText(candidate.id) === cardId);
        if (!card) {
          return null;
        }
        const currentHp = Number(entry && entry.currentHp);
        const bonus = bonusesByCardId[cardId] || getWormCapeLootBonuses(context.state || {}, cardId, Date.now());
        return applyCardBonus({
          ...card,
          currentHp: Number.isFinite(currentHp) ? Math.max(0, Math.round(currentHp)) : undefined,
        }, bonus);
      })
      .filter((card) => card && typeof card === "object")
      .slice(0, 2);
    if (playerCards.length < 2) {
      return {
        ...current,
        lastMessage: "You need two healthy capes to face Scion.",
      };
    }
    return {
      ...current,
      playerLoadout: requestedLoadout,
      pickerSlot: "",
      battle: createWormBattleState({
        playerCards,
        enemyCards: [SCION_CARD],
        seed: Date.now() >>> 0,
        enemyAiMode: "boss",
      }),
      orderPrefs: {},
      outcomePopup: null,
      lastMessage: "Scion enters the field.",
    };
  }

  if (action.type === "worm08-resolve-round") {
    if (!current.battle || current.battle.winner) {
      return current;
    }
    const orders = action.orders && typeof action.orders === "object" ? action.orders : {};
    const nextBattle = resolveWormRound(current.battle, {
      playerOrders: orders,
    });
    return {
      ...current,
      battle: nextBattle,
      orderPrefs: normalizeOrderPrefs(orders, nextBattle),
      lastMessage: nextBattle.winner
        ? nextBattle.winner === "player"
          ? "Impossible. Scion falls. Claim outcome."
          : "Scion erases the line."
        : current.lastMessage,
    };
  }

  if (action.type === "worm08-reset-battle") {
    return {
      ...current,
      battle: null,
      pickerSlot: "",
      orderPrefs: {},
      outcomePopup: null,
      lastMessage: "You retreat before total collapse.",
    };
  }

  if (action.type === "worm08-close-outcome-popup") {
    return {
      ...current,
      outcomePopup: null,
    };
  }

  if (action.type === "worm08-claim-outcome") {
    if (!current.battle || !current.battle.winner) {
      return current;
    }
    const won = current.battle.winner === "player";
    return {
      ...current,
      battle: null,
      pickerSlot: "",
      orderPrefs: {},
      solved: won || current.solved,
      pendingCloutAward: won ? 1600 : 0,
      lootEvents: won
        ? [
          {
            sourceRegion: "worm",
            triggerType: "scion-victory",
            dropChance: 1,
            outRegionChance: 1,
            forceOutRegion: true,
            rarityBias: 1,
          },
          {
            sourceRegion: "crd",
            triggerType: "scion-victory",
            dropChance: 1,
            outRegionChance: 0,
            rarityBias: 1,
          },
          {
            sourceRegion: "dcc",
            triggerType: "scion-victory",
            dropChance: 1,
            outRegionChance: 0,
            rarityBias: 1,
          },
        ]
        : [],
      outcomePopup: {
        title: won ? "Scion Defeated" : "Scion Overwhelmed Your Team",
        lines: won
          ? [
            "Against all expectation, the golden man falls.",
            "The field is yours at last.",
          ]
          : ["No clout awarded.", "No artifact rewards.", "Retreat and rebuild."],
      },
      lastMessage: won ? "Scion is defeated. Against all expectation." : "Defeat recorded.",
    };
  }

  return current;
}

export function buildWorm08ActionFromElement(element, runtime) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  const surface = element.closest(".worm08-node");
  if (!surface) {
    return null;
  }

  if (actionName === "worm08-socket-sigil") {
    return {
      type: "worm08-socket-sigil",
      sigilType: element.getAttribute("data-sigil-type") || "",
      artifact: element.getAttribute("data-artifact") || "",
      ready: element.getAttribute("data-ready") === "true",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-open-picker") {
    return {
      type: "worm08-open-picker",
      slotId: element.getAttribute("data-slot-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-close-picker") {
    return {
      type: "worm08-close-picker",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-pick-loadout") {
    return {
      type: "worm08-pick-loadout",
      slotId: element.getAttribute("data-slot-id") || "",
      cardId: element.getAttribute("data-card-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-start-battle") {
    const payload = LOADOUT_SLOTS.map((slot) => {
      const slotEl = surface.querySelector(`[data-boss-loadout-slot="${slot.slotId}"]`);
      const cardId = safeText(slotEl && slotEl.getAttribute("data-card-id"));
      const currentHp = Number(slotEl && slotEl.getAttribute("data-current-hp"));
      return {
        cardId,
        currentHp: Number.isFinite(currentHp) ? Math.max(0, Math.round(currentHp)) : 0,
      };
    });
    return {
      type: "worm08-start-battle",
      playerCards: payload,
      at: Date.now(),
    };
  }
  if (actionName === "worm08-reset-battle") {
    return {
      type: "worm08-reset-battle",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-close-outcome-popup") {
    return {
      type: "worm08-close-outcome-popup",
      at: Date.now(),
    };
  }
  if (actionName === "worm08-claim-outcome") {
    const current = normalizeWorm08Runtime(runtime);
    return {
      type: "worm08-claim-outcome",
      winner: current && current.battle ? current.battle.winner : "",
      playerResults: toBattleResults(current),
      at: Date.now(),
    };
  }
  if (actionName === "worm08-resolve-round") {
    return {
      type: "worm08-resolve-round",
      orders: gatherOrdersFromSurface(surface),
      at: Date.now(),
    };
  }

  return null;
}

export function renderWorm08Experience(context) {
  const runtime = normalizeWorm08Runtime(context.runtime);
  const selectedArtifact = safeText(context.selectedArtifactReward);
  const sockets = sigilMeta();
  const allSocketed = canStartScion(runtime);
  const wormState = normalizeWormSystemState(context.state.systems.worm, Date.now());
  const owned = wormOwnedCards(wormState, Date.now()).filter((entry) => Number(entry.currentHp || 0) > 0);
  const loadout = ensureLoadout(runtime, owned.map((entry) => entry.cardId));
  const selectedById = loadoutEntryById(owned);
  const loadoutComplete = loadout.every((cardId) => Boolean(cardId));

  const ringSlots = sockets.map((entry) => {
    const filled = Boolean(runtime.sockets[entry.key]);
    const ready = !filled && selectedArtifact === entry.artifact;
    return {
      filled,
      clickable: !filled,
      ready,
      title: filled ? `${entry.artifact} socketed.` : entry.artifact,
      ariaLabel: `${entry.artifact} socket`,
      symbolHtml: filled
        ? renderArtifactSymbol({ artifactName: entry.artifact, className: "slot-ring-symbol artifact-symbol" })
        : "",
      attrs: {
        "data-node-id": WORM08_NODE_ID,
        "data-node-action": "worm08-socket-sigil",
        "data-sigil-type": entry.key,
        "data-artifact": selectedArtifact,
        "data-ready": ready ? "true" : "false",
      },
    };
  });

  return `
    <article class="worm08-node" data-node-id="${WORM08_NODE_ID}">
      <section class="card">
        <h3>Scion</h3>
        <p>The final light waits above a ruined sky. Three Endbringer sigils must lock before it descends.</p>
        ${
          !allSocketed
            ? renderSlotRing({
                slots: ringSlots,
                className: "worm08-sigil-ring",
                ariaLabel: "Scion gate sigils",
                radiusPct: 42,
              })
            : ""
        }
        ${
          allSocketed && !runtime.solved && !runtime.battle
            ? `
        <section class="worm-boss-prep worm-boss-prep--scion">
          <div class="worm-boss-prep-head">
            <h4>Scion Descends</h4>
            <p>The golden light is burning through the sky itself. Choose two healthy capes for the last stand.</p>
          </div>
          <div class="worm02-loadout-slot-grid">
            ${LOADOUT_SLOTS.map((slot, index) => loadoutSlotMarkup(WORM08_NODE_ID, "worm08-open-picker", slot, selectedById[loadout[index]], runtime.pickerSlot === slot.slotId, false)).join("")}
          </div>
          <div class="toolbar worm-boss-prep-actions">
            <button type="button" data-node-id="${WORM08_NODE_ID}" data-node-action="worm08-start-battle" ${loadoutComplete ? "" : "disabled"}>Challenge Scion (2v1)</button>
          </div>
        </section>
      `
            : ""
        }
        ${runtime.lastMessage ? `<p class="muted">${escapeHtml(runtime.lastMessage)}</p>` : ""}
      </section>
      ${battleMarkup(WORM08_NODE_ID, runtime, "Scion", "worm08-resolve-round", "worm08-reset-battle", "worm08-claim-outcome")}
      ${outcomePopupMarkup(WORM08_NODE_ID, "worm08-close-outcome-popup", runtime.outcomePopup)}
      ${pickerMarkup(WORM08_NODE_ID, "worm08-close-picker", "worm08-pick-loadout", runtime, owned, loadout)}
    </article>
  `;
}

export const WORM08_NODE_EXPERIENCE = {
  nodeId: WORM08_NODE_ID,
  initialState: initialWorm08Runtime,
  synchronizeRuntime: synchronizeWorm08Runtime,
  render: renderWorm08Experience,
  reduceRuntime: reduceWorm08Runtime,
  validateRuntime: validateWorm08Runtime,
  buildActionFromElement: buildWorm08ActionFromElement,
};
