import { escapeHtml } from "../../templates/shared.js";
import {
  CRD02_MANUAL_RHYTHM_PATTERNS,
  cycleLength,
  nearestPulse,
  patternByIndex,
  patternCadence,
  pulsePhaseDelaySeconds,
} from "./rhythmCore.js";

const NODE_ID = "CRD09";
const HOLD_MS = 2000;
const HIT_TOLERANCE_MS = 170;

const TRACKS = Object.freeze({
  overlord: Object.freeze({
    id: "overlord",
    stageRequired: "underlord",
    stageGranted: "overlord",
    madraCost: 380000,
    soulfireCost: 75,
    rhythmTarget: 10,
    rhythmPatternIndex: 10,
    revelationI: "Overlord Revelation I",
    revelationII: "Overlord Revelation II",
    revelationCipher: "Overlord Revelation Cipher",
    fragmentA: "I advance because",
    fragmentB: "standing still is surrender.",
  }),
  archlord: Object.freeze({
    id: "archlord",
    stageRequired: "overlord",
    stageGranted: "archlord",
    madraCost: 900000,
    soulfireCost: 220,
    rhythmTarget: 14,
    rhythmPatternIndex: 11,
    revelationI: "Archlord Revelation I",
    revelationII: "Archlord Revelation II",
    revelationCipher: "Archlord Revelation Cipher",
    fragmentA: "We will never stop",
    fragmentB: "until the horizon kneels.",
  }),
});

const STAGE_ORDER = Object.freeze([
  "foundation",
  "copper",
  "iron",
  "jade",
  "lowgold",
  "highgold",
  "truegold",
  "underlord",
  "overlord",
  "archlord",
]);

function nowMs() {
  return Date.now();
}

function safeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeStage(value) {
  const key = safeText(value).toLowerCase();
  return STAGE_ORDER.includes(key) ? key : "foundation";
}

function stageAtLeast(stage, requirement) {
  return STAGE_ORDER.indexOf(normalizeStage(stage)) >= STAGE_ORDER.indexOf(normalizeStage(requirement));
}

function rewardsFromState(state) {
  return state && state.inventory && state.inventory.rewards && typeof state.inventory.rewards === "object"
    ? state.inventory.rewards
    : {};
}

function readCrd02Runtime(state) {
  const runtime = state && state.nodeRuntime && state.nodeRuntime.CRD02;
  return runtime && typeof runtime === "object" ? runtime : {};
}

function crdResourcesFromState(state) {
  const crd02 = readCrd02Runtime(state);
  const soulfire = crd02.soulfire && typeof crd02.soulfire === "object" ? crd02.soulfire : {};
  return {
    stage: normalizeStage(crd02.cultivationStage || "foundation"),
    madra: Math.max(0, Number(crd02.madra || 0)),
    soulfire: Math.max(0, Number(soulfire.amount || 0)),
  };
}

function normalizeRuntime(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};
  const phaseCandidate = safeText(source.phase).toLowerCase();
  const phase = ["invest", "rhythm", "revelation", "complete"].includes(phaseCandidate) ? phaseCandidate : "invest";
  const trackCandidate = safeText(source.track).toLowerCase();
  const track = ["overlord", "archlord", "done"].includes(trackCandidate) ? trackCandidate : "overlord";
  return {
    phase,
    track,
    madraInvested: Boolean(source.madraInvested),
    soulfireInvested: Boolean(source.soulfireInvested),
    rhythmStartedAt: Number.isFinite(Number(source.rhythmStartedAt)) ? Number(source.rhythmStartedAt) : nowMs(),
    rhythmStreak: Math.max(0, Math.floor(Number(source.rhythmStreak) || 0)),
    rhythmLastBeatOrdinal: Number.isFinite(Number(source.rhythmLastBeatOrdinal)) ? Number(source.rhythmLastBeatOrdinal) : -1,
    rhythmAttemptsLeft: Math.max(0, Math.floor(Number(source.rhythmAttemptsLeft) || 3)),
    flashUntil: Math.max(0, Number(source.flashUntil) || 0),
    revelationAttemptsLeft: Math.max(0, Math.floor(Number(source.revelationAttemptsLeft) || 3)),
    revelationValue: safeText(source.revelationValue),
    pendingMadraSpend: Math.max(0, Number(source.pendingMadraSpend) || 0),
    pendingSoulfireSpend: Math.max(0, Number(source.pendingSoulfireSpend) || 0),
    pendingOverlordAdvance: Boolean(source.pendingOverlordAdvance),
    pendingArchlordAdvance: Boolean(source.pendingArchlordAdvance),
    solved: Boolean(source.solved),
    lastMessage: safeText(source.lastMessage),
  };
}

function activeTrackFromStage(stage) {
  const normalized = normalizeStage(stage);
  if (stageAtLeast(normalized, "archlord")) {
    return "done";
  }
  if (stageAtLeast(normalized, "overlord")) {
    return "archlord";
  }
  return "overlord";
}

function trackConfig(trackId) {
  if (trackId === "archlord") {
    return TRACKS.archlord;
  }
  return TRACKS.overlord;
}

function rhythmPatternForTrack(track) {
  return patternByIndex(CRD02_MANUAL_RHYTHM_PATTERNS, Math.max(0, Number(track && track.rhythmPatternIndex) || 0));
}

function synchronizedRuntime(runtime, state) {
  const current = normalizeRuntime(runtime);
  const resources = crdResourcesFromState(state || {});
  const derivedTrack = activeTrackFromStage(resources.stage);
  if (derivedTrack === "done") {
    return {
      ...current,
      track: "done",
      phase: "complete",
      solved: true,
      madraInvested: false,
      soulfireInvested: false,
    };
  }

  if (current.track !== derivedTrack) {
    return {
      ...current,
      track: derivedTrack,
      phase: "invest",
      madraInvested: false,
      soulfireInvested: false,
      rhythmStreak: 0,
      rhythmLastBeatOrdinal: -1,
      rhythmAttemptsLeft: 3,
      flashUntil: 0,
      revelationAttemptsLeft: 3,
      revelationValue: "",
      pendingMadraSpend: 0,
      pendingSoulfireSpend: 0,
      pendingOverlordAdvance: false,
      pendingArchlordAdvance: false,
      solved: false,
      lastMessage: derivedTrack === "archlord"
        ? "Overlord stabilized. Archlord ascent is now possible."
        : current.lastMessage,
    };
  }

  return {
    ...current,
    solved: current.solved || derivedTrack === "done",
  };
}

function revelationAnswer(track) {
  return `${track.fragmentA} ${track.fragmentB}`.trim().toLowerCase();
}

function hasReward(state, name) {
  const rewards = rewardsFromState(state || {});
  return Boolean(rewards[name]);
}

function decodeFragments(state, track) {
  const hasI = hasReward(state, track.revelationI);
  const hasII = hasReward(state, track.revelationII);
  const hasCipher = hasReward(state, track.revelationCipher);

  const left = hasI ? (hasCipher ? track.fragmentA : "[CORRUPTED FRAGMENT I]") : "[MISSING FRAGMENT I]";
  const right = hasII ? (hasCipher ? track.fragmentB : "[CORRUPTED FRAGMENT II]") : "[MISSING FRAGMENT II]";
  const fullDecoded = hasI && hasII && hasCipher;
  return {
    left,
    right,
    fullDecoded,
  };
}

function revelationPanelMarkup(runtime, track, decoded) {
  const stageName = stageLabel(track.stageGranted);
  const buttonLabel = `Set Revelation and Advance to ${stageName}`;
  return `
    <section class="crd02-panel crd09-center-revelation">
      <h4>${escapeHtml(stageName)} Revelation</h4>
      <section class="crd07-revelation-panel crd09-revelation-panel">
        <div class="crd07-fragment-head">
          <p class="crd07-fragment-kicker">Revelation Fragments</p>
          <p class="crd07-fragment-note">Two fragments. One spoken line.</p>
        </div>
        <div class="crd07-fragment-grid">
          <article class="crd07-fragment-card ${decoded.left.startsWith("[MISSING") ? "is-missing" : "is-present"}">
            <span class="crd07-fragment-label">Fragment I</span>
            <p>${escapeHtml(decoded.left)}</p>
          </article>
          <article class="crd07-fragment-card ${decoded.right.startsWith("[MISSING") ? "is-missing" : "is-present"}">
            <span class="crd07-fragment-label">Fragment II</span>
            <p>${escapeHtml(decoded.right)}</p>
          </article>
        </div>
        <input
          type="text"
          class="crd07-revelation-input"
          data-crd09-revelation-input
          placeholder="Speak your revelation"
          value="${escapeHtml(runtime.revelationValue)}"
        />
        <div class="toolbar">
          <button type="button" data-node-id="${NODE_ID}" data-node-action="crd09-set-revelation">${escapeHtml(buttonLabel)}</button>
        </div>
        <p class="muted">${decoded.fullDecoded ? "Cipher complete." : "Cipher missing or fragments incomplete."}</p>
        <p><strong>Attempts Left:</strong> ${escapeHtml(String(runtime.revelationAttemptsLeft))}</p>
      </section>
    </section>
  `;
}

function moveToRhythm(runtime) {
  return {
    ...runtime,
    phase: "rhythm",
    rhythmStartedAt: nowMs(),
    rhythmStreak: 0,
    rhythmLastBeatOrdinal: -1,
    rhythmAttemptsLeft: 3,
    flashUntil: 0,
    revelationAttemptsLeft: 3,
    revelationValue: "",
    lastMessage: "Rhythm trial begins.",
  };
}

function drainInvestments(runtime, message) {
  return {
    ...runtime,
    phase: "invest",
    madraInvested: false,
    soulfireInvested: false,
    rhythmStreak: 0,
    rhythmLastBeatOrdinal: -1,
    rhythmAttemptsLeft: 3,
    flashUntil: 0,
    revelationAttemptsLeft: 3,
    revelationValue: "",
    lastMessage: message,
  };
}

export function initialCrd09Runtime() {
  return normalizeRuntime({
    phase: "invest",
    track: "overlord",
    madraInvested: false,
    soulfireInvested: false,
    rhythmStartedAt: nowMs(),
    rhythmStreak: 0,
    rhythmLastBeatOrdinal: -1,
    rhythmAttemptsLeft: 3,
    revelationAttemptsLeft: 3,
    revelationValue: "",
    pendingMadraSpend: 0,
    pendingSoulfireSpend: 0,
    pendingOverlordAdvance: false,
    pendingArchlordAdvance: false,
    flashUntil: 0,
    solved: false,
    lastMessage: "",
  });
}

export function synchronizeCrd09Runtime(runtime, context = {}) {
  return synchronizedRuntime(runtime, context.state || {});
}

export function validateCrd09Runtime(runtime) {
  const current = normalizeRuntime(runtime);
  return Boolean(current && current.solved);
}

export function reduceCrd09Runtime(runtime, action, context = {}) {
  const current = synchronizedRuntime(runtime, context.state || {});
  if (!action || typeof action !== "object") {
    return current;
  }

  if (current.track === "done") {
    return {
      ...current,
      phase: "complete",
      solved: true,
    };
  }

  const resources = crdResourcesFromState(context.state || {});
  const track = trackConfig(current.track);

  if (!stageAtLeast(resources.stage, track.stageRequired)) {
    return {
      ...current,
      lastMessage: `${track.stageRequired} stage required before this ascent.`,
    };
  }

  if (action.type === "crd09-invest-madra") {
    if (current.phase !== "invest" || current.madraInvested) {
      return current;
    }
    if (!action.ready) {
      return {
        ...current,
        lastMessage: `Not enough madra. Need ${track.madraCost}.`,
      };
    }
    const next = {
      ...current,
      madraInvested: true,
      pendingMadraSpend: track.madraCost,
      lastMessage: "Madra sphere is fully charged.",
    };
    return next.madraInvested && next.soulfireInvested ? moveToRhythm(next) : next;
  }

  if (action.type === "crd09-invest-soulfire") {
    if (current.phase !== "invest" || current.soulfireInvested) {
      return current;
    }
    if (!action.ready) {
      return {
        ...current,
        lastMessage: `Not enough soulfire. Need ${track.soulfireCost}.`,
      };
    }
    const next = {
      ...current,
      soulfireInvested: true,
      pendingSoulfireSpend: track.soulfireCost,
      lastMessage: "Soulfire sphere ignites.",
    };
    return next.madraInvested && next.soulfireInvested ? moveToRhythm(next) : next;
  }

  if (action.type === "crd09-rhythm-tap") {
    if (current.phase !== "rhythm") {
      return current;
    }
    const at = Number(action.at) || nowMs();

    const pattern = {
      ...rhythmPatternForTrack(track),
      id: `${track.id}-rhythm`,
    };

    const nearest = nearestPulse(pattern, current.rhythmStartedAt, at, HIT_TOLERANCE_MS);
    if (nearest.beatOrdinal === current.rhythmLastBeatOrdinal) {
      return current;
    }

    if (!nearest.onBeat) {
      if (current.rhythmStreak === 0) {
        return current;
      }
      const attemptsLeft = Math.max(0, current.rhythmAttemptsLeft - 1);
      if (attemptsLeft <= 0) {
        return drainInvestments(current, "Rhythm failed. Madra and soulfire drain away.");
      }
      return {
        ...current,
        rhythmAttemptsLeft: attemptsLeft,
        rhythmStreak: 0,
        rhythmLastBeatOrdinal: -1,
        flashUntil: 0,
        lastMessage: `Rhythm faltered. Attempts left: ${attemptsLeft}.`,
      };
    }

    const streak = current.rhythmStreak + 1;
    if (streak >= track.rhythmTarget) {
      return {
        ...current,
        phase: "revelation",
        rhythmStreak: 0,
        rhythmLastBeatOrdinal: -1,
        flashUntil: at + 260,
        revelationAttemptsLeft: 3,
        revelationValue: "",
        lastMessage: "Rhythm trial conquered. Speak your revelation.",
      };
    }

    return {
      ...current,
      rhythmStreak: streak,
      rhythmLastBeatOrdinal: nearest.beatOrdinal,
      flashUntil: at + 260,
      lastMessage: `Rhythm chain: ${streak}/${track.rhythmTarget}`,
    };
  }

  if (action.type === "crd09-set-revelation") {
    if (current.phase !== "revelation") {
      return current;
    }

    const ownsTriplet =
      hasReward(context.state || {}, track.revelationI) &&
      hasReward(context.state || {}, track.revelationII) &&
      hasReward(context.state || {}, track.revelationCipher);
    if (!ownsTriplet) {
      return {
        ...current,
        lastMessage: "The revelation remains scrambled. Recover all three fragments first.",
      };
    }

    const submitted = safeText(action.value).toLowerCase();
    const expected = revelationAnswer(track);
    if (submitted === expected) {
      if (track.id === "overlord") {
        return {
          ...current,
          pendingOverlordAdvance: true,
          phase: "invest",
          track: "archlord",
          madraInvested: false,
          soulfireInvested: false,
          revelationValue: "",
          rhythmAttemptsLeft: 3,
          revelationAttemptsLeft: 3,
          lastMessage: "Overlord revelation accepted.",
        };
      }

      return {
        ...current,
        pendingArchlordAdvance: true,
        phase: "complete",
        track: "done",
        madraInvested: false,
        soulfireInvested: false,
        solved: true,
        revelationValue: "",
        lastMessage: "Archlord revelation accepted.",
      };
    }

    const attemptsLeft = Math.max(0, current.revelationAttemptsLeft - 1);
    if (attemptsLeft <= 0) {
      return drainInvestments(current, "Revelation failed. The gathered power disperses.");
    }

    return {
      ...current,
      revelationAttemptsLeft: attemptsLeft,
      revelationValue: safeText(action.value),
      lastMessage: `The words ring false. Attempts left: ${attemptsLeft}.`,
    };
  }

  return current;
}

export function buildCrd09ActionFromElement(element) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }

  if (actionName === "crd09-invest-madra") {
    return {
      type: "crd09-invest-madra",
      ready: element.getAttribute("data-ready") === "true",
      at: nowMs(),
    };
  }

  if (actionName === "crd09-invest-soulfire") {
    return {
      type: "crd09-invest-soulfire",
      ready: element.getAttribute("data-ready") === "true",
      at: nowMs(),
    };
  }

  if (actionName === "crd09-set-revelation") {
    const root = element.closest(".crd09-node");
    const input = root ? root.querySelector("[data-crd09-revelation-input]") : null;
    return {
      type: "crd09-set-revelation",
      value: input && "value" in input ? input.value : "",
      at: nowMs(),
    };
  }

  return null;
}

export function buildCrd09KeyAction(event, runtime) {
  const current = normalizeRuntime(runtime);
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return null;
  }
  if (current.phase !== "rhythm") {
    return null;
  }
  if (event.code === "Space" || event.key === " ") {
    return {
      type: "crd09-rhythm-tap",
      at: nowMs(),
    };
  }
  return null;
}

function stageLabel(stage) {
  const map = {
    foundation: "Foundation",
    copper: "Copper",
    iron: "Iron",
    jade: "Jade",
    lowgold: "Low Gold",
    highgold: "High Gold",
    truegold: "True Gold",
    underlord: "Underlord",
    overlord: "Overlord",
    archlord: "Archlord",
  };
  return map[normalizeStage(stage)] || "Foundation";
}

function rhythmCycleSeconds(track) {
  return cycleLength(rhythmPatternForTrack(track));
}

export function renderCrd09Experience(context) {
  const runtime = synchronizedRuntime(context.runtime, context.state || {});
  const resources = crdResourcesFromState(context.state || {});

  if (runtime.track === "done") {
    return `
      <article class="crd09-node" data-node-id="${NODE_ID}">
        <section class="crd02-origin-card">
          <h3>Scaling The Lord Realm</h3>
          <p>You have crossed the Lord Realm. Overlord and Archlord both stand behind you.</p>
        </section>
      </article>
    `;
  }

  const track = trackConfig(runtime.track);
  const decoded = decodeFragments(context.state || {}, track);
  const canInvestMadra = resources.madra >= track.madraCost;
  const canInvestSoulfire = resources.soulfire >= track.soulfireCost;
  const stageReady = stageAtLeast(resources.stage, track.stageRequired);
  const rhythmPattern = rhythmPatternForTrack(track);
  const cycleSeconds = rhythmCycleSeconds(track);
  const phaseDelay = runtime.phase === "rhythm" ? pulsePhaseDelaySeconds(rhythmPattern, runtime.rhythmStartedAt) : 0;
  const flash = Date.now() < runtime.flashUntil;
  const pulseClass = `is-pattern-${Math.max(0, Number(rhythmPattern.visualId) || 0)}`;
  const centerPanel = runtime.phase === "rhythm"
    ? `
        <section class="crd02-manual-surface crd09-rhythm-surface" role="dialog" aria-label="Lord rhythm trial">
          <header><h3>${escapeHtml(stageLabel(track.stageGranted))} Rhythm Trial</h3></header>
          <div class="crd02-manual-core ${escapeHtml(pulseClass)}" style="--manual-cycle-seconds: ${escapeHtml(cycleSeconds.toFixed(3))}s; animation-delay: ${escapeHtml(phaseDelay.toFixed(3))}s;" aria-hidden="true">
            <span class="crd01-stream stream-a"></span>
            <span class="crd01-stream stream-b"></span>
            <span class="crd01-stream stream-c"></span>
            ${flash ? `<span class="crd01-hit-flash"></span>` : ""}
            <span class="crd01-core-shell"></span>
          </div>
          <p><strong>Pattern:</strong> ${escapeHtml(rhythmPattern.label || "Unknown Rhythm")}</p>
          <p><strong>Cadence:</strong> ${escapeHtml(patternCadence(rhythmPattern))}</p>
          <p><strong>Chain:</strong> ${escapeHtml(String(runtime.rhythmStreak))}/${escapeHtml(String(track.rhythmTarget))}</p>
          <p><strong>Attempts Left:</strong> ${escapeHtml(String(runtime.rhythmAttemptsLeft))}</p>
        </section>
      `
    : runtime.phase === "revelation"
      ? revelationPanelMarkup(runtime, track, decoded)
    : `
        <section class="crd02-panel crd09-center-focus">
          <h4>${escapeHtml(stageLabel(track.stageGranted))} Ascent</h4>
          <p class="muted">Madra and soulfire must answer in the same breath before the rhythm will open.</p>
        </section>
      `;

  return `
    <article class="crd09-node" data-node-id="${NODE_ID}">
      <section class="crd02-header crd09-header">
        <div class="crd09-header-copy">
          <h3>Scaling The Lord Realm</h3>
          <div class="crd04-combat-meta">
            <span class="crd04-meta-chip"><strong>Current Stage</strong> ${escapeHtml(stageLabel(resources.stage))}</span>
            <span class="crd04-meta-chip"><strong>Target Stage</strong> ${escapeHtml(stageLabel(track.stageGranted))}</span>
          </div>
        </div>
      </section>
      <section class="crd09-shell">
      ${
  !stageReady
    ? `
            <section class="crd02-panel crd09-panel crd09-panel--narrow">
              <p>Reach ${escapeHtml(stageLabel(track.stageRequired))} before attempting this ascent.</p>
            </section>
          `
    : `
            <section class="crd02-panel crd09-panel crd09-panel--ritual">
              <div class="crd09-ritual-layout">
                <button
                  type="button"
                  class="crd09-invest-sphere hub08-orb-button ${runtime.madraInvested ? "is-filled is-lit" : ""}"
                  data-node-id="${NODE_ID}"
                  data-crd09-action="crd09-invest-madra"
                  data-crd09-sphere="madra"
                  data-ready="${canInvestMadra ? "true" : "false"}"
                  ${runtime.phase !== "invest" || runtime.madraInvested ? "disabled" : ""}
                >
                  <span>Madra</span>
                  <small>${escapeHtml(String(track.madraCost))}</small>
                </button>
                ${centerPanel}
                <button
                  type="button"
                  class="crd09-invest-sphere hub08-orb-button ${runtime.soulfireInvested ? "is-filled is-lit" : ""}"
                  data-node-id="${NODE_ID}"
                  data-crd09-action="crd09-invest-soulfire"
                  data-crd09-sphere="soulfire"
                  data-ready="${canInvestSoulfire ? "true" : "false"}"
                  ${runtime.phase !== "invest" || runtime.soulfireInvested ? "disabled" : ""}
                >
                  <span>Soulfire</span>
                  <small>${escapeHtml(String(track.soulfireCost))}</small>
                </button>
              </div>
            </section>
          `
}

      ${runtime.lastMessage ? `<section class="crd02-panel crd09-panel crd09-panel--narrow"><p class="muted">${escapeHtml(runtime.lastMessage)}</p></section>` : ""}
      </section>
    </article>
  `;
}

export const CRD09_NODE_EXPERIENCE = {
  nodeId: NODE_ID,
  initialState: initialCrd09Runtime,
  synchronizeRuntime: synchronizeCrd09Runtime,
  render: renderCrd09Experience,
  reduceRuntime: reduceCrd09Runtime,
  validateRuntime: validateCrd09Runtime,
  buildActionFromElement: buildCrd09ActionFromElement,
  buildKeyAction: buildCrd09KeyAction,
};
