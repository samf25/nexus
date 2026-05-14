import { hasWaveOnePasskey, hasWaveTwoPasskey, hasWaveThreePasskey } from "./artifacts.js";
import { arcaneAttunementRank } from "../systems/arcaneAscension.js";

const WAVE_ONE_SECTIONS = new Set([
  "Cradle",
  "The Wandering Inn",
  "Wandering Inn",
  "Worm",
  "Mother of Learning",
  "Hall of Proofs",
  "Prime Vault",
]);

const WAVE_TWO_SECTIONS = new Set([
  "Arcane Ascension",
  "Symmetry Forge",
  "Dungeon Crawler Carl",
  "Curved Atlas",
  "A Practical Guide to Evil",
  "Practical Guide",
]);
const WAVE_THREE_NODE_IDS = new Set(["FIN01"]);

export function computeUnlockedNodeIds(index, state) {
  const solved = new Set(state.solvedNodeIds || []);
  const unlocked = new Set();
  const waveOneUnlocked = hasWaveOnePasskey(state);
  const waveTwoUnlocked = hasWaveTwoPasskey(state);
  const waveThreeUnlocked = hasWaveThreePasskey(state);

  for (const node of index.raw.nodes) {
    if (node.section === "Nexus Hub" && (node.node_id === "HUB04" || node.node_id === "HUB05" || node.node_id === "HUB06")) {
      unlocked.add(node.node_id);
      continue;
    }

    const deps = Array.isArray(node.dependencies) ? node.dependencies : [];
    const hasAllDeps = deps.every((dep) => solved.has(dep));
    const waveOneGateNode = WAVE_ONE_SECTIONS.has(node.section);
    const passesWaveOneGate = !waveOneGateNode || waveOneUnlocked;
    const waveOneBypass = waveOneUnlocked && waveOneGateNode;
    const waveTwoGateNode = WAVE_TWO_SECTIONS.has(node.section);
    const passesWaveTwoGate = !waveTwoGateNode || waveTwoUnlocked;
    const waveTwoBypass = waveTwoUnlocked && waveTwoGateNode;
    const waveThreeGateNode = WAVE_THREE_NODE_IDS.has(node.node_id);
    const passesWaveThreeGate = !waveThreeGateNode || waveThreeUnlocked;
    const waveThreeBypass = waveThreeUnlocked && waveThreeGateNode;

    if (
      (hasAllDeps && passesWaveOneGate && passesWaveTwoGate && passesWaveThreeGate) ||
      waveOneBypass ||
      waveTwoBypass ||
      waveThreeBypass
    ) {
      unlocked.add(node.node_id);
    }
  }

  const unlockedSections = new Set(
    index.raw.nodes
      .filter((node) => unlocked.has(node.node_id) && node.section !== "Nexus Hub")
      .map((node) => node.section),
  );

  for (const node of index.raw.nodes) {
    if (node.section === "Final Arc") {
      continue;
    }
    if (unlockedSections.has(node.section)) {
      if (WAVE_TWO_SECTIONS.has(node.section) && !waveTwoUnlocked) {
        continue;
      }
      unlocked.add(node.node_id);
    }
  }

  return unlocked;
}

export function computeSectionProgress(index, state, unlockedNodeIds) {
  const solvedSet = new Set(state.solvedNodeIds || []);
  const result = [];
  const dccRuntime =
    state && state.nodeRuntime && state.nodeRuntime.DCC01 && typeof state.nodeRuntime.DCC01 === "object"
      ? state.nodeRuntime.DCC01
      : {};
  const dccMeta = dccRuntime.meta && typeof dccRuntime.meta === "object" ? dccRuntime.meta : {};
  const dccBestFloor = Math.max(1, Number(dccMeta.bestFloor) || 1);
  const prestige =
    state && state.systems && state.systems.prestige && typeof state.systems.prestige === "object"
      ? state.systems.prestige
      : {};
  const prestigeRegions = prestige.regions && typeof prestige.regions === "object" ? prestige.regions : {};
  const overallMolResets =
    Math.max(0, Number(prestige.practicalGuideResets || 0))
    + Math.max(0, Number(prestigeRegions.cradle && prestigeRegions.cradle.resets || 0))
    + Math.max(0, Number(prestigeRegions.worm && prestigeRegions.worm.resets || 0))
    + Math.max(0, Number(prestigeRegions.dcc && prestigeRegions.dcc.resets || 0));
  const crd02Runtime =
    state && state.nodeRuntime && state.nodeRuntime.CRD02 && typeof state.nodeRuntime.CRD02 === "object"
      ? state.nodeRuntime.CRD02
      : {};
  const crdStage = String(crd02Runtime.cultivationStage || "foundation").trim().toLowerCase();
  const cradleStageOrder = ["foundation", "copper", "iron", "jade", "lowgold", "highgold", "truegold", "underlord", "overlord", "archlord"];
  const cradleStageLabels = {
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
  const cradleStageIndex = Math.max(0, cradleStageOrder.indexOf(crdStage));
  const wormSolved = {
    leviathan: solvedSet.has("WORM03"),
    simurgh: solvedSet.has("WORM05"),
    behemoth: solvedSet.has("WORM07"),
    scion: solvedSet.has("WORM08"),
  };
  const wormEndbringersDefeated = [wormSolved.leviathan, wormSolved.simurgh, wormSolved.behemoth].filter(Boolean).length;
  const wormTargetTotal = wormEndbringersDefeated >= 3 ? 4 : 3;
  const wormCurrentProgress = wormEndbringersDefeated >= 3 ? wormEndbringersDefeated + (wormSolved.scion ? 1 : 0) : wormEndbringersDefeated;
  const twi03Runtime =
    state && state.nodeRuntime && state.nodeRuntime.TWI03 && typeof state.nodeRuntime.TWI03 === "object"
      ? state.nodeRuntime.TWI03
      : {};
  const valuedGuestCompleted = Math.max(0, Number(twi03Runtime.specialRewardIndex || 0));
  const valuedGuestTotal = 5;
  const arcane =
    state && state.systems && state.systems.arcane && typeof state.systems.arcane === "object"
      ? state.systems.arcane
      : {};
  const attunements = arcane.attunements && typeof arcane.attunements === "object" ? arcane.attunements : {};
  const attunementRank = attunements.enchanter ? arcaneAttunementRank(arcane) : null;
  const pgeStorylineTotal = 15;
  const pgeNodeIds = ["PGE02", "PGE03", "PGE04", "PGE05", "PGE06"];
  const pgeStorylinesCompleted = pgeNodeIds.reduce((sum, nodeId) => {
    const runtime =
      state && state.nodeRuntime && state.nodeRuntime[nodeId] && typeof state.nodeRuntime[nodeId] === "object"
        ? state.nodeRuntime[nodeId]
        : {};
    const history = runtime.winRewardHistory && typeof runtime.winRewardHistory === "object" ? runtime.winRewardHistory : {};
    return sum + Object.keys(history).length;
  }, 0);

  function buildMetric(section, standardSolved, standardTotal, unlocked) {
    const solved = standardSolved;
    const total = standardTotal;
    const percent = total === 0 ? 0 : Math.round((solved / total) * 100);
    const base = {
      section,
      total,
      solved,
      unlocked,
      percent,
      progressKind: "bar",
      progressTitle: "Stages Completed",
      progressCurrent: solved,
      progressMax: total,
      progressDisplay: `${solved}/${total}`,
      progressLabel: total ? `${solved}/${total} stages completed` : "",
    };
    if (section === "Cradle") {
      return {
        ...base,
        progressTitle: "Advancement Stage",
        progressCurrent: cradleStageIndex + 1,
        progressMax: cradleStageOrder.length,
        progressDisplay: cradleStageLabels[crdStage] || "Foundation",
        progressLabel: `${cradleStageLabels[crdStage] || "Foundation"} advancement`,
        percent: Math.round(((cradleStageIndex + 1) / cradleStageOrder.length) * 100),
      };
    }
    if (section === "Worm") {
      return {
        ...base,
        progressTitle: wormEndbringersDefeated >= 3 ? "Final Threats" : "Endbringers",
        progressCurrent: wormCurrentProgress,
        progressMax: wormTargetTotal,
        progressDisplay: `${wormCurrentProgress}/${wormTargetTotal}`,
        progressLabel: wormEndbringersDefeated >= 3
          ? `${wormCurrentProgress}/${wormTargetTotal} apocalyptic threats defeated`
          : `${wormCurrentProgress}/${wormTargetTotal} Endbringers defeated`,
        percent: Math.round((wormCurrentProgress / wormTargetTotal) * 100),
      };
    }
    if (section === "Dungeon Crawler Carl") {
      const floorTarget = 5;
      return {
        ...base,
        progressTitle: "Dungeon Depth",
        progressCurrent: Math.min(dccBestFloor, floorTarget),
        progressMax: floorTarget,
        progressDisplay: `Floor ${dccBestFloor}`,
        progressLabel: `Deepest floor reached: ${dccBestFloor}`,
        percent: Math.round((Math.min(dccBestFloor, floorTarget) / floorTarget) * 100),
      };
    }
    if (section === "The Wandering Inn" || section === "Wandering Inn") {
      return {
        ...base,
        progressTitle: "Valued Guests",
        progressCurrent: valuedGuestCompleted,
        progressMax: valuedGuestTotal,
        progressDisplay: `${valuedGuestCompleted}/${valuedGuestTotal}`,
        progressLabel: `${valuedGuestCompleted}/${valuedGuestTotal} valued guest quests fulfilled`,
        percent: Math.round((valuedGuestCompleted / valuedGuestTotal) * 100),
      };
    }
    if (section === "Mother of Learning") {
      return {
        ...base,
        progressKind: "counter",
        progressTitle: "Loop Resets",
        progressCurrent: overallMolResets,
        progressMax: 0,
        progressDisplay: `${overallMolResets}`,
        progressLabel: `${overallMolResets} total resets completed`,
        percent: 0,
      };
    }
    if (section === "A Practical Guide to Evil" || section === "Practical Guide") {
      return {
        ...base,
        progressTitle: "Story Lines",
        progressCurrent: pgeStorylinesCompleted,
        progressMax: pgeStorylineTotal,
        progressDisplay: `${pgeStorylinesCompleted}/${pgeStorylineTotal}`,
        progressLabel: `${pgeStorylinesCompleted}/${pgeStorylineTotal} story lines completed`,
        percent: Math.round((pgeStorylinesCompleted / pgeStorylineTotal) * 100),
      };
    }
    if (section === "Arcane Ascension") {
      return {
        ...base,
        progressTitle: "Attunement Level",
        progressCurrent: attunementRank ? 1 : 0,
        progressMax: 1,
        progressDisplay: attunementRank ? attunementRank.label : "Unbound",
        progressLabel: attunementRank ? `Current attunement rank: ${attunementRank.label}` : "Attunement not yet bound",
        percent: attunementRank
          ? Math.round((((attunementRank.tierIndex * 5) + attunementRank.subrankIndex + 1) / 30) * 100)
          : 0,
      };
    }
    return base;
  }

  for (const [section, nodes] of index.sectionNodes.entries()) {
    const standardTotal = nodes.length;
    const standardSolved = nodes.filter((node) => solvedSet.has(node.node_id)).length;
    const unlocked = nodes.filter((node) => unlockedNodeIds.has(node.node_id)).length;
    result.push(buildMetric(section, standardSolved, standardTotal, unlocked));
  }

  result.sort((a, b) => a.section.localeCompare(b.section));
  return result;
}

export function frontierNodes(index, state, unlockedNodeIds, limit = 10) {
  const solvedSet = new Set(state.solvedNodeIds || []);

  return index.raw.nodes
    .filter((node) => unlockedNodeIds.has(node.node_id) && !solvedSet.has(node.node_id))
    .sort((a, b) => {
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }
      return String(a.node_id).localeCompare(String(b.node_id));
    })
    .slice(0, limit);
}
