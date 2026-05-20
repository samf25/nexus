import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import { renderRegionSymbol } from "../../core/symbology.js";
import {
  arcaneAttunementRank,
  arcaneSystemFromState,
  computeTomePullCost,
  enhancementGlyphPool,
  glyphDisplayName,
  regionGlyphPool,
} from "../../systems/arcaneAscension.js";
import {
  getArcaneLootModifiers,
  estimateLootShopPrice,
  formatLootItemEffectSummary,
  isLootItemEquipped,
  lootInventoryFromState,
  rollRegionalLoot,
} from "../../systems/loot.js";

const NODE_ID = "AA02";
const SHOP_OFFER_COUNT = 5;
const TOME_FLASH_STEP_MS = 1050;

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

function serializeOfferDrop(drop) {
  try {
    return encodeURIComponent(JSON.stringify(drop || {}));
  } catch {
    return "";
  }
}

function parseOfferDrop(value) {
  try {
    const decoded = decodeURIComponent(String(value || ""));
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function serializeGlyphList(values) {
  try {
    return encodeURIComponent(JSON.stringify(Array.isArray(values) ? values : []));
  } catch {
    return "";
  }
}

function parseGlyphList(value) {
  try {
    const decoded = decodeURIComponent(String(value || ""));
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed.map((entry) => safeText(entry).toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function rarityBiasForCourtSpend(totalSpent) {
  const spent = Math.max(0, safeInt(totalSpent, 0));
  return Math.min(2.4, (Math.log10(1 + spent) * 0.9));
}

function generateShopOffers(arcane, hourKey, state = {}) {
  const offers = [];
  const baseNow = hourKey * 3600000;
  const rarityBias = rarityBiasForCourtSpend(arcane.totalSpentAtCourt);
  const aaModifiers = getArcaneLootModifiers(state, Date.now());
  for (let index = 0; index < SHOP_OFFER_COUNT; index += 1) {
    const roll = rollRegionalLoot({
      sourceRegion: "aa",
      triggerType: `climbers-court-shop-${index}`,
      dropChance: 1,
      outRegionChance: 1,
      forceOutRegion: true,
      rarityBias,
      now: baseNow,
      seed: (hourKey * 977) + (index * 113) + safeInt(arcane.totalSpentAtCourt, 0),
    });
    if (!roll) {
      continue;
    }
    const cost = estimateLootShopPrice(roll, {
      totalSpentAtCourt: arcane.totalSpentAtCourt,
      buyDiscountPct: aaModifiers.buyDiscountPct,
      shopRegion: "aa",
    });
    offers.push({
      id: `offer-${hourKey}-${index}`,
      cost,
      lootDrop: roll,
    });
  }
  return offers;
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const offers = Array.isArray(source.shopOffers)
    ? source.shopOffers.filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: safeText(entry.id),
        cost: Math.max(1, safeInt(entry.cost, 1)),
        lootDrop: entry.lootDrop && typeof entry.lootDrop === "object" ? entry.lootDrop : null,
      }))
      .filter((entry) => entry.id && entry.lootDrop)
    : [];
  const tabCandidate = safeText(source.activeTab).toLowerCase();
  const activeTab = tabCandidate === "auction" || tabCandidate === "tome" ? tabCandidate : "shop";
  const revealQueue = Array.isArray(source.revealQueue)
    ? source.revealQueue.map((entry) => safeText(entry).toLowerCase()).filter(Boolean)
    : [];
  return {
    shopHourKey: Math.max(0, safeInt(source.shopHourKey, 0)),
    shopOffers: offers,
    selectedAuctionItemId: safeText(source.selectedAuctionItemId),
    activeTab,
    marketRegion: safeText(source.marketRegion).toLowerCase() || "all",
    revealQueue,
    revealTick: Math.max(0, safeInt(source.revealTick, 0)),
    revealStartedAt: Math.max(0, safeInt(source.revealStartedAt, 0)),
    lastRevealRouteNonce: Math.max(0, safeInt(source.lastRevealRouteNonce, 0)),
    lastMessage: safeText(source.lastMessage),
    solved: Boolean(source.solved),
  };
}

function normalizeItemDetail(item) {
  return formatLootItemEffectSummary(item, { maxEffects: 3 });
}

function bonusPctLabel(value) {
  return `${Math.round(Math.max(0, Number(value) || 0) * 100)}%`;
}

function displayItemLabel(item) {
  const label = safeText(item && item.label);
  return label.replace(/\s+\[[^\]]+\]$/u, "").trim();
}

function marketRegionKey(item) {
  const region = safeText(item && item.region).toLowerCase();
  if (region === "crd") {
    return "crd";
  }
  if (region === "worm") {
    return "worm";
  }
  if (region === "dcc") {
    return "dcc";
  }
  if (region === "aa") {
    return "aa";
  }
  return "other";
}

function marketRegionLabel(region) {
  if (region === "crd") {
    return "Cradle";
  }
  if (region === "worm") {
    return "Worm";
  }
  if (region === "dcc") {
    return "Dungeon";
  }
  if (region === "aa") {
    return "Arcane";
  }
  return "Other";
}

function marketRegionIcon(region) {
  if (region === "crd") {
    return renderRegionSymbol({ section: "Cradle", className: "aa02-market-region-symbol" });
  }
  if (region === "worm") {
    return renderRegionSymbol({ section: "Worm", className: "aa02-market-region-symbol" });
  }
  if (region === "dcc") {
    return renderRegionSymbol({ section: "Dungeon Crawler Carl", className: "aa02-market-region-symbol" });
  }
  if (region === "aa") {
    return renderRegionSymbol({ section: "Arcane Ascension", className: "aa02-market-region-symbol" });
  }
  return renderArtifactSymbol({ artifactName: "Archive of Ways", className: "aa02-market-region-symbol artifact-symbol" });
}

function itemStackSignature(item) {
  return JSON.stringify({
    region: marketRegionKey(item),
    kind: safeText(item && item.kind).toLowerCase(),
    rarity: safeText(item && item.rarity).toLowerCase(),
    label: displayItemLabel(item),
    detail: normalizeItemDetail(item),
  });
}

function groupAuctionItems(items, arcane, aaModifiers) {
  const modifiers = aaModifiers && typeof aaModifiers === "object" ? aaModifiers : { buyDiscountPct: 0, sellBonusPct: 0 };
  const grouped = new Map();
  for (const item of items) {
    const base = estimateLootShopPrice(item, {
      totalSpentAtCourt: arcane.totalSpentAtCourt,
      buyDiscountPct: modifiers.buyDiscountPct,
      shopRegion: "aa",
    });
    const payout = Math.max(
      1,
      Math.floor(base * 0.75 * (1 + Math.max(0, Number(modifiers.sellBonusPct) || 0))),
    );
    const signature = `${itemStackSignature(item)}::${payout}`;
    if (!grouped.has(signature)) {
      grouped.set(signature, {
        representative: item,
        quantity: 0,
        payout,
      });
    }
    const entry = grouped.get(signature);
    entry.quantity += Math.max(1, Number(item && item.quantity ? item.quantity : 1) || 1);
  }
  return Array.from(grouped.values()).sort((left, right) =>
    displayItemLabel(left.representative).localeCompare(displayItemLabel(right.representative)));
}

function groupShopOffers(offers) {
  const grouped = new Map();
  for (const offer of Array.isArray(offers) ? offers : []) {
    if (!offer || !offer.lootDrop) {
      continue;
    }
    const signature = `${itemStackSignature(offer.lootDrop)}::${Math.max(1, Number(offer.cost) || 1)}`;
    if (!grouped.has(signature)) {
      grouped.set(signature, {
        representative: offer.lootDrop,
        quantity: 0,
        cost: Math.max(1, Number(offer.cost) || 1),
        offerId: offer.id,
      });
    }
    grouped.get(signature).quantity += 1;
  }
  return Array.from(grouped.values()).sort((left, right) =>
    displayItemLabel(left.representative).localeCompare(displayItemLabel(right.representative)));
}

function resolveMarketRegionFilter(current, entries) {
  const available = Array.from(new Set((Array.isArray(entries) ? entries : []).map((entry) => marketRegionKey(entry)))).sort();
  const selected = available.includes(current) ? current : "all";
  return {
    available,
    selected,
  };
}

function marketRegionTabs(current, entries) {
  const { available, selected } = resolveMarketRegionFilter(current, entries);
  return `
    <div class="toolbar aa02-region-tabs">
      <button
        type="button"
        data-node-id="${NODE_ID}"
        data-node-action="aa02-set-market-region"
        data-region="all"
        ${selected === "all" ? "disabled" : ""}
      >
        All Regions
      </button>
      ${available.map((region) => `
        <button
          type="button"
          data-node-id="${NODE_ID}"
          data-node-action="aa02-set-market-region"
          data-region="${escapeHtml(region)}"
          ${selected === region ? "disabled" : ""}
        >
          ${marketRegionIcon(region)}
          <span>${escapeHtml(marketRegionLabel(region))}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function readableGlyphName(glyphId) {
  const normalized = safeText(glyphId).toLowerCase();
  const isRegion = regionGlyphPool().includes(normalized);
  return glyphDisplayName(normalized, isRegion ? "region" : "enhancement");
}

function renderGlyphSymbol(glyphId) {
  const id = safeText(glyphId).toLowerCase();
  if (id === "crd") {
    return renderRegionSymbol({ section: "Cradle", className: "aa02-glyph-symbol" });
  }
  if (id === "worm") {
    return renderRegionSymbol({ section: "Worm", className: "aa02-glyph-symbol" });
  }
  if (id === "dcc") {
    return renderRegionSymbol({ section: "Dungeon Crawler Carl", className: "aa02-glyph-symbol" });
  }
  if (id === "aa") {
    return renderRegionSymbol({ section: "Arcane Ascension", className: "aa02-glyph-symbol" });
  }
  return renderArtifactSymbol({ artifactName: readableGlyphName(id), className: "aa02-glyph-symbol artifact-symbol" });
}

function statusMarkup(runtime) {
  const message = safeText(runtime && runtime.lastMessage);
  if (!message) {
    return "";
  }
  if (message.toLowerCase().startsWith("tome pull complete:")) {
    return "";
  }
  if (message.toLowerCase() === "the tome inscribes five starter glyphs into your grimoire.") {
    return "";
  }
  return `<p class="aa02-status-note">${escapeHtml(message)}</p>`;
}

export function initialAa02Runtime(context = {}) {
  return synchronizeAa02Runtime(normalizeRuntime({}), context);
}

export function synchronizeAa02Runtime(runtime, context = {}) {
  const current = normalizeRuntime(runtime);
  const now = context.now || Date.now();
  const hourKey = Math.floor(now / 3600000);
  const arcane = arcaneSystemFromState(context.state || {}, now);
  const routeNonce = Math.max(0, safeInt(context.routeVisitNonce, 0));
  const shouldClearReveal = current.revealQueue.length > 0 && routeNonce > current.lastRevealRouteNonce;
  const elapsed = Math.max(0, now - current.revealStartedAt);
  const revealTick = current.revealQueue.length
    ? Math.min(current.revealQueue.length, Math.floor(elapsed / TOME_FLASH_STEP_MS) + 1)
    : 0;
  const revealFinished = current.revealQueue.length > 0 && revealTick >= current.revealQueue.length;
  const shouldAutoClearReveal =
    revealFinished && elapsed > ((current.revealQueue.length + 1) * TOME_FLASH_STEP_MS);
  const revealQueue = shouldClearReveal || shouldAutoClearReveal ? [] : current.revealQueue;
  const revealTickValue = revealQueue.length ? revealTick : 0;
  const revealStartedAt = revealQueue.length ? current.revealStartedAt : 0;
  if (current.shopHourKey === hourKey && current.shopOffers.length) {
    if (revealTickValue !== current.revealTick || revealQueue !== current.revealQueue) {
      return {
        ...current,
        revealQueue,
        revealTick: revealTickValue,
        revealStartedAt,
      };
    }
    return current;
  }
  return {
    ...current,
    shopHourKey: hourKey,
    shopOffers: generateShopOffers(arcane, hourKey, context.state || {}),
    revealQueue,
    revealTick: revealTickValue,
    revealStartedAt,
  };
}

export function validateAa02Runtime(runtime) {
  return Boolean(normalizeRuntime(runtime).solved);
}

export function reduceAa02Runtime(runtime, action) {
  const current = normalizeRuntime(runtime);
  if (!action || typeof action !== "object") {
    return current;
  }

  if (action.type === "aa02-open-tab") {
    const tab = safeText(action.tab).toLowerCase();
    const nextTab = tab === "auction" || tab === "tome" ? tab : "shop";
    const keepReveal = nextTab === "tome" && current.activeTab === "tome";
    return {
      ...current,
      activeTab: nextTab,
      revealQueue: keepReveal ? current.revealQueue : [],
      revealTick: keepReveal ? current.revealTick : 0,
      revealStartedAt: keepReveal ? current.revealStartedAt : 0,
    };
  }

  if (action.type === "aa02-set-market-region") {
    return {
      ...current,
      marketRegion: safeText(action.region).toLowerCase() || "all",
    };
  }

  if (action.type === "aa02-buy-offer") {
    return {
      ...current,
      solved: current.solved || Boolean(action.applied),
      lastMessage: safeText(action.message) || (action.applied ? "Purchase completed." : "Purchase failed."),
    };
  }

  if (action.type === "aa02-sell-selected") {
    return {
      ...current,
      solved: current.solved || Boolean(action.applied),
      lastMessage: safeText(action.message) || (action.applied ? "Sale completed." : "Sale failed."),
    };
  }

  if (action.type === "aa02-tome-starter" || action.type === "aa02-tome-pull") {
    const grants = Array.isArray(action.grants)
      ? action.grants.map((entry) => safeText(entry).toLowerCase()).filter(Boolean)
      : safeText(action.grant)
        ? [safeText(action.grant).toLowerCase()]
        : [];
    return {
      ...current,
      solved: current.solved || Boolean(action.applied),
      revealQueue: grants,
      revealTick: grants.length ? 1 : 0,
      revealStartedAt: Date.now(),
      lastRevealRouteNonce: Math.max(0, safeInt(action.routeVisitNonce, current.lastRevealRouteNonce)),
      activeTab: "tome",
      lastMessage: safeText(action.message) || "The Tome remains quiet.",
    };
  }

  return current;
}

function tabButton(tabId, active, label) {
  return `
    <button
      type="button"
      data-node-id="${NODE_ID}"
      data-node-action="aa02-open-tab"
      data-tab="${escapeHtml(tabId)}"
      ${active ? "disabled" : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function shopMarkup(runtime, arcane) {
  const nowLabel = new Date(runtime.shopHourKey * 3600000).toLocaleString();
  const groupedOffers = groupShopOffers(runtime.shopOffers);
  const selectedRegion = resolveMarketRegionFilter(
    runtime.marketRegion,
    groupedOffers.map((entry) => entry.representative),
  ).selected;
  const filteredOffers = groupedOffers.filter((entry) =>
    selectedRegion === "all" || marketRegionKey(entry.representative) === selectedRegion);
  return `
    <section class="card aa02-market-panel">
      <div class="aa02-market-head">
        <div>
          <h3>Climber's Court Shop</h3>
          <p class="muted">Rotates hourly. Current rotation started: ${escapeHtml(nowLabel)}.</p>
        </div>
        <div class="aa02-market-summary">
          <span class="aa02-market-pill">Mana Crystals ${escapeHtml(String(arcane.manaCrystals))}</span>
          <span class="aa02-market-pill">Offers ${escapeHtml(String(filteredOffers.length))}</span>
        </div>
      </div>
      ${marketRegionTabs(runtime.marketRegion, groupedOffers.map((entry) => entry.representative))}
      <div class="aa02-market-list">
        ${filteredOffers.map((offer) => `
          <article class="aa02-market-row">
            <div class="aa02-market-row-main">
              <div class="aa02-market-row-title">
                ${marketRegionIcon(marketRegionKey(offer.representative))}
                <div>
                  <h4>${escapeHtml(displayItemLabel(offer.representative))}</h4>
                  <p>${escapeHtml(normalizeItemDetail(offer.representative))}</p>
                </div>
              </div>
              <div class="aa02-market-row-meta">
                <span class="aa02-market-pill">${escapeHtml(marketRegionLabel(marketRegionKey(offer.representative)))}</span>
                <span class="aa02-market-pill">${escapeHtml(safeText(offer.representative.rarity) || "common")}</span>
                ${offer.quantity > 1 ? `<span class="aa02-market-pill">x${escapeHtml(String(offer.quantity))}</span>` : ""}
              </div>
            </div>
            <div class="aa02-market-row-action">
              <strong>${escapeHtml(String(offer.cost))}</strong>
              <span>mana crystals</span>
              <button
                type="button"
                data-node-id="${NODE_ID}"
                data-node-action="aa02-buy-offer"
                data-offer-id="${escapeHtml(offer.offerId)}"
                data-cost="${escapeHtml(String(offer.cost))}"
                data-drop="${escapeHtml(serializeOfferDrop(offer.representative))}"
                ${arcane.manaCrystals >= offer.cost ? "" : "disabled"}
              >
                Buy
              </button>
            </div>
          </article>
        `).join("") || `<p class="muted">No offers in this region tab right now.</p>`}
      </div>
    </section>
  `;
}

function auctionMarkup(runtime, state, arcane) {
  const loot = lootInventoryFromState(state || {}, Date.now());
  const aaModifiers = getArcaneLootModifiers(state || {}, Date.now());
  const itemEntries = Object.values(loot.items || {}).sort((left, right) => left.label.localeCompare(right.label));
  const arcaneForPricing = {
    ...arcane,
    bonuses: {
      ...(arcane.bonuses || {}),
      sellBonusPct: Number(aaModifiers.sellBonusPct || 0),
    },
  };
  const groupedItems = groupAuctionItems(itemEntries, arcaneForPricing, aaModifiers);
  if (!itemEntries.length) {
    return `
      <section class="card aa02-market-panel">
        <h3>Grand Auction</h3>
        <p class="muted">No loot available to auction.</p>
      </section>
    `;
  }

  const selectedRegion = resolveMarketRegionFilter(
    runtime.marketRegion,
    groupedItems.map((entry) => entry.representative),
  ).selected;
  const filteredItems = groupedItems.filter((entry) =>
    selectedRegion === "all" || marketRegionKey(entry.representative) === selectedRegion);

  return `
    <section class="card aa02-market-panel">
      <div class="aa02-market-head">
        <div>
          <h3>Grand Auction</h3>
          <p class="muted">List spoils by region and move them quickly without hunting through every item.</p>
        </div>
        <div class="aa02-market-summary">
          <span class="aa02-market-pill">Sell Bonus ${escapeHtml(bonusPctLabel(aaModifiers.sellBonusPct))}</span>
          <span class="aa02-market-pill">Lots ${escapeHtml(String(filteredItems.length))}</span>
        </div>
      </div>
      ${marketRegionTabs(runtime.marketRegion, groupedItems.map((entry) => entry.representative))}
      <div class="aa02-market-list">
        ${filteredItems.map((entry) => {
          const item = entry.representative;
          const equipped = isLootItemEquipped(state || {}, item.id);
          return `
            <article class="aa02-market-row">
              <div class="aa02-market-row-main">
                <div class="aa02-market-row-title">
                  ${marketRegionIcon(marketRegionKey(item))}
                  <div>
                    <h4>${escapeHtml(displayItemLabel(item))}</h4>
                    <p>${escapeHtml(normalizeItemDetail(item))}</p>
                  </div>
                </div>
                <div class="aa02-market-row-meta">
                  <span class="aa02-market-pill">${escapeHtml(marketRegionLabel(marketRegionKey(item)))}</span>
                  <span class="aa02-market-pill">${escapeHtml(safeText(item.rarity) || "common")}</span>
                  <span class="aa02-market-pill">x${escapeHtml(String(entry.quantity))}</span>
                </div>
              </div>
              <div class="aa02-market-row-action">
                <strong>${escapeHtml(String(entry.payout))}</strong>
                <span>mana crystals</span>
                <button
                  type="button"
                  data-node-id="${NODE_ID}"
                  data-node-action="aa02-sell-selected"
                  data-item-id="${escapeHtml(item.id)}"
                  data-payout="${escapeHtml(String(entry.payout))}"
                  ${equipped ? "disabled" : ""}
                >
                  ${equipped ? "Unequip first" : "Sell"}
                </button>
              </div>
            </article>
          `;
        }).join("") || `<p class="muted">No auction lots in this region tab.</p>`}
      </div>
    </section>
  `;
}

function tomeRevealMarkup(runtime) {
  if (!runtime.revealQueue.length || runtime.revealTick <= 0) {
    return "";
  }
  const index = Math.min(runtime.revealQueue.length - 1, runtime.revealTick - 1);
  const glyphId = runtime.revealQueue[index];
  if (!glyphId) {
    return "";
  }
  const niceName = readableGlyphName(glyphId);
  return `
    <div class="aa02-tome-flash ${runtime.revealQueue.length ? "is-revealing" : ""}" aria-live="polite">
      <div class="aa02-tome-flash-name">
        ${renderGlyphSymbol(glyphId)}
      </div>
      <p class="aa02-tome-flash-label">${escapeHtml(niceName)}</p>
    </div>
  `;
}

function tomeMarkup(state, arcane, runtime) {
  const pullCost = computeTomePullCost(state || {});
  const regionPoolSize = regionGlyphPool().length;
  const enhancementPoolSize = enhancementGlyphPool().length;
  const ownedRegionCount = arcane.grimoire.regionGlyphs.length;
  const ownedEnhancementCount = arcane.grimoire.enhancementGlyphs.length;
  const allCollected = ownedRegionCount >= regionPoolSize && ownedEnhancementCount >= enhancementPoolSize;
  return `
    <section class="card aa02-tome-book">
      <h3>Tome of Glyphs</h3>
      <div class="aa02-tome-spread">
        <section class="aa02-tome-page">
          ${tomeRevealMarkup(runtime)}
        </section>
      </div>
      <div class="toolbar">
        ${
          arcane.grimoire.starterGranted
            ? `<button type="button" data-node-id="${NODE_ID}" data-node-action="aa02-tome-pull" ${arcane.manaCrystals >= pullCost && !allCollected ? "" : "disabled"}>Offer ${escapeHtml(String(pullCost))} crystals to the tome</button>`
            : `<button type="button" data-node-id="${NODE_ID}" data-node-action="aa02-tome-starter">Inscribe Starter Glyphs</button>`
        }
      </div>
      ${allCollected ? `<p class="muted">All known glyphs acquired.</p>` : ""}
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

export function renderAa02Experience(context) {
  const runtime = synchronizeAa02Runtime(context.runtime, context);
  const arcane = arcaneSystemFromState(context.state || {}, Date.now());
  const attunement = arcaneAttunementRank(arcane);
  const attunementLabel = arcane.attunements.enchanter ? attunement.label : "Unbound";
  const activeTab = runtime.activeTab || "shop";

  const body = activeTab === "auction"
    ? auctionMarkup(runtime, context.state || {}, arcane)
    : activeTab === "tome"
      ? tomeMarkup(context.state || {}, arcane, runtime)
      : shopMarkup(runtime, arcane);

  return `
    <article class="aa02-node" data-node-id="${NODE_ID}">
      <section class="card">
        <h3>Climber's Court</h3>
    
        <div class="aa02-court-chip-row" aria-label="Climber's Court status">
          <span class="aa02-court-chip">
            <span class="aa02-court-chip-label">Attunement</span>
            <span class="aa02-court-chip-value">${escapeHtml(attunementLabel)}</span>
          </span>
    
          <span class="aa02-court-chip">
            <span class="aa02-court-chip-label">Mana Crystals</span>
            <span class="aa02-court-chip-value">${escapeHtml(String(arcane.manaCrystals))}</span>
          </span>
    
          <span class="aa02-court-chip">
            <span class="aa02-court-chip-label">Total Spent</span>
            <span class="aa02-court-chip-value">${escapeHtml(String(arcane.totalSpentAtCourt))}</span>
          </span>
        </div>
    
        <div class="toolbar">
          ${tabButton("shop", activeTab === "shop", "Shop")}
          ${tabButton("auction", activeTab === "auction", "Auction")}
          ${tabButton("tome", activeTab === "tome", "Tome of Glyphs")}
        </div>
      </section>
    
      ${body}
      ${activeTab !== "tome" ? statusMarkup(runtime) : ""}
      ${rankPopupMarkup(arcane)}
    </article>
  `;
}

export function buildAa02ActionFromElement(element) {
  const action = safeText(element.getAttribute("data-node-action"));
  if (!action) {
    return null;
  }
  if (action === "aa02-open-tab") {
    return {
      type: action,
      tab: safeText(element.getAttribute("data-tab")).toLowerCase(),
      at: Date.now(),
    };
  }
  if (action === "aa02-set-market-region") {
    return {
      type: action,
      region: safeText(element.getAttribute("data-region")).toLowerCase() || "all",
      at: Date.now(),
    };
  }
  if (action === "aa02-buy-offer") {
    return {
      type: action,
      offerId: safeText(element.getAttribute("data-offer-id")),
      cost: Math.max(1, safeInt(element.getAttribute("data-cost"), 1)),
      lootDrop: parseOfferDrop(element.getAttribute("data-drop")),
      at: Date.now(),
    };
  }
  if (action === "aa02-sell-selected") {
    return {
      type: action,
      itemId: safeText(element.getAttribute("data-item-id")),
      payout: Math.max(1, safeInt(element.getAttribute("data-payout"), 1)),
      at: Date.now(),
    };
  }
  if (action === "aa02-tome-starter" || action === "aa02-tome-pull") {
    return {
      type: action,
      grants: parseGlyphList(element.getAttribute("data-grants")),
      at: Date.now(),
    };
  }
  if (action === "aa03-close-rank-popup") {
    return {
      type: action,
      at: Date.now(),
    };
  }
  return null;
}

export const AA02_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialAa02Runtime,
  synchronizeRuntime: synchronizeAa02Runtime,
  render: renderAa02Experience,
  reduceRuntime: reduceAa02Runtime,
  validateRuntime: validateAa02Runtime,
  buildActionFromElement: buildAa02ActionFromElement,
};
