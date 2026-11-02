'use strict';
/* VIDEO LIBRARY
 *
 * The single place where demo videos live. To change an exercise's videos,
 * change only its demo_ids list in docs/app.js. To change a whole topic's
 * videos, change only the videos list below. Never edit app logic to
 * change videos. Demo URLs are only added when verified. They are never
 * invented.
 *
 * Plain browser script: no modules, no build step. Loaded via a script
 * tag before app.js in docs/index.html.
 */
var VIDEO_LIBRARY = {
  "topics": [
    {
      "id": "knee-rehab",
      "name": "Knee rehab",
      "description": "Verified demo reels and videos for the knee recovery program."
    },
    {
      "id": "upper-body",
      "name": "Upper body",
      "description": "Verified upper-body demo videos."
    },
    {
      "id": "lower-body",
      "name": "Lower body",
      "description": "Verified lower-body demo videos."
    },
    {
      "id": "back-arms",
      "name": "Back and arms",
      "description": "Placeholder for the planned back and arms expansion."
    }
  ],
  "videos": [
    {
      "id": "v-chauhan-top9",
      "topic": "knee-rehab",
      "title": "Top 9 knee exercises",
      "creator": "Dr. Priya Chauhan, physio",
      "handle": "@dr.chauhanpriya___mpt_ortho",
      "description": "Top 9 knee exercises, including labeled ankle pumps and heel slides.",
      "url": "https://www.instagram.com/reel/DdTa_2ipxGG/"
    },
    {
      "id": "v-jag-post-op",
      "topic": "knee-rehab",
      "title": "Post-knee-replacement starters",
      "creator": "JAG Physical Therapy",
      "handle": "@jagphysicaltherapy",
      "description": "Post-knee-replacement starters: seated heel slides, quad sets, and ankle pumps.",
      "url": "https://www.instagram.com/reel/Dbs_7ZBDeSv/"
    },
    {
      "id": "v-crp-acl",
      "topic": "knee-rehab",
      "title": "Early ACL rehab",
      "creator": "CRP Care Rehab Performance",
      "handle": "@carerehabperformance",
      "description": "Early ACL rehab with ankle pumps, heel slides, and towel-press quad activation.",
      "url": "https://www.instagram.com/reel/DY1ytN1zRyd/"
    },
    {
      "id": "v-jag-quad-sets",
      "topic": "knee-rehab",
      "title": "Quad sets, 10-second holds",
      "creator": "JAG Physical Therapy",
      "handle": "@jagphysicaltherapy",
      "description": "Quad sets with 10-second holds for 10 reps.",
      "url": "https://www.instagram.com/reel/Dbs_7ZBDeSv/"
    },
    {
      "id": "v-chauhan-quad-iso",
      "topic": "knee-rehab",
      "title": "Quadriceps isometric demo",
      "creator": "Dr. Priya Chauhan",
      "handle": "@dr.chauhanpriya___mpt_ortho",
      "description": "Labeled quadriceps isometric demonstration.",
      "url": "https://www.instagram.com/reel/DdTa_2ipxGG/"
    },
    {
      "id": "v-bobbrad-knee-ext",
      "topic": "knee-rehab",
      "title": "Seated knee extensions",
      "creator": "Bob and Brad",
      "handle": "@officialbobandbrad",
      "description": "Seated knee extensions and heel slides routine.",
      "url": "https://www.instagram.com/reel/DbdouOfxuuc/"
    },
    {
      "id": "v-kneehaber-stepup",
      "topic": "knee-rehab",
      "title": "Step-up form",
      "creator": "Connor Clayton / thekneehaber",
      "handle": "@thekneehaber",
      "description": "Controlled step-up form in an isometric and strength sequence.",
      "url": "https://www.instagram.com/reel/DcQvZ7ZMLAB/"
    },
    {
      "id": "v-djkim-slrdl",
      "topic": "knee-rehab",
      "title": "Single-leg RDL essentials",
      "creator": "DJ Kim",
      "handle": "@djkim.yoga",
      "description": "Single-leg RDL in five essential knee exercises.",
      "url": "https://www.instagram.com/reel/DTb3fy5kUi2/"
    },
    {
      "id": "v-pauli-slrdl",
      "topic": "knee-rehab",
      "title": "Single-leg RDLs, 8 per side",
      "creator": "Pauli Reitman",
      "handle": "@paulinareitman",
      "description": "Gym-based single-leg RDLs: 8 per side for 3 sets.",
      "url": "https://www.instagram.com/reel/DdUoESqphzG/"
    },
    {
      "id": "v-e3-slrdl",
      "topic": "knee-rehab",
      "title": "RDL progressions",
      "creator": "E3 Rehab",
      "handle": "@e3rehab",
      "description": "Single-leg RDL and three-way RDL progressions.",
      "url": "https://www.instagram.com/reel/DZNUZX3SkJS/"
    },
    {
      "id": "v-kneehaber-spanish",
      "topic": "knee-rehab",
      "title": "Spanish squat setup",
      "creator": "Connor Clayton / thekneehaber",
      "handle": "@thekneehaber",
      "description": "Spanish squat setup and hold alongside other knee-strength drills.",
      "url": "https://www.instagram.com/reel/DcQvZ7ZMLAB/"
    },
    {
      "id": "v-kneehaber-split",
      "topic": "knee-rehab",
      "title": "Split-squat hold",
      "creator": "Connor Clayton / thekneehaber",
      "handle": "@thekneehaber",
      "description": "Split-squat hold position in a knee-strength sequence.",
      "url": "https://www.instagram.com/reel/DcQvZ7ZMLAB/"
    },
    {
      "id": "v-bobbrad-hamstring",
      "topic": "knee-rehab",
      "title": "Seated hamstring stretch",
      "creator": "Bob and Brad",
      "handle": "@officialbobandbrad",
      "description": "Seated hamstring stretch for knee pain.",
      "url": "https://www.instagram.com/reel/DawDBQtgc70/"
    },
    {
      "id": "v-weshape-stretch",
      "topic": "knee-rehab",
      "title": "Stretch series",
      "creator": "WeShape",
      "handle": "",
      "description": "Stretch series including a hamstring stretch.",
      "url": "https://www.instagram.com/reel/DXh11z9AicL/"
    },
    {
      "id": "v-sommer-calf",
      "topic": "knee-rehab",
      "title": "Wall calf stretch",
      "creator": "Sommer Riermaier",
      "handle": "",
      "description": "Wall calf stretch demo explaining how tight calves affect the ankles and knees.",
      "url": "https://www.instagram.com/reel/DdoYCndzQ0L/"
    },
    {
      "id": "v-hoopes-calf",
      "topic": "knee-rehab",
      "title": "Calf stretch mistakes",
      "creator": "Dan Hoopes, MD, orthopedic surgeon",
      "handle": "",
      "description": "Why most people do the wall calf stretch wrong, plus correct form.",
      "url": "https://www.instagram.com/reel/DbHm60QMxqG/"
    },
    {
      "id": "v-bobbrad-calf",
      "topic": "knee-rehab",
      "title": "Calf stretch demo",
      "creator": "Bob and Brad",
      "handle": "@officialbobandbrad",
      "description": "Calf stretch demonstration.",
      "url": "https://www.instagram.com/reel/Da8K1oiBHiQ/"
    },
    {
      "id": "v-maloney-backward",
      "topic": "knee-rehab",
      "title": "Backward treadmill walking",
      "creator": "Matthew Maloney",
      "handle": "@aclwonders",
      "description": "Backward treadmill walking in a knee-pain routine.",
      "url": "https://www.instagram.com/reel/DUlTcAoDmRm/"
    },
    {
      "id": "v-benpatrick-backward",
      "topic": "knee-rehab",
      "title": "Backward walking for knees",
      "creator": "Ben Patrick",
      "handle": "@kneesovertoesguy",
      "description": "Backward treadmill walking for knee rebuilding.",
      "url": "https://www.instagram.com/reel/DYcmt2QOnV7/"
    },
    {
      "id": "v-djkim-featured",
      "topic": "knee-rehab",
      "title": "Single-leg RDL sequence",
      "creator": "DJ Kim",
      "handle": "@djkim.yoga",
      "description": "Single-leg RDL form within a concise knee-strength sequence.",
      "url": "https://www.instagram.com/reel/DTb3fy5kUi2/"
    },
    {
      "id": "v-kneehaber-featured",
      "topic": "knee-rehab",
      "title": "Knee-strength combo",
      "creator": "thekneehaber",
      "handle": "@thekneehaber",
      "description": "Spanish squat, split squat, and step-up form in one concise reel.",
      "url": "https://www.instagram.com/reel/DcQvZ7ZMLAB/"
    },
    {
      "id": "v-pauli-featured",
      "topic": "knee-rehab",
      "title": "Glute and leg session",
      "creator": "Pauli Reitman",
      "handle": "@paulinareitman",
      "description": "Glute and leg session showing single-leg RDLs at 8 reps × 3 sets each side.",
      "url": "https://www.instagram.com/reel/DdUoESqphzG/"
    },
    {
        "id": "v-wt-knee-isometric-wall-sits",
        "topic": "knee-rehab",
        "title": "How to Do a Wall Sit | Thighs Workout",
        "creator": "Howcast",
        "description": "Exact wall-sit hold demo, thighs parallel, 30-60 second hold.",
        "url": "https://www.youtube.com/watch?v=XULOKw4E4P4"
    },
    {
        "id": "v-wt-knee-quad-sets",
        "topic": "knee-rehab",
        "title": "Quadriceps Set",
        "creator": "Hospital for Special Surgery (HSS)",
        "description": "HSS rehab demo of the quad-set contraction. Page description frames it under a hip-replacement rehab set, but the video itself is the quad set.",
        "url": "https://www.youtube.com/watch?v=TVlWwUn_ZXw"
    },
    {
        "id": "v-wt-knee-straight-leg-raises",
        "topic": "knee-rehab",
        "title": "Straight Leg Raise | How to Build Strong Quads | The Best Post-Op Knee Exercise",
        "creator": "The Physio Bot",
        "description": "Lying straight-leg raise with straight-knee cue, post-op knee framing.",
        "url": "https://www.youtube.com/watch?v=385OLFbpe6I"
    },
    {
        "id": "v-wt-knee-clamshells",
        "topic": "knee-rehab",
        "title": "Clamshell in Sidelying Exercise for the Hips - Ask Doctor Jo",
        "creator": "Ask Doctor Jo",
        "description": "Side-lying clamshell, feet together, top knee lifts, pelvis stays neutral.",
        "url": "https://www.youtube.com/watch?v=O2KPabIoPPk"
    },
    {
        "id": "v-wt-knee-glute-bridges",
        "topic": "knee-rehab",
        "title": "How To Do A Glute Bridge | The Right Way",
        "creator": "Well+Good (Charlee Atkins)",
        "description": "Standard two-leg glute bridge with full form cues, no back arch.",
        "url": "https://www.youtube.com/watch?v=wPM8icPu6H8"
    },
    {
        "id": "v-wt-knee-terminal-knee-extensions-tkes",
        "topic": "knee-rehab",
        "title": "The Terminal Knee Extension (TKE): Gym Shorts (How To)",
        "creator": "Barbell Logic",
        "description": "Standing banded TKE exactly as described: band in knee crease, drive heel down, full extension.",
        "url": "https://www.youtube.com/watch?v=NATjG5HjtMw"
    },
    {
        "id": "v-wt-knee-swiss-ball-hamstring-curls",
        "topic": "knee-rehab",
        "title": "Swiss Ball Hamstring Curl",
        "creator": "Nuffield Health",
        "description": "Bridge up, roll ball toward glutes, same move as the array description.",
        "url": "https://www.youtube.com/watch?v=XkESHgkTdFw"
    },
    {
        "id": "v-wt-knee-heel-slides",
        "topic": "knee-rehab",
        "title": "How to Improve Knee Mobility Lying",
        "creator": "Rehab My Patient",
        "description": "Description is exactly the heel slide (slide heel toward bottom, return straight); Surrey Physio embeds this same video as its Heel Slides demo. Video title itself is generic, not Heel Slides.",
        "url": "https://www.youtube.com/watch?v=suCQoA3cdWg"
    },
    {
        "id": "v-wt-knee-poliquin-step-ups",
        "topic": "knee-rehab",
        "title": "ATG Reverse Step Ups : Poliquins - Loaded Mobility Tutorial",
        "creator": "Body By Brando (bbb_gyms)",
        "description": "Poliquin-style reverse step-up with regressions and progressions.",
        "url": "https://www.youtube.com/watch?v=l5IuYBdz114"
    },
    {
        "id": "v-wt-knee-patrick-step-ups",
        "topic": "knee-rehab",
        "title": "Knee Ability Zero: Step 4: Patrick Step",
        "creator": "KneesOverToesGuy / ATG",
        "description": "Ben Patrick's own ATG Zero step-4 video: flat foot, knee tracking forward over toe, wall for balance. An earlier candidate (cSAV96-9RAs) hit a rate limit and was not used.",
        "url": "https://www.youtube.com/watch?v=lTktLtISKek"
    },
    {
        "id": "v-wt-knee-tibialis-raises",
        "topic": "knee-rehab",
        "title": "Tibialis Raise",
        "creator": "",
        "description": "Wall tibialis raise exactly as described: butt against wall, legs straight, toes curl up, 25 reps. Channel not shown in fetched page text.",
        "url": "https://www.youtube.com/watch?v=fambZbEUVoo"
    },
    {
        "id": "v-wt-knee-single-leg-glute-bridges",
        "topic": "knee-rehab",
        "title": "Single Leg Glute Bridges",
        "creator": "Eugene Neal (Unbroken)",
        "description": "Silent form demo, one-leg bridge with level hips and heel drive, imbalance note matches.",
        "url": "https://www.youtube.com/watch?v=q98y9DmhqzA"
    },
    {
        "id": "v-wt-knee-banded-lateral-walks",
        "topic": "knee-rehab",
        "title": "DEMO: Banded Lateral Monster Walks #gluteactivation",
        "creator": "Heather Reed Fitness",
        "description": "Banded lateral walk with control cues; originally a Short, converted to watch form with the same video ID. Explicitly targets knee valgus prevention.",
        "url": "https://www.youtube.com/watch?v=tw3dUcw0xaU"
    },
    {
        "id": "v-wt-knee-assisted-nordic-hamstring-curls",
        "topic": "knee-rehab",
        "title": "ASSISTED NORDIC HAMSTRING CURLS",
        "creator": "Muscle and Motion",
        "description": "Band-assisted Nordic curl, matching the array's hands or band to assist description.",
        "url": "https://www.youtube.com/watch?v=o40Zd3WRbxg"
    },
    {
        "id": "v-wt-knee-reverse-lunges",
        "topic": "knee-rehab",
        "title": "How to Do Reverse Lunges Correctly | Mobile Physiotherapy Tips",
        "creator": "Mobile Physiotherapy",
        "description": "Step-back lunge with upright torso and front-knee alignment cues, knee-friendly framing.",
        "url": "https://www.youtube.com/watch?v=t88jlMKKvrU"
    },
    {
        "id": "v-wt-upper-dumbbell-bench-press",
        "topic": "upper-body",
        "title": "The Dumbbell Bench Press: Gym Shorts (How To)",
        "creator": "Barbell Logic",
        "description": "Short technique demo; page text confirms dumbbell bench press form steps.",
        "url": "https://www.youtube.com/watch?v=ufl6HV5NN9g"
    },
    {
        "id": "v-wt-upper-seated-cable-rows",
        "topic": "upper-body",
        "title": "Seated Cable Row - Full Video Tutorial & Exercise Guide",
        "creator": "Fit Father Project",
        "description": "Full step-by-step seated cable row tutorial.",
        "url": "https://www.youtube.com/watch?v=CsROhQ1onAg"
    },
    {
        "id": "v-wt-upper-incline-dumbbell-press",
        "topic": "upper-body",
        "title": "Incline Dumbbell Bench Press: Gym Shorts (How To)",
        "creator": "Barbell Logic",
        "description": "Short demo; page text confirms 30-60 degree bench angle, touch point, and form steps. First candidate (Fit Father Project VDU5bzE2qOE) could not be opened (HTTP 429), not used.",
        "url": "https://www.youtube.com/watch?v=PZecKOpWOrk"
    },
    {
        "id": "v-wt-upper-seated-overhead-press",
        "topic": "upper-body",
        "title": "Seated Dumbbell Press: Gym Shorts (How To)",
        "creator": "Barbell Logic",
        "description": "Seated dumbbell overhead press demo; shown without back support.",
        "url": "https://www.youtube.com/watch?v=e4GP9M687zY"
    },
    {
        "id": "v-wt-upper-lat-pulldowns",
        "topic": "upper-body",
        "title": "How to do Lat Pulldowns (AVOID MISTAKES!)",
        "creator": "ATHLEAN-X",
        "description": "Thorough form guide (leg pad, grip, torso angle, pull target, eccentric).",
        "url": "https://www.youtube.com/watch?v=SALxEARiMkw"
    },
    {
        "id": "v-wt-upper-push-ups",
        "topic": "upper-body",
        "title": "How to Do a Push-Up",
        "creator": "Howcast",
        "description": "Step-by-step push-up form, including a beginner knee variant. Howcast production in the Warrior Fitness series.",
        "url": "https://www.youtube.com/watch?v=zVU8lfAKuuI"
    },
    {
        "id": "v-wt-upper-assisted-pull-ups",
        "topic": "upper-body",
        "title": "Pull-Up Exercise Guide: How To Do A Pull-Up If You Can't Do One",
        "creator": "Fit Father Project",
        "description": "Band-assisted pull-up setup and step-by-step form.",
        "url": "https://www.youtube.com/watch?v=G1akmeQRM_E"
    },
    {
        "id": "v-wt-upper-single-arm-dumbbell-rows",
        "topic": "upper-body",
        "title": "How To Do A One Arm Dumbbell Row - Complete Video Tutorial & Exercise Guide",
        "creator": "Fit Father Project",
        "description": "Bench-supported one-arm row, full form tutorial.",
        "url": "https://www.youtube.com/watch?v=ze6J_KJtJJ8"
    },
    {
        "id": "v-wt-upper-face-pulls",
        "topic": "upper-body",
        "title": "Face Pull",
        "creator": "WhiteCoatTrainer",
        "description": "Cable face pull form video; page text thin but embedding WhiteCoatTrainer article confirms it as the face-pull form video.",
        "url": "https://www.youtube.com/watch?v=NEih7QoyjJ4"
    },
    {
        "id": "v-wt-upper-dumbbell-bicep-curls",
        "topic": "upper-body",
        "title": "Bicep Curls - (DUMBBELL FORM & TECHNIQUE)",
        "creator": "Fit Father Project",
        "description": "Standing dumbbell curl technique with peak contraction and pre-stretch cues.",
        "url": "https://www.youtube.com/watch?v=XE_pHwbst04"
    },
    {
        "id": "v-wt-upper-triceps-cable-pushdowns",
        "topic": "upper-body",
        "title": "How To: Rope Push-Down",
        "creator": "Scott Herman Fitness",
        "description": "Rope pushdown demo; channel confirmed via Scott Herman links in description.",
        "url": "https://www.youtube.com/watch?v=vB5OHsJ3EME"
    },
    {
        "id": "v-wt-upper-dumbbell-lateral-raises",
        "topic": "upper-body",
        "title": "Dumbbell Lateral Raise: Gym Shorts (How To)",
        "creator": "Barbell Logic",
        "description": "Short strict-form demo: neutral grip, arms out to sides, palms down, torso still.",
        "url": "https://www.youtube.com/watch?v=TM6se0vr1VA"
    },
    {
        "id": "v-wt-upper-cable-chest-flyes",
        "topic": "upper-body",
        "title": "STOP F*cking Up Cable Flys (PROPER FORM!)",
        "creator": "ATHLEAN-X",
        "description": "Cable crossover/fly form guide covering pulley heights for upper, middle, and lower chest. Title contains profanity; flag for user approval.",
        "url": "https://www.youtube.com/watch?v=JUDTGZh4rhg"
    },
    {
        "id": "v-wt-upper-dumbbell-pullovers",
        "topic": "upper-body",
        "title": "How to Do a Dumbbell Pullover",
        "creator": "Howcast",
        "description": "Bench dumbbell pullover demo with moderate-weight and shoulder-safety cautions.",
        "url": "https://www.youtube.com/watch?v=zUVzVXMh9Nc"
    },
    {
        "id": "v-wt-upper-bench-dips",
        "topic": "upper-body",
        "title": "How To Do Bench Dips For Bigger Triceps - The Proper Form, Sets, Reps & Routine Recommendations",
        "creator": "Fit Father Project",
        "description": "Full bench dip tutorial: elbows pinned, back close to bench, 90-degree depth.",
        "url": "https://www.youtube.com/watch?v=j_WpuVY3wbo"
    },
    {
        "id": "v-wt-lower-goblet-squats",
        "topic": "lower-body",
        "title": "Kettlebell goblet squat demo",
        "creator": "RD Athletics",
        "description": "Kettlebell goblet squat demo with upright-torso, feet, and elbow-tuck tips; same movement pattern as the entry's dumbbell version.",
        "url": "https://www.youtube.com/watch?v=MywbtGRNbYg"
    },
    {
        "id": "v-wt-lower-romanian-deadlifts-rdls",
        "topic": "lower-body",
        "title": "Perfect Romanian Deadlift (RDL) Tips:",
        "creator": "",
        "description": "Instructional form-tips Short covering stance, setup, lowering, return, neck/load path; channel could not be confirmed from page text or follow-up search. Known unverified fallback: Barbell Logic RDL in 5 Minutes (amLSSb8cXok), watch page not opened.",
        "url": "https://www.youtube.com/watch?v=XOmFYME7ru4"
    },
    {
        "id": "v-wt-lower-bulgarian-split-squats",
        "topic": "lower-body",
        "title": "How to do a Bulgarian Split Squat Exercise | Tutorial, Benefits, and Variations to Try",
        "creator": "Erin Stern",
        "description": "Step-by-step tutorial: bench setup, positioning, execution, drive/return, 8-12 reps per leg.",
        "url": "https://www.youtube.com/watch?v=je7lk51Vl8c"
    },
    {
        "id": "v-wt-lower-leg-press",
        "topic": "lower-body",
        "title": "Leg Press Form: Just Past 90°, Back Flat & 5 Mistakes",
        "creator": "",
        "description": "3D-model form guide: setup, lower just past 90, high vs low feet (matches entry's high-foot note), wide vs narrow, 5 mistakes. Channel not shown in fetched page text.",
        "url": "https://www.youtube.com/watch?v=ytYJcatOAxk"
    },
    {
        "id": "v-wt-lower-barbell-hip-thrusts",
        "topic": "lower-body",
        "title": "Best Hip Thrust For Glute Gains (ADD THIS!)",
        "creator": "Mind Pump Media",
        "description": "Banded barbell hip thrust tutorial: band above knees, elbows on bench, chin tucked, vertical shins, slow reps.",
        "url": "https://www.youtube.com/watch?v=8twog5p2ObE"
    },
    {
        "id": "v-wt-lower-standing-calf-raises",
        "topic": "lower-body",
        "title": "Dumbbell Standing Calf Raises Tutorial | Calf Strength Exercise | Proper Form Step by Step Guide",
        "creator": "",
        "description": "Dumbbell standing calf raise with setup, execution, mistakes; matches entry (heels high, pause at top, lower slowly). Description references a Lean Physique Lab training plan; channel unconfirmed.",
        "url": "https://www.youtube.com/watch?v=xzhX4SQEMvM"
    },
    {
        "id": "v-wt-lower-seated-calf-raises",
        "topic": "lower-body",
        "title": "How To Do A Seated Calf Raise",
        "creator": "PureGym",
        "description": "Seated calf raise with a dumbbell on each thigh just above the knee, matching the entry exactly.",
        "url": "https://www.youtube.com/watch?v=3ZRe_QpvRPg"
    },
    {
        "id": "v-wt-lower-lying-leg-curls",
        "topic": "lower-body",
        "title": "Lying Leg Curl",
        "creator": "",
        "description": "Title confirms machine lying leg curl; fetched page text thin (title only), but embedding MyProtein guide describes exact prone machine setup. Channel unconfirmed.",
        "url": "https://www.youtube.com/watch?v=YpB3pc1e88Q"
    },
    {
        "id": "v-wt-lower-kettlebell-swings",
        "topic": "lower-body",
        "title": "Kettle Bell Swing Tutorial",
        "creator": "White Coat Trainer",
        "description": "Full two-hand swing tutorial, embedded in a detailed form guide.",
        "url": "https://www.youtube.com/watch?v=Nq02624lRjU"
    },
    {
        "id": "v-wt-lower-cable-pull-throughs",
        "topic": "lower-body",
        "title": "Cable Pull Through Tutorial",
        "creator": "",
        "description": "Title confirms exact exercise; embedding White Coat Trainer guide covers rope setup, low pulley, hip hinge, glute squeeze. Channel unconfirmed from page text.",
        "url": "https://www.youtube.com/watch?v=Cuqf21hE-4g"
    },
    {
        "id": "v-wt-lower-trap-bar-deadlifts",
        "topic": "lower-body",
        "title": "Trap Bar Deadlift",
        "creator": "OPEX Fitness",
        "description": "Form demo: feet shoulder-width, straight spine, squeeze glutes, extend to standing, hinge back down.",
        "url": "https://www.youtube.com/watch?v=FYx76NSijfU"
    },
    {
        "id": "v-wt-lower-glute-ham-raises",
        "topic": "lower-body",
        "title": "PERFECT YOUR GLUTE-HAM RAISE",
        "creator": "Onnit",
        "description": "Full GHR tutorial: bench setup, step-by-step execution, muscles worked, no-bench alternatives. First candidate (Catalyst Athletics 1TlhdiFSJrU) failed to fetch (429), replaced.",
        "url": "https://www.youtube.com/watch?v=Co7xAWe3hwo"
    },
    {
        "id": "v-wt-lower-walking-lunges",
        "topic": "lower-body",
        "title": "How To Do Walking Lunges",
        "creator": "PureGym",
        "description": "Step-by-step demo: big step, front thigh parallel, back shin parallel, drive through front foot into next step.",
        "url": "https://www.youtube.com/watch?v=mAgbXQdd4LM"
    },
    {
        "id": "v-wt-lower-front-squats-dumbbell-or-kettlebell",
        "topic": "lower-body",
        "title": "Dumbbell Front Squat Tutorial",
        "creator": "",
        "description": "Dumbbell front squat tutorial; embedding guide (credits Merrick Lincoln, DPT, CSCS) confirms dumbbells racked on each shoulder, matching entry. Channel unconfirmed.",
        "url": "https://www.youtube.com/watch?v=-86u3KDj1ck"
    },
    {
        "id": "v-wt-lower-sumo-deadlifts-kettlebell",
        "topic": "lower-body",
        "title": "Kettlebell Sumo Deadlift",
        "creator": "Girls Gone Strong",
        "description": "KB sumo deadlift from a wide stance, driving knees out, targeting inner thighs and glutes.",
        "url": "https://www.youtube.com/watch?v=odS65TnXgU0"
    }
  ]
};

var VIDEO_BY_ID = {};
VIDEO_LIBRARY.videos.forEach(function (v) { VIDEO_BY_ID[v.id] = v; });

/* Resolve a video id to its full video object. Unknown ids warn and return
 * null so one bad id is skipped instead of blanking the page. */
function resolveVideo(id) {
  var v = VIDEO_BY_ID[id];
  if (!v) {
    if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
      console.warn('unknown video id: ' + id);
    }
    return null;
  }
  return v;
}

/* All videos for one topic, in library order. */
function videosForTopic(topicId) {
  return VIDEO_LIBRARY.videos.filter(function (v) { return v.topic === topicId; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VIDEO_LIBRARY: VIDEO_LIBRARY,
    resolveVideo: resolveVideo,
    videosForTopic: videosForTopic,
  };
}
