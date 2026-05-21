import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderWormCard } from "./wormCardRenderer.js";
import { wormCardById } from "./wormData.js";
import {
  BASIC_HIRE_COST,
  SICKBAY_HEAL_FRACTION_PER_MINUTE,
  normalizeWormSystemState,
  wormDrawBasicWindowCard,
  wormDrawWindowCard,
  wormOwnedCards,
  wormSpecialHiringWindows,
  wormStarterDraftCards,
} from "../../systems/wormDeck.js";
import { prestigeModifiersFromState } from "../../systems/prestige.js";
import {
  formatDurationRemaining,
  formatLootItemEffectSummary,
  getWormActiveHiringBoosts,
  getWormCapeLootBonuses,
  getWormCapeShardSummaryEntries,
  getWormHiringWeightModifier,
  getWormShardSlotCount,
  getWormSickbaySlotCount,
  lootInventoryFromState,
} from "../../systems/loot.js";
import { renderSlotRing } from "../../ui/slotRing.js";

const NODE_ID = "WORM01";
const PANELS = Object.freeze({
  deck: "deck",
  sickbay: "sickbay",
  jobs: "jobs",
  compactifier: "compactifier",
});
const POPUPS = Object.freeze({
  none: "",
  cape: "cape-shards",
  compactPicker: "compact-picker",
  compactStat: "compact-stat",
});

function safeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const panelCandidate = safeText(source.panel).toLowerCase();
  const panel = Object.values(PANELS).includes(panelCandidate) ? panelCandidate : PANELS.deck;
  const popupCandidate = safeText(source.popup).toLowerCase();
  const popup = Object.values(POPUPS).includes(popupCandidate) ? popupCandidate : POPUPS.none;

  const selectedStarterIds = Array.isArray(source.selectedStarterIds)
    ? source.selectedStarterIds.map((cardId) => safeText(cardId)).filter((cardId) => cardId).slice(0, 2)
    : [];

  return {
    panel,
    popup,
    selectedStarterIds,
    shardPopupCardId: safeText(source.shardPopupCardId),
    selectedLootItemId: safeText(source.selectedLootItemId),
    compactifierCardId: safeText(source.compactifierCardId),
    lastPulledCardId: safeText(source.lastPulledCardId),
    pullPopupCardId: safeText(source.pullPopupCardId),
    solved: Boolean(source.solved),
    lastMessage: safeText(source.lastMessage),
  };
}

function hpSummary(currentHp, maxHp) {
  const percent = maxHp > 0 ? Math.round((Math.max(0, currentHp) / maxHp) * 100) : 0;
  return `${Math.max(0, Math.round(currentHp))}/${Math.max(1, Math.round(maxHp))} (${percent}%)`;
}

function minutesToFull(entry) {
  if (!entry) {
    return 0;
  }
  const remainingHp = Math.max(0, Number(entry.maxHp || 0) - Number(entry.currentHp || 0));
  if (!remainingHp) {
    return 0;
  }
  const healPerMinute = Math.max(1, Number(entry.healPerMinute || 0) || (Number(entry.maxHp || 0) * SICKBAY_HEAL_FRACTION_PER_MINUTE));
  return remainingHp / healPerMinute;
}

function formatCountdownFromMinutes(minutes) {
  const totalSeconds = Math.max(0, Math.ceil(Number(minutes || 0) * 60));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function starterDraftCardMarkup(card, selected) {
  return `
    <button
      type="button"
      class="worm01-starter-pick ${selected ? "is-selected" : ""}"
      data-node-id="${NODE_ID}"
      data-node-action="worm01-toggle-starter"
      data-card-id="${escapeHtml(card.id)}"
    >
      ${renderWormCard(card, { role: "player" })}
    </button>
  `;
}

function renderStarterDraft(runtime, wormState) {
  const starters = wormStarterDraftCards();
  const selectedSet = new Set(runtime.selectedStarterIds);
  const picked = runtime.selectedStarterIds.length;
  const canConfirm = picked === 2;

  return `
    <section class="card worm01-onboarding">
      <h3>The Undersiders' Loft</h3>
      <p>You are now managing a team of capes. Choose two starters to establish your first roster.</p>
      <p class="muted">Pick exactly two: Chubster, Chuckles, Cinderhands, Glace.</p>
      <div class="worm01-starter-grid">
        ${starters.map((card) => starterDraftCardMarkup(card, selectedSet.has(card.id))).join("")}
      </div>
      <div class="worm01-starter-footer">
        <p><strong>Selected:</strong> ${picked}/2</p>
        <button
          type="button"
          data-node-id="${NODE_ID}"
          data-node-action="worm01-confirm-starters"
          ${canConfirm ? "" : "disabled"}
        >
          Confirm Starters
        </button>
      </div>
      ${wormState.startersConfirmed ? `<p class="key-hint">Starters already locked in.</p>` : ""}
    </section>
  `;
}

function panelButton(panelId, active) {
  const label = panelId === PANELS.deck
    ? "Deck"
    : panelId === PANELS.sickbay
      ? "Sickbay"
      : panelId === PANELS.compactifier
        ? "Cape Compactifier"
        : "Job Board";
  return `
    <button
      type="button"
      class="${active ? "" : "ghost"}"
      data-node-id="${NODE_ID}"
      data-node-action="worm01-open-panel"
      data-panel="${escapeHtml(panelId)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function compactifyDuplicateCost(density, divider = 1) {
  const baseCost = Math.max(2, Math.floor(Number(density || 1)) * 2);
  return Math.max(2, Math.ceil(baseCost / Math.max(1, Number(divider) || 1)));
}

function compactifierSelectedEntry(runtime, ownedCards) {
  const selectedId = safeText(runtime.compactifierCardId);
  return ownedCards.find((entry) => entry.cardId === selectedId) || null;
}

function compactStatFieldList(card) {
  const source = card && typeof card === "object" ? card : {};
  return [
    { key: "attack", label: "Attack", value: Number(source.attack || 0) },
    { key: "defense", label: "Defense", value: Number(source.defense || 0) },
    { key: "endurance", label: "Endurance", value: Number(source.endurance || 0) },
    { key: "info", label: "Info", value: Number(source.info || 0) },
    { key: "manipulation", label: "Manipulation", value: Number(source.manipulation || 0) },
    { key: "range", label: "Range", value: Number(source.range || 0) },
    { key: "speed", label: "Speed", value: Number(source.speed || 0) },
    { key: "stealth", label: "Stealth", value: Number(source.stealth || 0) },
  ];
}

function compactifierRadarMarkup(card) {
  const stats = compactStatFieldList(card);
  const maxValue = Math.max(1, ...stats.map((entry) => Math.max(0, entry.value)));
  const outerRadius = 39;
  const maxNormalizedRadius = outerRadius * 0.9;
  const pointFor = (index, total, radius) => {
    const angle = ((index / Math.max(1, total)) * Math.PI * 2) - (Math.PI / 2);
    return {
      x: 50 + (Math.cos(angle) * radius),
      y: 50 + (Math.sin(angle) * radius),
    };
  };
  const outerPoints = stats.map((_, index) => pointFor(index, stats.length, outerRadius));
  const polygonPoints = stats
    .map((entry, index) => {
      const ratio = Math.max(0.18, Math.min(1, entry.value / maxValue));
      const point = pointFor(index, stats.length, maxNormalizedRadius * ratio);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
  const valueLabels = stats
    .map((entry, index) => {
      const ratio = Math.max(0.18, Math.min(1, entry.value / maxValue));
      const point = pointFor(index, stats.length, Math.min(outerRadius, (maxNormalizedRadius * ratio) + 5.5));
      return `
        <text class="worm01-compact-radar-value" x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}">
          ${escapeHtml(String(Math.max(0, Math.round(entry.value))))}
        </text>
      `;
    })
    .join("");

  return `
    <svg class="worm01-compact-radar" viewBox="0 0 100 100" aria-hidden="true">
      <polygon class="worm01-compact-radar-ring" points="50,11 77.58,22.42 89,50 77.58,77.58 50,89 22.42,77.58 11,50 22.42,22.42"></polygon>
      <polygon class="worm01-compact-radar-ring is-inner" points="50,20 71.21,28.79 80,50 71.21,71.21 50,80 28.79,71.21 20,50 28.79,28.79"></polygon>
      ${outerPoints.map((point) => `<line class="worm01-compact-radar-spoke" x1="50" y1="50" x2="${point.x.toFixed(2)}" y2="${point.y.toFixed(2)}"></line>`).join("")}
      <polygon class="worm01-compact-radar-shape" points="${polygonPoints}"></polygon>
      ${valueLabels}
    </svg>
  `;
}

function compactifierSlotMarkup(runtime, ownedCards, compactifyCostDiv = 1) {
  const selected = compactifierSelectedEntry(runtime, ownedCards);
  if (!selected) {
    return `
      <button
        type="button"
        class="worm01-compact-slot is-empty"
        data-node-id="${NODE_ID}"
        data-node-action="worm01-open-compact-picker"
      >
        <span class="worm01-compact-slot-title">Cape Slot</span>
        <span class="worm01-compact-slot-empty">Select Cape</span>
      </button>
    `;
  }
  const density = Math.max(1, Number(selected.card.density || 1));
  const duplicateCost = compactifyDuplicateCost(density, compactifyCostDiv);
  return `
    <button
      type="button"
      class="worm01-compact-slot"
      data-node-id="${NODE_ID}"
      data-node-action="worm01-open-compact-picker"
    >
      <span class="worm01-compact-slot-title">Cape Slot</span>
      <span class="worm01-compact-slot-name">${escapeHtml(selected.card.heroName)}</span>
      <span class="worm02-loadout-slot-meta-line">
        <span class="worm02-loadout-meta-chip worm02-loadout-meta-chip-rarity">Density ${escapeHtml(String(density))}</span>
        <span class="worm02-loadout-meta-chip">Copies ${escapeHtml(String(selected.copies))}</span>
      </span>
      <span class="worm01-compact-slot-note">${escapeHtml(String(duplicateCost))} copies needed next</span>
    </button>
  `;
}

function compactifierPickerPopup(runtime, ownedCards, compactifyCostDiv = 1) {
  return `
    <div class="worm02-picker-overlay" role="dialog" aria-label="Select cape for compactifier">
      <section class="card worm02-picker-panel worm01-compact-picker-panel">
        <div class="worm02-picker-header">
          <div>
            <h3>Cape Compactifier</h3>
            <p class="muted">Choose the cape you want to condense. Duplicate copies fuel permanent stat growth.</p>
          </div>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="worm01-close-compact-popup">Close</button>
        </div>
        <div class="worm02-picker-grid">
          ${ownedCards.map((entry) => {
            const density = Math.max(1, Number(entry.card.density || 1));
            const duplicateCost = compactifyDuplicateCost(density, compactifyCostDiv);
            const canCompactify = Number(entry.copies || 1) >= duplicateCost;
            return `
              <button
                type="button"
                class="worm02-picker-card ${canCompactify ? "" : "is-disabled"}"
                data-node-id="${NODE_ID}"
                data-node-action="worm01-select-compact-cape"
                data-card-id="${escapeHtml(entry.cardId)}"
              >
                <strong>${escapeHtml(entry.card.heroName)}</strong>
                <span>Copies ${escapeHtml(String(entry.copies))}</span>
                <span>Density ${escapeHtml(String(density))}</span>
                <span>${escapeHtml(String(duplicateCost))} copies needed next</span>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    </div>
  `;
}

function compactifierStatPopup(runtime, ownedCards, compactifyCostDiv = 1) {
  const entry = compactifierSelectedEntry(runtime, ownedCards);
  if (!entry) {
    return "";
  }
  const density = Math.max(1, Number(entry.card.density || 1));
  const duplicateCost = compactifyDuplicateCost(density, compactifyCostDiv);
  const statOptions = compactStatFieldList(entry.card).map((option) => ({
    key: option.key,
    label: option.label,
  }));
  const ring = renderSlotRing({
    className: "worm01-compact-stat-ring",
    radiusPct: 39,
    ariaLabel: "Choose a stat to increase",
    centerHtml: `
      <div class="worm01-compact-stat-center">
        ${compactifierRadarMarkup(entry.card)}
      </div>
    `,
    slots: statOptions.map((option) => ({
      clickable: true,
      emptyHtml: `<span class="worm01-compact-stat-token">${escapeHtml(option.label)}</span>`,
      attrs: {
        "data-node-id": NODE_ID,
        "data-node-action": "worm01-compactify-cape",
        "data-card-id": entry.cardId,
        "data-stat-key": option.key,
      },
      ariaLabel: option.label,
      className: "worm01-compact-stat-slot",
    })),
  });

  return `
    <div class="worm01-shard-modal-backdrop" role="dialog" aria-label="Choose compactification stat">
      <section class="card worm01-compact-stat-modal">
        <div class="worm01-stage-header worm01-compact-stat-header">
          <div>
            <h3>Choose Stat Increase</h3>
            <p class="muted">This compactify will consume ${escapeHtml(String(duplicateCost))} total copies. Select one stat to strengthen.</p>
          </div>
          <div class="worm01-compact-stat-chip-row">
            <div class="worm01-stage-chip">${escapeHtml(entry.card.heroName)}</div>
            <div class="worm01-stage-chip">Copies ${escapeHtml(String(entry.copies))}</div>
          </div>
        </div>
        ${ring}
      </section>
    </div>
  `;
}

function renderCompactifierPanel(runtime, ownedCards, wormState, compactifyCostDiv = 1) {
  if (!wormState.compactifierUnlocked) {
    return `
      <section class="card">
        <h3>Cape Compactifier</h3>
        <p>The Compactifier has not been installed in the Loft yet.</p>
      </section>
    `;
  }

  const selected = compactifierSelectedEntry(runtime, ownedCards);
  const density = Math.max(1, Number(selected && selected.card ? selected.card.density || 1 : 1));
  const duplicateCost = compactifyDuplicateCost(density);
  const canCompactify = Boolean(selected) && Number(selected.copies || 1) >= duplicateCost;
  return `
    <section class="card worm01-compactifier-surface">
      <div class="worm01-compactifier-stage">
        <div class="worm01-compactifier-left">
          <h3>Cape Compactifier</h3>
          <p class="muted">Seat one cape in the Compactifier. If you have enough duplicates, condense them into permanent stat growth.</p>
          ${compactifierSlotMarkup(runtime, ownedCards, compactifyCostDiv)}
          <div class="toolbar">
            <button
              type="button"
              data-node-id="${NODE_ID}"
              data-node-action="worm01-begin-compactify"
              ${canCompactify ? "" : "disabled"}
            >
              Compactify
            </button>
          </div>
        </div>
        <div class="worm01-compactifier-right">
          ${
            selected
              ? renderWormCard(
                {
                  ...selected.card,
                  heroName: `${selected.card.heroName} x${selected.copies}`,
                },
                { role: "player" },
              )
              : `<div class="worm01-compactifier-empty">No cape selected.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function applyCapeLootBonusesToOwnedCards(ownedCards, wormState, lootState) {
  return (Array.isArray(ownedCards) ? ownedCards : []).map((entry) => {
    const statBonuses = getWormCapeLootBonuses(
      { systems: { worm: wormState }, inventory: { loot: lootState } },
      entry.cardId,
      Date.now(),
    );

    const boostedCard = {
      ...entry.card,
      attack: Math.max(0, Number(entry.card.attack || 0) + Math.max(0, Number(statBonuses.attack || 0))),
      defense: Math.max(0, Number(entry.card.defense || 0) + Math.max(0, Number(statBonuses.defense || 0))),
      endurance: Math.max(0, Number(entry.card.endurance || 0) + Math.max(0, Number(statBonuses.endurance || 0))),
      info: Math.max(0, Number(entry.card.info || 0) + Math.max(0, Number(statBonuses.info || 0))),
      manipulation: Math.max(0, Number(entry.card.manipulation || 0) + Math.max(0, Number(statBonuses.manipulation || 0))),
      range: Math.max(0, Number(entry.card.range || 0) + Math.max(0, Number(statBonuses.range || 0))),
      speed: Math.max(0, Number(entry.card.speed || 0) + Math.max(0, Number(statBonuses.speed || 0))),
      stealth: Math.max(0, Number(entry.card.stealth || 0) + Math.max(0, Number(statBonuses.stealth || 0))),
    };

    const boostedMaxHp = Math.max(40, Math.round(Number(boostedCard.endurance || 0) * 50));
    const boostedCurrentHp = Math.min(
      Math.max(0, Math.round(Number(entry.currentHp || 0))),
      boostedMaxHp,
    );

    return {
      ...entry,
      card: boostedCard,
      maxHp: boostedMaxHp,
      currentHp: boostedCurrentHp,
      shardBonuses: statBonuses,
    };
  });
}

function renderDeckPanel(ownedCards, wormState, maxSickbaySlots, maxShardSlotsPerCape, lootState) {
  if (!ownedCards.length) {
    return `<section class="card"><p>No capes in deck.</p></section>`;
  }
  const occupiedSickbaySlots = Array.isArray(wormState.sickbayCardIds) ? wormState.sickbayCardIds.length : 0;
  const shardSlotsByCape =
    lootState && lootState.loadouts && lootState.loadouts.worm && lootState.loadouts.worm.shardSlotsByCape
      ? lootState.loadouts.worm.shardSlotsByCape
      : {};

  return `
    <section class="worm01-card-grid">
      ${ownedCards
    .map((entry) => {
      const isFavorite = Array.isArray(wormState.favoriteCardIds) && wormState.favoriteCardIds.includes(entry.cardId);
      const inSickbay = Array.isArray(wormState.sickbayCardIds) && wormState.sickbayCardIds.includes(entry.cardId);
      const capeShardSlots = Array.isArray(shardSlotsByCape[entry.cardId]) ? shardSlotsByCape[entry.cardId] : [];
      const capeShardSlotCount = getWormShardSlotCount({ systems: { worm: wormState }, inventory: { loot: lootState } }, entry.cardId, Date.now());
      const filledShardCount = capeShardSlots.slice(0, capeShardSlotCount).filter(Boolean).length;
      const statBonuses = entry.shardBonuses || getWormCapeLootBonuses(
        { systems: { worm: wormState }, inventory: { loot: lootState } },
        entry.cardId,
        Date.now(),
      );
      const effectiveEndurance = Math.max(0, Number(entry.card.endurance || 0));
      const effectiveMaxHp = Math.max(40, Math.round(effectiveEndurance * 50));
      const effectiveCurrentHp = Math.min(
        Math.max(0, Math.round(Number(entry.currentHp || 0))),
        effectiveMaxHp,
      );
      const canSickbay = effectiveCurrentHp < effectiveMaxHp;
      const canAssignSickbay = canSickbay && (inSickbay || occupiedSickbaySlots < maxSickbaySlots);
      const shardButton = `
        <button
          type="button"
          class="worm01-shard-chip"
          data-node-id="${NODE_ID}"
          data-node-action="worm01-open-shard-popup"
          data-card-id="${escapeHtml(entry.cardId)}"
          title="Shard slots ${filledShardCount}/${capeShardSlotCount} unlocked, ${maxShardSlotsPerCape} max. Click to manage."
          aria-label="${escapeHtml(`${entry.card.heroName} shard slots`)}"
        >
          ${renderArtifactSymbol({
            artifactName: "Shard Slot",
            className: "worm01-shard-chip-symbol artifact-symbol",
          })}
        </button>
      `;
      const favoriteButton = `
        <button
          type="button"
          class="worm01-favorite-chip ${isFavorite ? "is-active" : ""}"
          data-node-id="${NODE_ID}"
          data-node-action="worm01-toggle-favorite"
          data-card-id="${escapeHtml(entry.cardId)}"
          title="${escapeHtml(isFavorite ? "Unstar cape" : "Star cape")}"
          aria-label="${escapeHtml(`${isFavorite ? "Unstar" : "Star"} ${entry.card.heroName}`)}"
        >
          ★
        </button>
      `;
      const sickbayButton = inSickbay
        ? `
            <button
              type="button"
              class="worm01-sickbay-chip is-active"
              data-node-id="${NODE_ID}"
              data-node-action="worm01-sickbay-remove"
              data-card-id="${escapeHtml(entry.cardId)}"
              title="Remove from Sickbay"
              aria-label="${escapeHtml(`Remove ${entry.card.heroName} from Sickbay`)}"
            >
              ×
            </button>
          `
        : `
            <button
              type="button"
              class="worm01-sickbay-chip"
              data-node-id="${NODE_ID}"
              data-node-action="worm01-sickbay-assign"
              data-card-id="${escapeHtml(entry.cardId)}"
              data-current-hp="${escapeHtml(String(effectiveCurrentHp))}"
              data-max-hp="${escapeHtml(String(effectiveMaxHp))}"
              data-max-slots="${escapeHtml(String(maxSickbaySlots))}"
              title="${escapeHtml(canAssignSickbay ? "Send to Sickbay" : `Sickbay full (${occupiedSickbaySlots}/${maxSickbaySlots})`)}"
              aria-label="${escapeHtml(`Send ${entry.card.heroName} to Sickbay`)}"
              ${canAssignSickbay ? "" : "disabled"}
            >
              +
            </button>
          `;
      const headerControls = `
        <div class="worm01-deck-card-controls">
          ${favoriteButton}
          ${shardButton}
          ${sickbayButton}
        </div>
      `;

      return `
          <article class="card worm01-deck-card">
            ${renderWormCard(
        {
          ...entry.card,
          heroName: `${entry.card.heroName} x${entry.copies}`,
        },
        {
          role: "player",
          headerExtraHtml: headerControls,
          combatant: {
            hp: entry.currentHp,
            maxHp: entry.maxHp,
            stats: {
              attack: entry.card.attack,
              defense: entry.card.defense,
              endurance: entry.card.endurance,
              info: entry.card.info,
              manipulation: entry.card.manipulation,
              range: entry.card.range,
              speed: entry.card.speed,
              stealth: entry.card.stealth,
            },
            modifiers: {},
            modifiers: {},
            debuffs: {},
            guardCharges: 0,
            speedReady: false,
            stealthReady: false,
          },
        },
      )}
          </article>
        `;
    })
    .join("")}
    </section>
  `;
}

function renderCapeShardPopup(runtime, ownedCards, maxShardSlotsPerCape, lootState) {
  if (!ownedCards.length) {
    return `
      <div class="worm01-shard-modal-backdrop" role="dialog" aria-label="Shard slots">
        <section class="card worm01-shard-modal">
          <h3>Shard Slots</h3>
          <p>No capes available.</p>
          <div class="toolbar">
            <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="worm01-close-shard-popup">Close</button>
          </div>
        </section>
      </div>
    `;
  }
  const selectedCardId = safeText(runtime.shardPopupCardId) || ownedCards[0].cardId;
  const entry = ownedCards.find((item) => item.cardId === selectedCardId) || ownedCards[0];
  const cardId = entry.cardId;
  const byCape = lootState && lootState.loadouts && lootState.loadouts.worm && lootState.loadouts.worm.shardSlotsByCape
    ? lootState.loadouts.worm.shardSlotsByCape
    : {};
  const allLootItems = lootState && lootState.items && typeof lootState.items === "object" ? lootState.items : {};
  const slots = Array.isArray(byCape[cardId]) ? byCape[cardId] : [];
  const selectedLootItemId = safeText(runtime.selectedLootItemId);
  const selectedLootItem = selectedLootItemId ? allLootItems[selectedLootItemId] : null;
  const canEquipSelected = Boolean(selectedLootItem && selectedLootItem.kind === "worm_enhancement");
  const canSocketSelected = Boolean(selectedLootItem && selectedLootItem.templateId === "worm_shard_slot_token");
  const unlockedSlots = getWormShardSlotCount({ inventory: { loot: lootState } }, cardId, Date.now());
  const summaryEntries = getWormCapeShardSummaryEntries({ inventory: { loot: lootState } }, cardId, Date.now());

  const visibleSlotCount = Math.min(
    maxShardSlotsPerCape,
    Math.max(1, unlockedSlots + (canSocketSelected && unlockedSlots < maxShardSlotsPerCape ? 1 : 0)),
  );

  const ringSlots = Array.from({ length: visibleSlotCount }, (_, index) => {
    const itemId = slots[index];
    const item = itemId ? allLootItems[itemId] : null;
    const isFilled = Boolean(item);
    const locked = index >= unlockedSlots;
    const nextSocket = locked && index === unlockedSlots;
    return {
      filled: isFilled,
      clickable: isFilled || (!locked && canEquipSelected) || (nextSocket && canSocketSelected),
      title: item
        ? `${item.label} (${item.rarity || "common"}) | ${formatLootItemEffectSummary(item, { maxEffects: 3 })}`
        : locked
          ? "Locked shard socket. Apply a Shard Lattice Socket to open it."
          : "Empty shard slot",
      ariaLabel: `Shard slot ${index + 1}`,
      symbolHtml: item
        ? renderArtifactSymbol({
            artifactName: item.label,
            className: "slot-ring-symbol artifact-symbol",
          })
        : locked
          ? renderArtifactSymbol({
              artifactName: "Locked Shard Slot",
              className: "slot-ring-symbol artifact-symbol is-slot-ghost",
            })
          : "",
      attrs: isFilled
        ? {
            "data-node-id": NODE_ID,
            "data-node-action": "worm01-unequip-shard",
            "data-card-id": cardId,
            "data-slot-id": index,
          }
        : !locked && canEquipSelected
          ? {
              "data-action": "loot-equip-target",
              "data-region": "worm",
              "data-target-id": cardId,
              "data-slot-id": index,
            }
          : nextSocket && canSocketSelected
            ? {
                "data-action": "loot-equip-target",
                "data-region": "worm",
                "data-target-id": cardId,
                "data-slot-id": index,
              }
            : {},
    };
  });

  return `
    <div class="worm01-shard-modal-backdrop" role="dialog" aria-label="Cape shard slots">
      <section class="card worm01-shard-modal">
        <h3>${escapeHtml(entry.card.heroName)} Shard Slots</h3>
        <p class="muted">Unlocked: ${escapeHtml(String(unlockedSlots))}/${escapeHtml(String(maxShardSlotsPerCape))}</p>
        ${renderSlotRing({
          slots: ringSlots,
          className: "worm01-shard-slot-ring",
          radiusPct: 42,
          centerHtml: renderArtifactSymbol({
            artifactName: entry.card.heroName,
            className: "slot-ring-center-symbol artifact-symbol",
          }),
          ariaLabel: `${entry.card.heroName} shard slot ring`,
        })}
        <div class="slot-bonus-summary">
          <span class="slot-bonus-kicker">Slotted Buffs</span>
          <div class="slot-bonus-grid">
            ${
              summaryEntries.length
                ? summaryEntries.map((summary) => `
                  <article class="slot-bonus-chip">
                    <span>${escapeHtml(summary.label)}</span>
                    <strong>${escapeHtml(summary.value)}</strong>
                  </article>
                `).join("")
                : '<p class="slot-bonus-empty">No active shard bonuses.</p>'
            }
          </div>
        </div>
        <div class="toolbar">
          <button type="button" data-action="toggle-widget" data-widget="loot">Open Loot Panel</button>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="worm01-close-shard-popup">Close</button>
        </div>
      </section>
    </div>
  `;
}

function renderSickbayPanel(ownedCards, wormState, maxSickbaySlots, healPercentPerMinute) {
  const ids = Array.isArray(wormState.sickbayCardIds) ? wormState.sickbayCardIds : [];
  const sickbayEntries = ownedCards.filter((item) => ids.includes(item.cardId));
  if (!sickbayEntries.length) {
    return `
      <section class="card worm01-sickbay-stage">
        <div class="worm01-stage-header">
          <div>
            <h3>Sickbay</h3>
            <p class="muted">Capes heal for ${escapeHtml(String(healPercentPerMinute))}% of max health every minute while in Sickbay.</p>
          </div>
          <div class="worm01-stage-chip">Capacity 0 / ${maxSickbaySlots}</div>
        </div>
        <div class="worm01-sickbay-empty">
          <div class="worm01-sickbay-emblem">+</div>
          <p>No cape currently assigned.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="card worm01-sickbay-stage worm01-sickbay-panel">
      <div class="worm01-stage-header">
        <div>
          <h3>Sickbay</h3>
          <p class="muted">Capes heal for ${escapeHtml(String(healPercentPerMinute))}% of max health every minute while in Sickbay.</p>
        </div>
        <div class="worm01-stage-chip">Capacity ${sickbayEntries.length} / ${maxSickbaySlots}</div>
      </div>
      <section class="worm01-card-grid">
        ${sickbayEntries.map((entry) => {
          const countdown = formatCountdownFromMinutes(minutesToFull(entry));
          const full = entry.currentHp >= entry.maxHp;
          return `
            <article class="card worm01-deck-card worm01-sickbay-card">
              <button
                type="button"
                class="worm01-sickbay-remove"
                data-node-id="${NODE_ID}"
                data-node-action="worm01-sickbay-remove"
                data-card-id="${escapeHtml(entry.cardId)}"
                aria-label="${escapeHtml(`Remove ${entry.card.heroName} from Sickbay`)}"
                title="Remove from Sickbay"
              >
                ×
              </button>
              <div class="worm01-sickbay-card-shell">
                <div class="worm01-sickbay-card-wrap">
                  ${renderWormCard(
                    entry.card,
                    {
                      role: "player",
                      combatant: {
                        hp: entry.currentHp,
                        maxHp: entry.maxHp,
                        stats: {
                          attack: entry.card.attack,
                          defense: entry.card.defense,
                          endurance: entry.card.endurance,
                          info: entry.card.info,
                          manipulation: entry.card.manipulation,
                          range: entry.card.range,
                          speed: entry.card.speed,
                          stealth: entry.card.stealth,
                        },
                        modifiers: {},
                        debuffs: {},
                        guardCharges: 0,
                        speedReady: false,
                        stealthReady: false,
                      },
                    },
                  )}
                </div>
                <div class="worm01-sickbay-readout">
                  <div class="worm01-sickbay-time ${full ? "is-ready" : ""}">
                    ${full ? "Ready now" : `Full recovery in ${escapeHtml(countdown)}`}
                  </div>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </section>
    </section>
  `;
}

function pullPopupMarkup(runtime) {
  const pulledCard = runtime.pullPopupCardId ? wormCardById(runtime.pullPopupCardId) : null;
  if (!pulledCard) {
    return "";
  }
  return `
    <div class="worm01-shard-modal-backdrop" role="dialog" aria-label="Hiring result">
      <section class="card worm01-shard-modal">
        <h3>New Hire</h3>
        ${renderWormCard(pulledCard, { role: "player" })}
        <div class="toolbar">
          <button type="button" data-node-id="${NODE_ID}" data-node-action="worm01-close-pull-popup">Close</button>
        </div>
      </section>
    </div>
  `;
}

function hiringBoostChipsMarkup(boosts, appliesTo) {
  const relevant = Array.isArray(boosts) ? boosts.filter((boost) => boost.appliesTo === appliesTo || boost.appliesTo === "all") : [];
  if (!relevant.length) {
    return `<div class="worm01-hiring-boost-row"><span class="worm01-hiring-boost-chip is-empty">No temporary buffs</span></div>`;
  }
  return `
    <div class="worm01-hiring-boost-row">
      ${relevant.map((boost) => `
        <article class="worm01-hiring-boost-chip">
          <strong>${escapeHtml(boost.label)}</strong>
          <span>${escapeHtml(boost.summary || "Temporary hiring boost")}</span>
          <small>${escapeHtml(formatDurationRemaining(boost.remainingMs))} remaining</small>
        </article>
      `).join("")}
    </div>
  `;
}

function renderJobsPanel(runtime, wormState, weightBase, maxRarity, specialWindows = [], hasTenPullAccess = false, activeHiringBoosts = []) {
  const canHire = Number(wormState.clout || 0) >= BASIC_HIRE_COST;
  const tenPullCost = BASIC_HIRE_COST * 10;
  const canTenPull = Number(wormState.clout || 0) >= tenPullCost;
  return `
    <section class="card worm01-job-board worm01-job-board-surface">
      <div class="worm01-stage-header">
        <div>
          <h3>Job Board</h3>
          <p class="muted">Pull fresh capes through local hiring channels and any special broker windows you have unlocked.</p>
        </div>
        <div class="worm01-stage-chip">Clout ${escapeHtml(String(Number(wormState.clout || 0).toFixed(2)))}</div>
      </div>
      <section class="worm01-job-window">
        <div class="worm01-job-window-copy">
          <h4>Basic Window</h4>
          <p>Rarity ${escapeHtml(String(maxRarity.toFixed(1)))} and below.</p>
          <p class="muted">Standard underling pulls from Brockton Bay and nearby talent pools.</p>
          ${hiringBoostChipsMarkup(activeHiringBoosts, "basic")}
        </div>
        <div class="worm01-job-window-actions">
          <button type="button" data-node-id="${NODE_ID}" data-node-action="worm01-hire-basic" data-weight-base="${escapeHtml(String(weightBase))}" data-max-rarity="${escapeHtml(String(maxRarity))}" ${canHire ? "" : "disabled"}>
            Hire Underling (${BASIC_HIRE_COST})
          </button>
          ${
            hasTenPullAccess
              ? `
                <button type="button" data-node-id="${NODE_ID}" data-node-action="worm01-hire-basic-ten" data-weight-base="${escapeHtml(String(weightBase))}" data-max-rarity="${escapeHtml(String(maxRarity))}" ${canTenPull ? "" : "disabled"}>
                  Hire x10 (${tenPullCost})
                </button>
              `
              : ""
          }
        </div>
      </section>
      ${
  specialWindows.length
    ? `
          <h4>Special Hiring Windows</h4>
          <div class="worm01-special-window-grid">
            ${specialWindows.map((window) => `
              <article class="worm01-special-window-card">
                <div>
                  <h5>${escapeHtml(window.label)}</h5>
                  <p>Rarity ${escapeHtml(String(window.minRarity.toFixed(1)))} to ${escapeHtml(String(window.maxRarity.toFixed(1)))}</p>
                  ${hiringBoostChipsMarkup(activeHiringBoosts, window.id)}
                </div>
                <button
                  type="button"
                  data-node-id="${NODE_ID}"
                  data-node-action="worm01-hire-window"
                  data-window-id="${escapeHtml(window.id)}"
                  data-window-label="${escapeHtml(window.label)}"
                  data-window-cost="${escapeHtml(String(window.cost))}"
                  data-weight-base="${escapeHtml(String(window.weightBase))}"
                  data-min-rarity="${escapeHtml(String(window.minRarity))}"
                  data-max-rarity="${escapeHtml(String(window.maxRarity))}"
                  ${Number(wormState.clout || 0) >= Number(window.cost) ? "" : "disabled"}
                >
                  Draw (${escapeHtml(String(window.cost))})
                </button>
              </article>
            `).join("")}
          </div>
        `
    : ""
}
    </section>
  `;
}

export function initialWorm01Runtime() {
  return normalizeRuntime({});
}

export function synchronizeWorm01Runtime(runtime, context) {
  const current = normalizeRuntime(runtime);
  const selectedLootItemId = safeText(context && context.selectedLootItemId);
  const withSelection = {
    ...current,
    selectedLootItemId,
  };
  const wormState = normalizeWormSystemState(context && context.state && context.state.systems ? context.state.systems.worm : {});
  if (!wormState.startersConfirmed) {
    return withSelection;
  }

  const ownedCards = wormOwnedCards(wormState, Date.now());
  const validCompactifierCardId = ownedCards.some((entry) => entry.cardId === withSelection.compactifierCardId)
    ? withSelection.compactifierCardId
    : "";

  return {
    ...withSelection,
    compactifierCardId: validCompactifierCardId,
    solved: true,
  };
}

export function validateWorm01Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceWorm01Runtime(runtime, action) {
  const current = normalizeRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "worm01-toggle-starter") {
    const cardId = safeText(action.cardId);
    if (!cardId) {
      return current;
    }

    const selected = current.selectedStarterIds.slice();
    const existingIndex = selected.indexOf(cardId);
    if (existingIndex >= 0) {
      selected.splice(existingIndex, 1);
    } else if (selected.length < 2) {
      selected.push(cardId);
    }

    return {
      ...current,
      selectedStarterIds: selected,
    };
  }

  if (action.type === "worm01-confirm-starters") {
    const picked = Array.isArray(action.cardIds)
      ? action.cardIds.map((cardId) => safeText(cardId)).filter((cardId) => cardId)
      : [];
    const uniquePicked = picked.filter((cardId, index) => picked.indexOf(cardId) === index);
    if (uniquePicked.length !== 2) {
      return {
        ...current,
        lastMessage: "Choose exactly two starter capes.",
      };
    }
    return {
      ...current,
      solved: true,
      panel: PANELS.deck,
      popup: POPUPS.none,
      selectedStarterIds: uniquePicked.slice(0, 2),
      lastMessage: "Starter roster confirmed.",
    };
  }

  if (action.type === "worm01-open-panel") {
    const panel = safeText(action.panel).toLowerCase();
    if (!Object.values(PANELS).includes(panel)) {
      return current;
    }
    return {
      ...current,
      panel,
      popup: POPUPS.none,
    };
  }

  if (action.type === "worm01-unlock-ten-pull" || action.type === "worm01-unlock-compactifier") {
    return {
      ...current,
      panel: action.type === "worm01-unlock-compactifier" ? PANELS.compactifier : current.panel,
      lastMessage: safeText(action.message),
    };
  }

  if (action.type === "worm01-open-compact-picker") {
    return {
      ...current,
      panel: PANELS.compactifier,
      popup: POPUPS.compactPicker,
    };
  }

  if (action.type === "worm01-select-compact-cape") {
    return {
      ...current,
      panel: PANELS.compactifier,
      popup: POPUPS.none,
      compactifierCardId: safeText(action.cardId),
    };
  }

  if (action.type === "worm01-close-compact-popup") {
    return {
      ...current,
      popup: POPUPS.none,
    };
  }

  if (action.type === "worm01-begin-compactify") {
    return {
      ...current,
      panel: PANELS.compactifier,
      popup: current.compactifierCardId ? POPUPS.compactStat : POPUPS.none,
    };
  }

  if (action.type === "worm01-compactify-cape") {
    return {
      ...current,
      panel: PANELS.compactifier,
      popup: POPUPS.none,
      lastMessage: safeText(action.message),
    };
  }

  if (action.type === "worm01-hire-basic") {
    return {
      ...current,
      panel: PANELS.jobs,
      popup: POPUPS.none,
      lastPulledCardId: safeText(action.pulledCardId),
      pullPopupCardId: safeText(action.pulledCardId),
    };
  }

  if (action.type === "worm01-hire-window") {
    return {
      ...current,
      panel: PANELS.jobs,
      popup: POPUPS.none,
      lastPulledCardId: safeText(action.pulledCardId),
      pullPopupCardId: safeText(action.pulledCardId),
    };
  }

  if (action.type === "worm01-hire-basic-ten") {
    const pulls = Array.isArray(action.pulledCardIds) ? action.pulledCardIds : [];
    const latest = pulls.length ? safeText(pulls[pulls.length - 1]) : "";
    return {
      ...current,
      panel: PANELS.jobs,
      popup: POPUPS.none,
      lastPulledCardId: latest,
      pullPopupCardId: latest,
    };
  }

  if (action.type === "worm01-close-pull-popup") {
    return {
      ...current,
      lastPulledCardId: "",
      pullPopupCardId: "",
    };
  }

  if (action.type === "worm01-sickbay-assign" || action.type === "worm01-sickbay-remove") {
    return {
      ...current,
      popup: POPUPS.none,
      lastMessage: safeText(action.message) || current.lastMessage,
    };
  }

  if (action.type === "worm01-open-shard-popup") {
    return {
      ...current,
      popup: POPUPS.cape,
      shardPopupCardId: safeText(action.cardId),
    };
  }

  if (action.type === "worm01-close-shard-popup") {
    return {
      ...current,
      popup: POPUPS.none,
    };
  }

  if (action.type === "worm01-equip-shard" || action.type === "worm01-unequip-shard") {
    return {
      ...current,
      lastMessage: safeText(action.message),
    };
  }

  if (action.type === "worm01-toggle-favorite") {
    return current;
  }

  return current;
}

export function buildWorm01ActionFromElement(element, runtime) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }

  if (actionName === "worm01-toggle-starter") {
    return {
      type: "worm01-toggle-starter",
      cardId: element.getAttribute("data-card-id") || "",
    };
  }

  if (actionName === "worm01-confirm-starters") {
    return {
      type: "worm01-confirm-starters",
      cardIds: normalizeRuntime(runtime).selectedStarterIds.slice(),
    };
  }

  if (actionName === "worm01-open-panel") {
    return {
      type: "worm01-open-panel",
      panel: element.getAttribute("data-panel") || "",
    };
  }

  if (actionName === "worm01-hire-basic") {
    const weightBase = Number(element.getAttribute("data-weight-base"));
    const maxRarity = Number(element.getAttribute("data-max-rarity"));
    const pull = wormDrawBasicWindowCard({
      weightBase,
      maxRarity,
    });
    return {
      type: "worm01-hire-basic",
      pulledCardId: pull ? pull.id : "",
      weightBase,
      maxRarity,
    };
  }

  if (actionName === "worm01-hire-basic-ten") {
    const weightBase = Number(element.getAttribute("data-weight-base"));
    const maxRarity = Number(element.getAttribute("data-max-rarity"));
    const pulledCardIds = Array.from({ length: 10 }, () => {
      const pull = wormDrawBasicWindowCard({
        weightBase,
        maxRarity,
      });
      return pull ? pull.id : "";
    }).filter((cardId) => cardId);
    return {
      type: "worm01-hire-basic-ten",
      pulledCardIds,
      weightBase,
      maxRarity,
      cost: BASIC_HIRE_COST * 10,
    };
  }

  if (actionName === "worm01-hire-window") {
    const weightBase = Number(element.getAttribute("data-weight-base"));
    const minRarity = Number(element.getAttribute("data-min-rarity"));
    const maxRarity = Number(element.getAttribute("data-max-rarity"));
    const pull = wormDrawWindowCard({
      weightBase,
      minRarity,
      maxRarity,
    });
    return {
      type: "worm01-hire-window",
      windowId: element.getAttribute("data-window-id") || "",
      windowLabel: element.getAttribute("data-window-label") || "",
      cost: Number(element.getAttribute("data-window-cost") || 0),
      weightBase,
      minRarity,
      maxRarity,
      pulledCardId: pull ? pull.id : "",
    };
  }

  if (actionName === "worm01-sickbay-assign") {
    return {
      type: "worm01-sickbay-assign",
      cardId: element.getAttribute("data-card-id") || "",
      currentHp: Number(element.getAttribute("data-current-hp") || 0),
      maxHp: Number(element.getAttribute("data-max-hp") || 0),
      maxSickbaySlots: Number(element.getAttribute("data-max-slots") || 1),
    };
  }

  if (actionName === "worm01-sickbay-remove") {
    return {
      type: "worm01-sickbay-remove",
      cardId: element.getAttribute("data-card-id") || "",
    };
  }

  if (actionName === "worm01-toggle-favorite") {
    return {
      type: "worm01-toggle-favorite",
      cardId: element.getAttribute("data-card-id") || "",
    };
  }

  if (actionName === "worm01-open-shard-popup") {
    return {
      type: "worm01-open-shard-popup",
      cardId: element.getAttribute("data-card-id") || "",
    };
  }

  if (actionName === "worm01-close-shard-popup") {
    return {
      type: "worm01-close-shard-popup",
    };
  }

  if (actionName === "worm01-close-pull-popup") {
    return {
      type: "worm01-close-pull-popup",
    };
  }

  if (actionName === "worm01-unlock-ten-pull") {
    return { type: "worm01-unlock-ten-pull" };
  }

  if (actionName === "worm01-unlock-compactifier") {
    return { type: "worm01-unlock-compactifier" };
  }

  if (actionName === "worm01-open-compact-picker") {
    return { type: "worm01-open-compact-picker" };
  }

  if (actionName === "worm01-select-compact-cape") {
    return {
      type: "worm01-select-compact-cape",
      cardId: element.getAttribute("data-card-id") || "",
    };
  }

  if (actionName === "worm01-close-compact-popup") {
    return { type: "worm01-close-compact-popup" };
  }

  if (actionName === "worm01-begin-compactify") {
    return { type: "worm01-begin-compactify" };
  }

  if (actionName === "worm01-compactify-cape") {
    return {
      type: "worm01-compactify-cape",
      cardId: element.getAttribute("data-card-id") || "",
      statKey: element.getAttribute("data-stat-key") || "",
    };
  }

  if (actionName === "worm01-equip-shard") {
    return {
      type: "worm01-equip-shard",
      cardId: element.getAttribute("data-card-id") || "",
      slotId: Number(element.getAttribute("data-slot-id") || 0),
      itemId: element.getAttribute("data-item-id") || "",
    };
  }

  if (actionName === "worm01-unequip-shard") {
    return {
      type: "worm01-unequip-shard",
      cardId: element.getAttribute("data-card-id") || "",
      slotId: Number(element.getAttribute("data-slot-id") || 0),
    };
  }

  return null;
}

export function renderWorm01Experience(context) {
  const runtime = normalizeRuntime(context.runtime);
  const modifiers = prestigeModifiersFromState(context.state);
  const wormPrestige = modifiers && modifiers.worm && typeof modifiers.worm === "object" ? modifiers.worm : {};
  const wormOptions = {
    capeMaxHpMultiplier: Math.max(1, Number(wormPrestige.capeMaxHpMultiplier || 1)),
    sickbayHealMultiplier: Math.max(1, Number(wormPrestige.sickbayHealMultiplier || 1)),
    compactifyCostDivider: Math.max(1, Number(wormPrestige.compactifyCostDivider || 1)),
  };
  const wormState = normalizeWormSystemState(context.state.systems.worm, Date.now(), wormOptions);
  const jobWeightBase = Number((0.125 * Math.max(1, Number(modifiers.worm.jobWeightBaseMultiplier || 1)) * Math.max(1, Number(getWormHiringWeightModifier(context.state, Date.now()) || 1))).toFixed(4));
  const specialWindowWeightMultiplier = Math.max(1, Number(wormPrestige.specialWindowWeightMultiplier || 1));
  const maxSickbaySlots =
    getWormSickbaySlotCount(context.state, Date.now()) + Math.max(0, Number(wormPrestige.extraSickbaySlots || 0));
  const sickbayHealPercentPerMinute = Number((SICKBAY_HEAL_FRACTION_PER_MINUTE * wormOptions.sickbayHealMultiplier * 100).toFixed(1));
  const maxShardSlotsPerCape = 3;
  const maxRarity = 5;
  const lootState = lootInventoryFromState(context.state, Date.now());
  const activeHiringBoosts = getWormActiveHiringBoosts(context.state, Date.now());
  const baseOwnedCards = wormOwnedCards(wormState, Date.now(), wormOptions);
  const ownedCards = applyCapeLootBonusesToOwnedCards(baseOwnedCards, wormState, lootState);
  const rewards =
    context && context.state && context.state.inventory && context.state.inventory.rewards && typeof context.state.inventory.rewards === "object"
      ? context.state.inventory.rewards
      : {};
  const specialWindows = wormSpecialHiringWindows().filter((window) => Boolean(rewards[window.rewardArtifact]));
  const hasTenPullAccess = Boolean(wormState.tenPullUnlocked);
  const canUnlockTenPull = Boolean(rewards["x10 Hiring Access"]) && !wormState.tenPullUnlocked;
  const canUnlockCompactifier = Boolean(rewards["Cape Compactifier"]) && !wormState.compactifierUnlocked;

  if (!wormState.startersConfirmed) {
    return `<article class="worm01-node" data-node-id="${NODE_ID}">${renderStarterDraft(runtime, wormState)}</article>`;
  }

  const panel = runtime.panel;
  const panelMarkup = panel === PANELS.sickbay
    ? renderSickbayPanel(ownedCards, wormState, maxSickbaySlots, sickbayHealPercentPerMinute)
    : panel === PANELS.compactifier
      ? renderCompactifierPanel(runtime, ownedCards, wormState, wormOptions.compactifyCostDivider)
    : panel === PANELS.jobs
      ? renderJobsPanel(
        runtime,
        wormState,
        jobWeightBase,
        maxRarity,
        specialWindows.map((window) => ({
          ...window,
          weightBase: Number((Number(window.weightBase || 1) * specialWindowWeightMultiplier).toFixed(4)),
        })),
        hasTenPullAccess,
        activeHiringBoosts,
      )
      : renderDeckPanel(ownedCards, wormState, maxSickbaySlots, maxShardSlotsPerCape, lootState);

  const popupMarkup = runtime.popup === POPUPS.cape
    ? renderCapeShardPopup(runtime, ownedCards, maxShardSlotsPerCape, lootState)
    : runtime.popup === POPUPS.compactPicker
      ? compactifierPickerPopup(runtime, ownedCards, wormOptions.compactifyCostDivider)
      : runtime.popup === POPUPS.compactStat
        ? compactifierStatPopup(runtime, ownedCards, wormOptions.compactifyCostDivider)
        : "";
  const pullPopup = pullPopupMarkup(runtime);

  return `
    <article class="worm01-node" data-node-id="${NODE_ID}">
      <section class="card worm01-loft-header">
        <div class="worm01-loft-head">
          <div>
            <h3>The Undersiders' Loft</h3>
          </div>
          <div class="worm01-clout-card" aria-label="Current clout">
            <span class="worm01-clout-label">Clout</span>
            <strong class="worm01-clout-value">${escapeHtml(String(Number(wormState.clout || 0).toFixed(2)))}</strong>
          </div>
        </div>
        <div class="toolbar">
          ${panelButton(PANELS.deck, panel === PANELS.deck)}
          ${panelButton(PANELS.sickbay, panel === PANELS.sickbay)}
          ${panelButton(PANELS.jobs, panel === PANELS.jobs)}
          ${wormState.compactifierUnlocked ? panelButton(PANELS.compactifier, panel === PANELS.compactifier) : ""}
          ${canUnlockCompactifier ? `<button type="button" data-node-id="${NODE_ID}" data-node-action="worm01-unlock-compactifier">Install Compactifier</button>` : ""}
          ${canUnlockTenPull ? `<button type="button" data-node-id="${NODE_ID}" data-node-action="worm01-unlock-ten-pull">Unlock x10 Hiring</button>` : ""}
        </div>
      </section>
      ${panelMarkup}
      ${popupMarkup}
      ${pullPopup}
    </article>
  `;
}

export const WORM01_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialWorm01Runtime,
  synchronizeRuntime: synchronizeWorm01Runtime,
  render: renderWorm01Experience,
  reduceRuntime: reduceWorm01Runtime,
  validateRuntime: validateWorm01Runtime,
  buildActionFromElement: buildWorm01ActionFromElement,
};
