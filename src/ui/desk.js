import { escapeHtml } from "../templates/shared.js";
import { renderRegionSymbol } from "../core/symbology.js";
import { deskHintsForNode } from "../data/deskHints.js";

function bestDeskNode(unlockedNodes, preferredNodeId) {
  if (preferredNodeId) {
    const found = unlockedNodes.find((node) => node.node_id === preferredNodeId);
    if (found) {
      return found;
    }
  }

  return unlockedNodes[0] || null;
}

function nodeOptionMarkup(nodes, selectedNodeId) {
  return nodes
    .map((node) => {
      const selected = node.node_id === selectedNodeId ? "selected" : "";
      return `<option value="${escapeHtml(node.node_id)}" ${selected}>${escapeHtml(node.node_id)} · ${escapeHtml(node.title)}</option>`;
    })
    .join("");
}

function hintRailForNode(node) {
  return deskHintsForNode(node);
}

export function renderDesk({ unlockedNodes, selectedNodeId, hintLevels }) {
  const selectedNode = bestDeskNode(unlockedNodes, selectedNodeId);

  if (!selectedNode) {
    return `
      <article class="animated-fade">
        <h2>Correspondence Desk</h2>
        <div class="empty-state">No visible nodes available for desk requests yet.</div>
      </article>
    `;
  }

  const level = Number(hintLevels[selectedNode.node_id] || 0);
  const hints = hintRailForNode(selectedNode);

  return `
    <article class="animated-fade desk-page">
      <header class="desk-hero">
        <div>
          <p class="desk-kicker">Silverlight Relay</p>
          <h2>Correspondence Desk</h2>
        </div>
        <div class="desk-hero-chip">Thread Level ${escapeHtml(String(level))}</div>
      </header>

      <div class="desk-layout">
        <section class="desk-panel desk-panel-system">
          <div class="desk-panel-head">
            <h3>Active Thread</h3>
            <span class="desk-panel-chip">${escapeHtml(selectedNode.node_id)}</span>
          </div>

          <label class="desk-field">
            <span class="desk-field-label">Select Node</span>
            <select class="select" data-desk-node>
              ${nodeOptionMarkup(unlockedNodes, selectedNode.node_id)}
            </select>
          </label>

          <div class="desk-thread-card">
            <div class="desk-thread-node">
              ${renderRegionSymbol({
                section: selectedNode.section,
                className: "desk-thread-symbol",
              })}
              <div class="desk-thread-copy">
                <span class="desk-thread-title">${escapeHtml(selectedNode.title)}</span>
                <span class="desk-thread-meta">${escapeHtml(selectedNode.section)}</span>
              </div>
            </div>
          </div>

          <div class="desk-action-grid">
            <button class="desk-action desk-action-soft" data-action="desk-hint" data-level="1">Nudge</button>
            <button class="desk-action desk-action-medium" data-action="desk-hint" data-level="2">Stronger Nudge</button>
            <button class="desk-action desk-action-strong" data-action="desk-hint" data-level="3">Extraction Check</button>
          </div>
        </section>

        <section class="desk-panel desk-panel-output">
          <div class="desk-panel-head">
            <h3>Thread Output</h3>
            <span class="desk-panel-chip">Hints ${escapeHtml(String(level))}/3</span>
          </div>
          ${
            level === 0
              ? `<div class="empty-state desk-empty-state">No hint requested yet for this node.</div>`
              : `<div class="desk-hint-stack">${hints
                  .slice(0, level)
                  .map(
                    (hint, i) => `
                      <article class="desk-hint-card">
                        <span class="desk-hint-step">Hint ${i + 1}</span>
                        <p>${escapeHtml(hint)}</p>
                      </article>`,
                  )
                  .join("")}</div>`
          }
        </section>
      </div>
    </article>
  `;
}
