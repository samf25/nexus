import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderRegionSymbol } from "../../core/symbology.js";
import { arcaneSystemFromState, glyphDisplayName, glyphTemplatePoints } from "../../systems/arcaneAscension.js";
import { isManualSocketLootItem, lootInventoryFromState } from "../../systems/loot.js";
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

function glyphTraceMarkup(glyphType, glyphId) {
  const points = glyphTemplatePoints(glyphType, glyphId);
  if (!Array.isArray(points) || !points.length) {
    return `<svg class="aa03-glyph-trace" viewBox="0 0 100 100" aria-hidden="true"></svg>`;
  }
  const coords = points
    .map((point) => {
      if (Array.isArray(point)) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        return `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`;
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
  return `
    <svg class="aa03-glyph-trace" viewBox="0 0 100 100" aria-hidden="true">
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
    manaInvest: Math.max(1, safeInt(source.manaInvest, 20)),
    craftedCount: Math.max(0, safeInt(source.craftedCount, 0)),
    solved: Boolean(source.solved),
    lastOutcome: source.lastOutcome && typeof source.lastOutcome === "object" ? { ...source.lastOutcome } : null,
    outcomePopupOpen: source.outcomePopupOpen !== false,
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
  const manaInvest = Math.max(0, safeInt(current.manaInvest, 20));
  return {
    ...current,
    manaInvest,
    solved: current.solved || Math.max(0, safeInt(arcane.crafting && arcane.crafting.nonJunkCrafts, 0)) > 0,
    craftedCount: Math.max(current.craftedCount, safeInt(arcane.crafting && arcane.crafting.totalCrafts, 0)),
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

  if (action.type === "aa03-start-workshop") {
    return {
      ...current,
      activeTab: "workshop",
      phase: "draw-region",
      regionStroke: [],
      enhancementStroke: [],
      regionMatch: null,
      enhancementMatch: null,
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

function renderRunePanel(kind, title) {
  return `
    <section class="card aa03-altar-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="aa03-rune-canvas-wrap">
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
      ${selectedItem && !selectedIsSocketable ? `<p class="muted">That selection is a consumable upgrade, not a socketed workshop piece.</p>` : ""}
      <div class="toolbar">
        <button type="button" data-action="toggle-widget" data-widget="loot">Open Loot Panel</button>
      </div>
    </section>
  `;
}

function appraisalMarkup(runtime, arcane) {
  const maxMana = Math.max(1, safeInt(arcane.workshop.manaCurrent, 1));
  const manaInvest = safeInt(runtime.manaInvest, 0);
  const manaValid = manaInvest >= 1 && manaInvest <= maxMana;
  return `
    <section class="card aa03-altar-card aa03-appraisal-card">
      <h3>Appraisal</h3>
      <div class="aa03-appraisal-grid">
        <div class="aa03-appraisal-rune">
          <span class="muted">Region Rune</span>
          <strong>${escapeHtml(readableGlyphName(safeText(runtime.regionMatch && runtime.regionMatch.bestMatch)) || "Unknown")}</strong>
        </div>
        <div class="aa03-appraisal-rune">
          <span class="muted">Enhancement Rune</span>
          <strong>${escapeHtml(readableGlyphName(safeText(runtime.enhancementMatch && runtime.enhancementMatch.bestMatch)) || "Unknown")}</strong>
        </div>
        <div class="aa03-appraisal-rune">
          <span class="muted">Estimated Accuracy</span>
          <strong>${escapeHtml(String(Math.round(runtime.estimatedAccuracy * 100)))}%</strong>
        </div>
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
            <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-new-craft">Start New Craft</button>
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
          <button type="button" data-node-id="${NODE_ID}" data-node-action="aa03-new-craft">Start New Craft</button>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="aa03-close-outcome-popup">Close</button>
        </div>
      </section>
    </div>
  `;
}

function workshopTabMarkup(runtime, arcane) {
  const canStart = arcane.attunements.enchanter && arcane.grimoire.regionGlyphs.length > 0 && arcane.grimoire.enhancementGlyphs.length > 0;
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
    );
  } else if (runtime.phase === "draw-enhancement") {
    leftMarkup = renderRunePanel(
      "enhancement",
      "Draw Enhancement Rune",
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

function glyphCardMarkup(glyphId, index) {
  const id = safeText(glyphId).toLowerCase();
  const type = regionSectionFromGlyph(id) ? "region" : "enhancement";
  return `
    <article class="card" style="animation-delay:${(index * 40)}ms">
      <h4>${escapeHtml(readableGlyphName(id))}</h4>
      <div class="aa03-glyph-preview">${glyphTraceMarkup(type, id)}</div>
    </article>
  `;
}

function grimoireTabMarkup(arcane) {
  return `
    <section class="card aa03-grimoire-book">
      <h3>Grimoire</h3>
      <h4>Region Glyphs</h4>
      <div class="worm01-card-grid">
        ${arcane.grimoire.regionGlyphs.map((glyph, index) => glyphCardMarkup(glyph, index)).join("") || "<p class=\"muted\">No region glyphs learned yet.</p>"}
      </div>
      <h4>Enhancement Glyphs</h4>
      <div class="worm01-card-grid">
        ${arcane.grimoire.enhancementGlyphs.map((glyph, index) => glyphCardMarkup(glyph, index)).join("") || "<p class=\"muted\">No enhancement glyphs learned yet.</p>"}
      </div>
    </section>
  `;
}

export function renderAa03Experience(context) {
  const runtime = synchronizeAa03Runtime(context.runtime, context);
  const arcane = arcaneSystemFromState(context.state || {}, Date.now());
  const activeTab = runtime.activeTab || "workshop";

  const body = activeTab === "grimoire"
    ? grimoireTabMarkup(arcane)
    : activeTab === "slots"
      ? workshopSlotsMarkup(context.state || {}, arcane, context.selectedLootItemId)
      : workshopTabMarkup(runtime, arcane);

  return `
    <article class="aa03-node" data-node-id="${NODE_ID}">
      <section class="card aa03-tabs-card">
        <div class="aa03-header-row">
          <div>
            <h3>Workshop</h3>
          </div>
          <div class="aa03-workshop-stats">
            <span class="aa03-result-pill">Mana ${escapeHtml(String(Math.floor(arcane.workshop.manaCurrent)))}/${escapeHtml(String(arcane.workshop.manaMax))}</span>
            <span class="aa03-result-pill">Total Crafts ${escapeHtml(String(arcane.crafting.totalCrafts))}</span>
            <span class="aa03-result-pill">Stable Crafts ${escapeHtml(String(arcane.crafting.nonJunkCrafts))}</span>
          </div>
        </div>
        <div class="toolbar">
          ${tabButton("workshop", activeTab === "workshop", "Workshop")}
          ${tabButton("grimoire", activeTab === "grimoire", "Grimoire")}
          ${tabButton("slots", activeTab === "slots", "Slots")}
        </div>
      </section>
      ${body}
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
  if (action === "aa03-start-workshop" || action === "aa03-new-craft" || action === "aa03-cancel-craft" || action === "aa03-close-outcome-popup") {
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
