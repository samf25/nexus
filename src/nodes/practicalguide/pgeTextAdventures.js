import { escapeHtml } from "../../templates/shared.js";
import { renderArtifactSymbol } from "../../core/artifacts.js";
import {
  activePracticalGuideRoleFromState,
  normalizePracticalGuideRoleArtifact,
  practicalGuideRoleArtifacts,
} from "../../systems/practicalGuide.js";

const ROLE_ARTIFACTS = Object.freeze(practicalGuideRoleArtifacts());
const EMPTY_ROLE_SCORES = Object.freeze(
  Object.fromEntries(ROLE_ARTIFACTS.map((role) => [role, 0])),
);
const TIMED_LOCK_NODE_IDS = Object.freeze(new Set(["PGE02", "PGE03", "PGE04", "PGE05", "PGE06"]));
const PGE_FAIL_LOCK_MS = 60_000;

function scene(id, text, choices) {
  return {
    id,
    type: "decision",
    text,
    choices,
  };
}

function winScene(id, text, requiresArtifacts = [], requiresRole = [], rewardArtifact = "") {
  return {
    id,
    type: "terminal",
    terminal: "win",
    text,
    requiresArtifacts,
    requiresRole,
    rewardArtifact: String(rewardArtifact || ""),
  };
}

function failScene(id, text, requiresArtifacts = [], requiresRole = [], requiresFlags = []) {
  return {
    id,
    type: "terminal",
    terminal: "fail",
    text,
    requiresArtifacts,
    requiresRole,
    requiresFlags,
  };
}

function adjudicationScene(id, text) {
  return {
    id,
    type: "terminal",
    terminal: "adjudication",
    text,
  };
}

const PGE_STORIES = Object.freeze({
  PGE01: {
    nodeId: "PGE01",
    title: "Claimant's Knife",
    subtitle: "No perfect ending. The story is measuring which Name fits your choices.",
    startSceneId: "PGE01-S1",
    devArtifacts: Object.freeze([]),
    scenes: Object.freeze([
      scene("PGE01-S1", "At Ash Ford, soldiers drag refugees from a burning cart and demand a champion.", [
        {
          id: "s1-stand",
          text: "Step forward and challenge their captain in front of everyone.",
          next: "PGE01-S2",
          roleScore: { Squire: 2, Captain: 1, "Black Knight": 1 },
          setFlags: ["open_challenge"],
        },
        {
          id: "s1-ridge",
          text: "Climb the ridge and mark officers before anyone notices.",
          next: "PGE01-S2",
          roleScore: { Archer: 2, Ranger: 1, Thief: 1 },
          setFlags: ["high_ground"],
        },
        {
          id: "s1-omen",
          text: "Whisper to the village priest that this must become a three-beat omen.",
          next: "PGE01-S2",
          roleScore: { Hierophant: 2, Bard: 1, Warlock: 1 },
          setFlags: ["omen_seeded"],
        },
      ]),
      scene("PGE01-S2", "The skirmish ends, and both survivors and mercenaries look to you for a story to follow.", [
        {
          id: "s2-command",
          text: "Take command, assign watches, and name a clear chain of order.",
          next: "PGE01-S3",
          roleScore: { Captain: 2, Warden: 1, Squire: 1 },
          setFlags: ["order"],
        },
        {
          id: "s2-proxy",
          text: "Put a decoy leader in front while you move unseen.",
          next: "PGE01-S3",
          roleScore: { Thief: 2, Bard: 1, Ranger: 1 },
          setFlags: ["proxy"],
        },
        {
          id: "s2-vow",
          text: "Swear a binding vow before witnesses and force both sides to answer it.",
          next: "PGE01-S3",
          roleScore: { Hierophant: 2, Squire: 1, Warden: 1 },
          setFlags: ["vow"],
        },
      ]),
      scene("PGE01-S3", "A broken bridge blocks retreat while enemy banners gather on the far bank.", [
        {
          id: "s3-hold",
          text: "Hold the near side and make the bridge your first stand.",
          next: "PGE01-S4",
          roleScore: { Warden: 2, Squire: 1, "Black Knight": 1 },
          setFlags: ["chokepoint"],
        },
        {
          id: "s3-flank",
          text: "Take a narrow deer path and threaten them from the flank.",
          next: "PGE01-S4",
          roleScore: { Ranger: 2, Archer: 1, Thief: 1 },
          setFlags: ["flank"],
        },
        {
          id: "s3-ash",
          text: "Carve runes into the ropes and burn the crossing behind you.",
          next: "PGE01-S4",
          roleScore: { Warlock: 2, "Black Knight": 1, Thief: 1 },
          setFlags: ["burned_bridge"],
        },
      ]),
      scene("PGE01-S4", "Night camp turns uneasy as rumors spread that the dead are counting your choices.", [
        {
          id: "s4-watch",
          text: "Double watches and punish anyone who breaks rotation.",
          next: "PGE01-S5",
          roleScore: { Captain: 2, Warden: 1, "Black Knight": 1 },
          setFlags: ["discipline"],
        },
        {
          id: "s4-tale",
          text: "Tell a careful tale that casts tomorrow as the second beat.",
          next: "PGE01-S5",
          roleScore: { Bard: 2, Hierophant: 1, Squire: 1 },
          setFlags: ["second_beat_named"],
        },
        {
          id: "s4-scout",
          text: "Slip out alone and map every fire and sentry post.",
          next: "PGE01-S5",
          roleScore: { Ranger: 2, Archer: 1, Thief: 1 },
          setFlags: ["mapped_camp"],
        },
      ]),
      scene("PGE01-S5", "At dawn, a sealed waystone asks who has authority to pass and who has right to take.", [
        {
          id: "s5-rite",
          text: "Knock three times and invoke old treaty law.",
          next: "PGE01-S6",
          roleScore: { Hierophant: 2, Bard: 1, Captain: 1 },
          setFlags: ["ritual_entry"],
        },
        {
          id: "s5-pick",
          text: "Open it quietly and leave no trace behind.",
          next: "PGE01-S6",
          roleScore: { Thief: 2, Ranger: 1, Archer: 1 },
          setFlags: ["silent_entry"],
        },
        {
          id: "s5-force",
          text: "Break the sigil and take the path by strength.",
          next: "PGE01-S6",
          roleScore: { "Black Knight": 2, Warlock: 1, Squire: 1 },
          setFlags: ["forced_entry"],
        },
      ]),
      scene("PGE01-S6", "A black plain opens ahead, with your followers waiting to see whether you walk first or send others.", [
        {
          id: "s6-lead",
          text: "Lead from the front and keep the line tight.",
          next: "PGE01-S7",
          roleScore: { Squire: 2, Captain: 1, Warden: 1 },
          setFlags: ["frontline"],
        },
        {
          id: "s6-screen",
          text: "Spread skirmishers and let speed decide where you strike.",
          next: "PGE01-S7",
          roleScore: { Ranger: 2, Archer: 1, Thief: 1 },
          setFlags: ["skirmish_line"],
        },
        {
          id: "s6-anchor",
          text: "Set a hard center and dare them to break on you.",
          next: "PGE01-S7",
          roleScore: { "Black Knight": 2, Warden: 1, Captain: 1 },
          setFlags: ["anvil_center"],
        },
      ]),
      scene("PGE01-S7", "A mirrored oath appears: keep your promise as spoken, rewrite it, or abandon it.", [
        {
          id: "s7-keep",
          text: "Keep the oath exactly and pay the full cost.",
          next: "PGE01-S8",
          roleScore: { Squire: 2, Hierophant: 1, Warden: 1 },
          setFlags: ["oath_kept"],
        },
        {
          id: "s7-rewrite",
          text: "Rewrite the oath to trap your enemy in your wording.",
          next: "PGE01-S8",
          roleScore: { Warlock: 2, Bard: 1, Thief: 1 },
          setFlags: ["oath_rewritten"],
        },
        {
          id: "s7-abandon",
          text: "Abandon the oath and survive by motion and distance.",
          next: "PGE01-S8",
          roleScore: { Ranger: 2, Archer: 1, Thief: 1 },
          setFlags: ["oath_abandoned"],
        },
      ]),
      scene("PGE01-S8", "A ruined standard hangs over a field of old bones. Everyone waits to see what symbol you raise.", [
        {
          id: "s8-raise",
          text: "Raise the standard and demand people rally behind it.",
          next: "PGE01-S9",
          roleScore: { Captain: 2, Squire: 1, Bard: 1 },
          setFlags: ["banner_raised"],
        },
        {
          id: "s8-bury",
          text: "Bury the standard and make defense the only promise.",
          next: "PGE01-S9",
          roleScore: { Warden: 2, "Black Knight": 1, Hierophant: 1 },
          setFlags: ["banner_buried"],
        },
        {
          id: "s8-steal",
          text: "Steal the enemy colors and use their story against them.",
          next: "PGE01-S9",
          roleScore: { Thief: 2, Bard: 1, Warlock: 1 },
          setFlags: ["colors_stolen"],
        },
      ]),
      scene("PGE01-S9", "Before dawn, scouts report three possible threats and only one force you can personally answer.", [
        {
          id: "s9-gate",
          text: "Count gate posts and build a denial line.",
          next: "PGE01-S10",
          roleScore: { Warden: 2, Captain: 1, Squire: 1 },
          setFlags: ["gate_math"],
        },
        {
          id: "s9-shot",
          text: "Count wind shifts and set one impossible shot.",
          next: "PGE01-S10",
          roleScore: { Archer: 2, Ranger: 1, Thief: 1 },
          setFlags: ["wind_math"],
        },
        {
          id: "s9-names",
          text: "Count which names matter and cut the rest from the tale.",
          next: "PGE01-S10",
          roleScore: { Bard: 2, Hierophant: 1, Warlock: 1 },
          setFlags: ["name_math"],
        },
      ]),
      scene("PGE01-S10", "At the cairn of old claimants, the final turn asks what shape your authority takes.", [
        {
          id: "s10-oath",
          text: "Authority by sworn burden.",
          next: "PGE01-ADJ",
          roleScore: { Squire: 2, Hierophant: 1, Warden: 1 },
          setFlags: ["final_oath"],
        },
        {
          id: "s10-iron",
          text: "Authority by fear, steel, and refusal.",
          next: "PGE01-ADJ",
          roleScore: { "Black Knight": 2, Captain: 1, Warlock: 1 },
          setFlags: ["final_iron"],
        },
        {
          id: "s10-road",
          text: "Authority by movement, reach, and selection.",
          next: "PGE01-ADJ",
          roleScore: { Ranger: 2, Archer: 1, Thief: 1 },
          setFlags: ["final_road"],
        },
      ]),
      adjudicationScene("PGE01-ADJ", "The pattern closes. Your Role is chosen from what you repeatedly made true."),
    ]),
  },
  PGE02: {
    nodeId: "PGE02",
    title: "Siege of the Last Gate",
    subtitle: "Westwall drowns in rain while claimants try to force the ending.",
    startSceneId: "PGE02-01",
    devArtifacts: Object.freeze(["Westwall Ram", "Oathbreaker Bell", "Sunforge Powder"]),
    scenes: Object.freeze([
      scene("PGE02-01", "Night rain turns Westwall into one argument with three breaches. You get one framing move before everyone else starts naming the ending for you.", [
        {
          id: "p2-1-threefold",
          text: "Declare a Rule of Three defense.",
          requiresRole: ["Captain", "Squire", "Warden"],
          setFlags: ["frame_threefold"],
          next: "PGE02-02",
        },
        {
          id: "p2-1-villain",
          text: "Crown yourself the villain and bait a claimant.",
          requiresRole: ["Black Knight", "Bard", "Warlock"],
          setFlags: ["frame_villain"],
          next: "PGE02-02",
        },
        {
          id: "p2-1-culvert",
          text: "Commit the real victory to the culvert route.",
          requiresRole: ["Thief", "Ranger"],
          setFlags: ["frame_culvert"],
          next: "PGE02-02",
        },
        {
          id: "p2-1-panic",
          text: "Spread every reserve thin and pray speed becomes a plan.",
          setFlags: ["frame_panic"],
          next: "PGE02-02",
        },
      ]),
      scene("PGE02-02", "Second beat. The wall only gives you one true lever; everything else is noise and dead men.", [
        {
          id: "p2-2-ram",
          text: "Set the Westwall Ram at the inner gate and make dawn your third beat.",
          requiresFlags: ["frame_threefold"],
          requiresArtifacts: ["Westwall Ram"],
          setFlags: ["lever_hold"],
          next: "PGE02-03",
        },
        {
          id: "p2-2-villain",
          text: "Ring the Oathbreaker Bell over a Sunforge killbox and make the claimant step into your story.",
          requiresFlags: ["frame_villain"],
          requiresArtifacts: ["Oathbreaker Bell", "Sunforge Powder"],
          setFlags: ["lever_reversal"],
          next: "PGE02-03",
        },
        {
          id: "p2-2-culvert",
          text: "Use powder and ramwork to turn the wall into a decoy and open the dark-water lane.",
          requiresFlags: ["frame_culvert"],
          requiresArtifacts: ["Sunforge Powder", "Westwall Ram"],
          setFlags: ["lever_exfil"],
          next: "PGE02-03",
        },
        {
          id: "p2-2-chaos",
          text: "Commit every reserve to whatever breach looks loudest.",
          setFlags: ["lever_chaos"],
          next: "PGE02-03",
        },
      ]),
      scene("PGE02-03", "Dawn edge. Witnesses are finally watching the same stair. You get one line to decide what history says happened here.", [
        {
          id: "p2-3-w1",
          text: "Third beat lands at dawn: the gate stands and the siege loses its claim.",
          requiresFlags: ["frame_threefold", "lever_hold"],
          next: "PGE02-W1",
        },
        {
          id: "p2-3-w2",
          text: "Keep the monster mask on one breath longer and let the claimant overreach into your ending.",
          requiresFlags: ["frame_villain", "lever_reversal"],
          next: "PGE02-W2",
        },
        {
          id: "p2-3-w3",
          text: "Hold the lie at the wall while legitimacy leaves through black water.",
          requiresFlags: ["frame_culvert", "lever_exfil"],
          next: "PGE02-W3",
        },
        {
          id: "p2-3-l1",
          text: "Call all-out assault and let force decide what the story never did.",
          requiresFlags: ["lever_chaos"],
          next: "PGE02-L1",
        },
        {
          id: "p2-3-l2",
          text: "Refuse to name a win condition and watch the line tear itself apart.",
          next: "PGE02-L2",
        },
      ]),
      winScene("PGE02-W1", "Third beat lands exactly on dawn. The siege breaks because the story says it must.", ["Westwall Ram"], [], "Underlord Revelation I"),
      winScene("PGE02-W2", "You wore the villain mask until the claimant stepped into your ending.", ["Oathbreaker Bell", "Sunforge Powder"], [], "Overlord Revelation I"),
      winScene("PGE02-W3", "The wall was always a decoy. The true victory left through dark water.", ["Sunforge Powder", "Westwall Ram"], [], "Archlord Revelation I"),
      failScene("PGE02-L1", "Sunforge fire runs through dry beams. The keep becomes a cautionary tale."),
      failScene("PGE02-L2", "Without a declared ending, the wall survives only long enough to learn it has already lost."),
    ]),
  },
  PGE03: {
    nodeId: "PGE03",
    title: "Winter Court Knife-Game",
    subtitle: "Court stories are duels in slow motion: reveal, claim, and seal.",
    startSceneId: "PGE03-01",
    devArtifacts: Object.freeze(["Mirror of Nine Lies", "Green Wax Seal", "Veiled Signet"]),
    scenes: Object.freeze([
      scene("PGE03-01", "Winter court offers three entries at once: the gallery, the petition desk, and the mask-circles where truth goes to bargain for better clothes.", [
        {
          id: "p3-1-gallery",
          text: "Take the gallery and build an Archer line of sight.",
          requiresRole: ["Archer", "Ranger"],
          setFlags: ["frame_archer"],
          next: "PGE03-02",
        },
        {
          id: "p3-1-legal",
          text: "Enter by law and make the chamber answer to seals.",
          requiresArtifacts: ["Green Wax Seal"],
          setFlags: ["frame_legal"],
          next: "PGE03-02",
        },
        {
          id: "p3-1-rumor",
          text: "Enter through masks and buy the right version of events.",
          requiresRole: ["Bard", "Thief"],
          setFlags: ["frame_rumor"],
          next: "PGE03-02",
        },
        {
          id: "p3-1-reactive",
          text: "Wait for the loudest faction and inherit their framing.",
          setFlags: ["frame_reactive"],
          next: "PGE03-02",
        },
      ]),
      scene("PGE03-02", "The usurper presses for a verdict. You get one mechanism before the room decides what counts as proof.", [
        {
          id: "p3-2-arrow",
          text: "Use Mirror of Nine Lies to mark the true claimant for one public shot.",
          requiresFlags: ["frame_archer"],
          requiresArtifacts: ["Mirror of Nine Lies"],
          setFlags: ["lever_arrow"],
          next: "PGE03-03",
        },
        {
          id: "p3-2-legal",
          text: "Chain Green Wax Seal and Veiled Signet into one speaking right no forgery can survive.",
          requiresFlags: ["frame_legal"],
          requiresArtifacts: ["Green Wax Seal", "Veiled Signet"],
          setFlags: ["lever_legal"],
          next: "PGE03-03",
        },
        {
          id: "p3-2-rumor",
          text: "Trade a future betrayal for control over what the court remembers by dawn.",
          requiresFlags: ["frame_rumor"],
          setFlags: ["lever_rumor"],
          next: "PGE03-03",
        },
        {
          id: "p3-2-stall",
          text: "Ask for one more witness and let the room harden against you.",
          setFlags: ["lever_stall"],
          next: "PGE03-03",
        },
      ]),
      scene("PGE03-03", "Final declaration. Winter only keeps one version of the knife-game.", [
        {
          id: "p3-3-w1",
          text: "Loose the one shot that rewrites succession in a single heartbeat.",
          requiresFlags: ["frame_archer", "lever_arrow"],
          next: "PGE03-W1",
        },
        {
          id: "p3-3-w2",
          text: "Present three relics and one lawful chain the court cannot bend around.",
          requiresFlags: ["frame_legal", "lever_legal"],
          next: "PGE03-W2",
        },
        {
          id: "p3-3-w3",
          text: "Leave the throne empty and let your chosen rumor become the only stable truth.",
          requiresFlags: ["frame_rumor", "lever_rumor"],
          next: "PGE03-W3",
        },
        {
          id: "p3-3-l1",
          text: "Claim openly without earning witness law first.",
          requiresFlags: ["lever_stall"],
          next: "PGE03-L1",
        },
        {
          id: "p3-3-l2",
          text: "Walk out and become the missing villain in everyone else's story.",
          next: "PGE03-L2",
        },
      ]),
      winScene("PGE03-W1", "One precise shot rewrites succession in a single heartbeat.", ["Mirror of Nine Lies"], ["Archer"], "Underlord Revelation II"),
      winScene("PGE03-W2", "Three relics, one legal chain. The court bends instead of breaking.", ["Mirror of Nine Lies", "Green Wax Seal", "Veiled Signet"], [], "Overlord Revelation II"),
      winScene("PGE03-W3", "You never sat the throne, but your version of events did.", ["Veiled Signet", "Green Wax Seal"], ["Bard", "Thief"], "Archlord Revelation II"),
      failScene("PGE03-L1", "A false claim under witness law brands you for all factions."),
      failScene("PGE03-L2", "By leaving before closure, you become the missing villain in someone else's story."),
    ]),
  },
  PGE04: {
    nodeId: "PGE04",
    title: "Tomb of the Drowned Crown",
    subtitle: "A dead dynasty's safeguards care more about pattern than morality.",
    startSceneId: "PGE04-S1",
    devArtifacts: Object.freeze(["Sunless Lantern", "Bone Key", "River-Map of Silt"]),
    scenes: Object.freeze([
      scene("PGE04-S1", "The drowned tomb opens three ways: the choir of dead names, the ossuary lockline, and the flood galleries that remember a safer route than any living guide.", [
        {
          id: "p4-1-choir",
          text: "Enter by claimant ritual and speak to the dead like they still matter.",
          requiresRole: ["Warlock", "Hierophant"],
          setFlags: ["frame_choir"],
          next: "PGE04-S2",
        },
        {
          id: "p4-1-lockline",
          text: "Treat the tomb as a machine and take the ossuary sequence.",
          requiresArtifacts: ["Sunless Lantern", "Bone Key"],
          setFlags: ["frame_lock"],
          next: "PGE04-S2",
        },
        {
          id: "p4-1-flood",
          text: "Read the flood galleries and let timing, not authority, carry you inward.",
          requiresArtifacts: ["River-Map of Silt"],
          setFlags: ["frame_flood"],
          next: "PGE04-S2",
        },
        {
          id: "p4-1-rush",
          text: "Rush the center and hope treasure outruns pattern.",
          setFlags: ["frame_rush"],
          next: "PGE04-S2",
        },
      ]),
      scene("PGE04-S2", "The inner court stirs. You get one stable mechanism before stone, water, and dead judges all start calling you a thief.", [
        {
          id: "p4-2-crown",
          text: "Offer debt, blood, and relic authority together and seat the drowned crown cleanly.",
          requiresFlags: ["frame_choir"],
          requiresArtifacts: ["Sunless Lantern", "Bone Key", "River-Map of Silt"],
          requiresRole: ["Warlock"],
          setFlags: ["lever_crown"],
          next: "PGE04-S3",
        },
        {
          id: "p4-2-seal",
          text: "Open the lesser line, take what can be carried, and seal the chamber behind you.",
          requiresFlags: ["frame_lock"],
          requiresArtifacts: ["Sunless Lantern", "Bone Key"],
          setFlags: ["lever_seal"],
          next: "PGE04-S3",
        },
        {
          id: "p4-2-river",
          text: "Refuse kingship, redirect the flood, and survive with knowledge instead of a crown.",
          requiresFlags: ["frame_flood"],
          requiresArtifacts: ["River-Map of Silt"],
          setFlags: ["lever_river"],
          next: "PGE04-S3",
        },
        {
          id: "p4-2-greed",
          text: "Open everything at once and grab whatever shines first.",
          setFlags: ["lever_greed"],
          next: "PGE04-S3",
        },
      ]),
      scene("PGE04-S3", "Final pressure. The tomb will accept one claim and erase the rest.", [
        {
          id: "p4-3-w1",
          text: "Pay the full price and leave as lawful inheritor.",
          requiresFlags: ["frame_choir", "lever_crown"],
          next: "PGE04-W1",
        },
        {
          id: "p4-3-w2",
          text: "Take the lesser claim, seal the chamber, and survive the burial court.",
          requiresFlags: ["frame_lock", "lever_seal"],
          next: "PGE04-W2",
        },
        {
          id: "p4-3-w3",
          text: "Leave the crown to the dead and ride the floodline out with the map's truth intact.",
          requiresFlags: ["frame_flood", "lever_river"],
          next: "PGE04-W3",
        },
        {
          id: "p4-3-l1",
          text: "Grab for the crown before the judges finish counting the price.",
          requiresFlags: ["lever_greed"],
          next: "PGE04-L1",
        },
        {
          id: "p4-3-l2",
          text: "Wait for the hall to choose a claimant for you.",
          next: "PGE04-L2",
        },
      ]),
      winScene("PGE04-W1", "Debt is accepted, crown is seated, and the tomb records you as lawful inheritor.", ["Sunless Lantern", "Bone Key", "River-Map of Silt"], ["Warlock"], "Underlord Revelation Cipher"),
      winScene("PGE04-W2", "You leave with lesser relics and a sealed chamber that will not reopen easily.", ["Sunless Lantern", "Bone Key"], [], "Overlord Revelation Cipher"),
      winScene("PGE04-W3", "You refuse kingship, redirect the flood, and survive with knowledge intact.", ["River-Map of Silt"], [], "Archlord Revelation Cipher"),
      failScene("PGE04-L1", "The crown rejects theft. Stone and water close over your route."),
      failScene("PGE04-L2", "The flood completes its beat without you and the tomb erases your claim for good."),
    ]),
  },
  PGE05: {
    nodeId: "PGE05",
    title: "March of Small Mercies",
    subtitle: "After victory, the harder story begins: who gets protected, who gets punished, and who gets written out.",
    startSceneId: "PGE05-01",
    devArtifacts: Object.freeze(["Ashen Treaty Pins", "Red Petition Docket", "Saintglass Vial"]),
    scenes: Object.freeze([
      scene("PGE05-01", "The city is yours and suddenly that is the problem. Officers want reprisals, civilians want terms, and history wants a sentence simple enough to remember.", [
        {
          id: "p5-1-mercy",
          text: "Frame the conquest as restoration: protect first, punish second.",
          requiresRole: ["Squire", "Warden", "Captain"],
          setFlags: ["frame_mercy"],
          next: "PGE05-02",
        },
        {
          id: "p5-1-law",
          text: "Frame it as lawful transition: every sentence tied to a record.",
          requiresArtifacts: ["Red Petition Docket"],
          setFlags: ["frame_law"],
          next: "PGE05-02",
        },
        {
          id: "p5-1-fear",
          text: "Frame it as deterrence: one example now prevents ten rebellions later.",
          requiresRole: ["Black Knight", "Warlock", "Bard"],
          setFlags: ["frame_deterrence"],
          next: "PGE05-02",
        },
        {
          id: "p5-1-drift",
          text: "Delay and let district officers improvise policy for you.",
          setFlags: ["frame_drift"],
          next: "PGE05-02",
        },
      ]),
      scene("PGE05-02", "The officer corps splits before noon. You get one real mechanism before habit and vengeance decide the rest.", [
        {
          id: "p5-2-mercy",
          text: "Issue Ashen Treaty Pins and make reprisals answer to record and witness.",
          requiresFlags: ["frame_mercy"],
          requiresArtifacts: ["Ashen Treaty Pins"],
          setFlags: ["lever_mercy"],
          next: "PGE05-03",
        },
        {
          id: "p5-2-law",
          text: "Chain accusation, testimony, and punishment into one public process.",
          requiresFlags: ["frame_law"],
          requiresArtifacts: ["Red Petition Docket"],
          setFlags: ["lever_law"],
          next: "PGE05-03",
        },
        {
          id: "p5-2-fear",
          text: "Stage one exemplary punishment, then cap retaliation before it becomes appetite.",
          requiresFlags: ["frame_deterrence"],
          setFlags: ["lever_fear"],
          next: "PGE05-03",
        },
        {
          id: "p5-2-drift",
          text: "Trust your subordinates to sort mercy from weakness on their own.",
          setFlags: ["lever_drift"],
          next: "PGE05-03",
        },
      ]),
      scene("PGE05-03", "Final decree. The city will remember one doctrine and blame you for all the others.", [
        {
          id: "p5-3-w1",
          text: "Mercy becomes binding law: the marked are untouchable even after rebellion.",
          requiresFlags: ["frame_mercy", "lever_mercy"],
          next: "PGE05-W1",
        },
        {
          id: "p5-3-w2",
          text: "Punishment becomes visible process: witnessed, recorded, and appealable.",
          requiresFlags: ["frame_law", "lever_law"],
          next: "PGE05-W2",
        },
        {
          id: "p5-3-w3",
          text: "Fear opens the door, then boundaries shut it before the realm tears itself apart.",
          requiresFlags: ["frame_deterrence", "lever_fear"],
          next: "PGE05-W3",
        },
        {
          id: "p5-3-l1",
          text: "Authorize open reprisal and let the city learn obedience from fire.",
          requiresFlags: ["lever_drift"],
          next: "PGE05-L1",
        },
        {
          id: "p5-3-l2",
          text: "Refuse doctrine entirely and inherit every cruelty done in your name.",
          next: "PGE05-L2",
        },
      ]),
      winScene("PGE05-W1", "Mercy survives because you made it enforceable, not sentimental.", ["Ashen Treaty Pins", "Red Petition Docket"], [], "Edict of the Turning Knife"),
      winScene("PGE05-W2", "You turn vengeance into process and process into legitimacy.", ["Red Petition Docket", "Saintglass Vial"], [], "Accord of Borrowed Crowns"),
      winScene("PGE05-W3", "Fear opens the door, then limits close it before the realm tears itself apart.", ["Ashen Treaty Pins"], [], "Writ of the Glass Tribunal"),
      failScene("PGE05-L1", "Reprisal outruns command. You keep the city and lose the realm."),
      failScene("PGE05-L2", "By refusing doctrine, you inherit every atrocity committed in your name."),
    ]),
  },
  PGE06: {
    nodeId: "PGE06",
    title: "The Long Night Banquet",
    subtitle: "Guest-right, poison, and policy share one table; your choice is which law survives dessert.",
    startSceneId: "PGE06-01",
    devArtifacts: Object.freeze(["Ivory Truce Fork", "Nightwine Ledger", "Mercy Bell Chime"]),
    scenes: Object.freeze([
      scene("PGE06-01", "The coalition banquet opens under truce while three rumors arrive before the first course: poison, coup, and a martyr waiting to happen.", [
        {
          id: "p6-1-host",
          text: "Host openly and anchor the night in guest-right.",
          requiresArtifacts: ["Ivory Truce Fork"],
          setFlags: ["frame_guest"],
          next: "PGE06-02",
        },
        {
          id: "p6-1-audit",
          text: "Audit every cup, plate, and handoff before anyone dies in public.",
          requiresArtifacts: ["Nightwine Ledger"],
          setFlags: ["frame_audit"],
          next: "PGE06-02",
        },
        {
          id: "p6-1-shadow",
          text: "Work the kitchens and corridors, not the table itself.",
          requiresRole: ["Thief", "Ranger", "Bard"],
          setFlags: ["frame_shadow"],
          next: "PGE06-02",
        },
        {
          id: "p6-1-reactive",
          text: "Wait for the first collapse and answer live.",
          setFlags: ["frame_reactive"],
          next: "PGE06-02",
        },
      ]),
      scene("PGE06-02", "Mid-course panic. You get one stabilizing mechanism before suspicion becomes policy.", [
        {
          id: "p6-2-guest",
          text: "Force equal tasting order and reconcile the host table against the ledger.",
          requiresFlags: ["frame_guest"],
          requiresArtifacts: ["Nightwine Ledger"],
          setFlags: ["lever_guest"],
          next: "PGE06-03",
        },
        {
          id: "p6-2-audit",
          text: "Ring Mercy Bell Chime over the audit and make process outrun vengeance.",
          requiresFlags: ["frame_audit"],
          requiresArtifacts: ["Mercy Bell Chime"],
          setFlags: ["lever_audit"],
          next: "PGE06-03",
        },
        {
          id: "p6-2-shadow",
          text: "Turn corridor leverage into a private surrender no one can publicly acknowledge.",
          requiresFlags: ["frame_shadow"],
          setFlags: ["lever_shadow"],
          next: "PGE06-03",
        },
        {
          id: "p6-2-blame",
          text: "Name a culprit faction before the evidence finishes arriving.",
          setFlags: ["lever_blame"],
          next: "PGE06-03",
        },
      ]),
      scene("PGE06-03", "Final course. The hall will survive under one law, or not at all.", [
        {
          id: "p6-3-w1",
          text: "Prove the host table held and let guest-right outlive the poisoning.",
          requiresFlags: ["frame_guest", "lever_guest"],
          next: "PGE06-W1",
        },
        {
          id: "p6-3-w2",
          text: "Make accountability faster than vengeance and let the hall choose process.",
          requiresFlags: ["frame_audit", "lever_audit"],
          next: "PGE06-W2",
        },
        {
          id: "p6-3-w3",
          text: "Trade one private surrender for one public peace.",
          requiresFlags: ["frame_shadow", "lever_shadow"],
          next: "PGE06-W3",
        },
        {
          id: "p6-3-l1",
          text: "Arrest the wrong delegation loudly enough that no one can walk it back.",
          requiresFlags: ["lever_blame"],
          next: "PGE06-L1",
        },
        {
          id: "p6-3-l2",
          text: "Keep the hall through fear alone and let trust die where it sits.",
          next: "PGE06-L2",
        },
      ]),
      winScene("PGE06-W1", "Guest-right holds through poison and panic. The truce outlives the table.", ["Ivory Truce Fork", "Nightwine Ledger"], [], "Bridge-Supper Compact"),
      winScene("PGE06-W2", "You make accountability faster than vengeance, and the hall chooses process.", ["Nightwine Ledger", "Mercy Bell Chime"], [], "Accord of Borrowed Crowns"),
      winScene("PGE06-W3", "No speech saves the room; a private surrender does, and history credits peace.", ["Ivory Truce Fork"], ["Thief", "Ranger", "Bard"], "Writ of the Glass Tribunal"),
      failScene("PGE06-L1", "You turn suspicion into civil fracture. The feast becomes the first battle."),
      failScene("PGE06-L2", "You keep immediate control and lose every ally by dawn."),
    ]),
  },
});

function scenesById(story) {
  return Object.fromEntries((story.scenes || []).map((entry) => [entry.id, entry]));
}

function rewardsMap(state) {
  return state && state.inventory && state.inventory.rewards && typeof state.inventory.rewards === "object"
    ? state.inventory.rewards
    : {};
}

function normalizeRuntime(candidate, story) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const sceneLookup = scenesById(story);
  const startSceneId = story && story.startSceneId ? story.startSceneId : "";
  const initialScene = sceneLookup[startSceneId] ? startSceneId : Object.keys(sceneLookup)[0] || "";
  const sceneId = sceneLookup[source.sceneId] ? source.sceneId : initialScene;
  const roleScoresInput = source.roleScores && typeof source.roleScores === "object" ? source.roleScores : {};
  const roleScores = Object.fromEntries(
    ROLE_ARTIFACTS.map((role) => [role, Number(roleScoresInput[role]) || 0]),
  );
  const flagsInput = source.flags && typeof source.flags === "object" ? source.flags : {};
  const flags = {};
  for (const [key, value] of Object.entries(flagsInput)) {
    if (value) {
      flags[key] = true;
    }
  }
  const currentScene = sceneLookup[sceneId] || null;
  return {
    sceneId,
    flags,
    roleScores,
    choiceCount: Math.max(0, Math.floor(Number(source.choiceCount) || 0)),
    lockedUntil: Math.max(0, Math.floor(Number(source.lockedUntil) || 0)),
    lastFailureSceneId: String(source.lastFailureSceneId || ""),
    solved: Boolean(source.solved),
    outcomeRole: String(source.outcomeRole || ""),
    history:
      Array.isArray(source.history)
        ? source.history.map((entry) => String(entry || "")).filter((entry) => entry).slice(-60)
        : [],
    lastMessage: String(source.lastMessage || ""),
    terminalType: currentScene && currentScene.type === "terminal" ? String(currentScene.terminal || "") : "",
    routeVisitNonce: Math.max(0, Math.floor(Number(source.routeVisitNonce) || 0)),
    pendingRewards:
      Array.isArray(source.pendingRewards)
        ? source.pendingRewards.map((entry) => String(entry || "")).filter((entry) => entry).slice(-8)
        : [],
    winRewardHistory:
      source.winRewardHistory && typeof source.winRewardHistory === "object"
        ? Object.fromEntries(
            Object.entries(source.winRewardHistory).filter(([, value]) => Boolean(value)),
          )
        : {},
  };
}

function isTimedLockNode(nodeId) {
  return TIMED_LOCK_NODE_IDS.has(String(nodeId || ""));
}

function remainingLockMs(runtime, now = Date.now()) {
  return Math.max(0, Math.floor(Number(runtime && runtime.lockedUntil) || 0) - Math.floor(Number(now) || 0));
}

function hasActiveLock(nodeId, runtime, now = Date.now()) {
  return isTimedLockNode(nodeId) && remainingLockMs(runtime, now) > 0;
}

function storyForNodeId(nodeId) {
  return PGE_STORIES[String(nodeId || "")] || null;
}

function choiceNextId(choice) {
  if (choice && typeof choice === "object" && choice.next) {
    return String(choice.next);
  }
  if (choice && typeof choice === "object" && Array.isArray(choice.nextSceneIds) && choice.nextSceneIds[0]) {
    return String(choice.nextSceneIds[0]);
  }
  return "";
}

function listFrom(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "")).filter((entry) => entry);
  }
  if (value) {
    return [String(value)];
  }
  return [];
}

function requiresCheck(
  { requiresRole = [], requiresArtifacts = [], requiresFlags = [] },
  context,
  { includeRole = true, includeArtifacts = true, includeFlags = true } = {},
) {
  const safeContext = context && typeof context === "object" ? context : {};
  const runtimeFlags =
    safeContext.runtime &&
    typeof safeContext.runtime === "object" &&
    safeContext.runtime.flags &&
    typeof safeContext.runtime.flags === "object"
      ? safeContext.runtime.flags
      : {};
  const rewards = rewardsMap(safeContext.state);
  const activeRole = activePracticalGuideRoleFromState(safeContext.state);
  const roleNeed = listFrom(requiresRole);
  const artifactNeed = listFrom(requiresArtifacts);
  const flagNeed = listFrom(requiresFlags);

  const missingRole = includeRole && roleNeed.length && !roleNeed.includes(activeRole) ? roleNeed : [];
  const missingArtifacts = includeArtifacts ? artifactNeed.filter((artifact) => !rewards[artifact]) : [];
  const missingFlags = includeFlags ? flagNeed.filter((flag) => !runtimeFlags[flag]) : [];

  return {
    missingRole,
    missingArtifacts,
    missingFlags,
    locked: Boolean(missingRole.length || missingArtifacts.length || missingFlags.length),
  };
}

function terminalOutcomeRole(runtime) {
  let winner = ROLE_ARTIFACTS[0];
  let winnerScore = Number(runtime.roleScores[winner]) || 0;
  for (const role of ROLE_ARTIFACTS) {
    const score = Number(runtime.roleScores[role]) || 0;
    if (score > winnerScore) {
      winner = role;
      winnerScore = score;
    }
  }
  return winner;
}

function lockReason(lockInfo) {
  const parts = [];
  if (lockInfo.missingRole.length) {
    parts.push(`Role: ${lockInfo.missingRole.join(" / ")}`);
  }
  if (lockInfo.missingArtifacts.length) {
    parts.push(`Artifacts: ${lockInfo.missingArtifacts.join(", ")}`);
  }
  if (lockInfo.missingFlags.length) {
    parts.push("Story conditions unmet");
  }
  return parts.join(" | ");
}

function mergeUnique(values) {
  return [...new Set(values.filter((entry) => entry))];
}

function fallbackSceneId(nodeId, choice, stage = "path") {
  if (choice && typeof choice.onMissingFlagsNext === "string" && choice.onMissingFlagsNext) {
    return choice.onMissingFlagsNext;
  }
  return `${String(nodeId || "")}-MISS-${stage}`;
}

function visibleChoiceData(currentScene, context, story) {
  const sceneLookup = scenesById(story);
  const lockedRequirementSymbols = [];
  const visibleChoices = (currentScene.choices || []).filter((choice) => {
    const nextId = choiceNextId(choice);
    const nextScene = sceneLookup[nextId] || null;
    const hardLock = requiresCheck({
      requiresRole: choice.requiresRole,
      requiresArtifacts: choice.requiresArtifacts,
      requiresFlags: choice.requiresFlags,
    }, context, { includeFlags: false });
    if (hardLock.locked) {
      lockedRequirementSymbols.push(...hardLock.missingRole, ...hardLock.missingArtifacts);
      return false;
    }
    if (nextScene && nextScene.type === "terminal") {
      const terminalHardLock = requiresCheck({
        requiresRole: nextScene.requiresRole,
        requiresArtifacts: nextScene.requiresArtifacts,
        requiresFlags: nextScene.requiresFlags,
      }, context, { includeFlags: false });
      if (terminalHardLock.locked) {
        lockedRequirementSymbols.push(...terminalHardLock.missingRole, ...terminalHardLock.missingArtifacts);
        return false;
      }
    }
    return true;
  });
  return {
    visibleChoices,
    uniqueSymbols: mergeUnique(lockedRequirementSymbols),
  };
}

function applyTimedFailureLock(nodeId, runtime, story, now, sceneId, message) {
  if (!isTimedLockNode(nodeId)) {
    return runtime;
  }
  return {
    ...runtime,
    sceneId: sceneId || runtime.sceneId || story.startSceneId,
    lockedUntil: Math.max(0, Math.floor(Number(now) || 0)) + PGE_FAIL_LOCK_MS,
    lastFailureSceneId: String(sceneId || runtime.sceneId || ""),
    solved: false,
    lastMessage: message || "This thread collapses. The story bars you out for a minute.",
  };
}

function renderChoices(nodeId, currentScene, runtime, context, story) {
  const sceneLookup = scenesById(story);
  const { visibleChoices, uniqueSymbols } = visibleChoiceData(currentScene, context, story);
  const symbolStrip = uniqueSymbols.length
    ? `
      <section class="card pge-lock-sigil-strip" aria-label="Hidden route sigils">
        ${uniqueSymbols.map((name) => `
          <span class="pge-lock-sigil">
            ${renderArtifactSymbol({
    artifactName: name,
    className: "artifact-symbol",
  })}
          </span>
        `).join("")}
      </section>
    `
    : "";

  if (!visibleChoices.length) {
    return `
      ${symbolStrip}
      <section class="card pge-terminal is-fail">
        <h4>No Current Openings</h4>
        <p>None of your available roles or artifacts unlock a stable move in this scene.</p>
      </section>
    `;
  }

  return `
    ${symbolStrip}
    <div class="pge-choice-grid">
      ${visibleChoices.map((choice) => {
        const nextId = choiceNextId(choice);
        const nextScene = sceneLookup[nextId] || null;
        const artifactRequirements = mergeUnique([
          ...listFrom(choice.requiresArtifacts),
          ...(nextScene && nextScene.type === "terminal" ? listFrom(nextScene.requiresArtifacts) : []),
        ]);
        const roleRequirements = mergeUnique([
          ...listFrom(choice.requiresRole),
          ...(nextScene && nextScene.type === "terminal" ? listFrom(nextScene.requiresRole) : []),
        ]);
        const requirementBits = [];
        if (artifactRequirements.length) {
          requirementBits.push(
            `Requires ${artifactRequirements.join(artifactRequirements.length > 1 ? ", " : "")}`,
          );
        }
        if (roleRequirements.length) {
          requirementBits.push(
            `Requires ${roleRequirements.join(roleRequirements.length > 1 ? ", " : "")} role${roleRequirements.length > 1 ? "s" : ""}`,
          );
        }
        const requirementText = requirementBits.join(" \u2022 ");
        const hasArtifactRequirement = artifactRequirements.length > 0;
        const hasRoleRequirement = roleRequirements.length > 0;
        const badgeMarkup =
          hasArtifactRequirement || hasRoleRequirement
            ? `
              <span class="pge-choice-badges" aria-hidden="true">
                ${hasArtifactRequirement
                  ? `<span class="pge-choice-badge is-artifact">Artifact</span>`
                  : ""}
                ${hasRoleRequirement
                  ? `<span class="pge-choice-badge is-role">Role</span>`
                  : ""}
              </span>
            `
            : "";
        return `
          <button
            type="button"
            class="pge-choice${hasArtifactRequirement ? " has-artifact-gate" : ""}${hasRoleRequirement ? " has-role-gate" : ""}"
            data-node-id="${escapeHtml(nodeId)}"
            data-node-action="pge-choose"
            data-choice-id="${escapeHtml(choice.id)}"
            ${requirementText ? `data-pge-requirement="${escapeHtml(requirementText)}" title="${escapeHtml(requirementText)}"` : ""}
          >
            <span>${escapeHtml(choice.text)}</span>
            ${badgeMarkup}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderTerminal(nodeId, story, runtime, currentScene) {
  if (!currentScene || currentScene.type !== "terminal") {
    return "";
  }

  if (currentScene.terminal === "adjudication") {
    const role = runtime.outcomeRole || terminalOutcomeRole(runtime);
    const claimed = Boolean(runtime.solved);
    return `
      <section class="card pge-terminal is-adjudication">
        <h4>Role Settles</h4>
        <p>${escapeHtml(currentScene.text || "The story chooses.")}</p>
        <p><strong>Projected Role:</strong> ${escapeHtml(role)}</p>
        ${
          claimed
            ? `
              <p class="muted">Role already claimed. To change Role, complete a Practical Guide reset in Loop Reset.</p>
            `
            : `
              <div class="toolbar">
                <button
                  type="button"
                  data-node-id="${escapeHtml(nodeId)}"
                  data-node-action="pge01-claim-role"
                  data-role-artifact="${escapeHtml(role)}"
                >
                  Claim Role
                </button>
              </div>
            `
        }
      </section>
    `;
  }

  const isWin = currentScene.terminal === "win";
  return `
    <section class="card pge-terminal ${isWin ? "is-win" : "is-fail"}">
      <h4>${isWin ? "Story Victory" : "Story Collapse"}</h4>
      <p>${escapeHtml(currentScene.text || "")}</p>
      <div class="toolbar">
        <button
          type="button"
          class="ghost"
          data-node-id="${escapeHtml(nodeId)}"
          data-node-action="pge-restart"
        >
          Restart Story
        </button>
      </div>
    </section>
  `;
}

function renderLockedPanel(nodeId, runtime, currentScene, now = Date.now()) {
  const remainingSeconds = Math.max(1, Math.ceil(remainingLockMs(runtime, now) / 1000));
  const failureText = currentScene && currentScene.type === "terminal" ? currentScene.text || "" : "";
  return `
    <section class="card pge-terminal is-fail pge-lockout" data-node-id="${escapeHtml(nodeId)}">
      <h4>Story Locked</h4>
      <p>${escapeHtml(failureText || "That route ended badly enough that the pattern rejects another attempt for now.")}</p>
      <p><strong>Reset in:</strong> ${escapeHtml(String(remainingSeconds))}s</p>
      <p class="muted">This strand will reopen from the beginning once the lock expires.</p>
    </section>
  `;
}

function createInitialRuntime(story) {
  return {
    sceneId: story.startSceneId,
    flags: {},
    roleScores: { ...EMPTY_ROLE_SCORES },
    choiceCount: 0,
    lockedUntil: 0,
    lastFailureSceneId: "",
    solved: false,
    outcomeRole: "",
    history: [],
    lastMessage: "",
    routeVisitNonce: 0,
    pendingRewards: [],
    winRewardHistory: {},
  };
}

function reduceAdventureRuntime(nodeId, runtime, action, context) {
  const story = storyForNodeId(nodeId);
  if (!story) {
    return runtime;
  }
  const current = normalizeRuntime(runtime, story);
  const sceneLookup = scenesById(story);
  const currentScene = sceneLookup[current.sceneId] || null;
  const now = Math.max(0, Math.floor(Number((action && action.at) || Date.now()) || 0));

  if (!action || typeof action !== "object") {
    return current;
  }

  if (hasActiveLock(nodeId, current, now)) {
    return {
      ...current,
      lastMessage: "This story is still locked.",
    };
  }

  if (action.type === "pge-restart") {
    if (nodeId === "PGE01" && current.solved) {
      return {
        ...current,
        lastMessage: "Role already claimed. Use Loop Reset to take a new Role.",
      };
    }
    return {
      ...createInitialRuntime(story),
      lastMessage: "Story rewound.",
      routeVisitNonce: current.routeVisitNonce,
      winRewardHistory:
        current.winRewardHistory && typeof current.winRewardHistory === "object"
          ? { ...current.winRewardHistory }
          : {},
    };
  }

  if (action.type === "pge01-claim-role") {
    if (nodeId !== "PGE01" || !currentScene || currentScene.terminal !== "adjudication") {
      return current;
    }
    const roleArtifact = normalizePracticalGuideRoleArtifact(action.roleArtifact);
    if (!roleArtifact) {
      return {
        ...current,
        lastMessage: "Role claim failed.",
      };
    }
    return {
      ...current,
      solved: true,
      outcomeRole: roleArtifact,
      lastMessage: `${roleArtifact} claimed.`,
    };
  }

  if (action.type !== "pge-choose" || !currentScene || currentScene.type !== "decision") {
    return current;
  }

  const choiceId = String(action.choiceId || "");
  const choice = (currentScene.choices || []).find((entry) => entry.id === choiceId);
  if (!choice) {
    return current;
  }

  const choiceLock = requiresCheck({
    requiresRole: choice.requiresRole,
    requiresArtifacts: choice.requiresArtifacts,
    requiresFlags: choice.requiresFlags,
  }, context, { includeFlags: false });
  if (choiceLock.locked) {
    return {
      ...current,
      lastMessage: "That path is currently locked.",
    };
  }

  let nextSceneId = choiceNextId(choice);
  if (!sceneLookup[nextSceneId]) {
    return {
      ...current,
      lastMessage: "The story thread frays and resets.",
    };
  }

  const choiceFlagLock = requiresCheck({
    requiresRole: choice.requiresRole,
    requiresArtifacts: choice.requiresArtifacts,
    requiresFlags: choice.requiresFlags,
  }, context, { includeRole: false, includeArtifacts: false, includeFlags: true });
  if (choiceFlagLock.missingFlags.length) {
    const fallbackId = fallbackSceneId(nodeId, choice, "path");
    if (sceneLookup[fallbackId]) {
      nextSceneId = fallbackId;
    } else {
      return {
        ...current,
        lastMessage: "That thread was never laid for this run.",
      };
    }
  }

  const nextFlags = { ...current.flags };
  for (const flag of listFrom(choice.setFlags)) {
    nextFlags[flag] = true;
  }
  const nextRoleScores = { ...current.roleScores };
  const roleScore = choice && typeof choice.roleScore === "object" ? choice.roleScore : {};
  for (const [role, bonus] of Object.entries(roleScore)) {
    const normalizedRole = normalizePracticalGuideRoleArtifact(role);
    if (!normalizedRole) {
      continue;
    }
    nextRoleScores[normalizedRole] = (Number(nextRoleScores[normalizedRole]) || 0) + (Number(bonus) || 0);
  }

  let nextScene = sceneLookup[nextSceneId];
  const nextHistory = [...current.history, choice.text].slice(-60);

  let solved = current.solved;
  let lastMessage = "";
  let outcomeRole = current.outcomeRole;
  const pendingRewards = Array.isArray(current.pendingRewards) ? [...current.pendingRewards] : [];
  const winRewardHistory =
    current.winRewardHistory && typeof current.winRewardHistory === "object"
      ? { ...current.winRewardHistory }
      : {};
  if (nextScene.type === "terminal") {
    const terminalHardLock = requiresCheck({
      requiresRole: nextScene.requiresRole,
      requiresArtifacts: nextScene.requiresArtifacts,
      requiresFlags: nextScene.requiresFlags,
    }, {
      ...context,
      runtime: {
        ...current,
        flags: nextFlags,
      },
    }, { includeFlags: false });
    if (terminalHardLock.locked) {
      const reason = lockReason(terminalHardLock);
      return {
        ...current,
        lastMessage: reason ? `Ending locked: ${reason}` : "You sense the ending would reject you.",
      };
    }
    const terminalFlagLock = requiresCheck({
      requiresRole: nextScene.requiresRole,
      requiresArtifacts: nextScene.requiresArtifacts,
      requiresFlags: nextScene.requiresFlags,
    }, {
      ...context,
      runtime: {
        ...current,
        flags: nextFlags,
      },
    }, { includeRole: false, includeArtifacts: false, includeFlags: true });
    if (terminalFlagLock.missingFlags.length) {
      const fallbackId = fallbackSceneId(nodeId, choice, "ending");
      if (sceneLookup[fallbackId]) {
        nextSceneId = fallbackId;
        nextScene = sceneLookup[nextSceneId];
      } else {
        return {
          ...current,
          lastMessage: "The finale rejects this line of play.",
        };
      }
    }
  }

  if (nextScene.type === "terminal") {
    if (nextScene.terminal === "win") {
      solved = true;
      lastMessage = "A winning story locks into place.";
      const rewardArtifact = String(nextScene.rewardArtifact || "");
      if (rewardArtifact && !winRewardHistory[rewardArtifact]) {
        winRewardHistory[rewardArtifact] = true;
        pendingRewards.push(rewardArtifact);
      }
    } else if (nextScene.terminal === "fail") {
      solved = false;
      lastMessage = "This thread ends in loss.";
      if (isTimedLockNode(nodeId)) {
        return applyTimedFailureLock(nodeId, {
          ...current,
          sceneId: nextSceneId,
          flags: nextFlags,
          roleScores: nextRoleScores,
          choiceCount: current.choiceCount + 1,
          solved,
          outcomeRole,
          history: nextHistory,
          lastMessage,
          pendingRewards,
          winRewardHistory,
        }, story, now, nextSceneId, "This thread ends in loss. The story bars you out for a minute.");
      }
    } else if (nextScene.terminal === "adjudication" && nodeId === "PGE01") {
      outcomeRole = terminalOutcomeRole({
        ...current,
        roleScores: nextRoleScores,
      });
      lastMessage = "The Role draws near.";
    }
  }

  return {
    ...current,
    sceneId: nextSceneId,
    flags: nextFlags,
    roleScores: nextRoleScores,
    choiceCount: current.choiceCount + 1,
    lockedUntil: 0,
    lastFailureSceneId: "",
    solved,
    outcomeRole,
    history: nextHistory,
    lastMessage,
    pendingRewards,
    winRewardHistory,
  };
}

function renderAdventure(nodeId, context) {
  const story = storyForNodeId(nodeId);
  if (!story) {
    return `
      <article class="pge-node" data-node-id="${escapeHtml(nodeId)}">
        <section class="card"><p>Story payload missing.</p></section>
      </article>
    `;
  }

  const runtime = normalizeRuntime(context.runtime, story);
  const sceneLookup = scenesById(story);
  const currentScene = sceneLookup[runtime.sceneId];
  const activeRole = activePracticalGuideRoleFromState(context.state);
  const lockActive = hasActiveLock(nodeId, runtime, context && context.now ? context.now : Date.now());

  return `
    <article class="pge-node" data-node-id="${escapeHtml(nodeId)}">
      <section class="card pge-head">
        <h3>${escapeHtml(story.title)}</h3>
        <p>${escapeHtml(story.subtitle || "")}</p>
        <p class="muted">
          <strong>Active Role:</strong> ${escapeHtml(activeRole || "None")}
          &nbsp;|&nbsp;
          <strong>Choices Made:</strong> ${escapeHtml(String(runtime.choiceCount))}
        </p>
      </section>

      ${
        currentScene && !lockActive
          ? `
            <section class="card pge-scene">
              <p>${escapeHtml(currentScene.text || "")}</p>
            </section>
          `
          : ""
      }

      ${
        !lockActive && currentScene && currentScene.type === "decision"
          ? renderChoices(nodeId, currentScene, runtime, context, story)
          : ""
      }

      ${lockActive ? renderLockedPanel(nodeId, runtime, currentScene, context && context.now ? context.now : Date.now()) : renderTerminal(nodeId, story, runtime, currentScene)}
    </article>
  `;
}

function buildAdventureActionFromElement(nodeId, element) {
  const actionName = element.getAttribute("data-node-action");
  if (!actionName) {
    return null;
  }
  if (actionName === "pge-choose") {
    return {
      type: "pge-choose",
      choiceId: element.getAttribute("data-choice-id") || "",
      at: Date.now(),
    };
  }
  if (actionName === "pge-restart") {
    return {
      type: "pge-restart",
      at: Date.now(),
    };
  }
  if (actionName === "pge01-claim-role" && nodeId === "PGE01") {
    return {
      type: "pge01-claim-role",
      roleArtifact: element.getAttribute("data-role-artifact") || "",
      at: Date.now(),
    };
  }
  return null;
}

function createPgeNodeExperience(nodeId) {
  const story = storyForNodeId(nodeId);
  return {
    nodeId,
    initialState() {
      return createInitialRuntime(story);
    },
    render(context) {
      return renderAdventure(nodeId, context);
    },
    synchronizeRuntime(runtime, context = {}) {
      const normalized = normalizeRuntime(runtime, story);
      const incomingNonce = Math.max(0, Math.floor(Number(context.routeVisitNonce) || 0));
      const now = Math.max(0, Math.floor(Number(context.now) || Date.now()) || 0);
      const activeLock = hasActiveLock(nodeId, normalized, now);
      if (isTimedLockNode(nodeId) && normalized.lockedUntil > 0 && !activeLock) {
        return {
          ...createInitialRuntime(story),
          routeVisitNonce: incomingNonce,
          winRewardHistory:
            normalized.winRewardHistory && typeof normalized.winRewardHistory === "object"
              ? { ...normalized.winRewardHistory }
              : {},
          lastMessage: "The lock expires. The story starts again.",
        };
      }
      if (normalized.routeVisitNonce === 0) {
        return {
          ...normalized,
          routeVisitNonce: incomingNonce,
        };
      }
      if (normalized.routeVisitNonce !== incomingNonce) {
        if (activeLock) {
          return {
            ...normalized,
            routeVisitNonce: incomingNonce,
          };
        }
        if (!normalized.solved && normalized.choiceCount > 0) {
          return {
            ...createInitialRuntime(story),
            routeVisitNonce: incomingNonce,
            winRewardHistory:
              normalized.winRewardHistory && typeof normalized.winRewardHistory === "object"
                ? { ...normalized.winRewardHistory }
                : {},
            lastMessage: "Thread lost on exit. Story reset.",
          };
        }
        return {
          ...normalized,
          routeVisitNonce: incomingNonce,
        };
      }
      if (activeLock) {
        return normalized;
      }
      const currentScene = scenesById(story)[normalized.sceneId] || null;
      if (isTimedLockNode(nodeId) && currentScene && currentScene.type === "terminal" && currentScene.terminal === "fail") {
        return applyTimedFailureLock(nodeId, normalized, story, now, normalized.sceneId, "This thread ends in loss. The story bars you out for a minute.");
      }
      if (isTimedLockNode(nodeId) && currentScene && currentScene.type === "decision") {
        const { visibleChoices } = visibleChoiceData(currentScene, {
          ...context,
          runtime: normalized,
        }, story);
        if (!visibleChoices.length) {
          return applyTimedFailureLock(nodeId, normalized, story, now, normalized.sceneId, "No current opening survives your role and artifact spread. The story bars you out for a minute.");
        }
      }
      return normalized;
    },
    reduceRuntime(runtime, action, context) {
      return reduceAdventureRuntime(nodeId, runtime, action, context || {});
    },
    validateRuntime(runtime) {
      const normalized = normalizeRuntime(runtime, story);
      return Boolean(normalized.solved);
    },
    buildActionFromElement(element) {
      return buildAdventureActionFromElement(nodeId, element);
    },
  };
}

export const PGE01_NODE_EXPERIENCE = createPgeNodeExperience("PGE01");
export const PGE02_NODE_EXPERIENCE = createPgeNodeExperience("PGE02");
export const PGE03_NODE_EXPERIENCE = createPgeNodeExperience("PGE03");
export const PGE04_NODE_EXPERIENCE = createPgeNodeExperience("PGE04");
export const PGE05_NODE_EXPERIENCE = createPgeNodeExperience("PGE05");
export const PGE06_NODE_EXPERIENCE = createPgeNodeExperience("PGE06");
