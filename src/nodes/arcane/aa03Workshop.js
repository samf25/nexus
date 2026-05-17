import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderRegionSymbol } from "../../core/symbology.js";
import {
  arcaneAttunementFeatures,
  arcaneAttunementRank,
  arcaneSystemFromState,
  attunementRankOptions,
  attunementSubrankVisualFactor,
  glyphDisplayName,
  glyphTemplatePoints,
  qualitativeAccuracyLabel,
} from "../../systems/arcaneAscension.js";
import { getArcaneWorkshopSlotSummaryEntries, isManualSocketLootItem, lootInventoryFromState } from "../../systems/loot.js";
import { renderSlotRing } from "../../ui/slotRing.js";

const NODE_ID = "AA03";

function safeText(value) {
  return String(value || "").trim();
}

function safeFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeInt(value, fallback = 0) {
  return Math.floor(safeFinite(value, fallback));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseSerializedStroke(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed)
      ? parsed
        .map((point) => ({
          x: clamp(safeFinite(point && point.x, 0), 0, 1),
          y: clamp(safeFinite(point && point.y, 0), 0, 1),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : [];
  } catch {
    return [];
  }
}

function readableGlyphName(glyphId) {
  const normalized = safeText(glyphId).toLowerCase();
  return glyphDisplayName(normalized, regionSectionFromGlyph(normalized) ? "region" : "enhancement");
}

function regionSectionFromGlyph(glyphId) {
  const id = safeText(glyphId).toLowerCase();
  if (id === "crd") {
    return "Cradle";
  }
  if (id === "worm") {
    return "Worm";
  }
  if (id === "dcc") {
    return "Dungeon Crawler Carl";
  }
  if (id === "aa") {
    return "Arcane Ascension";
  }
  return "";
}

function renderGlyphSymbol(glyphId, className = "") {
  const section = regionSectionFromGlyph(glyphId);
  if (section) {
    return renderRegionSymbol({
      section,
      className,
    });
  }
  return renderArtifactSymbol({
    artifactName: readableGlyphName(glyphId),
    className: `${className} artifact-symbol`,
  });
}

function glyphTraceMarkup(glyphType, glyphId, options = {}) {
  const points = glyphTemplatePoints(glyphType, glyphId);
  const overlayMode = Boolean(options && options.overlay);
  if (!Array.isArray(points) || !points.length) {
    return `<svg class="aa03-glyph-trace" viewBox="0 0 100 100" aria-hidden="true"></svg>`;
  }
  if (!overlayMode) {
    const coords = points
      .map((point) => {
        if (Array.isArray(point)) {
          const x = Number(point[0]);
          const y = Number(point[1]);
          return Number.isFinite(x) && Number.isFinite(y)
            ? `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`
            : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
    return `
      <svg class="aa03-glyph-trace" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <polyline points="${escapeHtml(coords)}"></polyline>
      </svg>
    `;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const normalizedPoints = points
    .map((point) => {
      if (Array.isArray(point)) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          return { x, y };
        }
      }
      return null;
    })
    .filter(Boolean);
  if (!normalizedPoints.length) {
    return `<svg class="aa03-glyph-trace" viewBox="0 0 100 100" aria-hidden="true"></svg>`;
  }
  const overlayPad = {
    "merchant-sigil": 0.2,
    "stability-anchor": 0.48,
    "surge-glyph": 0.34,
  }[safeText(glyphId).toLowerCase()] || 0.12;
  const overlayScale = {
    "stability-anchor": 0.72,
    "surge-glyph": 0.86,
  }[safeText(glyphId).toLowerCase()] || 1;
  const width = Math.max(0.12, maxX - minX);
  const height = Math.max(0.12, maxY - minY);
  const viewX = (minX - (width * overlayPad)) * 100;
  const viewY = (minY - (height * overlayPad)) * 100;
  const viewWidth = width * (1 + (overlayPad * 2)) * 100;
  const viewHeight = height * (1 + (overlayPad * 2)) * 100;
  const coords = normalizedPoints
    .map((point) => `${(point.x * 100).toFixed(1)},${(point.y * 100).toFixed(1)}`)
    .join(" ");
  return `
    <svg class="aa03-glyph-trace" style="transform:scale(${escapeHtml(overlayScale.toFixed(2))}); transform-origin:center;" viewBox="${escapeHtml(viewX.toFixed(2))} ${escapeHtml(viewY.toFixed(2))} ${escapeHtml(viewWidth.toFixed(2))} ${escapeHtml(viewHeight.toFixed(2))}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <polyline points="${escapeHtml(coords)}"></polyline>
    </svg>
  `;
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const tabCandidate = safeText(source.activeTab).toLowerCase();
  return {
    phase: safeText(source.phase) || "idle",
    activeTab: tabCandidate === "grimoire" || tabCandidate === "slots" ? tabCandidate : "workshop",
    regionStroke: Array.isArray(source.regionStroke) ? source.regionStroke : [],
    enhancementStroke: Array.isArray(source.enhancementStroke) ? source.enhancementStroke : [],
    regionMatch: source.regionMatch && typeof source.regionMatch === "object" ? { ...source.regionMatch } : null,
    enhancementMatch: source.enhancementMatch && typeof source.enhancementMatch === "object" ? { ...source.enhancementMatch } : null,
    trueAccuracy: clamp(safeFinite(source.trueAccuracy, 0), 0, 1),
    estimatedAccuracy: clamp(safeFinite(source.estimatedAccuracy, 0), 0, 1),
    craftForecast: Array.isArray(source.craftForecast) ? source.craftForecast.filter((entry) => entry && typeof entry === "object") : [],
    manaInvest: Math.max(1, safeInt(source.manaInvest, 20)),
    craftedCount: Math.max(0, safeInt(source.craftedCount, 0)),
    solved: Boolean(source.solved),
    lastOutcome: source.lastOutcome && typeof source.lastOutcome === "object" ? { ...source.lastOutcome } : null,
    outcomePopupOpen: source.outcomePopupOpen !== false,
    rankPopupSeenKey: safeText(source.rankPopupSeenKey),
    lastMessage: safeText(source.lastMessage),
  };
}

export function initialAa03Runtime() {
  return normalizeRuntime({
    phase: "idle",
    manaInvest: 20,
    solved: false,
  });
}

export function synchronizeAa03Runtime(runtime, context = {}) {
  const current = normalizeRuntime(runtime);
  const arcane = arcaneSystemFromState(context.state || {}, Date.now());
  const pendingRankKey = safeText(arcane.attunements && arcane.attunements.pendingRankPopup && arcane.attunements.pendingRankPopup.key);
  const manaInvest = Math.max(0, safeInt(current.manaInvest, 20));
  return {
    ...current,
    manaInvest,
    solved: current.solved || Math.max(0, safeInt(arcane.crafting && arcane.crafting.nonJunkCrafts, 0)) > 0,
    craftedCount: Math.max(current.craftedCount, safeInt(arcane.crafting && arcane.crafting.totalCrafts, 0)),
    rankPopupSeenKey: pendingRankKey || current.rankPopupSeenKey,
  };
}

export function validateAa03Runtime(runtime) {
  return Boolean(normalizeRuntime(runtime).solved);
}

export function reduceAa03Runtime(runtime, action) {
  const current = normalizeRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "aa03-open-tab") {
    const tab = safeText(action.tab).toLowerCase();
    return {
      ...current,
      activeTab: tab === "grimoire" || tab === "slots" ? tab : "workshop",
    };
  }

  if (action.type === "aa03-select-glyph") {
    return {
      ...current,
      lastMessage: "",
    };
  }

  if (action.type === "aa03-start-workshop") {
    return {
      ...current,
      activeTab: "workshop",
      phase: "draw-region",
      regionStroke: [],
      enhancementStroke: [],
      regionMatch: null,
      enhancementMatch: null,
      craftForecast: [],
      lastOutcome: null,
      outcomePopupOpen: false,
      lastMessage: "Draw a region rune in the first panel.",
    };
  }

  if (action.type === "aa03-cancel-craft") {
    return {
      ...current,
      activeTab: "workshop",
      phase: "idle",
      regionStroke: [],
      enhancementStroke: [],
      regionMatch: null,
      enhancementMatch: null,
      trueAccuracy: 0,
      estimatedAccuracy: 0,
      craftForecast: [],
      lastOutcome: null,
      outcomePopupOpen: false,
      lastMessage: "Craft cancelled.",
    };
  }

  if (action.type === "aa03-clear-rune") {
    const kind = safeText(action.kind).toLowerCase();
    return {
      ...current,
      regionStroke: kind === "region" ? [] : current.regionStroke,
      enhancementStroke: kind === "enhancement" ? [] : current.enhancementStroke,
      lastMessage: "Rune panel cleared.",
    };
  }

  if (action.type === "aa03-submit-region-rune") {
    if (!action.applied) {
      return {
        ...current,
        lastMessage: safeText(action.message) || "Region rune did not resolve.",
      };
    }
    return {
      ...current,
      phase: "draw-enhancement",
      regionStroke: Array.isArray(action.strokePoints) ? action.strokePoints : current.regionStroke,
      regionMatch: action.regionMatch && typeof action.regionMatch === "object" ? { ...action.regionMatch } : null,
      lastMessage: safeText(action.message) || "Region rune accepted.",
    };
  }

  if (action.type === "aa03-submit-enhancement-rune") {
    if (!action.applied) {
      return {
        ...current,
        lastMessage: safeText(action.message) || "Enhancement rune did not resolve.",
      };
    }
    return {
      ...current,
      phase: "appraisal",
      enhancementStroke: Array.isArray(action.strokePoints) ? action.strokePoints : current.enhancementStroke,
      enhancementMatch: action.enhancementMatch && typeof action.enhancementMatch === "object" ? { ...action.enhancementMatch } : null,
      trueAccuracy: clamp(safeFinite(action.trueAccuracy, current.trueAccuracy), 0, 1),
      estimatedAccuracy: clamp(safeFinite(action.estimatedAccuracy, current.estimatedAccuracy), 0, 1),
      craftForecast: Array.isArray(action.craftForecast) ? action.craftForecast : [],
      lastMessage: safeText(action.message) || "Enhancement rune accepted.",
    };
  }

  if (action.type === "aa03-set-mana-invest") {
    return {
      ...current,
      manaInvest: Math.max(0, safeInt(action.amount, current.manaInvest)),
    };
  }

  if (action.type === "aa03-craft-item") {
    if (!action.applied) {
      return {
        ...current,
        lastMessage: safeText(action.message) || "Craft failed.",
      };
    }
    return {
      ...current,
      phase: "result",
      solved: current.solved || Boolean(action.nonJunk),
      lastOutcome: action.outcome && typeof action.outcome === "object" ? { ...action.outcome } : null,
      outcomePopupOpen: true,
      craftedCount: current.craftedCount + 1,
      lastMessage: safeText(action.message) || "Craft complete.",
    };
  }

  if (action.type === "aa03-close-outcome-popup") {
    return {
      ...current,
      phase: "idle",
      outcomePopupOpen: false,
    };
  }

  if (action.type === "aa03-close-rank-popup") {
    return {
      ...current,
      lastMessage: "",
      rankPopupSeenKey: current.rankPopupSeenKey,
    };
  }

  if (action.type === "aa03-new-craft") {
    return {
      ...current,
      phase: "draw-region",
      regionStroke: [],
      enhancementStroke: [],
      regionMatch: null,
      enhancementMatch: null,
      trueAccuracy: 0,
      estimatedAccuracy: 0,
      craftForecast: [],
      manaInvest: Math.max(1, safeInt(action.manaInvest, current.manaInvest || 20)),
      lastOutcome: null,
      outcomePopupOpen: false,
      lastMessage: "Begin a new enchantment.",
    };
  }

  if (action.type === "aa03-workshop-slot-message") {
    return {
      ...current,
      lastMessage: safeText(action.message),
    };
  }

  return current;
}

function tabButton(tabId, active, label) {
  return `
    <button
      type="button"
      data-node-id="${NODE_ID}"
      data-node-action="aa03-open-tab"
      data-tab="${escapeHtml(tabId)}"
      ${active ? "disabled" : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderRunePanel(kind, title, overlayGlyphId = "", overlayStrength = null) {
  const opacity = overlayStrength ? (0.22 + (overlayStrength * 0.54)).toFixed(2) : "0.62";
  const blurPx = overlayStrength ? (15 - (overlayStrength * 9)).toFixed(1) : "10";
  const strokeOpacity = overlayStrength ? (0.34 + (overlayStrength * 0.52)).toFixed(2) : "0.78";
  return `
    <section class="card aa03-altar-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="aa03-rune-canvas-wrap">
        ${overlayGlyphId ? `<div class="aa03-rune-overlay" style="--aa03-overlay-opacity:${escapeHtml(opacity)}; --aa03-overlay-blur:${escapeHtml(blurPx)}px; --aa03-overlay-stroke-opacity:${escapeHtml(strokeOpacity)}">${glyphTraceMarkup(kind, overlayGlyphId, { overlay: true })}</div>` : ""}
        <canvas
          width="460"
          height="300"
          data-aa03-canvas="true"
          data-aa03-canvas-kind="${escapeHtml(kind)}"
          class="aa03-rune-canvas"
        ></canvas>
      </div>
      <div class="toolbar">
        <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-clear-rune" data-kind="${escapeHtml(kind)}">Clear</button>
        <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-submit-${escapeHtml(kind)}-rune" data-kind="${escapeHtml(kind)}">Submit ${escapeHtml(kind === "region" ? "Region" : "Enhancement")} Rune</button>
        <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-cancel-craft">Cancel</button>
      </div>
    </section>
  `;
}

function workshopSlotsMarkup(state, arcane, selectedLootItemId = "") {
  const loot = lootInventoryFromState(state || {}, Date.now());
  const slotCount = Math.max(2, safeInt(arcane.workshop.equipSlotCount, 2));
  const slots = Array.from({ length: slotCount }, (_, index) => safeText(arcane.workshop.equippedLootIds[index]));
  const selected = safeText(selectedLootItemId);
  const selectedItem = selected ? loot.items[selected] : null;
  const selectedIsSocketable = isManualSocketLootItem(selectedItem, "aa");
  const ringSlots = slots.map((itemId, index) => {
    const item = itemId ? loot.items[itemId] : null;
    const canEquip = Boolean(selectedItem && selectedIsSocketable);
    const canUnequip = Boolean(item) && !canEquip;
    return {
      filled: Boolean(item),
      clickable: canEquip || canUnequip,
      title: item ? `${item.label} (${item.rarity || "common"})` : "Empty workshop slot",
      ariaLabel: `Workshop slot ${index + 1}`,
      symbolHtml: item
        ? renderArtifactSymbol({
            artifactName: item.label,
            className: "slot-ring-symbol artifact-symbol",
          })
        : "",
      attrs: canEquip
        ? {
            "data-action": "loot-equip-target",
            "data-region": "aa",
            "data-slot-id": index,
          }
        : canUnequip
          ? {
              "data-action": "loot-unequip-target",
              "data-region": "aa",
              "data-slot-id": index,
            }
        : {},
    };
  });
  const summaryEntries = getArcaneWorkshopSlotSummaryEntries(state || {}, Date.now());

  return `
    <section class="card aa03-altar-card">
      <h3>Workshop Slots</h3>
      ${renderSlotRing({
        slots: ringSlots,
        className: "aa03-slot-ring",
        radiusPct: 42,
        centerHtml: renderRegionSymbol({
          section: "Arcane Ascension",
          className: "slot-ring-center-symbol",
        }),
        ariaLabel: "Workshop slot ring",
      })}
      <div class="slot-bonus-summary">
        <span class="slot-bonus-kicker">Slotted Buffs</span>
        <div class="slot-bonus-grid">
          ${
            summaryEntries.length
              ? summaryEntries.map((entry) => `
                <article class="slot-bonus-chip">
                  <span>${escapeHtml(entry.label)}</span>
                  <strong>${escapeHtml(entry.value)}</strong>
                </article>
              `).join("")
              : '<p class="slot-bonus-empty">No active workshop bonuses.</p>'
          }
        </div>
      </div>
      ${selectedItem && !selectedIsSocketable ? `<p class="muted">That selection is a consumable upgrade, not a socketed workshop piece.</p>` : ""}
      <div class="toolbar">
        <button type="button" data-action="toggle-widget" data-widget="loot">Open Loot Panel</button>
      </div>
    </section>
  `;
}

function appraisalMarkup(runtime, arcane) {
  const features = arcaneAttunementFeatures(arcane);
  const maxMana = Math.max(1, safeInt(arcane.workshop.manaCurrent, 1));
  const manaInvest = safeInt(runtime.manaInvest, 0);
  const manaValid = manaInvest >= 1 && manaInvest <= maxMana;
  const regionAccuracy = Number(runtime.regionMatch && runtime.regionMatch.accuracyScore) || 0;
  const enhancementAccuracy = Number(runtime.enhancementMatch && runtime.enhancementMatch.accuracyScore) || 0;
  const combinedAccuracy = Number(runtime.trueAccuracy) || 0;
  const appraisalAccuracy = features.dualPreview ? combinedAccuracy : (Number(runtime.estimatedAccuracy) || combinedAccuracy);
  const accuracyDisplay = features.numericAppraisal
    ? `${Math.round(appraisalAccuracy * 100)}%`
    : qualitativeAccuracyLabel(appraisalAccuracy);
  const forecast = Array.isArray(runtime.craftForecast) ? runtime.craftForecast : [];
  return `
    <section class="card aa03-altar-card aa03-appraisal-card">
      <h3>Appraisal</h3>
      <div class="aa03-appraisal-grid">
        ${
          features.dualPreview
            ? `
              <div class="aa03-appraisal-rune aa03-appraisal-rune-combined">
                <span class="muted">Region</span>
                <strong>${escapeHtml(readableGlyphName(safeText(runtime.regionMatch && runtime.regionMatch.bestMatch)) || "Unknown")}</strong>
                <em>${escapeHtml(features.numericAppraisal ? `${Math.round(regionAccuracy * 100)}%` : qualitativeAccuracyLabel(regionAccuracy))}</em>
              </div>
              <div class="aa03-appraisal-rune aa03-appraisal-rune-combined">
                <span class="muted">Enhancement</span>
                <strong>${escapeHtml(readableGlyphName(safeText(runtime.enhancementMatch && runtime.enhancementMatch.bestMatch)) || "Unknown")}</strong>
                <em>${escapeHtml(features.numericAppraisal ? `${Math.round(enhancementAccuracy * 100)}%` : qualitativeAccuracyLabel(enhancementAccuracy))}</em>
              </div>
              <div class="aa03-appraisal-rune aa03-appraisal-rune-focus">
                <span class="muted">Combined Craft Accuracy</span>
                <strong>${escapeHtml(features.numericAppraisal ? `${Math.round(combinedAccuracy * 100)}%` : qualitativeAccuracyLabel(combinedAccuracy))}</strong>
              </div>
            `
            : ""
        }
        ${
          !features.dualPreview
            ? `
              <div class="aa03-appraisal-rune">
                <span class="muted">Region Rune</span>
                <strong>${escapeHtml(readableGlyphName(safeText(runtime.regionMatch && runtime.regionMatch.bestMatch)) || "Unknown")}</strong>
              </div>
              <div class="aa03-appraisal-rune">
                <span class="muted">Enhancement Rune</span>
                <strong>${escapeHtml(readableGlyphName(safeText(runtime.enhancementMatch && runtime.enhancementMatch.bestMatch)) || "Unknown")}</strong>
              </div>
              <div class="aa03-appraisal-rune aa03-appraisal-rune-focus">
                <span class="muted">${features.numericAppraisal ? "Craft Accuracy" : "Appraisal"}</span>
                <strong>${escapeHtml(accuracyDisplay)}</strong>
              </div>
            `
            : ""
        }
      </div>
      <label>
        <span class="muted">Mana Investment</span>
        <input
          class="aa03-mana-input"
          type="number"
          min="1"
          max="${escapeHtml(String(maxMana))}"
          step="1"
          value="${escapeHtml(manaInvest > 0 ? String(manaInvest) : "")}"
          data-aa03-mana-invest
        />
      </label>
      <p><strong>Available:</strong> ${escapeHtml(String(maxMana))} mana</p>
      ${
        features.rarityThresholds && forecast.length
          ? `
            <div class="aa03-threshold-panel">
              <h4>Rarity Thresholds</h4>
              <div class="aa03-threshold-grid">
                ${forecast.map((entry) => `
                  <div class="aa03-threshold-card">
                    <span>${escapeHtml(String(entry.rarity || ""))}</span>
                    <strong>${escapeHtml(String(entry.threshold || 0))}</strong>
                  </div>
                `).join("")}
              </div>
            </div>
          `
          : ""
      }
      <div class="toolbar">
        <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-craft-item" data-mana="${escapeHtml(String(manaInvest))}" ${manaValid ? "" : "disabled"}>Craft Item</button>
        <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-cancel-craft">Cancel</button>
      </div>
      ${manaValid ? "" : `<p class="muted">Enter a valid mana value between 1 and ${escapeHtml(String(maxMana))}.</p>`}
    </section>
  `;
}

function resultPopupMarkup(runtime) {
  if (!runtime.outcomePopupOpen || !runtime.lastOutcome) {
    return "";
  }
  const outcome = runtime.lastOutcome || {};
  if (outcome.junk) {
    return `
      <div class="worm02-picker-overlay" role="dialog" aria-label="Craft result">
        <section class="card aa03-result-modal">
          <div class="aa03-result-head">
            <h3>Craft Result</h3>
          </div>
          <div class="aa03-result-body">
            <div class="aa03-result-emblem aa03-result-emblem-junk">J</div>
            <div class="aa03-result-copy">
              <h4>Junk</h4>
              <p>The rune collapse left only unstable scrap and failed etching dust.</p>
            </div>
          </div>
          <div class="toolbar">
            <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-close-outcome-popup">Close</button>
          </div>
        </section>
      </div>
    `;
  }
  const regionName = readableGlyphName(safeText(outcome.region)) || "Unknown";
  return `
    <div class="worm02-picker-overlay" role="dialog" aria-label="Craft result">
      <section class="card aa03-result-modal">
        <div class="aa03-result-head">
          <h3>Craft Result</h3>
        </div>
        <div class="aa03-result-body">
          <div class="aa03-result-emblem">
            ${renderGlyphSymbol(outcome.region || "aa", "aa03-result-symbol")}
          </div>
          <div class="aa03-result-copy">
            <h4>${escapeHtml(outcome.label || "Unknown")}</h4>
            <div class="aa03-result-tags">
              <span class="aa03-result-pill">${escapeHtml(regionName)}</span>
              <span class="aa03-result-pill">${escapeHtml(outcome.rarity || "Unknown")}</span>
            </div>
            <p>Stabilized through the ${escapeHtml(regionName)} rune and set into a finished workshop prize.</p>
            ${safeText(outcome.details) ? `<div class="aa03-result-detail-list">${safeText(outcome.details).split("|").map((part) => `<span class="aa03-result-detail-line">${escapeHtml(safeText(part))}</span>`).join("")}</div>` : ""}
          </div>
        </div>
        <div class="toolbar">
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-close-outcome-popup">Close</button>
        </div>
      </section>
    </div>
  `;
}

function workshopTabMarkup(runtime, arcane) {
  const canStart = arcane.attunements.enchanter && arcane.grimoire.regionGlyphs.length > 0 && arcane.grimoire.enhancementGlyphs.length > 0;
  const features = arcaneAttunementFeatures(arcane);
  const overlayStrength = attunementSubrankVisualFactor(features.rank);
  const selectedRegionGlyph = safeText(arcane.grimoire.selectedRegionGlyph);
  const selectedEnhancementGlyph = safeText(arcane.grimoire.selectedEnhancementGlyph);
  let leftMarkup = "";
  if (runtime.phase === "idle") {
    leftMarkup = `
      <section class="card aa03-altar-card aa03-idle-card">
        <p>Trace the region mark, bind an enhancement, then feed the bench mana until the enchantment resolves into a finished relic.</p>
        <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-start-workshop" ${canStart ? "" : "disabled"}>Begin Enchanting</button>
        ${canStart ? "" : `<p class="muted">Requires Enchanter attunement and unlocked glyphs from Climber's Court.</p>`}
      </section>
    `;
  } else if (runtime.phase === "draw-region") {
    leftMarkup = renderRunePanel(
      "region",
      "Draw Region Rune",
      features.traceOverlay ? selectedRegionGlyph : "",
      overlayStrength,
    );
  } else if (runtime.phase === "draw-enhancement") {
    leftMarkup = renderRunePanel(
      "enhancement",
      "Draw Enhancement Rune",
      features.traceOverlay ? selectedEnhancementGlyph : "",
      overlayStrength,
    );
  } else if (runtime.phase === "appraisal") {
    leftMarkup = appraisalMarkup(runtime, arcane);
  } else {
    leftMarkup = `
      <section class="card aa03-altar-card aa03-idle-card">
        <h3>Workshop</h3>
        <p>Ready for another craft.</p>
        <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-new-craft">Start New Craft</button>
      </section>
    `;
  }

  return `
    <section class="aa03-workshop-layout">
      <div class="aa03-workshop-left">${leftMarkup}</div>
      ${resultPopupMarkup(runtime)}
    </section>
  `;
}

function glyphCardMarkupSelectable(glyphId, index, selectedGlyph) {
  const id = safeText(glyphId).toLowerCase();
  const type = regionSectionFromGlyph(id) ? "region" : "enhancement";
  const isSelected = id === safeText(selectedGlyph).toLowerCase();
  return `
    <button
      type="button"
      class="card aa03-glyph-card ${isSelected ? "is-selected" : ""}"
      style="animation-delay:${(index * 40)}ms"
      data-node-id="${NODE_ID}"
      data-node-action="aa03-select-glyph"
      data-glyph-kind="${escapeHtml(type)}"
      data-glyph-id="${escapeHtml(id)}"
    >
      <h4>${escapeHtml(readableGlyphName(id))}</h4>
      <div class="aa03-glyph-preview">${glyphTraceMarkup(type, id)}</div>
    </button>
  `;
}

function grimoireTabMarkup(arcane, features) {
  const selectable = Boolean(features && features.persistentSelection);
  const regionCards = arcane.grimoire.regionGlyphs.map((glyph, index) => (
    selectable
      ? glyphCardMarkupSelectable(glyph, index, arcane.grimoire.selectedRegionGlyph)
      : `<article class="card aa03-glyph-card" style="animation-delay:${(index * 40)}ms"><h4>${escapeHtml(readableGlyphName(glyph))}</h4><div class="aa03-glyph-preview">${glyphTraceMarkup("region", glyph)}</div></article>`
  )).join("");
  const enhancementCards = arcane.grimoire.enhancementGlyphs.map((glyph, index) => (
    selectable
      ? glyphCardMarkupSelectable(glyph, index, arcane.grimoire.selectedEnhancementGlyph)
      : `<article class="card aa03-glyph-card" style="animation-delay:${(index * 40)}ms"><h4>${escapeHtml(readableGlyphName(glyph))}</h4><div class="aa03-glyph-preview">${glyphTraceMarkup("enhancement", glyph)}</div></article>`
  )).join("");
  return `
    <section class="card aa03-grimoire-book">
      <h3>Grimoire</h3>
      <h4>Region Glyphs</h4>
      <div class="worm01-card-grid">
        ${regionCards || "<p class=\"muted\">No region glyphs learned yet.</p>"}
      </div>
      <h4>Enhancement Glyphs</h4>
      <div class="worm01-card-grid">
        ${enhancementCards || "<p class=\"muted\">No enhancement glyphs learned yet.</p>"}
      </div>
    </section>
  `;
}

function rankPopupMarkup(arcane) {
  const popup = arcane.attunements && arcane.attunements.pendingRankPopup && typeof arcane.attunements.pendingRankPopup === "object"
    ? arcane.attunements.pendingRankPopup
    : null;
  if (!popup) {
    return "";
  }
  return `
    <div class="worm02-picker-overlay" role="dialog" aria-label="Attunement Rank Up">
      <section class="card aa03-rankup-modal" style="--aa-rank-color:${escapeHtml(popup.color || "#d8e5ff")}">
        <h3>${escapeHtml(popup.label || "Attunement Advanced")}</h3>
        <p>${escapeHtml(popup.description || "")}</p>
        <div class="aa03-rankup-benefits">
          ${(Array.isArray(popup.benefits) ? popup.benefits : []).map((entry) => `<span class="aa03-rankup-chip">${escapeHtml(entry)}</span>`).join("")}
        </div>
        <div class="toolbar">
          <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-close-rank-popup">Continue</button>
        </div>
      </section>
    </div>
  `;
}

function attunementDebugMarkup() {
  const options = attunementRankOptions();
  return `
    <section class="card aa03-attunement-debug">
      <h4>Attunement Tester</h4>
      <div class="toolbar">
        <select class="select" data-aa03-rank-select>
          ${options.map((entry) => `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.label)}</option>`).join("")}
        </select>
        <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-set-attunement-rank">Set Rank</button>
      </div>
    </section>
  `;
}

function attunementHudMarkup(arcane, attunement, attunementLabel, activeTab) {
  const currentMana = Math.floor(arcane.workshop.manaCurrent);
  const maxMana = Math.max(0, Math.floor(arcane.workshop.manaMax));
  const manaPercent = maxMana > 0 ? Math.round((currentMana / maxMana) * 100) : 0;
  const badgeColor = arcane.attunements.enchanter ? (attunement.color || "#d8e5ff") : "#8f96a8";
  const requirementLabel = arcane.attunements.enchanter && attunement.nextThreshold != null
    ? `${attunement.nextThreshold} mana`
    : "Attunement not yet bound";
  return `
    <section class="card aa03-tabs-card aa03-hud-card">
      <div class="aa03-hud-main">
        <div class="aa03-attunement-badge" style="--aa-attunement-color:${escapeHtml(badgeColor)}">
          <span>Current Attunement</span>
          <strong>${escapeHtml(attunementLabel)}</strong>
        </div>
        <div class="aa03-mana-hud">
          <div class="aa03-mana-head">
            <span>Mana</span>
            <strong>${escapeHtml(String(currentMana))}/${escapeHtml(String(maxMana))}</strong>
          </div>
          <div class="aa03-mana-bar" aria-label="Workshop mana">
            <span style="width:${escapeHtml(String(manaPercent))}%"></span>
          </div>
        </div>
        <div class="aa03-requirement-chip">
          <span>Requirement</span>
          <strong>${escapeHtml(requirementLabel)}</strong>
        </div>
        <div class="aa03-craft-chips">
          <span class="aa03-craft-chip">Crafts ${escapeHtml(String(arcane.crafting.totalCrafts))}</span>
          <span class="aa03-craft-chip">Stable ${escapeHtml(String(arcane.crafting.nonJunkCrafts))}</span>
        </div>
      </div>
      <div class="toolbar">
        ${tabButton("workshop", activeTab === "workshop", "Workshop")}
        ${tabButton("grimoire", activeTab === "grimoire", "Grimoire")}
        ${tabButton("slots", activeTab === "slots", "Slots")}
      </div>
    </section>
  `;
}

export function renderAa03Experience(context) {
  const runtime = synchronizeAa03Runtime(context.runtime, context);
  const arcane = arcaneSystemFromState(context.state || {}, Date.now());
  const attunement = arcaneAttunementRank(arcane);
  const features = arcaneAttunementFeatures(arcane);
  const attunementLabel = arcane.attunements.enchanter ? attunement.label : "Unbound";
  const activeTab = runtime.activeTab || "workshop";

  const body = activeTab === "grimoire"
    ? grimoireTabMarkup(arcane, features)
    : activeTab === "slots"
      ? workshopSlotsMarkup(context.state || {}, arcane, context.selectedLootItemId)
      : workshopTabMarkup(runtime, arcane);

  return `
    <article class="aa03-node" data-node-id="${NODE_ID}">
      ${attunementHudMarkup(arcane, attunement, attunementLabel, activeTab)}
      ${attunementDebugMarkup()}
      ${body}
      ${rankPopupMarkup(arcane)}
    </article>
  `;
}

export function buildAa03ActionFromElement(element) {
  const action = safeText(element.getAttribute("data-node-action"));
  if (!action) {
    return null;
  }
  if (action === "aa03-open-tab") {
    return {
      type: action,
      tab: safeText(element.getAttribute("data-tab")).toLowerCase(),
      at: Date.now(),
    };
  }
  if (action === "aa03-select-glyph") {
    return {
      type: action,
      glyphKind: safeText(element.getAttribute("data-glyph-kind")).toLowerCase(),
      glyphId: safeText(element.getAttribute("data-glyph-id")).toLowerCase(),
      at: Date.now(),
    };
  }
  if (action === "aa03-set-attunement-rank") {
    const root = element.closest(".aa03-node");
    const select = root ? root.querySelector("[data-aa03-rank-select]") : null;
    const rankKey = select && "value" in select ? String(select.value || "") : "";
    return {
      type: action,
      rankKey: safeText(rankKey).toLowerCase(),
      at: Date.now(),
    };
  }
  if (action === "aa03-start-workshop" || action === "aa03-new-craft" || action === "aa03-cancel-craft" || action === "aa03-close-outcome-popup") {
    return { type: action, at: Date.now() };
  }
  if (action === "aa03-close-rank-popup") {
    return { type: action, at: Date.now() };
  }
  if (action === "aa03-clear-rune") {
    return {
      type: action,
      kind: safeText(element.getAttribute("data-kind")).toLowerCase(),
      at: Date.now(),
    };
  }
  if (action === "aa03-submit-region-rune" || action === "aa03-submit-enhancement-rune") {
    const kind = safeText(element.getAttribute("data-kind")).toLowerCase();
    const root = element.closest(".aa03-node");
    const canvas = root ? root.querySelector(`[data-aa03-canvas-kind="${kind}"]`) : null;
    const serialized = canvas ? canvas.getAttribute("data-aa03-path") || "[]" : "[]";
    return {
      type: action,
      kind,
      strokePoints: parseSerializedStroke(serialized),
      at: Date.now(),
    };
  }
  if (action === "aa03-craft-item") {
    const root = element.closest(".aa03-node");
    const investInput = root ? root.querySelector("[data-aa03-mana-invest]") : null;
    const liveMana = investInput && "value" in investInput ? investInput.value : element.getAttribute("data-mana");
    return {
      type: action,
      mana: safeInt(liveMana, 0),
      at: Date.now(),
    };
  }
  return null;
}

export function buildAa03KeyAction(event) {
  if (!event || event.key !== "Enter") {
    return null;
  }
  return null;
}

export const AA03_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialAa03Runtime,
  synchronizeRuntime: synchronizeAa03Runtime,
  render: renderAa03Experience,
  reduceRuntime: reduceAa03Runtime,
  validateRuntime: validateAa03Runtime,
  buildActionFromElement: buildAa03ActionFromElement,
  buildKeyAction: buildAa03KeyAction,
};
