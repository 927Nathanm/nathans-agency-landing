// Fully self-contained golf analysis engine — no external API required.

export interface AnalysisRequest {
  messages: Array<{ role: string; content: string }>
  hasFrame1: boolean
  hasFrame2: boolean
  frameTime?: number
}

// ─── Intent detection ─────────────────────────────────────────────────────────

type Intent =
  | 'annotate'
  | 'fault'
  | 'drill'
  | 'position'
  | 'analyze'
  | 'compare'
  | 'shortgame'
  | 'putting'
  | 'mental'
  | 'equipment'
  | 'general'

function detectIntent(text: string): Intent {
  const t = text.toLowerCase()
  if (/draw|mark|annotate|show (me |the )?(line|plane|angle|path|arc)|highlight|circle|arrow/.test(t)) return 'annotate'
  if (/over.the.top|casting|chicken wing|reverse pivot|sway|hanging back|cupped|loss of posture|slice|hook|shanking|thin|fat|chunk|topped|early release|ott/.test(t)) return 'fault'
  if (/drill|practice|exercise|fix|correct|how (do|can) i|what (should|can) i do|tip/.test(t)) return 'drill'
  if (/setup|address|takeaway|backswing|top of|transition|downswing|impact|follow.through|finish|p[1-9]/.test(t)) return 'position'
  if (/compare|difference|better|worse|video 1|video 2|left.*right|before.*after/.test(t)) return 'compare'
  if (/chip|pitch|bunker|sand|wedge|short game|lob/.test(t)) return 'shortgame'
  if (/putt|green|read|roll|break/.test(t)) return 'putting'
  if (/nervous|pressure|mental|focus|confidence|yips|anxiety|routine/.test(t)) return 'mental'
  if (/shaft|flex|loft|fitting|club|driver|iron|hybrid|length/.test(t)) return 'equipment'
  return 'analyze'
}

function extractTopic(text: string): string {
  const t = text.toLowerCase()
  if (/over.the.top|ott/.test(t)) return 'over_the_top'
  if (/casting|early release/.test(t)) return 'casting'
  if (/chicken wing/.test(t)) return 'chicken_wing'
  if (/reverse pivot/.test(t)) return 'reverse_pivot'
  if (/sway/.test(t)) return 'sway'
  if (/hanging back/.test(t)) return 'hanging_back'
  if (/cupped/.test(t)) return 'cupped_wrist'
  if (/loss of posture|stand up/.test(t)) return 'loss_of_posture'
  if (/slice/.test(t)) return 'slice'
  if (/hook/.test(t)) return 'hook'
  if (/setup|address/.test(t)) return 'setup'
  if (/takeaway/.test(t)) return 'takeaway'
  if (/backswing/.test(t)) return 'backswing'
  if (/top of|p4/.test(t)) return 'top'
  if (/transition/.test(t)) return 'transition'
  if (/downswing/.test(t)) return 'downswing'
  if (/impact|p6/.test(t)) return 'impact'
  if (/follow.through/.test(t)) return 'follow_through'
  if (/finish/.test(t)) return 'finish'
  if (/hip/.test(t)) return 'hips'
  if (/shoulder/.test(t)) return 'shoulders'
  if (/wrist/.test(t)) return 'wrists'
  if (/grip/.test(t)) return 'grip'
  if (/posture|spine/.test(t)) return 'posture'
  if (/lag/.test(t)) return 'lag'
  if (/club path|path/.test(t)) return 'club_path'
  if (/swing plane|plane/.test(t)) return 'swing_plane'
  if (/tempo|rhythm/.test(t)) return 'tempo'
  if (/weight|transfer|shift/.test(t)) return 'weight_transfer'
  if (/rotation|turn/.test(t)) return 'rotation'
  return 'general'
}

// ─── Response library ─────────────────────────────────────────────────────────

const RESPONSES: Record<string, string[]> = {
  // ── Full swing analysis ──────────────────────────────────────────────────
  analyze_with_frame: [
    `**Full Swing Analysis**

Looking at your swing at this position, here's what I'm evaluating:

**Phase:** Determining P-position based on club and body relationship

**Key Checkpoints I'm Assessing:**
- **Spine angle** — Is it maintained from address through impact? Most amateurs lose 2-4° of spine angle during the downswing, causing thin or topped shots.
- **Hip/shoulder separation** — The X-factor (shoulder rotation relative to hip rotation) should peak just after transition begins. Elite players get 45-55° of separation here.
- **Trail arm position** — The trail elbow should be tucked and below the lead arm in the downswing. If it's flying out, that's your over-the-top move starting.
- **Weight distribution** — Should be shifting toward the lead foot from P5 onward.

**What to Look For:**
If your shots are going right (for a right-hander), check the face angle at impact — it's likely 5-8° open. If they're going left and low, check for early extension where the hips bump forward instead of rotating.

**Next Steps:**
Send me a specific question about what's feeling off — like "my hips" or "my backswing" — and I'll give you a targeted fix with a drill.`,

    `**Swing Analysis**

Here's my breakdown based on what I'm seeing at this timestamp:

**Phase Identification:**
At this point in the swing, I'm looking at the relationship between the lead arm, the club shaft, and your spine angle to determine P-position.

**The Three Pillars I'm Checking:**

1. **Kinematic Sequence** — The correct order is: hips → shoulders → lead arm → club head. Any break in this chain (like shoulders beating the hips) is almost always the root cause of inconsistency.

2. **Lag Retention** — The wrist-to-shaft angle should still be visible at P5 (lead arm parallel to ground on the downswing). Early release here costs 15-25 mph of club head speed.

3. **Path vs. Face** — Ball flight is caused by path and face angle at impact. A 5° outside-in path with a square face = straight pull. Same path with face 3° right of target = pull-fade (slice shape).

**Common Issues at This Stage:**
- Trail shoulder getting "stuck" (over-the-top move)
- Hips sliding rather than rotating
- Loss of secondary spine tilt (leaning away from target too early)

Ask me about any specific fault or position and I'll walk through the fix and the drills that work best.`,
  ],

  analyze_no_frame: [
    `**Swing Coaching Session**

Without a video frame to analyze directly, let me help you self-diagnose. Tell me more about:

1. **Ball flight** — What does the shot typically do? (Slice, hook, push, pull, straight?)
2. **Contact quality** — Fat, thin, toe, heel, or solid?
3. **What it feels like** — Any specific sensation that feels off?

**The Most Common Root Causes (in order of frequency):**

1. **Setup** (~35% of issues) — Poor grip, ball position, or posture creates compensations that cascade through the swing. Fix the setup and many problems disappear.

2. **Over-the-top transition** (~25%) — Shoulders initiating before hips finish their "bump." Creates out-to-in path, leading to slices and pulls.

3. **Early release/casting** (~20%) — Unhinging the wrists before impact. Kills lag, reduces speed, causes fat/thin contact.

4. **Reverse pivot** (~15%) — Weight going to lead side on backswing, trail side on follow-through. Causes huge inconsistency.

5. **Grip/face** (~5%) — Strong or weak grip causing face angle issues at impact.

What's your most common miss? I'll build a diagnosis from there.`,

    `**Golf Analysis — Let's Get Started**

I'm ready to analyze your swing. Here's how to get the most out of our session:

**For the best analysis**, capture a frame while your swing is paused at a key position. The most diagnostic positions are:
- **P4 (top of backswing)** — Reveals wrist hinge, shoulder rotation, and position
- **P5 (lead arm parallel on downswing)** — Shows lag retention and slot
- **P6 (impact)** — The moment of truth — shows shaft lean, hip rotation, and face

**Quick Self-Assessment:**
Answer these and I can pinpoint your likely fault:

- Do you slice more than hook?
- Does the ball go straight but higher/lower than expected?
- Do you feel like you're "swinging hard but not hitting far"?
- Where on the face do you typically make contact?

The relationship between your answers reveals the underlying pattern. A slicer who hits it high is doing something very different from a slicer who hits it low.`,
  ],
The club head should track along the target line — not inside it, not outside it. A common error is pulling the club immediately inside, which forces an over-the-top move on the way down.

**Club Face at P2 (Hip High):**
When the club is parallel to the ground, the leading edge of the club face should roughly mirror your spine angle. For most setups, that's 45° or slightly more "open" to the ground — not vertical (too open), not flat-face (too closed).

**Wrist Action:**
Wrists should stay *relatively* quiet until the club reaches hip height, then begin their natural hinge. Forcing an early wrist hinge (the "one-piece takeaway" error) disrupts the width and timing.

**Triangle Maintenance:**
The triangle formed by your shoulders, arms, and hands should stay intact through the first phase. Imagine a large ball between your forearms — keep it trapped.

**Connection Point:**
The lead arm should stay connected to the chest through impact. A drill: put a glove or towel under the lead armpit. If it falls before hip height, you've disconnected too early.

**Common Takeaway Faults:**
- **Too inside:** Club head goes behind right hip immediately → over-the-top downswing
- **Too outside:** Pushes the shaft across the target line → trapped, blocked shots
- **Fanning open:** Lead wrist cups immediately → open face through impact`,
  ],

  backswing: [
    `**Backswing Analysis (P2 → P4)**

**Shoulder Rotation:**
Target: 90° for irons, up to 100° for driver. Under-rotation (common in beginners and seniors) means you can't store energy. Over-rotation usually causes loss of posture.

**Hip Rotation vs. Resistance:**
Hips should rotate 45°. Here's the key: you *want* resistance between hip turn (45°) and shoulder turn (90°). That "X-factor" gap is what stores elastic energy for your downswing. Letting the hips turn too far (60°+) kills the coil.

**Weight Transfer:**
By the top, 70-80% of weight should be on the trail side. You should feel pressure in the *inside* of the trail foot, not the outside edge (if you feel pressure on the outside, you're swaying, not turning).

**Wrist Hinge:**
Should be complete at the top. The shaft-to-forearm angle should be 90° — no more, no less. A "flat" wrist hinge (less than 90°) means you're still hinging coming down, creating timing issues. Too much hinge creates a "crossing the line" issue.

**Lead Arm:**
Relatively straight — not rigid. A gentle bend is fine. A significantly bent lead arm shortens your arc, reduces distance, and makes club head position inconsistent.

**Top Position Checklist:**
- Club shaft: parallel to ground or slightly past (slightly past-parallel is fine)
- Lead wrist: flat to slightly bowed (not cupped)
- Head: behind the ball, slight tilt away from target
- Trail knee: flex maintained — not locked or kicked inward
- Lead knee: moderate flex, pointing between ball and trail foot`,
  ],

  transition: [
    `**Transition Analysis — The Most Critical Phase**

Transition is where tour pros separate themselves from amateurs. This fraction of a second determines everything about the downswing.

**The Correct Sequence:**
Lower body LEADS before the upper body finishes its backswing. This is counterintuitive, but the hips should begin their lateral bump toward the target while the shoulders are still completing rotation.

**The Lateral Bump:**
Hips move 2-4 inches toward the target before rotation begins. This drops the trail shoulder slightly and automatically puts the club "in the slot." Skip this and the shoulders beat the hips — classic over-the-top.

**X-Factor Stretch:**
As the hips begin forward, the shoulders are still going back. This stretches the lead-side muscles like a coiled spring. The energy release from this stretch is responsible for 40-50% of club head speed. You'll feel it in the left oblique/lat region.

**Trail Elbow Drop:**
As the transition starts, the trail elbow should drop down and into the body (into the "slot"). This automatically shallows the club and promotes an inside-out or neutral path.

**The "Squat":**
Watch any tour player in slow motion at transition — they appear to squat slightly (hips drop 1-2 inches) before explosively extending toward impact. This is the "ground force" move that elite players use to gain extra speed.

**Drill: The Step Drill**
Pause at the top. Step your lead foot toward the target and simultaneously bring your arms down. Then complete the shot. This feels the correct sequence of lower-then-upper and resets faulty transition habits.`,
  ],

  downswing: [
    `**Downswing Analysis (P4 → P6)**

**The Sequence (Critical):**
Hips → Shoulders → Arms → Club Head. Any deviation from this sequence costs speed and accuracy. Specifically: if your shoulders are leading your hips, you're "over the top" — the single most common fault in amateur golf.

**Hip Clearance:**
By impact, hips should be open 40-45° to the target line. At address they were square. Most amateurs only achieve 20-25° of clearance because they stop rotating and push with the arms instead.

**The Slot:**
"Getting in the slot" means the club is approaching from inside the target line, with the trail elbow close to the right hip. Visual cue: if you paused at P5 (lead arm parallel on the way down), the shaft should be roughly parallel to the address shaft plane or slightly shallower.

**Lag Maintenance:**
The wrist-to-shaft angle should be maintained until the hands pass the right hip. Releasing this angle early (casting) is the #1 speed killer. You should feel like you're "holding the angle" as long as possible, then releasing explosively through the ball.

**Shaft Lean at Impact:**
Hands need to be ahead of the club face at impact — typically 1-2 ball widths for irons. This creates forward shaft lean, which reduces the loft, creates compression, and produces that "pure" iron shot sound.

**Speed Source:**
Ball striking speed comes from: ground forces (40%) + hip rotation (25%) + shoulder rotation (20%) + arm/wrist release (15%). Most amateurs try to generate all speed with arms and get only 40% of their potential.`,
  ],

  impact: [
    `**Impact Analysis (P6)**

Impact is the only position that objectively matters — but it's too fast to consciously control. It's the result of everything that happened before it.

**The Perfect Impact Positions:**

**Hands:** Ahead of the ball by 1-2 ball widths for irons. This creates the forward shaft lean that compresses the ball. For driver, hands are roughly level with the ball or slightly behind (ascending strike).

**Hips:** 40-45° open to the target line. Hips have fired through; this is what "clearing" means. If the hips are square or only slightly open at impact, arms are doing all the work.

**Lead Leg:** Straightening but not fully locked. The "straight lead leg" at impact is a result of the sequence, not something you consciously force. Forcing it locks the hips early.

**Lead Wrist:** Flat to slightly bowed (flexed). A cupped lead wrist at impact opens the face. You can check this by filming face-on and looking at the left wrist crease — it should be flat or concave.

**Trail Heel:** Beginning to lift. Weight is transferring to lead foot; you should feel 70% on the lead side at impact.

**Club Face:** Square to 2° closed relative to the target line. The path-to-face relationship determines curvature: face open relative to path = fade/slice; face closed relative to path = draw/hook.

**The Impact Bag Drill:**
Hit an impact bag or stuff a duffel bag with towels. Train your hands-ahead, hips-open position at the moment of contact. This builds the correct muscular pattern without timing worries.`,
  ],

  follow_through: [
    `**Follow-Through Analysis (P7 → P8)**

**The Mirror of the Backswing:**
The follow-through should be a mirror image of your takeaway. The club head arc goes through the ball, not at it. If you feel like you're "hitting at" the ball rather than "swinging through" it, your follow-through is probably short and chicken-winged.

**Extension:**
Full arm extension through the ball. At P7 (lead arm parallel on follow-through), both arms should be fully extended — not the lead arm bent (chicken wing) and not the trail arm short.

**Rotation:**
Your chest should face the target or slightly left of it. If you're finishing with your chest facing right of target (for a right-hander), rotation stopped at or before impact.

**Release:**
The trail forearm should rotate over the lead forearm through impact — this is the "release." Think of it as the natural consequence of unhinging your wrists and letting the arms swing. Don't force it, just don't block it.

**Chicken Wing (Lead Elbow Bend):**
This is usually caused by: (1) blocking the release with an overly strong grip, (2) not rotating the torso through impact, or (3) a weak left side not pulling the club through.

**Fix Drill — Forearm Rotation:**
Take slow-motion practice swings focusing on the trail forearm rotating over the lead forearm at the point of contact. Feel the club head passing the hands naturally. Do this 50x in front of a mirror before hitting balls.`,
  ],

  finish: [
    `**Finish Position Analysis**

**The Finish Is a Diagnostic:**
Your finish position tells me everything about your swing. Tour pros can hold a perfect finish for 3+ seconds because momentum placed them there naturally. A stumble, stagger, or off-balance finish means something in the sequence forced a compensation.

**The Ideal Finish:**
- **Weight:** 90-95% on the lead foot, rolled to the outer edge of the lead foot
- **Trail foot:** Up on the toe, heel fully raised and pointing skyward
- **Hips:** Fully rotated, belt buckle facing target or slightly left
- **Shoulders:** Chest facing target or left of target
- **Hands:** High finish — hands above the left shoulder (right-hander), club behind the head
- **Spine:** Vertical or even slightly tilted toward target (reverse "C" is fine, excessive is not)

**Balance Test:**
You should be able to hold your finish position comfortably for 3 seconds without shifting or stepping. If you can't, identify which direction the imbalance is pulling:
- **Falling toward target:** Ball position too far forward, or hips sliding instead of rotating
- **Falling back:** Hanging back, not transferring weight
- **Losing balance sideways:** Sway on the backswing not corrected

**High Hands:**
A high finish is a consequence of full rotation and arm extension. Low hands at finish typically indicate restricted hip rotation — the body "ran out of room" and the hands couldn't get up.`,
  ],

  hips: [
    `**Hip Mechanics Analysis**

The hips are the engine of the golf swing. They generate ground forces and sequence the entire kinematic chain.

**Backswing Hip Rotation:**
Target: 45° of hip turn (not 0°, not 60°). Restricted hip turn (common with limited mobility) forces the arms to lift and creates a steep plane. Too much turn eliminates the coil/X-factor that stores power.

**Mobility Check:**
Can you rotate your hips 45° while maintaining your spine angle and knee flex? Many golfers who "slice" have tight hip flexors that prevent proper rotation and cause the lower body to bail out (slide instead of rotate).

**The Bump-Then-Turn Sequence:**
On the downswing: 2-4" lateral hip shift toward target FIRST, then rotation. Skipping the bump means the upper body outpaces the lower body. The bump also drops the trail shoulder, which shallows the swing plane automatically.

**Hip Clearance at Impact:**
Hips should be 40-45° open at impact. Most amateurs arrive at only 20-25° open because they stop rotating and push with the arms. Result: club comes from outside the target line (over-the-top).

**Drills:**
1. **Chair drill:** Place a chair to your trail side and practice swinging without bumping into it — forces rotation instead of lateral slide.
2. **Step-through drill:** After impact, let the trail foot step forward. Forces full hip rotation.
3. **Belt buckle drill:** Think "belt buckle to target" at finish. Simple cue that promotes full rotation.

**Mobility Exercises:**
Hip circles, 90/90 stretches, and hip flexor lunges before practice will immediately improve rotation range.`,
  ],

  shoulders: [
    `**Shoulder Mechanics Analysis**

**Backswing Shoulder Turn:**
Target 90° (perpendicular to spine). Under-rotated (60-70°) = short swing, limited power. Many golfers don't reach 90° because of: (1) physical limitation, (2) head moving off the ball preventing turn, (3) lead arm breaking down.

**The Shoulder Tilt:**
Often overlooked: shoulders don't just rotate — they tilt. The trail shoulder lowers and the lead shoulder rises slightly on the backswing. This tilt (7-10° for most shots) is what allows the trail shoulder to move correctly on the downswing.

**The Crucial Rule:**
On the downswing, the *lead* shoulder initiates by pulling down and back — not the trail shoulder pushing forward. This distinction is everything. Pushing with the trail shoulder is the mechanism of the over-the-top move.

**Shoulder Shallowing:**
As the hips begin their bump, the trail shoulder automatically drops if the sequence is correct. You should feel the trail shoulder moving "under" on the way down, not "over" or "level."

**Turn vs. Tilt Drill:**
Stand upright (no spine tilt) and practice rotating your shoulders. Notice how they rotate flat. Now add your address spine angle and rotate — notice the shoulder tilt that naturally appears. This is the correct motion.

**Check at the Top:**
From a face-on view, the left shoulder (for right-handers) should be roughly over or behind the ball at the top. If it's far right of the ball, you haven't turned fully.`,
  ],

  grip: [
    `**Grip Analysis**

The grip is where everything begins. It's the only connection between you and the club, and even a 5° error in grip orientation means 10-15° of face angle change at impact.

**Grip Types & Their Effects:**
- **Neutral (2-2.5 knuckles visible on lead hand):** Promotes a square face. Best for consistency.
- **Strong (3+ knuckles):** Encourages a closed face, natural draw. Can cause hooks if too aggressive.
- **Weak (1 knuckle):** Promotes an open face. Common cause of slices.

**Lead Hand Position:**
The club should run diagonally across the fingers — from the pad below the little finger to the base of the index finger. "Palm grip" (grip too high in the palm) reduces wrist hinge and creates tension.

**Trail Hand Position:**
The trail hand grip mirrors the lead. The V formed by thumb and forefinger should point toward the trail shoulder. Trail thumb should sit slightly on the left side of the grip (for right-handers).

**Pressure Points:**
- Lead hand: pressure in the last 3 fingers
- Trail hand: pressure in the middle 2 fingers and the fingers (not the palm)
- Overall pressure: 4/10. Tight enough not to fly out, loose enough to feel the club head.

**Interlock vs. Overlap:**
- Interlock (Nicklaus, Tiger): Good for smaller hands or weaker grip strength
- Vardon overlap (most pros): Better for larger hands, promotes unified motion
- 10-finger (baseball): Highest potential speed, least control. Good for beginners or senior players.

**Check:**
Hold a club at address. You should be able to see the last 2-3 knuckles of your lead hand. The V formed by your trail hand's thumb/forefinger should point roughly at your trail shoulder.`,
  ],

  posture: [
    `**Posture & Spine Angle Analysis**

**The Setup Spine Angle:**
40-45° forward tilt from the vertical — but this should come from a *hip hinge*, not a waist bend. There's a huge difference:
- **Hip hinge:** Back stays relatively straight, butt pushed back slightly, spine neutral
- **Waist bend:** Back rounds, hips are under the body, restricts turn

The difference is visible in the lower back. A proper hip hinge has a slight arch in the lower back; a waist bend rounds it.

**Secondary Spine Tilt:**
At address, your spine should tilt slightly away from the target (trail shoulder lower than lead shoulder). For a driver this is 3-5°; for irons about 1-3°. This tilt helps with sequencing and allows the proper shoulder turn.

**Maintaining Posture Through Impact:**
This is where most amateurs fail. The common fault is "early extension" — the hips move toward the ball during the downswing instead of rotating around the spine. This causes:
- Standing up through impact
- Loss of lag
- Thin shots or heel contact

**Stay In The Box Drill:**
Set up against a wall with your tailbone touching it. Make practice swings. Your tailbone should maintain contact with the wall through impact. If it moves away from the wall, you're early-extending.

**Knee Flex Maintenance:**
Trail knee flex should remain throughout the backswing. If it straightens, the hips elevate and posture is lost. Lead knee should flex inward (not outward) to allow rotation.`,
  ],

  lag: [
    `**Lag Analysis**

Lag is the wrist-to-shaft angle maintained into the downswing. It's the most significant speed multiplier in golf — more lag = more stored energy = more club head speed at impact.

**What Lag Looks Like:**
From a face-on view at P5 (lead arm parallel on the downswing), there should be a visible angle between the lead forearm and the club shaft — ideally close to 90°. Many amateurs have already released to nearly straight by this position.

**Why Lag Is Lost (Casting):**
1. **Grip too tight** — Tense forearms prevent the wrist hinge from being maintained
2. **Trying to hit hard** — Throwing the hands at the ball is instinctive but counterproductive
3. **No lower body lead** — Without the hips initiating first, the arms fire early to compensate
4. **Weak wrists** — Wrist strength and flexibility (especially lead wrist extension) plays a role

**The Paradox:**
More lag = more speed, but you can't consciously hold lag — it must be the natural consequence of good sequencing. The real fix is: start the downswing with the lower body, let the upper body lag behind, and the club will naturally retain its angle until the hands reach hip height.

**Drills:**
1. **Pump drill:** Start downswing, pause with lead arm parallel (P5), verify lag angle, then complete
2. **Heavy bag drill:** Hit into an impact bag — the resistance forces proper delivery angle
3. **Slow motion reps:** At 10% speed, feel the lag position at P5; build muscle memory

**Speed Without Cast:**
If lag is your issue, you're probably 20-30% below your potential club head speed. Fix it and distance gains are guaranteed.`,
  ],

  weight_transfer: [
    `**Weight Transfer Analysis**

**The Athletic Motion:**
Weight transfer in golf mirrors other athletic movements — a baseball pitcher, tennis player, or boxer all load to the trail side then transfer explosively forward. Golf is the same.

**Backswing Loading:**
70-80% of weight should shift to the trail side by the top of the backswing. The feeling: pressure in the *inside* of the trail foot/heel — not the outside edge (that's sway, not load).

**The Trigger:**
Weight shift begins before the backswing is complete. That's the key. As the arms reach the top, the left heel (for right-handers) should be planting back down if it lifted, and the hip bump should begin.

**Downswing Transfer:**
- At transition: 50/50
- At P5: 60% lead
- At impact: 75-80% lead
- At finish: 90-95% lead

**Early vs. Late Transfer:**
- **Transfer too early (reverse pivot):** Weight going lead-side on the backswing. Almost always causes either fat contact (trying to hang back to compensate) or a pull/slice.
- **Transfer too late (hanging back):** Weight stays on trail side through impact. Causes a flip of the hands, loss of lag, and often a block right or a hook.

**Step Drill:**
Make a backswing, step your lead foot toward the target as you start down, then complete the shot. This exaggerates the weight transfer feeling. After 50 reps, make a normal swing and feel the same transfer.

**Ground Force Measurement:**
Elite players push down into the ground 1.5-2x their body weight at impact. This vertical force (along with horizontal) is the primary power source. It's accessed by proper weight transfer.`,
  ],

  rotation: [
    `**Rotation Analysis**

**What Rotation Actually Means:**
True rotation is spinning around a fixed spine axis. Many amateurs confuse lateral sliding (sway/drift) with rotation. In a proper turn, the spine stays in roughly the same position — the body rotates around it.

**Backswing Rotation Check:**
- Shoulders: 90° from target line
- Hips: 45° from target line
- Spine: relatively still (small amount of shift is fine)
- Head: minor movement is acceptable (staying perfectly still often restricts turn)

**The Coil:**
The 45° differential between shoulder turn and hip turn is your "X-factor." This is not just about distance — it's the primary sequencing driver. Larger X-factor means more elastic energy; poor X-factor means the swing relies only on arm speed.

**Downswing Rotation Rate:**
Tour players rotate their hips at approximately 700°/second through impact. Amateurs typically manage 400-500°/second. The difference is not flexibility — it's initiating the rotation from the ground up.

**Blocking vs. Clearing:**
"Blocking" means the hips stop rotating at or before impact, arms swing past the body, and the face stays open. "Clearing" means the hips fully rotate so the arms and club can swing freely through. Blocked hips = push or push-fade; cleared hips = straight to draw.

**Rotation Drills:**
1. **Hip bumper drill:** Feel your trail hip bump toward the target at transition, then rotate fully
2. **Headcover under trail arm:** Ensures the body is rotating (not just spinning arms)
3. **Medicine ball rotations:** Build the rotational speed and strength separately from the swing`,
  ],

  tempo: [
    `**Tempo & Rhythm Analysis**

**What Tempo Is:**
Tempo is the ratio of backswing time to downswing time. Research by John Novosel ("Tour Tempo") found that all great ball strikers have a 3:1 ratio — backswing takes 3x as long as the downswing, regardless of how fast or slow the swing feels.

**Common Tempo Faults:**
1. **Too fast backswing:** 2:1 ratio or even 1.5:1. No time to set the body properly, club overshoots, transition is rushed.
2. **Pausing at the top:** Destroys the athletic flow and the elastic energy stored by the X-factor stretch.
3. **Deceleration into impact:** Happens when golfers fear the shot. Deceleration creates all types of inconsistent contact.

**Building Good Tempo:**
- The backswing should feel unhurried but deliberate
- The downswing should feel "automatic" — not forced, not slow
- The finish should follow naturally from the momentum

**The Metronome Drill:**
Set a metronome to 72 BPM. Backswing takes 3 beats, downswing takes 1 beat. This trains the 3:1 ratio physically. After 100 swings, your body internalizes the rhythm.

**Breathing:**
Exhale slowly on the backswing, hold or continue exhale through impact. Never hold your breath before the swing — it creates tension. Many tour players have a specific breathing routine as part of their pre-shot routine.

**When Tempo Breaks Down:**
High-pressure situations almost always cause tempo to accelerate. Your pre-shot routine should anchor tempo. Some players use a rehearsal swing at their target tempo before every shot.`,
  ],

  club_path: [
    `**Club Path Analysis**

Club path (relative to target line) is one of the two most important factors in ball flight (the other being face angle).

**Path Categories:**
- **In-to-out (positive):** Club approaches from inside target line, exits outside. Promotes draws and hooks.
- **Square (0°):** Club travels directly down the target line at impact. Neutral shot shape.
- **Out-to-in (negative):** Club approaches from outside target line. Promotes fades and slices.

**How Path Is Created:**
Path is primarily determined by shoulder angle and the slot the club arrives in. An open shoulder at impact (shoulders aiming left of target for right-handers) pulls the path outside-in. A closed shoulder promotes inside-out.

**Path-Face Relationship (D-Plane):**
The ball starts roughly where the face is pointing, and then curves away from the path relative to the face. So:
- Face square, path 5° out-to-in → straight pull
- Face 2° right, path 5° out-to-in → pull with slight fade back toward target
- Face 2° right, path 2° in-to-out → gentle draw
This is the gear-effect model that explains all ball flights.

**Optimal Path for Power:**
For distance, a slightly in-to-out path (1-3° for irons, 2-4° for driver) is optimal. It maximizes the compression zone and allows for a draw shape with slightly more rollout.

**Drill for In-to-Out:**
Set two alignment sticks — one just outside the ball, one just inside your trail foot. Practice swinging between them. The outer stick trains your path to stay from inside the line.`,
  ],

  swing_plane: [
    `**Swing Plane Analysis**

**The Two-Plane Theory:**
Most modern golfers use a two-plane swing — the arms swing on a steeper plane than the shoulders rotate on. The arm plane is determined by your height, arm length, and the club's lie angle. The shoulder plane is flatter. The key is that the club transitions between these planes correctly.

**One-Plane Alternative:**
The Moe Norman / Graves Golf single-plane has the club, arms, and shoulders on the same plane at address. Benefits: simplicity and consistency. Drawback: different setup feels awkward to traditional golfers.

**Identifying Your Plane:**
Down-the-line view is required. Draw a line from the club head through the grip at address — this is your *shaft plane*. The ideal delivery is slightly below this plane (shallower) on the way down.

**Too Steep:**
If the club is above the shaft plane line at P5 (lead arm parallel on downswing), the club is too steep. Causes: thin shots, divots ahead of ball, pull, pull-fade, and loss of distance.

**Too Flat:**
If the club is below the shaft plane, it's too flat. Can cause pushed shots, blocked shots, or hooks, depending on face angle.

**The Delivery Plane:**
At impact, the shaft should bisect the right shoulder (for right-handers) when viewed from down the line. This "delivery plane" is the gold standard checkpoint. If the shaft is pointing significantly above the shoulder, you're steep; below, you're flat.

**Visual Training:**
Filming yourself from down the line and drawing the shaft plane line at address is the most effective way to self-diagnose plane issues. Compare your P5 position to the line.`,
  ],


  // ── Faults ──────────────────────────────────────────────────────────────────
  over_the_top: [
    `**Over-the-Top (OTT) Analysis**

Over-the-top is the single most common fault in amateur golf, responsible for the majority of slices and pulls.

**What's Happening:**
The shoulders initiate the downswing before the hips have begun their bump-and-turn. The trail shoulder "throws" forward and over, causing the club to approach impact from outside the target line.

**Ball Flight Signatures:**
- Pull (club path left, face pointing left) → straight pull
- Pull-fade/slice (club path left, face slightly open) → ball starts left, curves right
- Steep divots pointing left of target
- Contact toward the toe of the iron or hosel area

**Root Causes (find yours):**
1. **Hip sequencing** — Hips haven't started forward before shoulders move
2. **Trail shoulder anxiety** — Unconsciously throwing the right arm/shoulder at the ball
3. **Lifting the club** — Arms lifting independently instead of turning with the body forces a reroute from the top

**Fixes (in order of impact):**

1. **Start the downswing with your lower body.** Feel your left knee and hip bump toward the target while your shoulders are still completing the backswing. The arms stay "passive" — they're just along for the ride.

2. **Trail elbow to the trail hip.** From the top, focus on moving the trail elbow down toward the trail hip pocket. This automatically shallows the club and eliminates the OTT move.

3. **Headcover drill.** Place a headcover 6 inches outside and slightly behind the ball. Practice swinging without hitting it. This forces an inside approach path.

4. **Pause-and-drop drill.** Pause at the top for 1 second. Then consciously drop your trail elbow into the slot before swinging through. Builds proper sequencing muscle memory.

**Timeline:** OTT is a deeply ingrained pattern. Expect 4-6 weeks of dedicated practice to rewire it.`,
  ],

  casting: [
    `**Casting / Early Release Analysis**

Casting is releasing the wrist-to-shaft angle (lag) before the hands reach hip height. It's the primary speed killer in golf.

**Why It Happens:**
- The brain sees the ball and instinctively wants to "hit" it → the hands throw outward
- Poor lower body sequencing forces the arms to generate power early
- Grip too tight locks the wrists and prevents proper lag storage
- Swinging "at" the ball rather than "through" it

**Speed Cost:**
A player who casts typically loses 15-30% of potential club head speed. That's 15-30 yards for a 7-iron and 40-60 yards with a driver.

**Ball Flight Signatures:**
- Fat shots (club hits ground before ball)
- Thin shots (bottom of arc is behind ball → catches it on the upswing)
- Loss of distance
- High, weak shots with irons (club returns to neutral loft or adds loft)
- Scooping feeling

**The Fix:**

**Primary:** Start the downswing from the ground up. Hips move FIRST. If the hips lead properly, the arms naturally trail behind and maintain lag until the last moment.

**Feel drill:** Take the club to the top. Without moving your arms, bump your hips toward the target. Feel how the arms automatically "fall" and the lag angle increases? That's the correct sensation.

**Impact bag drill:** Hit into a heavy bag. The resistance forces you to maintain shaft lean and deliver the hands ahead of the club head. Without the resistance, the hands naturally uncock early.

**Gate drill:** Place a tee 6 inches in front of the ball. Try to take a divot that starts *at* the tee — you'll need shaft lean and proper sequencing to accomplish it.`,
  ],

  chicken_wing: [
    `**Chicken Wing Analysis**

The chicken wing — lead elbow bending sharply through impact — kills extension, reduces distance, and causes inconsistent contact.

**What's Happening:**
Instead of the lead arm extending fully through the ball and rotating, the left elbow bends backward (for right-handers) through impact. This shortens the swing arc and prevents proper forearm rotation.

**Root Causes:**
1. **Blocked rotation** — If the body isn't rotating through impact, the arms have no room to extend. They fold to get out of the way.
2. **Over-the-top path** — Coming OTT forces the lead arm to pull in early
3. **Strong grip** — Can block the natural rotation of the forearms through impact
4. **Fear of hooking** — Golfers who've hit hooks often consciously prevent rotation, which creates the wing

**Fix:**

**Rotation is the cure.** The chicken wing is a symptom of the body not rotating. If the hips and chest fully rotate through impact, there is space for the arms to extend.

**Forearm Rotation Drill:**
Make slow-motion swings focusing on the trail forearm rolling over the lead forearm at the impact zone. This is a natural movement — don't force it, just allow it. Feel the club face turn over through the zone.

**Extension through the flag drill:**
Imagine swinging to a target 10 feet past the ball. Your arms must extend to reach it. This thought promotes full extension rather than an early fold.

**Towel drill:**
Place a towel under both armpits. Make swings keeping both towels in place through impact. This promotes connected rotation rather than independent arm movements.`,
  ],

  reverse_pivot: [
    `**Reverse Pivot Analysis**

A reverse pivot means weight going to the *lead* side on the backswing and the *trail* side at impact — the exact opposite of what's correct.

**The Pattern:**
- Backswing: weight stays left (or shifts left)
- Downswing: weight dumps to the right trying to compensate
- Result: steep angle of attack, thin/fat contact, loss of distance, inconsistent direction

**Visual Tells:**
- Head moves toward the target during the backswing
- Lead shoulder drops instead of turning back
- "Dip" or "lower" visible in the head position at the top

**Root Causes:**
1. **Trying to "stay behind the ball"** — misinterpretation causes left-weight on backswing
2. **Restricted hip turn** — without proper hip turn, the body has to sway left to create swing width
3. **Fear of sway** — over-correcting away from sway by leaning left instead

**Fix:**

**Trail knee flex maintenance.** Keep a bend in the trail knee throughout the backswing. This prevents the trail side from straightening and allows weight to transfer properly to the trail foot.

**Feel:** On the backswing, focus on feeling pressure build in the *inside* of the trail foot and heel. Not the outside edge (sway), but the inside arch area.

**Drill — Trail foot drill:**
Take your normal backswing, then press your trail heel down. Feel the weight on the trail side. This sensation should be present at the top of your backswing before any other movement begins.

**Flagpole drill:**
Hold a flagpole or alignment stick vertically against your trail ear. During the backswing, your head should move slightly *behind* the stick — away from the target. If the head moves in front of it, you're reverse pivoting.`,
  ],

  sway: [
    `**Sway Analysis**

Sway is lateral hip movement (away from target) on the backswing instead of rotation around the spine axis.

**Sway vs. Proper Turn:**
In a proper turn, the hips rotate around a fixed spine. In a sway, the hips slide to the trail side, moving the entire center of mass. The trail knee straightens, the trail hip pushes out, and width is created laterally instead of rotationally.

**Why It Feels "Powerful":**
Sway creates the illusion of a big backswing because there's a lot of movement. But it's not stored power — there's no coil. The body then has to sway back toward the target to unwind, creating a "slide-hit" pattern.

**Ball Flight:**
Swaying tends to cause: pushes (face square to path, path going right), push-fades, and sometimes fat shots as the low point of the arc shifts.

**The Fix:**

**Wall drill:** Set up with your trail hip touching a wall (or the back of a chair). Make backswings without your trail hip touching the wall. This constrains the sway and forces rotation.

**Trail knee fixed:** Keep the trail knee in its address flex position throughout the backswing. The knee is your pivot anchor — if it straightens, you're swaying.

**Mental image:** Imagine your head as the center of a clock. Your shoulders rotate around the clock's center. The center doesn't move — only the hands turn.

**Alignment stick in ground:** Place a stick angled into the ground at your trail hip. Rotate without pushing it. Any sway will immediately push the stick.`,
  ],

  hanging_back: [
    `**Hanging Back Analysis**

Hanging back means the weight never fully transfers to the lead side through impact. The golfer stays on the trail side, causing the club to bottom out behind the ball.

**Pattern:**
- Backswing: may be fine
- Transition/impact: weight stays 60-70% trail side instead of shifting forward
- Compensation: flip the hands or throw the arms to reach the ball

**Causes:**
1. **Fear of pulling left** — Amateurs who've fought OTT/slice sometimes consciously hold back to prevent it
2. **No lower body drive** — Passive legs don't drive forward; arms take over
3. **Short game habit** — Wedge shots require less transfer; this sometimes bleeds into full swings
4. **Physical limitation** — Hip/knee issues can prevent full weight shift

**Ball Flight:**
Fat shots (weight back moves low point behind ball), thin shots (flip), blocks to the right, or high weak fades.

**The Fix:**

**Step drill:** Pause at the top, physically step your lead foot 12 inches toward the target, then complete the swing. Exaggerates the weight transfer feeling.

**Left foot only:** Hit short shots with only the lead foot on the ground. Forces all weight to lead side.

**Step-through:** After impact, let your trail foot step all the way forward as if walking. This forces full transfer.

**Target hip:** Think "left hip to the target" through the downswing. Driving the lead hip toward the target creates both the lateral shift and the rotation needed for proper impact.`,
  ],

  cupped_wrist: [
    `**Cupped Lead Wrist Analysis**

A cupped lead wrist (wrist bowed backward, creating a concave angle) at the top or through impact opens the club face, which is the most direct cause of slicing.

**What "Cupped" Means:**
At the top of the backswing, look at your lead wrist. If there's a concave "cup" or the back of the hand is angled away from the forearm, the face is open. Ideal is flat (in-line with forearm) to slightly bowed (convex, toward the sky).

**Impact Implications:**
Each degree of cup in the lead wrist at impact corresponds to roughly 2-3° of open face. A 4° cupped wrist = club face 8-12° open = banana slice.

**Dustin Johnson Model:**
DJ is famous for an extremely bowed lead wrist at the top — almost comically concave toward the sky. This closes the face early, allowing him to swing aggressively without worrying about the face opening.

**The Fix:**

**Hinge the wrist correctly:** The lead wrist should hinge in *radial deviation* (thumb toward forearm), not *extension* (cup). Practice the backswing with an alignment rod on the back of the lead hand and forearm — it should stay in contact throughout.

**Supination drill:** Through the impact zone, practice rotating the lead wrist toward "supination" (palm turns down, toward the ball). This bows the wrist and closes the face.

**Glove drill:** Stick a tee through the velcro on the back of a glove. Point it down at address. At the top, it should point at the ground or slightly toward the ball — not at the sky (cupped) or straight up (flat).

**Mirror check:** In front of a mirror, swing to the top and compare your wrist to a "flat" reference. This instant visual feedback is the most effective training tool.`,
  ],

  loss_of_posture: [
    `**Loss of Posture Analysis**

Loss of posture (also called "early extension") is when the hips move toward the ball during the downswing instead of rotating around the spine. It's one of the most common faults in mid-handicap players.

**What Happens:**
- Hips bump forward (toward the ball) instead of rotating
- Spine angle increases (standing up)
- Arms run out of room and collapse inward
- Hands flip to compensate

**Visual Signature:**
From down-the-line view, watch the hips from address to impact. In a proper swing, the hips should stay near the address "line" (roughly the same distance from the ball) and rotate. Early extension moves them forward 4-8 inches.

**Causes:**
1. **Tight hip flexors** — Hip flexors pull the hips forward if not sufficiently mobile
2. **Poor sequence** — Sliding hips instead of rotating
3. **Trying to "power" through the ball** — Pushing forward with the whole body

**Ball Flight:**
Fat shots, heel contact, thin shots (flip compensation), loss of distance, and push-draws.

**The Fix:**

**Wall drill:** Set up so your tailbone touches a wall. Maintain this contact through the entire swing, including impact. Any forward hip movement will pull your tailbone off the wall.

**Squat pattern:** During the downswing, feel like you're *squatting* slightly and *rotating*. The squat keeps the spine angle as the hips clear.

**Hip mobility:** Spend 5-10 minutes on hip flexor stretches before every practice session. Kneeling lunge stretches and 90/90 hip stretches directly address the physical limitation.

**Broom drill:** Put a broom handle in your belt loop pointing at the ground behind you. It should stay pointed at the ground throughout the swing — if it rises, you're early extending.`,
  ],

  slice: [
    `**Slice Diagnosis & Fix**

A slice is the most common ball flight in golf and is caused by a face that is open *relative to the club path* at impact.

**The Physics:**
- Ball starts toward where the face is pointing
- Ball curves away from the path, toward the face
- So: face 5° right of target + path 8° left of target = ball starts right, curves further right

**The Most Common Slice Pattern:**
- Over-the-top swing path (6-12° out-to-in)
- Cupped lead wrist (face open 8-15°)
- Face open to path by 10-20° → severe slice

**Systematic Fix (Address Each Layer):**

**Layer 1 — Grip:** Strengthen the grip (rotate both hands to the right). You should see 3 knuckles on the lead hand. The V's should point to your trail shoulder.

**Layer 2 — Wrist:** At the top, ensure your lead wrist is flat or slightly bowed. Not cupped.

**Layer 3 — Path:** Start the downswing from the inside. Feel your trail elbow drop toward the trail hip. The club approaches from inside the target line.

**Layer 4 — Hip Sequence:** Hips lead the downswing. If they're square at impact, the shoulders are doing all the work and will pull the club outside.

**Quick Fix Drill:**
Set up aiming 20 feet right of your normal target. Swing aggressively out to that right target. The feeling of "swinging right" counteracts the instinct to pull left. Your slicing mechanics should immediately produce a straighter shot.`,
  ],

  hook: [
    `**Hook Diagnosis & Fix**

A hook is caused by a face that is closed *relative to the club path* — the opposite problem of a slice.

**The Physics:**
Face pointing significantly left of the path at impact → ball starts left and curves further left.

**Common Hook Patterns:**
- Very strong grip (3+ knuckles, V's pointing behind trail shoulder)
- Extremely inside-out swing path
- Lead wrist dramatically bowed at impact
- Sometimes: flip/early release with path left

**Types of Hooks:**
1. **Pull-hook:** Path left AND face left. Ball goes hard left immediately.
2. **Block-hook:** Path right, face very closed. Ball starts right then violently hooks left.
3. **Draw that got out of control:** Path slightly inside-out, face too closed.

**Systematic Fix:**

**Grip check:** Weaken the grip slightly. 2-2.5 knuckles visible. V's pointing to the trail shoulder, not behind it.

**Face at top:** Check for a rolled-over, extremely bowed lead wrist. Some bow is fine; excessive bow closes the face too early.

**Path:** If it's a pull-hook, check for path-too-far-inside-out. The gate drill (alignment sticks framing the path) helps.

**Release timing:** If it's a late flip turning into a hook, work on getting hands forward at impact consistently.

**Ball position:** Moving the ball position slightly forward for longer clubs helps — an earlier contact point on the arc usually means less face rotation has occurred.`,
  ],


  // ── Drills ──────────────────────────────────────────────────────────────────
  drill_general: [
    `**Essential Practice Drills**

Here are the highest-ROI drills based on the most common amateur faults:

**1. Impact Bag Drill (Most Important)**
Buy or make an impact bag. Hit it with your 7-iron focus on:
- Hands ahead of the bag
- Hips open 40°+
- Lead wrist flat
This single drill builds better impact position than almost anything else.

**2. Alignment Stick Setup**
Every practice session: lay two sticks on the ground — one along the target line, one at your feet. Confirms correct alignment. Most slicers are aimed 15-20° right of their target without knowing it.

**3. Pause at the Top**
Swing to the top and pause for 1-2 seconds. Then continue. This eliminates the rushing transition and makes the correct sequence (hips first) the only option.

**4. Left-Hand-Only (Lead Hand Only)**
Swing with only the lead hand/arm. This trains extension through impact and prevents the chicken wing. Start very short — half swings.

**5. Feet-Together Drill**
Hit balls with your feet touching. Forces balance and rhythm. Any swing flaw causes a stumble, giving instant feedback.

**6. Slow Motion**
Take 50 slow-motion swings (10% speed) before each ball-hitting session. This is where genuine pattern change happens — when it's slow enough for your nervous system to feel what you're asking it to do.

**7. Three-Ball Drill**
Line up 3 balls, 6 inches apart. Take one continuous swing through all three. Trains full extension and prevents early deceleration.

Which specific fault are you working on? I can give you the most targeted drills for it.`,
  ],

  drill_ott: [
    `**Over-the-Top Correction Drills**

These are the most effective drills specifically for eliminating the OTT move:

**1. Headcover Outside Drill**
Place a headcover 6" outside the ball. Swing without hitting it. Forces an inside-out approach path. Do 50 swings daily until the avoidance is automatic.

**2. Trail Elbow to Trail Hip**
From the top, consciously move the trail elbow toward the trail hip *before* the arms swing. This automatically shallows the plane and eliminates the over-the-top route.

**3. Pause-and-Drop**
Swing to the top. Pause 2 seconds. Then ONLY move your trail elbow toward your hip pocket before completing the swing. Builds the neural pathway for proper sequencing.

**4. Wall/Doorframe Drill**
Stand a door frame width from a wall. Swing and barely miss the wall on the backswing — the close proximity forces you to start the downswing under-and-inside to avoid hitting it.

**5. Hip-Lead Pump Drill**
Swing to the top. "Pump" the hips toward the target three times without moving the arms. Feel the separation. Then continue the swing. Builds the sensation that hips lead.

**6. Baseball Warm-Up**
Start with baseball swings (shoulder height, flat plane). Gradually lower the plane swing by swing over 20 swings. This teaches the body the in-to-out path from a motion it already knows.

**Expectation Setting:**
OTT is deeply ingrained. Do these drills for 6-8 weeks before expecting full correction. Progress comes as: awareness → slow-motion control → partial swing control → full swing improvement.`,
  ],

  // ── Short game ──────────────────────────────────────────────────────────────
  shortgame: [
    `**Short Game Analysis**

**The Impact of Short Game:**
Research shows that 60-65% of all golf shots occur inside 100 yards. Improving your short game is the fastest route to scoring improvement.

**Chipping Fundamentals:**
- Weight: 60-70% on the lead side throughout — don't shift weight
- Ball position: back of center (promotes downward strike)
- Shaft lean: forward at address and maintained through impact
- Hands: ahead of ball at address (5-6 inches ahead)
- Wrists: minimal hinge, arms and body move together (like a putting stroke made longer)
- Strike: ball first, then optionally the turf

**Pitching (30-80 yards):**
Pitching uses more wrist hinge and body rotation than chipping. The hinge is a hinge, not a flip. Key: the lead wrist must stay flat through impact, not cup and flip.

**The Phil Mickelson Lob Shot:**
Open the face dramatically, open stance to match, ball forward, weight left, hinge the wrists on the backswing, maintain the face angle through impact. Practice this at a low slow speed first to understand the mechanics.

**The Bounce:**
The bounce (the rounded part of the wedge sole) is your friend, not your enemy. In sand and rough, strike with the bounce — not the leading edge. Many thin/bladed chips come from trying to "pick" the ball and striking with the leading edge.

**Distance Control:**
The most important short game skill. Calibrate by: measuring your half-swing, 3/4-swing, and full-swing distances with each wedge. Know your yardages precisely.

**Practice Protocol:**
70% of short game practice should be random target practice (different distances, lies, and targets). Blocked practice (same shot repeatedly) builds mechanics; random practice builds the skill to score.`,
  ],

  putting: [
    `**Putting Analysis**

**Putting accounts for 41% of shots for average golfers.** Even a 1-putt improvement per round saves 18 strokes per season.

**Setup:**
- Eyes directly over the ball or slightly inside the line
- Lead eye directly over the ball (the dominant eye reads the line)
- Hands slightly ahead of the ball (slight shaft lean)
- Weight: 50/50 or slightly lead-side
- Grip pressure: 3/10 — minimal tension

**Stroke:**
- Pendulum motion: shoulders rock, hands passive
- Putter face stays square to the arc (arc stroke) or square to target throughout (SBST)
- Accelerate through the ball — never decelerate
- Follow-through equal to or longer than backswing

**Reading Greens:**
1. Start from behind the hole, not behind the ball
2. Identify the "fall line" — the straightest uphill/downhill putt through the hole
3. All putts break toward the fall line
4. Grain (grass direction) affects speed: putting against grain is slower
5. Uphill putts break less than their break (hit firm); downhill break more (die into cup)

**Speed Control:**
Speed is the master skill in putting. Correct pace eliminates 3-putts. Practice: putt 10 balls to the fringe with no hole — focus only on getting them to die 18 inches past the fringe.

**Mental:**
Pick a specific spot to roll the ball over (not the hole as target). This focusses attention on your process, not outcome.

**Practice Drill — Gate Drill:**
Place two tees as a gate just wide enough for the putter to pass through. Stroke through the gate. This immediately reveals face angle and path issues.`,
  ],

  // ── Mental game ─────────────────────────────────────────────────────────────
  mental: [
    `**Mental Game Analysis**

Golf is 90% mental — and mental skills can be trained as systematically as physical ones.

**Pre-Shot Routine:**
Every elite player has a consistent pre-shot routine. It serves as an anchor for performance under pressure. Your routine should:
1. Read the situation (wind, lie, distance)
2. Commit to a specific shot (target, trajectory, shape)
3. Waggle/rehearsal swing to load the movement pattern
4. Look at target, then ball
5. Trigger — a specific cue (deep breath, press forward, etc.) that starts the swing

**Process vs. Outcome:**
Focus on what you can control (pre-shot routine, swing thought, alignment) not what you can't (outcome, score, what others think). Anxiety spikes when focus shifts to outcome.

**The One-Thought Principle:**
Pick ONE swing thought per round — maximum. More thoughts paralyze the system. Good swing thoughts are: motion-based ("feel the lag"), not technical ("keep the right elbow in").

**Breathing:**
Box breathing (4 seconds in, 4 hold, 4 out, 4 hold) activates the parasympathetic nervous system. Use it in between shots, not mid-routine.

**After Bad Shots:**
Most amateurs carry the previous bad shot into the next one. The "10-second rule": allow yourself to be upset for 10 seconds, then consciously let it go. The next shot is independent.

**The Yips:**
Often caused by performance anxiety converting into muscle tension and flinching. Fixes: grip changes, putting styles (claw, arm-lock), pre-shot routine changes, and working with a sports psychologist.

**Confidence:**
Confidence in golf comes from *preparation* and *process* adherence, not from telling yourself you'll play well. Build it through deliberate practice.`,
  ],

  // ── Equipment ───────────────────────────────────────────────────────────────
  equipment: [
    `**Equipment Analysis & Recommendations**

**Shaft Flex:**
Flex is determined by swing speed and tempo:
- **Regular (R):** Driver swing speed 75-90 mph
- **Stiff (S):** 90-105 mph
- **X-Stiff (X):** 105+ mph
- **Senior (A/Senior):** Under 75 mph

Using a shaft that's too stiff: loses distance (under-loaded), can't get the flex working
Using a shaft too soft: over-loaded, hooks, inconsistency

**Loft:**
Driver loft should match attack angle + swing speed:
- Slower swing (under 90 mph): 12-14° loft
- Average (90-100 mph): 10.5-12°
- Fast (100+): 8.5-10.5°
Higher loft + high spin = straighter but shorter. Lower loft + low spin = longer but needs precise strike.

**Club Fitting:**
The most overlooked improvement in golf. A proper fitting adjusts: shaft flex, shaft weight, lie angle, grip size, and club length. Lie angle alone (the angle of the shaft to the ground) can send the ball 20-30 feet sideways on an iron shot if incorrect.

**Lie Angle:**
Have this checked. Upright lie (toe up at impact) → pulls left. Flat lie (heel up at impact) → pushes right.

**Wedge Gapping:**
Most important gap set: pitching wedge, gap wedge, sand wedge, lob wedge. Common error is having 2 clubs gapped 15 yards apart and a 5-yard gap between two others. Full wedge system should have 10-15 yard gaps between each.

**Ball:**
For swing speeds under 95 mph: distance balls (Bridgestone e6, TaylorMade Distance). For 95-105: urethane tour-level balls start to make sense. For 105+: premium tour balls (Pro V1, TP5) are worth it.`,
  ],

  // ── Comparison ──────────────────────────────────────────────────────────────
  compare: [
    `**Comparative Analysis**

When comparing swings between two videos, I focus on these key differentials:

**Timing Differences:**
The most telling comparison is the *timing* — does one swing have earlier/later hip rotation? More/less lag at the same point in the downswing? The P-position framework helps: both videos at P4 (top), P5 (mid-downswing), and P6 (impact) gives a clear frame-by-frame comparison.

**What to Look For:**

**Setup:** Compare spine angle, ball position, grip. Setup differences often explain all the downstream differences.

**Shoulder Turn at Top:** One swing may have 70° of turn, the other 90°. This changes everything about the potential power and the required timing.

**Transition Sequence:** Does one swing have hips leading shoulders? Or do the shoulders initiate in one and not the other?

**Shaft Plane:** Comparing the shaft position at P5 between two swings (or same player at different times) reveals whether one is steeper/shallower.

**Hip Rotation at Impact:** Comparing hips at impact is especially revealing for understanding path and contact differences.

**To compare your two videos specifically:**
Pause both videos at the same P-position and look for the differences I described above. You can also ask me to mark specific features — "show me the shoulder turn in both" — and I'll generate visual annotations.`,
  ],

  // ── Annotation responses ────────────────────────────────────────────────────
  annotate_swing_plane: [
    `I'll mark the swing plane for you.

The plane line runs from the club head at address through the grip — this is your reference plane. On the downswing, the club should deliver on or slightly below this line.

Here's the swing plane marked:`,
  ],

  annotate_club_path: [
    `I'll draw the club path showing the approach angle to the ball.

The ideal path for irons is 1-3° inside-out. I'll show the actual path based on the frame position:`,
  ],

  annotate_general: [
    `Let me annotate the key lines and angles visible in this frame.`,
  ],

  // ── General golf ─────────────────────────────────────────────────────────────
  general: [
    `**Golf Coaching Analysis**

Great question! Here's what I can help you with:

**Full Swing:**
- Setup and address fundamentals
- Takeaway through finish (all 9 P-positions)
- Common fault diagnosis (over-the-top, casting, chicken wing, reverse pivot, sway, and more)
- Specific body part mechanics (hips, shoulders, wrists, weight transfer)

**Short Game:**
- Chipping technique
- Pitching and distance control
- Bunker shots
- Lob shots

**Putting:**
- Setup and stroke mechanics
- Green reading
- Speed control
- Mental approach

**Mental Game:**
- Pre-shot routines
- Pressure management
- Consistency under stress

**Practice Guidance:**
- Targeted drills for specific faults
- Effective practice structure
- What to work on and in what order

**Try asking something specific like:**
- "What's causing my slice?"
- "Analyze my setup"
- "Give me drills for over-the-top"
- "How do I generate more lag?"
- "Mark the swing plane on video 1"

The more specific you are, the more targeted the advice.`,

    `**AI Swing Coach — Ready to Help**

I specialize in golf biomechanics and swing analysis. Let's diagnose what's happening with your game.

**Quickest Path to Improvement:**
Tell me your most common ball flight (slice, hook, pull, push, fat, thin) and I can immediately identify the likely root cause and give you 2-3 targeted fixes.

**For Frame Analysis:**
Enable frame capture (camera icon) and send a message while your video is paused at a key position. P4 (top of backswing) and P6 (impact) are the most diagnostic positions.

**Topics I Cover in Depth:**
- Every phase of the swing (setup through finish)
- All major fault patterns and their root causes
- Specific drills that work for each fault
- Short game mechanics
- Putting
- Mental game and pre-shot routines
- Equipment guidance

What would you like to work on?`,
  ],
}

// ─── Annotation generator ─────────────────────────────────────────────────────

interface AnnotationShape {
  tool: string
  points: number[][]
  color: string
  strokeWidth: number
  label: string
}

function generateAnnotations(intent: Intent, topic: string, hasFrame: boolean): string | null {
  if (intent !== 'annotate') return null

  const shapes: AnnotationShape[] = []

  if (topic === 'swing_plane') {
    shapes.push(
      { tool: 'plane', points: [[0.25, 0.85], [0.75, 0.25]], color: '#00ff88', strokeWidth: 2, label: 'Swing plane' },
      { tool: 'plane', points: [[0.15, 0.85], [0.65, 0.2]], color: '#ffaa00', strokeWidth: 1.5, label: 'Ideal delivery plane' },
    )
  } else if (topic === 'club_path') {
    shapes.push(
      { tool: 'arrow', points: [[0.2, 0.7], [0.65, 0.45]], color: '#00cfff', strokeWidth: 2.5, label: 'Club path' },
      { tool: 'line', points: [[0.1, 0.8], [0.9, 0.4]], color: '#ffffff', strokeWidth: 1, label: 'Target line' },
    )
  } else if (topic === 'hips') {
    shapes.push(
      { tool: 'line', points: [[0.3, 0.55], [0.7, 0.55]], color: '#ff6600', strokeWidth: 2.5, label: 'Hip line' },
      { tool: 'angle', points: [[0.5, 0.55], [0.3, 0.55], [0.55, 0.4]], color: '#ffaa00', strokeWidth: 2, label: 'Hip rotation' },
    )
  } else if (topic === 'shoulders') {
    shapes.push(
      { tool: 'line', points: [[0.25, 0.3], [0.75, 0.3]], color: '#ff6600', strokeWidth: 2.5, label: 'Shoulder line' },
      { tool: 'angle', points: [[0.5, 0.3], [0.25, 0.3], [0.6, 0.15]], color: '#ffaa00', strokeWidth: 2, label: 'Shoulder turn' },
    )
  } else if (topic === 'posture') {
    shapes.push(
      { tool: 'line', points: [[0.5, 0.1], [0.45, 0.85]], color: '#00ff88', strokeWidth: 2, label: 'Spine angle' },
    )
  } else if (topic === 'general') {
    shapes.push(
      { tool: 'line', points: [[0.25, 0.85], [0.65, 0.25]], color: '#00ff88', strokeWidth: 2, label: 'Swing plane' },
      { tool: 'line', points: [[0.3, 0.55], [0.7, 0.55]], color: '#ff6600', strokeWidth: 2, label: 'Hip line' },
      { tool: 'line', points: [[0.25, 0.3], [0.75, 0.3]], color: '#ff6600', strokeWidth: 2, label: 'Shoulder line' },
    )
  } else {
    shapes.push(
      { tool: 'plane', points: [[0.25, 0.85], [0.7, 0.2]], color: '#00ff88', strokeWidth: 2, label: 'Swing plane' },
      { tool: 'line', points: [[0.3, 0.55], [0.7, 0.55]], color: '#ff6600', strokeWidth: 2, label: 'Hip line' },
    )
  }

  return `\`\`\`annotations\n${JSON.stringify({ video: 1, shapes }, null, 2)}\n\`\`\``
}

// ─── Response selector ────────────────────────────────────────────────────────

function pickResponse(responses: string[]): string {
  return responses[Math.floor(Math.random() * responses.length)]
}

function buildResponse(intent: Intent, topic: string, hasFrame: boolean, hasBothFrames: boolean, userText: string): string {
  let body = ''

  switch (intent) {
    case 'annotate': {
      const annoText = pickResponse(RESPONSES.annotate_general)
      const annoBlock = generateAnnotations(intent, topic, hasFrame)
      body = annoText + (annoBlock ? '\n\n' + annoBlock : '')
      break
    }
    case 'analyze': {
      if (hasFrame || hasBothFrames) {
        body = pickResponse(RESPONSES.analyze_with_frame)
      } else {
        body = pickResponse(RESPONSES.analyze_no_frame)
      }
      break
    }
    case 'fault': {
      const key = topic as keyof typeof RESPONSES
      const pool = RESPONSES[key]
      body = pool ? pickResponse(pool) : pickResponse(RESPONSES.general)
      break
    }
    case 'drill': {
      if (topic === 'over_the_top') body = pickResponse(RESPONSES.drill_ott)
      else body = pickResponse(RESPONSES.drill_general)
      break
    }
    case 'position': {
      const key = topic as keyof typeof RESPONSES
      const pool = RESPONSES[key]
      body = pool ? pickResponse(pool) : pickResponse(RESPONSES.analyze_no_frame)
      break
    }
    case 'compare': {
      body = pickResponse(RESPONSES.compare)
      break
    }
    case 'shortgame': {
      body = pickResponse(RESPONSES.shortgame)
      break
    }
    case 'putting': {
      body = pickResponse(RESPONSES.putting)
      break
    }
    case 'mental': {
      body = pickResponse(RESPONSES.mental)
      break
    }
    case 'equipment': {
      body = pickResponse(RESPONSES.equipment)
      break
    }
    default: {
      const key = topic as keyof typeof RESPONSES
      const pool = RESPONSES[key]
      body = pool ? pickResponse(pool) : pickResponse(RESPONSES.general)
    }
  }

  if (hasFrame && intent !== 'annotate' && !body.includes('timestamp')) {
    body += '\n\n*Frame captured for analysis. Ask me to mark specific features (swing plane, hip line, shoulder line, club path) and I\'ll annotate them on your video.*'
  }

  return body
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateGolfResponse(req: AnalysisRequest): string {
  const lastUser = [...req.messages].reverse().find(m => m.role === 'user')
  const userText = lastUser?.content ?? ''

  const intent = detectIntent(userText)
  const topic = extractTopic(userText)

  return buildResponse(intent, topic, req.hasFrame1, req.hasFrame2, userText)
}
