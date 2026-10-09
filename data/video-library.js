'use strict';
/**
 * VIDEO LIBRARY: the single place where demo videos live.
 *
 * How to swap videos (no logic rebuild needed):
 *   - To change the videos for an exercise: edit that exercise's `demo_ids`
 *     list in data/exercises.js (docs demo: docs/app.js) to point at
 *     different video ids below.
 *   - To change the videos for a whole topic: edit the `videos` list below.
 *   - To add a brand new video: append an entry to `videos` (pick a unique
 *     id, set its topic) and reference its id from any exercise or from
 *     FEATURED_DEMO_IDS.
 * Never edit app logic or the exercise catalog to change videos. The catalog
 * only holds video ids; this file holds the actual video data.
 *
 * Only reels that were verified in the original routine are listed here.
 * Never invent demo URLs.
 */

const VIDEO_LIBRARY = {
  topics: [
    { id: 'knee-rehab', name: 'Knee rehab', description: 'Verified demo reels for the knee recovery program.' },
    { id: 'upper-body', name: 'Upper body', description: 'Placeholder for the planned upper-body expansion.' },
    { id: 'back-arms', name: 'Back and arms', description: 'Placeholder for the planned back and arms expansion.' },
  ],
  videos: [
    // ---- Knee rehab (all currently verified reels) ----
    { id: 'v-chauhan-top9', topic: 'knee-rehab', title: 'Top 9 knee exercises',
      creator: 'Dr. Priya Chauhan, physio', handle: '@dr.chauhanpriya___mpt_ortho',
      description: 'Top 9 knee exercises, including labeled ankle pumps and heel slides.',
      url: 'https://www.instagram.com/reel/DdTa_2ipxGG/' },
    { id: 'v-jag-post-op', topic: 'knee-rehab', title: 'Post-knee-replacement starters',
      creator: 'JAG Physical Therapy', handle: '@jagphysicaltherapy',
      description: 'Post-knee-replacement starters: seated heel slides, quad sets, and ankle pumps.',
      url: 'https://www.instagram.com/reel/Dbs_7ZBDeSv/' },
    { id: 'v-crp-acl', topic: 'knee-rehab', title: 'Early ACL rehab',
      creator: 'CRP Care Rehab Performance', handle: '@carerehabperformance',
      description: 'Early ACL rehab with ankle pumps, heel slides, and towel-press quad activation.',
      url: 'https://www.instagram.com/reel/DY1ytN1zRyd/' },
    { id: 'v-jag-quad-sets', topic: 'knee-rehab', title: 'Quad sets, 10-second holds',
      creator: 'JAG Physical Therapy', handle: '@jagphysicaltherapy',
      description: 'Quad sets with 10-second holds for 10 reps.',
      url: 'https://www.instagram.com/reel/Dbs_7ZBDeSv/' },
    { id: 'v-chauhan-quad-iso', topic: 'knee-rehab', title: 'Quadriceps isometric demo',
      creator: 'Dr. Priya Chauhan', handle: '@dr.chauhanpriya___mpt_ortho',
      description: 'Labeled quadriceps isometric demonstration.',
      url: 'https://www.instagram.com/reel/DdTa_2ipxGG/' },
    { id: 'v-bobbrad-knee-ext', topic: 'knee-rehab', title: 'Seated knee extensions',
      creator: 'Bob and Brad', handle: '@officialbobandbrad',
      description: 'Seated knee extensions and heel slides routine.',
      url: 'https://www.instagram.com/reel/DbdouOfxuuc/' },
    { id: 'v-kneehaber-stepup', topic: 'knee-rehab', title: 'Step-up form',
      creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber',
      description: 'Controlled step-up form in an isometric and strength sequence.',
      url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    { id: 'v-djkim-slrdl', topic: 'knee-rehab', title: 'Single-leg RDL essentials',
      creator: 'DJ Kim', handle: '@djkim.yoga',
      description: 'Single-leg RDL in five essential knee exercises.',
      url: 'https://www.instagram.com/reel/DTb3fy5kUi2/' },
    { id: 'v-pauli-slrdl', topic: 'knee-rehab', title: 'Single-leg RDLs, 8 per side',
      creator: 'Pauli Reitman', handle: '@paulinareitman',
      description: 'Gym-based single-leg RDLs: 8 per side for 3 sets.',
      url: 'https://www.instagram.com/reel/DdUoESqphzG/' },
    { id: 'v-e3-slrdl', topic: 'knee-rehab', title: 'RDL progressions',
      creator: 'E3 Rehab', handle: '@e3rehab',
      description: 'Single-leg RDL and three-way RDL progressions.',
      url: 'https://www.instagram.com/reel/DZNUZX3SkJS/' },
    { id: 'v-kneehaber-spanish', topic: 'knee-rehab', title: 'Spanish squat setup',
      creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber',
      description: 'Spanish squat setup and hold alongside other knee-strength drills.',
      url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    { id: 'v-kneehaber-split', topic: 'knee-rehab', title: 'Split-squat hold',
      creator: 'Connor Clayton / thekneehaber', handle: '@thekneehaber',
      description: 'Split-squat hold position in a knee-strength sequence.',
      url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    { id: 'v-bobbrad-hamstring', topic: 'knee-rehab', title: 'Seated hamstring stretch',
      creator: 'Bob and Brad', handle: '@officialbobandbrad',
      description: 'Seated hamstring stretch for knee pain.',
      url: 'https://www.instagram.com/reel/DawDBQtgc70/' },
    { id: 'v-weshape-stretch', topic: 'knee-rehab', title: 'Stretch series',
      creator: 'WeShape', handle: '',
      description: 'Stretch series including a hamstring stretch.',
      url: 'https://www.instagram.com/reel/DXh11z9AicL/' },
    { id: 'v-sommer-calf', topic: 'knee-rehab', title: 'Wall calf stretch',
      creator: 'Sommer Riermaier', handle: '',
      description: 'Wall calf stretch demo explaining how tight calves affect the ankles and knees.',
      url: 'https://www.instagram.com/reel/DdoYCndzQ0L/' },
    { id: 'v-hoopes-calf', topic: 'knee-rehab', title: 'Calf stretch mistakes',
      creator: 'Dan Hoopes, MD, orthopedic surgeon', handle: '',
      description: 'Why most people do the wall calf stretch wrong, plus correct form.',
      url: 'https://www.instagram.com/reel/DbHm60QMxqG/' },
    { id: 'v-bobbrad-calf', topic: 'knee-rehab', title: 'Calf stretch demo',
      creator: 'Bob and Brad', handle: '@officialbobandbrad',
      description: 'Calf stretch demonstration.',
      url: 'https://www.instagram.com/reel/Da8K1oiBHiQ/' },
    { id: 'v-maloney-backward', topic: 'knee-rehab', title: 'Backward treadmill walking',
      creator: 'Matthew Maloney', handle: '@aclwonders',
      description: 'Backward treadmill walking in a knee-pain routine.',
      url: 'https://www.instagram.com/reel/DUlTcAoDmRm/' },
    { id: 'v-benpatrick-backward', topic: 'knee-rehab', title: 'Backward walking for knees',
      creator: 'Ben Patrick', handle: '@kneesovertoesguy',
      description: 'Backward treadmill walking for knee rebuilding.',
      url: 'https://www.instagram.com/reel/DYcmt2QOnV7/' },
    { id: 'v-djkim-featured', topic: 'knee-rehab', title: 'Single-leg RDL sequence',
      creator: 'DJ Kim', handle: '@djkim.yoga',
      description: 'Single-leg RDL form within a concise knee-strength sequence.',
      url: 'https://www.instagram.com/reel/DTb3fy5kUi2/' },
    { id: 'v-kneehaber-featured', topic: 'knee-rehab', title: 'Knee-strength combo',
      creator: 'thekneehaber', handle: '@thekneehaber',
      description: 'Spanish squat, split squat, and step-up form in one concise reel.',
      url: 'https://www.instagram.com/reel/DcQvZ7ZMLAB/' },
    { id: 'v-pauli-featured', topic: 'knee-rehab', title: 'Glute and leg session',
      creator: 'Pauli Reitman', handle: '@paulinareitman',
      description: 'Glute and leg session showing single-leg RDLs at 8 reps × 3 sets each side.',
      url: 'https://www.instagram.com/reel/DdUoESqphzG/' },
  ],
};

const VIDEO_BY_ID = new Map(VIDEO_LIBRARY.videos.map((v) => [v.id, v]));

/** Resolve a video id to its full video object. Throws on unknown ids so a
 *  typo fails loudly instead of rendering a broken demo link. */
function resolveVideo(id) {
  const v = VIDEO_BY_ID.get(id);
  if (!v) throw new Error('unknown video id: ' + id);
  return v;
}

/** All videos for one topic, in library order. */
function videosForTopic(topicId) {
  return VIDEO_LIBRARY.videos.filter((v) => v.topic === topicId);
}

module.exports = { VIDEO_LIBRARY, resolveVideo, videosForTopic };
