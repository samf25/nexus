import { escapeHtml } from "../../templates/shared.js";
import { renderRegionSymbol } from "../../core/symbology.js";
import {
  prestigeRegionDefinitions,
  prestigeRegionSnapshot,
} from "../../systems/prestige.js";

const NODE_ID = "MOL03";
const REGIONS = prestigeRegionDefinitions().filter(
  (region) => region.id === "cradle" || region.id === "worm" || region.id === "dcc",
);

function normalizeRuntime(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const previewSource = source.previewUpgradeIdByRegion && typeof source.previewUpgradeIdByRegion === "object"
    ? source.previewUpgradeIdByRegion
    : {};
  const previewUpgradeIdByRegion = {};
  for (const region of REGIONS) {
    previewUpgradeIdByRegion[region.id] = String(previewSource[region.id] || "");
  }
  return {
    selectedIndex: Math.max(0, Math.min(REGIONS.length - 1, Math.floor(Number(source.selectedIndex) || 0))),
    focusRegionId: REGIONS.some((region) => region.id === source.focusRegionId) ? source.focusRegionId : "",
    previewUpgradeIdByRegion,
    solved: Boolean(source.solved),
    lastMessage: String(source.lastMessage || ""),
  };
}

function selectedRegion(runtime) {
  return REGIONS[runtime.selectedIndex] || REGIONS[0];
}

function solvedFromState(state) {
  return REGIONS.some((region) => {
    const snapshot = prestigeRegionSnapshot(state, region.id);
    return (snapshot.upgradeViews || []).some((view) => Number(view.level || 0) > 0);
  });
}

function regionAccent(regionId) {
  const key = String(regionId || "").trim().toLowerCase();
  if (key === "cradle") {
    return "Core Refinements";
  }
  if (key === "worm") {
    return "Shard Investments";
  }
  if (key === "dcc") {
    return "Sponsor Lattice";
  }
  return "Prestige Tree";
}

function wheelMarkup(runtime) {
  const selected = selectedRegion(runtime).id;
  const radius = REGIONS.length === 2 ? 24 : 38;
  const points = REGIONS.map((_, index) => {
    const angle = REGIONS.length === 2 ? -90 + index * 180 : ((360 / Math.max(1, REGIONS.length)) * index) - 90;
    const radians = (angle * Math.PI) / 180;
    return {
      x: 50 + Math.cos(radians) * radius,
      y: 50 + Math.sin(radians) * radius,
    };
  });

  return `
    <section class="card mol03-wheel-panel">
      <div class="mol03-wheel-head">
        <span class="mol03-kicker">Region Lattice</span>
        <h3>Choose A Loop</h3>
      </div>
      <div class="mol02-ring-stage mol03-wheel-stage">
        <div class="mol02-ring-guide" aria-hidden="true"></div>
        <div class="mol02-ring-core">
          ${renderRegionSymbol({
            section: "Mother of Learning",
            className: "mol-wheel-core-symbol",
          })}
        </div>
        ${REGIONS.map((region, index) => {
          const point = points[index];
          return `
            <button
              type="button"
              class="mol02-ring-node ${selected === region.id ? "is-selected" : ""}"
              style="left:${point.x}%; top:${point.y}%;"
              data-node-id="${NODE_ID}"
              data-node-action="mol03-focus-region"
              data-region-id="${escapeHtml(region.id)}"
              aria-label="${escapeHtml(region.label)} prestige tree"
            >
              ${renderRegionSymbol({ section: region.label, className: "mol-wheel-node-symbol" })}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function visibleUpgradeViews(snapshot) {
  return (snapshot.upgradeViews || []).filter((view) => view.visible);
}

function branchOrderForSnapshot(snapshot) {
  const ordered = [];
  for (const view of visibleUpgradeViews(snapshot)) {
    if (!ordered.includes(view.branch)) {
      ordered.push(view.branch);
    }
  }
  return ordered;
}

function groupedViews(snapshot) {
  const groups = new Map();
  for (const branchId of branchOrderForSnapshot(snapshot)) {
    groups.set(branchId, []);
  }
  for (const view of visibleUpgradeViews(snapshot)) {
    if (!groups.has(view.branch)) {
      groups.set(view.branch, []);
    }
    groups.get(view.branch).push(view);
  }
  for (const views of groups.values()) {
    views.sort((left, right) => Number(left.tier || 1) - Number(right.tier || 1));
  }
  return groups;
}

function resolvedPreviewUpgradeId(runtime, snapshot) {
  const regionId = snapshot.regionId;
  const remembered = String(runtime.previewUpgradeIdByRegion && runtime.previewUpgradeIdByRegion[regionId] || "");
  const visible = visibleUpgradeViews(snapshot);
  if (remembered && visible.some((view) => view.id === remembered)) {
    return remembered;
  }
  const best =
    visible.find((view) => view.affordable)
    || visible.find((view) => view.purchasable)
    || visible.find((view) => view.acquired)
    || visible[0]
    || null;
  return best ? best.id : "";
}

function perLevelEffectLines(regionId, upgradeId) {
  const region = String(regionId || "").trim().toLowerCase();
  const id = String(upgradeId || "").trim().toLowerCase();
  const map = {
    cradle: {
      "remnant-seed": ["+10 starting Madra per level"],
      "madra-surge": ["Madra gain x1.30 per level"],
      "cycle-economy": ["Cycling costs divide by +0.22 per level"],
      "combat-edge": ["Combat attack x1.16 per level"],
      "soul-cloak-memory": ["+3.5% dodge per level", "Technique costs divide by +0.14 per level"],
      "empty-palm-insight": ["+7% Empty Palm success per level"],
      "manual-echo": ["Manual cultivation x1.20 per level"],
      "breakthrough-memory": ["Breakthrough costs divide by +0.16 per level"],
      "battle-memory-array": ["+6% damage reduction per level", "+8% enemy fumble per level"],
      "soulfire-surge": ["Soulfire gain x1.24 per level"],
      "soulfire-forge": ["Soulfire costs divide by +0.18 per level"],
      "soulfire-furnace": ["Passive soulfire x1.30 per level"],
    },
    worm: {
      "clout-surge": ["Clout gain x1.18 per level"],
      "job-window": ["Basic hiring weight x1.18 per level"],
      "special-window-broker": ["Special windows x1.22 per level"],
      "street-medicine": ["Sickbay healing x1.35 per level"],
      "cape-conditioning": ["Cape max HP x1.10 per level"],
      "threat-drills": ["Cape damage x1.10 per level"],
      "trauma-plates": ["+6% combat damage reduction per level"],
      "sickbay-overflow": ["Levels 2-4 add Sickbay slots"],
      "compactifier-routines": ["Compactify costs divide by +0.25 per level"],
      "shard-lattice": ["Shard effects x1.20 per level"],
      "broker-network": ["+8% Worm loot drop chance per level"],
      "high-stakes-sponsors": ["+0.30 rarity bias per level"],
    },
    dcc: {
      "sponsor-might": ["+10 max HP per level", "+1 attack per level"],
      "conditioning-program": ["+2 max stamina per level"],
      "crowd-survival": ["+6% damage reduction per level"],
      "sponsor-bounty": ["+16% gold per level", "+4% rare bonus per level"],
      "market-favors": ["Shop prices divide by +0.16 per level"],
      "floor-reader": ["+18% map reveal chance per level"],
      "sponsor-arsenal": ["Lv1 sponsor blast", "Lv2 +1 slot", "Lv3 +1 basic refinement"],
      "skill-index": ["+9% tome drop weight per level"],
      "execution-patterns": ["Skill damage x1.10 per level"],
      "field-medicine": ["Potion healing x1.22 per level"],
      "ration-cache": ["Lv1 +1 potion", "Lv2 +10 gold", "Lv3 second potion"],
      "scavenger-instinct": ["+12% bonus loot roll chance per level"],
    },
  };
  return (map[region] && map[region][id]) || [];
}

function currentLevelSummary(regionId, upgradeId, level) {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  const region = String(regionId || "").trim().toLowerCase();
  const id = String(upgradeId || "").trim().toLowerCase();
  if (!lv) {
    return "No investment yet.";
  }
  const format = (value) => Number(value).toFixed(2).replace(/\.00$/u, "");
  if (region === "cradle") {
    if (id === "remnant-seed") return `+${lv * 10} starting Madra`;
    if (id === "madra-surge") return `Madra gain x${format(1 + 0.3 * lv)}`;
    if (id === "cycle-economy") return `Cycling costs /${format(1 + 0.22 * lv)}`;
    if (id === "combat-edge") return `Combat attack x${format(1 + 0.16 * lv)}`;
    if (id === "soul-cloak-memory") return `+${format(0.035 * lv * 100)}% dodge, costs /${format(1 + 0.14 * lv)}`;
    if (id === "empty-palm-insight") return `+${format(0.07 * lv * 100)}% Empty Palm`;
    if (id === "manual-echo") return `Manual cultivation x${format(1 + 0.2 * lv)}`;
    if (id === "breakthrough-memory") return `Breakthrough costs /${format(1 + 0.16 * lv)}`;
    if (id === "battle-memory-array") return `+${format(0.06 * lv * 100)}% reduction, +${format(0.08 * lv * 100)}% fumble`;
    if (id === "soulfire-surge") return `Soulfire gain x${format(1 + 0.24 * lv)}`;
    if (id === "soulfire-forge") return `Soulfire costs /${format(1 + 0.18 * lv)}`;
    if (id === "soulfire-furnace") return `Passive soulfire x${format(1 + 0.3 * lv)}`;
  }
  if (region === "worm") {
    if (id === "clout-surge") return `Clout gain x${format(1 + 0.18 * lv)}`;
    if (id === "job-window") return `Basic hiring x${format(1 + 0.18 * lv)}`;
    if (id === "special-window-broker") return `Special windows x${format(1 + 0.22 * lv)}`;
    if (id === "street-medicine") return `Sickbay healing x${format(1 + 0.35 * lv)}`;
    if (id === "cape-conditioning") return `Cape max HP x${format(1 + 0.1 * lv)}`;
    if (id === "threat-drills") return `Cape damage x${format(1 + 0.1 * lv)}`;
    if (id === "trauma-plates") return `-${format(0.06 * lv * 100)}% incoming damage`;
    if (id === "sickbay-overflow") return `+${Math.max(0, lv - 1)} extra Sickbay slots`;
    if (id === "compactifier-routines") return `Compactify costs /${format(1 + 0.25 * lv)}`;
    if (id === "shard-lattice") return `Shard effects x${format(1 + 0.2 * lv)}`;
    if (id === "broker-network") return `+${format(0.08 * lv * 100)}% Worm loot chance`;
    if (id === "high-stakes-sponsors") return `+${format(0.3 * lv)} rarity bias`;
  }
  if (region === "dcc") {
    if (id === "sponsor-might") return `+${lv * 10} HP, +${lv} attack`;
    if (id === "conditioning-program") return `+${lv * 2} stamina`;
    if (id === "crowd-survival") return `-${format(0.06 * lv * 100)}% incoming damage`;
    if (id === "sponsor-bounty") return `+${format(0.16 * lv * 100)}% gold, +${format(0.04 * lv * 100)}% rare`;
    if (id === "market-favors") return `Shop prices /${format(1 + 0.16 * lv)}`;
    if (id === "floor-reader") return `+${format(0.18 * lv * 100)}% map reveal`;
    if (id === "sponsor-arsenal") return lv >= 3 ? "Blast, slot, and basic refinement online" : lv === 2 ? "Blast and extra slot online" : "Sponsor Blast online";
    if (id === "skill-index") return `+${format(0.09 * lv * 100)}% tome drop weight`;
    if (id === "execution-patterns") return `Skill damage x${format(1 + 0.1 * lv)}`;
    if (id === "field-medicine") return `Potion healing x${format(1 + 0.22 * lv)}`;
    if (id === "ration-cache") return lv >= 3 ? "2 potions and +10 gold" : lv === 2 ? "1 potion and +10 gold" : "1 starting potion";
    if (id === "scavenger-instinct") return `+${format(0.12 * lv * 100)}% bonus loot roll`;
  }
  return `${lv} levels invested.`;
}

function nodeStatusLabel(view) {
  if (!view.visible) return "Hidden";
  if (view.maxed) return "Maxed";
  if (view.affordable) return "Available";
  if (view.acquired) return "Owned";
  return "Locked";
}

function layoutForBranch(branchIndex, tier) {
  return {
    x: 96 + (Math.max(1, Number(tier) || 1) - 1) * 148,
    y: 78 + branchIndex * 110,
  };
}

function treeLinksMarkup(branches) {
  const byId = new Map();
  branches.forEach((branch, branchIndex) => {
    branch.views.forEach((view) => {
      byId.set(view.id, { branchIndex, view });
    });
  });
  const lines = [];
  branches.forEach((branch, branchIndex) => {
    branch.views.forEach((view) => {
      (Array.isArray(view.prereqs) ? view.prereqs : []).forEach((entry) => {
        const source = byId.get(entry.id);
        if (!source) return;
        const from = layoutForBranch(source.branchIndex, source.view.tier);
        const to = layoutForBranch(branchIndex, view.tier);
        lines.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`);
      });
    });
  });
  return lines.join("");
}

function treeNodeMarkup(regionId, branchIndex, view, previewId) {
  const position = layoutForBranch(branchIndex, view.tier);
  return `
    <button
      type="button"
      class="crd02-tech-node mol03-tech-node is-shape-${escapeHtml(view.shape || "hex")} ${view.affordable ? "is-buyable" : "is-locked"} ${view.maxed ? "is-maxed" : ""} ${view.acquired ? "is-acquired" : ""} ${previewId === view.id ? "is-preview" : ""}"
      data-node-id="${NODE_ID}"
      data-node-action="mol03-preview-upgrade"
      data-region-id="${escapeHtml(regionId)}"
      data-upgrade-id="${escapeHtml(view.id)}"
      style="left:${position.x}px; top:${position.y}px;"
    >
      <span class="sr-only">${escapeHtml(view.label)} ${escapeHtml(String(view.level))}/${escapeHtml(String(view.maxLevel))}</span>
      <span class="crd02-tech-core" aria-hidden="true"></span>
    </button>
  `;
}

function previewDetailMarkup(snapshot, previewId) {
  const view = (snapshot.upgradeViews || []).find((entry) => entry.id === previewId) || null;
  if (!view) {
    return `
      <aside class="crd02-tech-detail mol03-tech-detail">
        <h4>No Investment Selected</h4>
        <p class="muted">Choose a node in the lattice to inspect its levels and buy one step at a time.</p>
      </aside>
    `;
  }
  const nextCostLabel = view.maxed ? "MAXED" : `${view.nextCost} ${snapshot.regionDef.pointLabel}`;
  return `
    <aside class="crd02-tech-detail mol03-tech-detail">
      <header>
        <h4>${escapeHtml(view.label)}</h4>
        <span class="crd02-tech-state is-${escapeHtml(nodeStatusLabel(view).toLowerCase())}">${escapeHtml(nodeStatusLabel(view))}</span>
      </header>
      <p class="crd02-tech-effect">${escapeHtml(view.effect || "No effect description.")}</p>
      <p class="crd02-tech-meta-line">
        <span><strong>Level</strong> ${escapeHtml(String(view.level))}/${escapeHtml(String(view.maxLevel))}</span>
        <span><strong>Next Cost</strong> ${escapeHtml(nextCostLabel)}</span>
        <span><strong>Status</strong> ${escapeHtml(nodeStatusLabel(view))}</span>
      </p>
      <section class="crd02-tech-req-block">
        <h5>Current Effect</h5>
        <p class="mol03-detail-summary">${escapeHtml(currentLevelSummary(snapshot.regionId, view.id, view.level))}</p>
      </section>
      <section class="crd02-tech-req-block">
        <h5>Per Level</h5>
        <ul class="mol03-detail-lines">
          ${perLevelEffectLines(snapshot.regionId, view.id).map((line) => `<li>${escapeHtml(line)}</li>`).join("") || '<li>No additional notes.</li>'}
        </ul>
      </section>
      <button
        type="button"
        data-node-id="${NODE_ID}"
        data-node-action="mol03-buy-upgrade"
        data-region-id="${escapeHtml(snapshot.regionId)}"
        data-upgrade-id="${escapeHtml(view.id)}"
        ${view.affordable ? "" : "disabled"}
      >
        ${view.maxed ? "Maxed" : `Invest ${escapeHtml(String(view.nextCost))} ${escapeHtml(snapshot.regionDef.pointLabel)}`}
      </button>
    </aside>
  `;
}

function treeModalMarkup(runtime, snapshot) {
  if (!runtime.focusRegionId) {
    return "";
  }
  const branches = Array.from(groupedViews(snapshot).entries()).map(([branchId, views]) => ({ branchId, views }));
  const previewId = resolvedPreviewUpgradeId(runtime, snapshot);
  return `
    <div class="crd02-tech-modal mol03-tree-modal mol03-tree-modal--${escapeHtml(snapshot.regionId)}" role="dialog" aria-label="${escapeHtml(snapshot.regionDef.label)} prestige tree">
      <section class="crd02-tech-surface mol03-tech-surface">
        <header>
          <span class="mol03-kicker">${escapeHtml(regionAccent(snapshot.regionId))}</span>
          <button type="button" class="ghost" data-node-id="${NODE_ID}" data-node-action="mol03-clear-focus">Close</button>
        </header>
        <div class="crd02-tech-layout mol03-tech-layout">
          <div class="crd02-tech-tree mol03-tech-tree">
            <div class="crd02-tech-stage mol03-tech-stage" style="--tech-grid-width:500px; --tech-grid-height:430px;">
              <svg class="crd02-tech-links" viewBox="0 0 500 430" preserveAspectRatio="none" aria-hidden="true">
                ${treeLinksMarkup(branches)}
              </svg>
              ${branches.map((branch, branchIndex) => `
                ${branch.views.map((view) => treeNodeMarkup(snapshot.regionId, branchIndex, view, previewId)).join("")}
              `).join("")}
            </div>
          </div>
          ${previewDetailMarkup(snapshot, previewId)}
        </div>
      </section>
    </div>
  `;
}

function selectedSummaryMarkup(region, snapshot) {
  const visible = visibleUpgradeViews(snapshot);
  const totalLevels = visible.reduce((sum, view) => sum + Math.max(0, Number(view.level || 0)), 0);
  const maxLevels = visible.reduce((sum, view) => sum + Math.max(0, Number(view.maxLevel || 0)), 0);
  const openableText = snapshot.points > 0 ? `Enough ${region.pointLabel} to keep investing.` : `Bank ${region.pointLabel} through resets.`;
  return `
    <section class="card mol03-summary mol03-summary--${escapeHtml(region.id)}">
      <div class="mol03-summary-head">
        <div>
          <span class="mol03-kicker">Prestige Focus</span>
          <h3>${escapeHtml(region.label)}</h3>
          <p class="muted">${escapeHtml(openableText)}</p>
        </div>
        <div class="mol03-summary-points">
          <span>${escapeHtml(region.pointLabel)}</span>
          <strong>${escapeHtml(String(snapshot.points))}</strong>
        </div>
      </div>
      <div class="mol03-summary-stats">
        <article class="mol03-summary-chip"><span>Resets</span><strong>${escapeHtml(String(snapshot.resets))}</strong></article>
        <article class="mol03-summary-chip"><span>Levels Invested</span><strong>${escapeHtml(String(totalLevels))}/${escapeHtml(String(maxLevels))}</strong></article>
      </div>
      <div class="toolbar">
        <button type="button" data-node-id="${NODE_ID}" data-node-action="mol03-focus-region" data-region-id="${escapeHtml(region.id)}">Open Lattice</button>
      </div>
    </section>
  `;
}

export function initialMol03Runtime() {
  return normalizeRuntime({});
}

export function synchronizeMol03Runtime(runtime, { state = null } = {}) {
  const current = normalizeRuntime(runtime);
  const focused = current.focusRegionId && REGIONS.some((region) => region.id === current.focusRegionId)
    ? current.focusRegionId
    : "";
  return {
    ...current,
    focusRegionId: focused,
    solved: current.solved || solvedFromState(state),
  };
}

export function validateMol03Runtime(runtime) {
  return Boolean(runtime && runtime.solved);
}

export function reduceMol03Runtime(runtime, action) {
  const current = normalizeRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "mol03-cycle") {
    const step = Number(action.step) >= 0 ? 1 : -1;
    return {
      ...current,
      selectedIndex: (current.selectedIndex + step + REGIONS.length) % REGIONS.length,
      lastMessage: "",
    };
  }

  if (action.type === "mol03-focus-region") {
    const regionId = REGIONS.some((region) => region.id === action.regionId) ? action.regionId : selectedRegion(current).id;
    return {
      ...current,
      focusRegionId: regionId,
      lastMessage: "",
    };
  }

  if (action.type === "mol03-clear-focus") {
    return {
      ...current,
      focusRegionId: "",
    };
  }

  if (action.type === "mol03-preview-upgrade") {
    const regionId = REGIONS.some((region) => region.id === action.regionId) ? action.regionId : current.focusRegionId;
    return {
      ...current,
      previewUpgradeIdByRegion: {
        ...current.previewUpgradeIdByRegion,
        [regionId]: String(action.upgradeId || ""),
      },
    };
  }

  if (action.type === "mol03-buy-upgrade") {
    const regionId = REGIONS.some((region) => region.id === action.regionId) ? action.regionId : current.focusRegionId;
    return {
      ...current,
      solved: current.solved || Boolean(action.applied),
      previewUpgradeIdByRegion: {
        ...current.previewUpgradeIdByRegion,
        [regionId]: String(action.upgradeId || current.previewUpgradeIdByRegion[regionId] || ""),
      },
      lastMessage: String(action.message || current.lastMessage),
    };
  }

  return current;
}

export function buildMol03ActionFromElement(element) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  if (actionName === "mol03-cycle") {
    return { type: "mol03-cycle", step: Number(element.getAttribute("data-step") || 1), at: Date.now() };
  }
  if (actionName === "mol03-focus-region") {
    return { type: "mol03-focus-region", regionId: element.getAttribute("data-region-id") || "", at: Date.now() };
  }
  if (actionName === "mol03-clear-focus") {
    return { type: "mol03-clear-focus", at: Date.now() };
  }
  if (actionName === "mol03-preview-upgrade") {
    return {
      type: "mol03-preview-upgrade",
      regionId: element.getAttribute("data-region-id") || "",
      upgradeId: element.getAttribute("data-upgrade-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === "mol03-buy-upgrade") {
    return {
      type: "mol03-buy-upgrade",
      regionId: element.getAttribute("data-region-id") || "",
      upgradeId: element.getAttribute("data-upgrade-id") || "",
      at: Date.now(),
    };
  }
  return null;
}

export function buildMol03KeyAction(event, runtime) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  const current = normalizeRuntime(runtime);
  if (event.code === "Escape") {
    return current.focusRegionId ? { type: "mol03-clear-focus", at: Date.now() } : null;
  }
  if (current.focusRegionId) {
    return null;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    return { type: "mol03-cycle", step: -1, at: Date.now() };
  }
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    return { type: "mol03-cycle", step: 1, at: Date.now() };
  }
  if (event.key === "Enter") {
    return { type: "mol03-focus-region", regionId: selectedRegion(current).id, at: Date.now() };
  }
  return null;
}

export function renderMol03Experience(context) {
  const runtime = synchronizeMol03Runtime(context.runtime, { state: context.state });
  const region = selectedRegion(runtime);
  const snapshot = prestigeRegionSnapshot(context.state, region.id);
  const focusedSnapshot = runtime.focusRegionId ? prestigeRegionSnapshot(context.state, runtime.focusRegionId) : null;

  return `
    <article class="mol03-node" data-node-id="${NODE_ID}">
      <section class="card mol02-header-card mol03-header-card">
        <div class="mol02-header-copy">
          <span class="mol02-kicker">Prestige Lattice</span>
          <h2>Loop Investments</h2>
        </div>
      </section>
      <section class="mol02-dashboard-grid mol03-dashboard-grid">
        ${wheelMarkup(runtime)}
        ${selectedSummaryMarkup(region, snapshot)}
      </section>
      ${focusedSnapshot ? treeModalMarkup(runtime, focusedSnapshot) : ""}
    </article>
  `;
}

export const MOL03_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialMol03Runtime,
  synchronizeRuntime: synchronizeMol03Runtime,
  render: renderMol03Experience,
  reduceRuntime: reduceMol03Runtime,
  validateRuntime: validateMol03Runtime,
  buildActionFromElement: buildMol03ActionFromElement,
  buildKeyAction: buildMol03KeyAction,
};
