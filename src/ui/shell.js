import { escapeHtml } from "../templates/shared.js";
import { renderRegionSymbol } from "../core/symbology.js";
import { renderArtifactSymbol } from "../core/artifacts.js";
import { formatDurationRemaining, formatLootItemEffectSummary, isDirectUseLootItem, isLootItemEquipped, isManualSocketLootItem, lootItemsByRegion } from "../systems/loot.js";

const ARTIFACT_SOURCE_LABEL_MAP = Object.freeze({
  "The Wandering Inn": "Inn",
  "Wandering Inn": "Inn",
  "Mother of Learning": "MoL",
  "A Practical Guide to Evil": "Guide",
  "Practical Guide": "Guide",
  "Arcane Ascension": "Arcane",
  "Dungeon Crawler Carl": "Dungeon",
  "Hall of Proofs": "Math",
  "Prime Vault": "Math",
  "Symmetry Forge": "Math",
  "Curved Atlas": "Math",
});

function compactArtifactSourceLabel(source) {
  const text = String(source || "").trim();
  return ARTIFACT_SOURCE_LABEL_MAP[text] || text || "Unknown source";
}

function artifactSourceGroup(source) {
  const text = String(source || "").trim();
  if (["Hall of Proofs", "Prime Vault", "Symmetry Forge", "Curved Atlas"].includes(text)) {
    return "Math";
  }
  return text;
}

function renderInventory(state, selectedArtifactReward, selectedArtifactSource = "all") {
  const rewardEntries = Object.entries(state.inventory.rewards || {}).map(([reward, meta]) => ({
    reward,
    meta: meta && typeof meta === "object" ? meta : {},
  }));
  if (!rewardEntries.length) {
    return `<div class="widget-empty">No artifacts collected yet.</div>`;
  }

  const sources = Array.from(
    new Set(
      rewardEntries
        .map((entry) => artifactSourceGroup(entry.meta.section || ""))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const selectedSource = selectedArtifactSource === "all" || sources.includes(selectedArtifactSource)
    ? selectedArtifactSource
    : "all";
  const filtered = selectedSource === "all"
    ? rewardEntries.slice()
    : rewardEntries.filter((entry) => artifactSourceGroup(entry.meta.section || "") === selectedSource);

  const tabs = `
    <div class="toolbar widget-artifact-tabs">
      <button
        type="button"
        data-action="artifact-select-source"
        data-source="all"
        ${selectedSource === "all" ? "disabled" : ""}
      >
        All
      </button>
      ${sources.map((source) => `
        <button
          type="button"
          data-action="artifact-select-source"
          data-source="${escapeHtml(source)}"
          ${selectedSource === source ? "disabled" : ""}
        >
          ${escapeHtml(compactArtifactSourceLabel(source))}
        </button>
      `).join("")}
    </div>
  `;

  if (!filtered.length) {
    return `${tabs}<div class="widget-empty">No artifacts in this source tab.</div>`;
  }

  return `
    ${tabs}
    <ul class="widget-list widget-artifact-list widget-scroll-list" data-widget-artifact-list="true">
      ${filtered
        .sort((a, b) => String(a.reward).localeCompare(String(b.reward)))
        .map(
          ({ reward, meta }) => `
            <li class="widget-item">
              <button
                type="button"
                class="widget-artifact-chip ${selectedArtifactReward === reward ? "is-selected" : ""}"
                data-action="artifact-select"
                data-reward="${escapeHtml(reward)}"
                aria-label="${escapeHtml(`Select artifact ${reward}`)}"
              >
                ${renderArtifactSymbol({
                  artifactName: reward,
                  className: "widget-artifact-symbol artifact-symbol",
                })}
                <span class="widget-artifact-labels">
                  <strong>${escapeHtml(reward)}</strong>
                  <small>${escapeHtml(compactArtifactSourceLabel(artifactSourceGroup(meta.section || "Unknown source")))}</small>
                </span>
              </button>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function effectSummary(item) {
  const summary = formatLootItemEffectSummary(item, { maxEffects: 3 });
  if (String(item && item.kind ? item.kind : "").toLowerCase() === "consumable_boost" && Number(item && item.durationMs ? item.durationMs : 0) > 0) {
    return `${summary} | Duration: ${formatDurationRemaining(Number(item.durationMs || 0))}`;
  }
  return summary;
}

function effectSummaryLines(item) {
  return effectSummary(item)
    .split("|")
    .map((part) => String(part || "").trim())
    .filter(Boolean);
}

function normalizeLootEffectSignature(effects) {
  const list = Array.isArray(effects) ? effects : [];
  return list
    .map((effect) => ({
      key: String(effect && effect.key ? effect.key : ""),
      type: String(effect && effect.type ? effect.type : ""),
      value: Number(effect && effect.value ? effect.value : 0),
    }))
    .sort((left, right) => `${left.key}:${left.type}:${left.value}`.localeCompare(`${right.key}:${right.type}:${right.value}`));
}

function normalizeLootEnchantSignature(enchantments) {
  const list = Array.isArray(enchantments) ? enchantments : [];
  return list
    .map((entry) => ({
      id: String(entry && entry.id ? entry.id : ""),
      label: String(entry && entry.label ? entry.label : ""),
      abilityId: String(entry && entry.abilityId ? entry.abilityId : ""),
      effects: normalizeLootEffectSignature(entry && entry.effects),
    }))
    .sort((left, right) => `${left.id}:${left.label}:${left.abilityId}`.localeCompare(`${right.id}:${right.label}:${right.abilityId}`));
}

function displayStackSignature(item) {
  if (!item || String(item.kind || "").toLowerCase() !== "dcc_armor") {
    return String(item && item.id ? item.id : "");
  }
  return JSON.stringify({
    region: item.region || "",
    kind: item.kind || "",
    rarity: item.rarity || "",
    label: displayItemLabel(item),
    runLifespan: Number(item.runLifespan || 0),
    effects: normalizeLootEffectSignature(item.effects),
    enchantments: normalizeLootEnchantSignature(item.enchantments),
  });
}

function groupLootDisplayItems(items) {
  const list = Array.isArray(items) ? items : [];
  const groups = [];
  const bySignature = new Map();
  for (const item of list) {
    const signature = displayStackSignature(item);
    if (!signature || String(item.kind || "").toLowerCase() !== "dcc_armor") {
      groups.push({
        representative: item,
        quantity: Math.max(1, Number(item && item.quantity ? item.quantity : 1) || 1),
        memberIds: [String(item && item.id ? item.id : "")].filter(Boolean),
      });
      continue;
    }
    const existing = bySignature.get(signature);
    if (existing) {
      existing.quantity += Math.max(1, Number(item && item.quantity ? item.quantity : 1) || 1);
      existing.memberIds.push(String(item && item.id ? item.id : ""));
      continue;
    }
    const group = {
      representative: item,
      quantity: Math.max(1, Number(item && item.quantity ? item.quantity : 1) || 1),
      memberIds: [String(item && item.id ? item.id : "")].filter(Boolean),
    };
    bySignature.set(signature, group);
    groups.push(group);
  }
  return groups;
}

function displayItemLabel(item) {
  const label = String(item && item.label ? item.label : "");
  return label.replace(/\s+\[[^\]]+\]$/u, "").trim();
}

function placementHintForItem(item, activeNodeId) {
  if (!item || !activeNodeId) {
    return "";
  }
  const templateId = String(item.templateId || "").toLowerCase();
  const kind = String(item.kind || "").toLowerCase();
  if (templateId === "worm_shard_enhancement") {
    return "Shard enhancement selected. Open a cape shard popup in The Undersiders' Loft and click a socket.";
  }
  if (templateId === "worm_shard_slot_token") {
    return "Shard lattice selected. Open a cape shard popup in The Undersiders' Loft and click that cape's next locked socket.";
  }
  if (templateId === "worm_hiring_window_token") {
    return "Use this dossier to permanently improve Worm hiring quality.";
  }
  if (templateId === "crd_soul_crystal" || templateId === "crd_combat_relic") {
    return "Cradle gear selected. Open Madra Well soul/combat slots to place it.";
  }
  if (
    kind === "aa_focus"
    || kind === "aa_focus_matrix"
    || (kind === "aa_upgrade" && templateId !== "aa_workshop_slot_token")
  ) {
    return "Workshop loot selected. Open The Workshop slots and click a socket.";
  }
  if (kind === "aa_upgrade" || kind === "slot_expansion") {
    return "This loot is a permanent upgrade. Use it instead of slotting it.";
  }
  if (kind === "dcc_armor") {
    return "Dungeon Crawler Carl armor selected. Place it from The Crawl slot controls before entering a run.";
  }
  if (kind === "dcc_enchant") {
    return "Legacy Dungeon Crawler Carl enchant selected. It can be sold, but new enchants come embedded on armor.";
  }
  return "Selected item can be used or placed in its matching region slots.";
}

function renderUniversalTargetActions(state, item, activeNodeId) {
  if (!item || !activeNodeId) {
    return "";
  }

  return `
    <p class="muted" style="padding: 0 10px 8px; margin: 0;">
      ${escapeHtml(placementHintForItem(item, activeNodeId))}
    </p>
  `;
}

function renderLootInventory(state, selectedLootItemId, selectedLootRegion, activeNodeId) {
  const groups = lootItemsByRegion(state, Date.now());
  const region = ["crd", "worm", "dcc", "aa"].includes(String(selectedLootRegion || "").toLowerCase())
    ? String(selectedLootRegion || "").toLowerCase()
    : "crd";
  const list = (groups[region] || []).filter((item) => !isLootItemEquipped(state, item.id));
  const displayGroups = groupLootDisplayItems(list);

  const regionTabs = `
    <div class="toolbar">
      <button type="button" data-action="loot-select-region" data-region="crd" ${region === "crd" ? "disabled" : ""}>Cradle</button>
      <button type="button" data-action="loot-select-region" data-region="worm" ${region === "worm" ? "disabled" : ""}>Worm</button>
      <button type="button" data-action="loot-select-region" data-region="dcc" ${region === "dcc" ? "disabled" : ""}>Dungeon Crawler Carl</button>
      <button type="button" data-action="loot-select-region" data-region="aa" ${region === "aa" ? "disabled" : ""}>Arcane Ascension</button>
    </div>
  `;

  if (!displayGroups.length) {
    return `${regionTabs}<div class="widget-empty">No loot in this region tab.</div>`;
  }

  return `
    ${regionTabs}
    <ul class="widget-list widget-artifact-list widget-scroll-list">
      ${displayGroups.map((entry) => {
        const item = entry.representative;
        const itemId = String(item && item.id ? item.id : "");
        const isSelected = entry.memberIds.includes(String(selectedLootItemId || ""));
        return `
        <li class="widget-item">
          <button
            type="button"
              class="widget-artifact-chip ${isSelected ? "is-selected" : ""}"
              data-action="loot-select-item"
              data-item-id="${escapeHtml(itemId)}"
            >
            ${renderRegionSymbol({
              section:
                item.region === "crd"
                  ? "Cradle"
                  : item.region === "worm"
                    ? "Worm"
                    : item.region === "aa"
                      ? "Arcane Ascension"
                      : "Dungeon Crawler Carl",
              className: "widget-artifact-symbol",
            })}
            <span class="widget-artifact-labels">
              <strong>${escapeHtml(displayItemLabel(item))}</strong>
              <small>${escapeHtml(String(item.rarity || "common"))}</small>
            </span>
            <span class="widget-loot-meta">
              <span class="widget-loot-chip">x${escapeHtml(String(entry.quantity || 1))}</span>
              <span class="widget-loot-chip">${escapeHtml(String(item.rarity || "common"))}</span>
            </span>
          </button>
          <div class="widget-loot-detail-list">
            ${effectSummaryLines(item).map((line) => `<span class="widget-loot-detail-line">${escapeHtml(line)}</span>`).join("")}
          </div>
          ${isDirectUseLootItem(item)
            ? `<div class="toolbar" style="margin-top:6px;"><button type="button" class="ghost" data-action="loot-use-item" data-item-id="${escapeHtml(itemId)}">Use</button></div>`
            : ""}
          ${isSelected && !isDirectUseLootItem(item) && isManualSocketLootItem(item, item.region) ? renderUniversalTargetActions(state, item, activeNodeId) : ""}
        </li>
      `;
      }).join("")}
    </ul>
  `;
}

function widgetClass(isOpen) {
  return isOpen ? "widget-panel open" : "widget-panel";
}

export function renderShellLayout({
  summary,
  state,
  selectedArtifactReward,
  selectedArtifactSource,
  selectedLootItemId,
  selectedLootRegion,
  deskUnlocked,
  backRoute,
  backLabel,
  frontierNodes,
  contentHtml,
  widgetState,
  currentRoute,
  activeNodeId,
}) {
  const isDccNode = String(activeNodeId || "") === "DCC01";
  return `
    <div class="space-app-shell">
      <header class="space-header">
        <div class="space-brand">
          <h1>Nexus</h1>
          <p>${escapeHtml(String(summary.nodeCount || 0))} nodes | ${escapeHtml(String(summary.sections?.length || 0))} arcs</p>
        </div>
        <nav class="space-controls">
          ${
            backRoute
              ? `<button class="ghost" data-action="go-back" data-route="${escapeHtml(backRoute)}">${escapeHtml(backLabel || "Back")}</button>`
              : ""
          }
          <button class="ghost" data-action="go-home" ${currentRoute === "/" ? "disabled" : ""}>Nexus</button>
          ${
            deskUnlocked
              ? `<button class="ghost" data-action="go-desk" ${currentRoute === "/desk" ? "disabled" : ""}>Desk</button>`
              : ""
          }
          <button data-action="toggle-widget" data-widget="artifacts">Artifacts</button>
          <button data-action="toggle-widget" data-widget="loot">Loot</button>
          <button data-action="toggle-widget" data-widget="save">Save</button>
          <button class="warn" data-action="reset-progress">Reset</button>
        </nav>
      </header>

      <main class="space-main">
        <section class="focus-surface">
          ${contentHtml}
        </section>
      </main>

      <aside class="widget-stack ${isDccNode ? "is-dcc-node" : ""}" aria-label="Utility Widgets">
        <section class="${widgetClass(widgetState.artifacts)}">
          <header>
            <h3>Artifacts</h3>
            <button class="ghost" data-action="toggle-widget" data-widget="artifacts">Close</button>
          </header>
          ${renderInventory(state, selectedArtifactReward, selectedArtifactSource)}
        </section>

        <section class="${widgetClass(widgetState.loot)} widget-panel-loot">
          <header>
            <h3>Loot</h3>
            <button class="ghost" data-action="toggle-widget" data-widget="loot">Close</button>
          </header>
          ${renderLootInventory(state, selectedLootItemId, selectedLootRegion, activeNodeId)}
        </section>

        <section class="${widgetClass(widgetState.save)}">
          <header>
            <h3>Save Transfer</h3>
            <button class="ghost" data-action="toggle-widget" data-widget="save">Close</button>
          </header>
          <div class="widget-block">
            <p class="muted">Export your progress, then import that file in another browser or device.</p>
            <div class="nexus-focus-actions">
              <button data-action="save-export">Export Save</button>
              <button class="ghost" data-action="save-import-prompt">Import Save</button>
            </div>
            <input class="save-input" type="file" accept=".json,application/json" data-save-file />
          </div>
        </section>
      </aside>
    </div>
  `;
}
