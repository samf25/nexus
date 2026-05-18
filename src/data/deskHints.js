function fallbackHintsForNode(node) {
  return [node.hint_1, node.hint_2, node.hint_3]
    .map((hint) => String(hint || "").trim())
    .filter(Boolean);
}

export const DESK_HINT_OVERRIDES = Object.freeze({
  HUB01: Object.freeze([
    "This puzzle is about reconstruction: every shard has one correct cell and one correct orientation.",
    "Rotate pieces before you trust their position; a nearly-right shard will not feel right until its symbol, color, and edge cuts agree with its neighbors.",
    "Finish the full plate rather than reading individual fragments. The completed frontispiece gives the archive phrase you need next.",
  ]),
  HUB02: Object.freeze([
    "This version is not an icon sorting puzzle. It is a ring-alignment puzzle.",
    "Choose which ring is active, then rotate it in discrete ticks; only the final outer/inner wheel alignment matters.",
    "The solved bearing is reached by moving the outer ring two ticks and the inner ring one tick from their starting positions.",
  ]),
  HUB03: Object.freeze([
    "Do a complete sweep of the page. Anything with the shared hover/scan behavior is part of the puzzle.",
    "You are collecting ordered index fragments, not decoding a substitution alphabet.",
    "Record each revealed mark exactly once, then read the assembled index in its natural order.",
  ]),
  HUB04: Object.freeze([
    "Treat this as an orientation puzzle first and a reading puzzle second.",
    "Use the repeated symbols as anchors; once the field is aligned, the meaningful path is the one that stays consistent across all layers.",
    "Do not over-decode the decorative stars. The answer is produced by the aligned route through the marked constellation points.",
  ]),
  HUB05: Object.freeze([
    "The console is inert until the right artifact has been selected and scanned.",
    "Use Archive Address to wake the board, then open Constellation Order in the artifact panel to see what the six sockets are asking for.",
    "The six sockets want, in order: Worm, Prime Vault, Cradle, Hall of Proofs, Wandering Inn, and Mother of Learning.",
  ]),
  HUB06: Object.freeze([
    "This node is mostly about learning the Correspondence Desk, not solving a hidden cipher.",
    "Try each desk action once: inspect the active node, request a hint level, and notice which artifacts or locks the desk mentions.",
    "When stuck later, return here mentally: the desk exposes node-authored hints, lock reasons, and artifact dependencies.",
  ]),
  HUB07: Object.freeze([
    "The important phrase is split across UI text that looks like flavor at first.",
    "Read the same class of fragments in the same order every time; mixing headings, captions, and labels will scramble the phrase.",
    "The final input is a fog phrase. Normalize spaces and punctuation, but do not change the words you extracted.",
  ]),
  HUB08: Object.freeze([
    "The fog lattice is a final inventory check as much as a puzzle.",
    "Four sockets must be filled before the last exchange matters: Restart Token, Ledger Key, Lemma of implication, and Mod Wheel.",
    "After the sockets are live, spend the madra, sacrifice the Worm cape, and submit THE FOG REMEMBERS.",
  ]),

  CRD01: Object.freeze([
    "Follow the pulse instead of clicking as fast as possible.",
    "Each successful timing window seeds the next path; missing one usually means waiting for the rhythm to come around again.",
    "If the route feels random, slow down and click only on the bright beat rather than between beats.",
  ]),
  CRD02: Object.freeze([
    "Madra generation is a loop: collect, spend, improve the loop, then collect faster.",
    "Prioritize upgrades that either increase passive flow or make each manual cycle more efficient before buying luxury progress.",
    "Breakthrough checks are easier after the well is stable; do not spend your last resources right before attempting one.",
  ]),
  CRD03: Object.freeze([
    "The aura board rewards matching aspect to region, not just filling every slot.",
    "Read the small labels around each region and place aspects where their behavior would naturally resonate.",
    "If one aspect refuses to settle, swap it with the most similar-looking wrong placement rather than rebuilding the whole map.",
  ]),
  CRD04: Object.freeze([
    "This is a survival-and-tempo node: winning cleanly matters more than spending every action aggressively.",
    "Use defensive or recovery options before your health falls into burst range; the later rounds punish greedy openings.",
    "Treat each fight as a resource puzzle. Save your strongest option for the opponent who can actually stop the run.",
  ]),
  CRD05: Object.freeze([
    "The duel is about sequencing. Do not throw your finisher before the enemy has committed.",
    "Alternate pressure with control; a turn spent preventing damage is often worth more than a small hit.",
    "Watch the enemy's state text. The safest attack windows come immediately after you disrupt or exhaust them.",
  ]),
  CRD06: Object.freeze([
    "You are not meant to simply out-damage the duel. Build a stable rhythm first.",
    "Use cycling and defensive tools to survive the dangerous turns, then convert the opening into damage.",
    "When the fight stalls, check whether you are missing a state setup rather than another raw attack.",
  ]),
  CRD07: Object.freeze([
    "Nightwheel Valley has two requirements: hunt materials from this node and revelation artifacts from outside this node.",
    "The four local materials are Nightwheel Ember Lotus, Moonwell Pearl, Stormforged Scale, and Dreadbeast Core. The three Underlord revelation artifacts come from Practical Guide endings.",
    "Get Underlord Revelation I from PGE02, Underlord Revelation II from PGE03, and Underlord Revelation Cipher from PGE04; then enter: I rise so I am no longer cast aside.",
  ]),
  CRD08: Object.freeze([
    "The tournament is a gauntlet, so preserve health and resources across fights.",
    "Read each opponent's warning text before choosing your opener; the correct response changes from round to round.",
    "If you can consistently win early rounds but lose late, upgrade survivability or control rather than only increasing damage.",
  ]),
  CRD09: Object.freeze([
    "Lord-realm progress depends on preparation outside the immediate click target.",
    "Make sure your advancement state and revelation-style artifacts are caught up before trying to force the ascent.",
    "The final checks reward a complete path: prior realm, supporting resources, and the correct personal statement all have to agree.",
  ]),
  CRD10: Object.freeze([
    "This pilgrimage is a route planner. Choices that look like flavor can change what later gates accept.",
    "Track which oaths, insights, and materials your route produces; do not assume every branch leads to the same advancement proof.",
    "When blocked, compare the gate's missing requirement against your route history rather than repeating the final action.",
  ]),
  CRD11: Object.freeze([
    "Each dreadgod-style hunt has its own danger profile and reward pattern.",
    "Prepare before starting the next hunt: upgrades, defensive tools, and leftover resources matter more than speed.",
    "If one hunt seems impossible, farm the safer hunts first and come back with the artifact or stat the hard fight is checking.",
  ]),

  LOG01: Object.freeze([
    "Translate the gate labels into truth conditions before touching switches.",
    "Work from the smallest gate outward: NOT first, then AND/OR, then the final output.",
    "The correct switch pattern is the one that makes the whole circuit true, not the one that makes every intermediate lamp light.",
  ]),
  LOG02: Object.freeze([
    "Separate facts from implications before filling the witness grid.",
    "A row is only confirmed when it satisfies every visible condition; near-matches are traps.",
    "Use elimination: mark impossible witnesses first, then the remaining consistent row gives the needed entry.",
  ]),
  LOG03: Object.freeze([
    "Treat each clause as a constraint on the same small set of propositions.",
    "Unit clauses and contradictions are your fastest anchors; propagate them before trying random assignments.",
    "There is a complete satisfying assignment. Once you find it, read the designated true variables in the requested order.",
  ]),
  LOG04: Object.freeze([
    "Modal symbols talk about worlds connected by arrows, not about the current world alone.",
    "A box statement must hold in every accessible world; a diamond statement only needs one accessible witness.",
    "Evaluate the accessibility graph first, then test the formulas world by world.",
  ]),
  LOG05: Object.freeze([
    "Quantifier order matters. 'For every' followed by 'there exists' is not interchangeable with the reverse.",
    "Use the domain entries as witnesses: universals must survive all entries, existentials only need one.",
    "When two statements look similar, test the counterexample that would make only one of them fail.",
  ]),
  LOG06: Object.freeze([
    "This node wants valid inference steps, not just a plausible final claim.",
    "Name the rule each line uses: modus ponens, contraposition, conjunction, disjunction, or contradiction-style reasoning.",
    "If a proof line cannot be justified from earlier lines, move it later or replace it with the missing intermediate step.",
  ]),

  MOL01: Object.freeze([
    "This is a memory loop. The sequence is stable even when the display resets.",
    "Write down the revealed symbols between attempts; the node rewards accumulation across loops.",
    "Replay the full sequence from the start after each new reveal rather than only entering the newest symbol.",
  ]),
  MOL02: Object.freeze([
    "Resetting is progress here. A failed loop can still leave you with better information or resources.",
    "Choose a focused objective before each loop instead of trying to touch every system at once.",
    "Spend permanent loop gains on options that shorten future setup; then use the new route to reach the locked outcome.",
  ]),
  MOL03: Object.freeze([
    "The prestige lattice is about dependencies: some upgrades only become good after their parents are active.",
    "Buy broad unlocks before narrow multipliers if you are stuck at the same ceiling every loop.",
    "The end state usually requires a connected chain through the lattice, not isolated expensive nodes.",
  ]),

  NUM01: Object.freeze([
    "Think in remainders. The clock face is arithmetic modulo a fixed cycle.",
    "Add or subtract full turns whenever a number looks too large; only its residue matters.",
    "Line up the requested residues in order, then read the marked positions rather than the raw numbers.",
  ]),
  NUM02: Object.freeze([
    "Prime structure is the key: factor first, then solve.",
    "Repeated prime factors carry extra information; do not collapse them too early.",
    "Once the factorization is clean, the lock values fall out from the prime powers, not from trial-and-error.",
  ]),
  NUM03: Object.freeze([
    "This is a Bezout/gcd puzzle before it is a number-entry puzzle.",
    "Find integer coefficients that combine the two displayed numbers into their gcd.",
    "Use the Bezout coefficients to build the requested certificate; signs matter, but equivalent certificates can differ by a full multiple.",
  ]),
  NUM04: Object.freeze([
    "Count the numbers that remain coprime to the modulus.",
    "Factor the modulus first; Euler's phi is much faster than listing everything by hand.",
    "After computing phi for each component, use the requested residues or exponents with the reduced cycle length.",
  ]),
  NUM05: Object.freeze([
    "Separate the public information from the private key material.",
    "The totient-like value is what lets you invert the exponent; factoring is the hidden step.",
    "After you find the inverse exponent, decrypt by modular exponentiation and translate the resulting numbers in order.",
  ]),
  NUM06: Object.freeze([
    "Each line tells you a remainder condition for the same unknown number.",
    "Combine two congruences at a time, always keeping the growing modulus with the combined residue.",
    "The final answer is the smallest nonnegative number satisfying every displayed congruence.",
  ]),

  ALG01: Object.freeze([
    "Permutation composition has an order. Decide whether the rightmost or leftmost move acts first before calculating.",
    "Track one symbol all the way through the chain, then repeat for the remaining symbols.",
    "Write the final map as cycles only after every element's destination is known.",
  ]),
  ALG02: Object.freeze([
    "The dihedral moves are rotations and flips of the same object.",
    "Reduce long rotation strings modulo the number of sides before combining them with reflections.",
    "A reflection changes the direction of subsequent rotations; that is usually where wrong answers come from.",
  ]),
  ALG03: Object.freeze([
    "A homomorphism must preserve the operation, not just send named elements to attractive targets.",
    "Check the generators first; once their images are valid, the rest of the table is forced.",
    "The kernel is the set that maps to the identity. Find it before deciding what structure is being mirrored.",
  ]),
  ALG04: Object.freeze([
    "Subgroups are closed worlds. Every selected element must stay inside after combining with every other selected element.",
    "Use divisibility and generated elements to narrow the lattice instead of testing arbitrary subsets.",
    "The correct lattice has inclusion arrows only where no intermediate subgroup sits between the two nodes.",
  ]),
  ALG05: Object.freeze([
    "Separate addition behavior from multiplication behavior.",
    "Units have multiplicative inverses; zero divisors multiply with something nonzero to give zero.",
    "Classify the ring elements first, then use that classification to open the workshop locks.",
  ]),
  ALG06: Object.freeze([
    "An action is consistent only if the identity acts trivially and products act like consecutive moves.",
    "Find orbits by repeatedly applying the generators; find stabilizers by asking which moves leave a point fixed.",
    "Use orbit-stabilizer as a check: orbit size times stabilizer size should match the group size for that point.",
  ]),

  GEO01: Object.freeze([
    "Curvature is concentrated where the angles fail to add up as expected.",
    "Measure the defect at each marked vertex before trying to read the whole surface.",
    "The global answer comes from summing local defects, not from averaging the visible shapes.",
  ]),
  GEO02: Object.freeze([
    "An atlas is a set of overlapping coordinate charts.",
    "Compare the same point in two charts; the transition map is the rule that converts one coordinate description into the other.",
    "The valid transition is the one that works throughout the overlap, not just at a single sample point.",
  ]),
  GEO03: Object.freeze([
    "Follow the arrows as a vector field, not as a maze wall.",
    "Look for fixed points, flow direction, and whether nearby arrows spiral, source, sink, or pass through.",
    "The marked trajectory is the path tangent to the arrows at every step.",
  ]),
  GEO04: Object.freeze([
    "A tangent vector is local: it tells you an allowed instantaneous direction at one point.",
    "Match each courier move to the tangent space at its current location before transporting it onward.",
    "If a vector suddenly points off the surface, project or translate it using the chart's local basis.",
  ]),
  GEO05: Object.freeze([
    "Topological sameness ignores stretching but not cutting, gluing, or punching holes.",
    "Count connected components, boundary components, and holes before trusting the drawing.",
    "The lantern accepts the invariant that survives all allowed deformations.",
  ]),
  GEO06: Object.freeze([
    "The cartographer's problem is to reconcile local maps into one manifold picture.",
    "Check each overlap for consistent orientation and coordinate conversion.",
    "The final chart order is the one where every neighboring overlap agrees without reversing an impossible edge.",
  ]),

  TWI01: Object.freeze([
    "The ledger is a careful-reading puzzle. The blanks are not interchangeable.",
    "Match each guest to the clue that uniquely identifies them, then fill the cells using exact text from the ledger.",
    "If two guests seem possible, use the clue that mentions timing, species, room, or food preference to break the tie.",
  ]),
  TWI02: Object.freeze([
    "Treat the map as regions with relationships, not as a freehand geography quiz.",
    "Use named roads, coasts, and neighboring territories to anchor uncertain labels.",
    "Place the obvious regions first; the remaining empty spaces become constrained by adjacency.",
  ]),
  TWI03: Object.freeze([
    "The inn systems reward balanced progress: reputation, supplies, and quests support each other.",
    "Do not spend every resource on one upgrade path if the next quest is asking for a different kind of proof.",
    "When a quest will not complete, check whether it wants an earned artifact, a guest state, or a specific inn upgrade.",
  ]),
  TWI04: Object.freeze([
    "Construction is an economy puzzle: income, materials, and upgrade slots all bottleneck different stages.",
    "Buy upgrades that increase future production before chasing expensive cosmetic or one-off improvements.",
    "If the project stalls, look for the missing prerequisite building rather than repeating the same gathering action.",
  ]),

  AA01: Object.freeze([
    "Start by stabilizing the attunement rather than forcing the strongest-looking option.",
    "The node cares about matching rune, mana, and function; mismatched power is still unstable power.",
    "Once the starter attunement is clean, use the resulting artifact as your proof for the next Arcane Ascension node.",
  ]),
  AA02: Object.freeze([
    "The tower route is gated by both resource checks and correct room choices.",
    "Use the early rooms to gather safe crystals and information before spending charges on risky doors.",
    "If a later chamber refuses you, leave with better gear or a clearer attunement path rather than brute-forcing the same route.",
  ]),
  AA03: Object.freeze([
    "Crafting checks recipe logic: base item, rune, and power source must all agree.",
    "Inspect what each component contributes before combining them; some parts are catalysts, not final ingredients.",
    "Build the item whose effect answers the node's stated obstacle, then socket it instead of carrying unused materials.",
  ]),

  WORM01: Object.freeze([
    "Build a small reliable cape deck before chasing flashy late-game effects.",
    "Read each cape's role: some are damage, some control the enemy plan, and some protect the team long enough to win.",
    "A legal team with complementary roles is stronger than a team of individually powerful but overlapping capes.",
  ]),
  WORM02: Object.freeze([
    "Arena fights are resource puzzles. Do not spend your best action into a shielded or low-value turn.",
    "Use control before burst against enemies that telegraph a dangerous move.",
    "Farm lower-risk fights when the next bracket is gated by cape count, shard state, or missing rewards.",
  ]),
  WORM03: Object.freeze([
    "The Endbringer-style fight asks you to manage inevitability, not just win a damage race.",
    "Save defensive and interruption effects for the telegraphed disaster turns.",
    "If Leviathan keeps overwhelming you, improve team durability and tempo before adding more fragile damage.",
  ]),
  WORM04: Object.freeze([
    "Cleanup fights punish narrow teams. Bring answers to multiple threat types.",
    "Remove or disable the enemy that snowballs first, even if another target has lower health.",
    "The Slaughterhouse-style encounters are easier when you combine control, focus fire, and one emergency defensive line.",
  ]),
  WORM05: Object.freeze([
    "Simurgh pressure is about delayed consequences. Watch for effects that punish your next choices.",
    "Avoid overcommitting after a warning turn; leave enough resources to respond to the follow-up.",
    "The winning line usually alternates stabilization and burst instead of trying to race every phase.",
  ]),
  WORM06: Object.freeze([
    "National cleanup checks your whole roster, not just your favorite cape pair.",
    "Rotate teams so you are not entering late fights exhausted or under-equipped.",
    "Use broad defensive rewards and roster upgrades before attempting the hardest civic fights.",
  ]),
  WORM07: Object.freeze([
    "Behemoth punishes standing still and trading evenly.",
    "Respect the turns that telegraph area damage; mitigation and repositioning are worth more than chip damage there.",
    "The clean win comes from surviving the big pulses and spending your saved burst during the exposed windows.",
  ]),
  WORM08: Object.freeze([
    "The Scion node is an endgame inventory and roster check.",
    "Bring the three Endbringer sigils and a team plan that can survive multiple phases.",
    "Do not trigger the finale until your cape count, sigils, and defensive tools are all ready; the fight expects a completed Worm arc.",
  ]),

  DCC01: Object.freeze([
    "Gear matters before the crawl starts. Equip run-limited items intentionally, because the run itself is not the place to rethink every slot.",
    "For horde combat, do not only spam Basic Attack: manage stamina, block, range, and enemy intent while using crowd tools like Pocket Sand, Door Kicking, bombs, or Sponsor Blast when they fit the room.",
    "Spend gold and upgrades between floors on the bottleneck that is actually killing you: Max HP for burst deaths, stamina for empty turns, ability slots for tactical flexibility, and loot rarity if you are stable but under-geared.",
  ]),

  PGE01: Object.freeze([
    "The Practical Guide arc starts by establishing what kind of story role you are playing.",
    "Pick a role and then make choices that match that role's logic; inconsistent genre behavior is punished later.",
    "The role artifact you earn here is a key for the later PGE adventures, so do not treat the first node as optional flavor.",
  ]),
  PGE02: Object.freeze([
    "The siege has multiple endings, and the reward depends on which story logic you satisfy.",
    "For the Cradle Nightwheel requirement, pursue the fortress/Rule-of-Three style victory rather than the villain or culvert alternatives.",
    "The Underlord Revelation I route is the Last Gate ending: align the defenders, use the siege relics correctly, and make the gate stand.",
  ]),
  PGE03: Object.freeze([
    "The Winter Court node is a knife-game: the right ending depends on court role and evidence, not random guessing.",
    "For the Cradle Nightwheel requirement, look for the Archer/Mirror route rather than the legal or rumor endings.",
    "Underlord Revelation II comes from the mirror-and-shot resolution: secure the mirror evidence and use the archer line to expose the usurper.",
  ]),
  PGE04: Object.freeze([
    "The tomb has several relic-gated endings. Keep track of every artifact you pick up inside the adventure.",
    "For the Cradle Nightwheel requirement, use the Warlock route and collect the Sunless Lantern, Bone Key, and River-Map before committing to the throne resolution.",
    "Underlord Revelation Cipher is awarded by the full relic tomb ending, not by the faster side exits.",
  ]),
  PGE05: Object.freeze([
    "The mercy march is about narrative consistency under pressure.",
    "Choose the route that matches your declared role and preserves the group resource the scene keeps emphasizing.",
    "If the ending feels close but wrong, check which named promise, relic, or witness you abandoned earlier in the march.",
  ]),
  PGE06: Object.freeze([
    "The later Guide node expects you to remember the story roles established across the earlier adventures.",
    "Track which endings produced which artifacts; the node is asking for a coherent set, not every possible prize.",
    "When the final choice branches, pick the option whose story logic matches the artifacts you actually earned.",
  ]),

  FIN01: Object.freeze([
    "This is a convergence check. It is supposed to feel like many earlier systems are being audited at once.",
    "Before trying the final phrase, make sure the major arc artifacts are actually socketed or recognized where the finale expects them.",
    "If the ending refuses to open, the missing piece is probably an unfinished arc dependency, not a typo in the final interaction.",
  ]),
});

export function deskHintsForNode(node) {
  const nodeId = String(node && node.node_id ? node.node_id : "");
  const override = DESK_HINT_OVERRIDES[nodeId];
  if (Array.isArray(override) && override.length) {
    return override.slice(0, 3);
  }
  return fallbackHintsForNode(node || {});
}
