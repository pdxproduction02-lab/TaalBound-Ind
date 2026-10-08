(() => {
'use strict';


// ============================================================
// TAALBOUND v0.3
// PULSE — MUSIC SYNCHRONIZED LEVEL SYSTEM
// ============================================================


const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const deathScreen = document.getElementById('deathScreen');

const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const progressFill = document.getElementById('progressFill');
const percent = document.getElementById('percent');
const sectionName = document.getElementById('sectionName');
const music = document.getElementById('music');

const resultTitle = document.getElementById('resultTitle');


// ============================================================
// DISPLAY
// ============================================================

let W = innerWidth;
let H = innerHeight;

let dpr = Math.min(
  devicePixelRatio || 1,
  2
);

function resize() {

  W = innerWidth;
  H = innerHeight;

  dpr = Math.min(
    devicePixelRatio || 1,
    2
  );

  canvas.width =
    Math.floor(W * dpr);

  canvas.height =
    Math.floor(H * dpr);

  canvas.style.width =
    W + 'px';

  canvas.style.height =
    H + 'px';

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}

addEventListener(
  'resize',
  resize
);

resize();


// ============================================================
// MUSIC / RHYTHM
// ============================================================

const BPM = 128;

const BEAT_TIME =
  60 / BPM;

// World distance travelled per beat.
const BEAT_DISTANCE = 150;

// 128 BPM × 150 pixels per beat.
const BASE_SPEED =
  BEAT_DISTANCE / BEAT_TIME;

// Approximate PULSE duration.
const LEVEL_DURATION = 176;


// ============================================================
// PHYSICS
// ============================================================

const PLAYER_X = 140;

const GROUND_OFFSET = 105;

function GROUND_Y() {
  return H - GROUND_OFFSET;
}


// ============================================================
// GAME STATE
// ============================================================

let running = false;

let dead = false;

let finished = false;

let last = 0;

let worldX = 0;

let score = 0;

let currentBeat = -1;

let beatPulse = 0;

let sectionPulse = 0;

let particles = [];

  // ============================================================
// V0.4 MOVEMENT SYSTEM
// ============================================================

const NORMAL_SPEED = 320;

const SPEED_SAMPLE_RATE = 120;

let currentSpeed = NORMAL_SPEED;


// ============================================================
// PULSE — SPEED TIMELINE
// ============================================================
//
// Percentage is relative to NORMAL_SPEED.
//
// +20%  = 1.20 × normal
// +50%  = 1.50 × normal
// +90%  = 1.90 × normal
// +100% = 2.00 × normal
// -50%  = 0.50 × normal
//
// Speed changes are smoothly interpolated between timestamps.
// ============================================================

const SPEED_KEYFRAMES = [

  { time: 0,   multiplier: 1.00 },

  { time: 15,  multiplier: 1.20 },

  { time: 34,  multiplier: 1.30 },

  { time: 50,  multiplier: 1.50 },

  { time: 60,  multiplier: 1.90 },

  { time: 65,  multiplier: 2.00 },

  { time: 90,  multiplier: 0.70 },

  { time: 100, multiplier: 1.00 },

  { time: 120, multiplier: 1.50 },

  { time: 124, multiplier: 1.90 },

  { time: 150, multiplier: 0.70 },

  { time: 160, multiplier: 1.00 }

];
  
// Jump physics
const GRAVITY = 1800;
const JUMP = -780;

// Jump forgiveness
const COYOTE_TIME = 0.10;
const JUMP_BUFFER_TIME = 0.12;

let coyoteTimer = 0;
let jumpBufferTimer = 0;

// ============================================================
// PLAYER
// ============================================================

const player = {

  x: PLAYER_X,

  y: 0,

  w: 34,

  h: 34,

  vy: 0,

  onGround: false,

  rot: 0

};


// ============================================================
// LEVEL OBJECTS
// ============================================================

let hazards = [];


// ============================================================
// LEVEL BUILDER
// ============================================================

function buildLevel() {
  hazards = [];

  function spike(beat, width = 38, height = 42) {
    hazards.push({
      type: 'spike',
      x: getWorldXForTime(beat * BEAT_TIME),
      w: width,
      h: height
    });
  }

  function doubleSpike(beat) {
    spike(beat, 38, 42);
    spike(beat + 2, 38, 42);
  }

  function tallBarrier(beat) {
    hazards.push({
      type: 'barrier',
      x: getWorldXForTime(beat * BEAT_TIME),
      w: 44,
      h: 72
    });
  }

  function rhythmPattern(startBeat, pattern) {
    for (const offset of pattern) {
      spike(startBeat + offset);
    }
  }

  // INTRO
  rhythmPattern(16, [0, 4, 8, 12, 16, 20, 24, 28]);

  // RHYTHM
  rhythmPattern(48, [0, 4, 8, 12]);
  doubleSpike(64);
  spike(72);
  doubleSpike(76);
  spike(84);
  doubleSpike(88);
  spike(96);

  // BUILD
  rhythmPattern(104, [0, 4, 8, 12, 16, 20, 24]);
  doubleSpike(132);
  spike(140);
  doubleSpike(144);
  spike(152);
  doubleSpike(156);
  spike(164);
  tallBarrier(168);

  // FIRST DROP
  rhythmPattern(176, [0, 4, 8, 12]);
  doubleSpike(192);
  spike(200);
  doubleSpike(204);
  spike(212);
  doubleSpike(216);
  spike(224);
  doubleSpike(228);
  spike(236);
  doubleSpike(240);
  spike(248);

  // BREAK
  spike(260);
  spike(272);
  tallBarrier(284);
  spike(296);

  // BUILD 2
  rhythmPattern(304, [0, 4, 8, 12, 16]);
  tallBarrier(324);
  spike(332);

  // FINAL DROP
  doubleSpike(336);
  spike(344);
  doubleSpike(348);
  spike(356);
  doubleSpike(360);
  spike(368);
  doubleSpike(372);
}


// ============================================================
// SECTION SYSTEM
// ============================================================

function getSection(time) {
  if (time < 30) return 'INTRO';
  if (time < 60) return 'RHYTHM';
  if (time < 90) return 'BUILD';
  if (time < 120) return 'DROP';
  if (time < 150) return 'BREAK';
  if (time < 175) return 'FINAL DROP';
  return 'FINALE';
}

function smoothStep(t) {

  t = Math.max(
    0,
    Math.min(1, t)
  );

  return (
    t * t *
    (3 - 2 * t)
  );

}


function getSpeedForTime(time) {

  const points =
    SPEED_KEYFRAMES;

  if (time <= points[0].time) {
    return (
      NORMAL_SPEED *
      points[0].multiplier
    );
  }


  for (
    let i = 0;
    i < points.length - 1;
    i++
  ) {

    const a = points[i];
    const b = points[i + 1];


    if (
      time >= a.time &&
      time <= b.time
    ) {

      const rawT =
        (time - a.time) /
        (b.time - a.time);

      const t =
        smoothStep(rawT);

      const multiplier =
        a.multiplier +
        (
          b.multiplier -
          a.multiplier
        ) * t;

      return (
        NORMAL_SPEED *
        multiplier
      );

    }

  }


  return (
    NORMAL_SPEED *
    points[points.length - 1]
      .multiplier
  );

}

const worldDistanceTable = [];

function buildWorldDistanceTable() {
  worldDistanceTable.length = 0;

  const totalSamples =
    Math.ceil(
      LEVEL_DURATION *
      SPEED_SAMPLE_RATE
    );

  let distance = 0;
  let previousTime = 0;

  let previousSpeed =
    getSpeedForTime(0);

  worldDistanceTable.push({
    time: 0,
    distance: 0,
    speed: previousSpeed
  });

  for (
    let i = 1;
    i <= totalSamples;
    i++
  ) {
    const time =
      Math.min(
        LEVEL_DURATION,
        i / SPEED_SAMPLE_RATE
      );

    const speed =
      getSpeedForTime(time);

    distance +=
      ((previousSpeed + speed) * 0.5) *
      (time - previousTime);

    worldDistanceTable.push({
      time,
      distance,
      speed
    });

    previousTime = time;
    previousSpeed = speed;
  }
}

function getWorldXForTime(time) {
  const t =
    Math.max(
      0,
      Math.min(
        LEVEL_DURATION,
        time
      )
    );

  const scaled =
    t * SPEED_SAMPLE_RATE;

  const index =
    Math.floor(scaled);

  if (
    index >=
    worldDistanceTable.length - 1
  ) {
    return worldDistanceTable[
      worldDistanceTable.length - 1
    ].distance;
  }

  const a =
    worldDistanceTable[index];

  const b =
    worldDistanceTable[index + 1];

  const mix =
    scaled - index;

  return (
    a.distance +
    (b.distance - a.distance) *
    mix
  );
}

buildWorldDistanceTable();
buildLevel();

// ============================================================
// RESET
// ============================================================

function reset() {

  music.pause();

  music.currentTime = 0;


  worldX = 0;
  currentSpeed = NORMAL_SPEED;

  currentBeat = -1;

  beatPulse = 0;

  sectionPulse = 0;

  particles = [];


  dead = false;

  finished = false;

  running = true;


  player.x =
    PLAYER_X;

  player.y =
    GROUND_Y() -
    player.h;

  player.vy = 0;

  player.onGround = true;

  player.rot = 0;


  resultTitle.textContent =
    'PULSE FAILED';


  deathScreen.classList.add(
    'hidden'
  );

  startScreen.classList.add(
    'hidden'
  );


  progressFill.style.width =
    '0%';

  percent.textContent =
    '0%';


  const playPromise =
    music.play();

  if (
    playPromise !== undefined
  ) {

    playPromise.catch(() => {

      console.log(
        'Audio playback blocked.'
      );

    });

  }


  last =
    performance.now();


  requestAnimationFrame(
    loop
  );

}


// ============================================================
// JUMP
// ============================================================

function jump() {
  if (!running || dead || finished) return;

  // Remember the jump input briefly.
  jumpBufferTimer = JUMP_BUFFER_TIME;

  // Allow jumping slightly after leaving a platform.
  if (player.onGround || coyoteTimer > 0) {
    performJump();
  }
}

function performJump() {
  player.vy = JUMP;
  player.onGround = false;

  coyoteTimer = 0;
  jumpBufferTimer = 0;

  createJumpParticles();
}


// ============================================================
// INPUT
// ============================================================

addEventListener(
  'keydown',
  e => {

    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp'
    ) {

      e.preventDefault();

      jump();

    }

  }
);


canvas.addEventListener(
  'pointerdown',
  e => {

    e.preventDefault();

    jump();

  },
  {
    passive: false
  }
);


startButton.onclick =
  reset;

restartButton.onclick =
  reset;


// ============================================================
// DEATH
// ============================================================

function die() {

  if (
    dead ||
    finished
  ) {

    return;

  }


  dead = true;

  running = false;


  music.pause();


  resultTitle.textContent =
    'PULSE FAILED';


  deathScreen.classList.remove(
    'hidden'
  );

}


// ============================================================
// FINISH
// ============================================================

function finish() {

  if (
    finished ||
    dead
  ) {

    return;

  }


  finished = true;

  running = false;


  music.pause();


  progressFill.style.width =
    '100%';

  percent.textContent =
    '100%';


  resultTitle.textContent =
    'PULSE COMPLETE';


  deathScreen.classList.remove(
    'hidden'
  );

}


// ============================================================
// COLLISION
// ============================================================

function rectHit(a, b) {

  return (

    a.x <
    b.x + b.w &&

    a.x + a.w >
    b.x &&

    a.y <
    b.y + b.h &&

    a.y + a.h >
    b.y

  );

}


// ============================================================
// PARTICLES
// ============================================================

function createJumpParticles() {

  for (
    let i = 0;
    i < 6;
    i++
  ) {

    particles.push({

      x:
        player.x +
        player.w / 2,

      y:
        player.y +
        player.h,

      vx:
        (Math.random() - 0.5) *
        90,

      vy:
        Math.random() *
        70,

      life:
        0.35 +

        Math.random() *
        0.2

    });

  }

}

function createLandingParticles() {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x + player.w / 2,
      y: player.y + player.h,
      vx: (Math.random() - 0.5) * 180,
      vy: -Math.random() * 80,
      life: 0.25 + Math.random() * 0.15
    });
  }
}
function createBeatParticles() {

  for (
    let i = 0;
    i < 5;
    i++
  ) {

    particles.push({

      x:
        W * 0.5,

      y:
        GROUND_Y(),

      vx:
        (Math.random() - 0.5) *
        260,

      vy:
        -Math.random() *
        180,

      life:
        0.25 +

        Math.random() *
        0.25

    });

  }

}


function updateParticles(dt) {

  for (
    const p of particles
  ) {

    p.x +=
      p.vx * dt;

    p.y +=
      p.vy * dt;

    p.vy +=
      400 * dt;

    p.life -=
      dt;

  }


  particles =
    particles.filter(
      p => p.life > 0
    );

}


function drawParticles() {

  for (
    const p of particles
  ) {

    ctx.globalAlpha =
      Math.max(
        0,
        p.life * 2
      );

    ctx.fillStyle =
      '#68e7ff';

    ctx.fillRect(
      p.x,
      p.y,
      3,
      3
    );

  }

  ctx.globalAlpha = 1;

}


// ============================================================
// UPDATE
// ============================================================

function update(dt) {

  if (
    !music.paused &&
    music.readyState >= 2
  ) {

    /*
      IMPORTANT:

      Audio is now the authoritative clock.

      We no longer rely on accumulated dt
      for level synchronization.
    */

    worldX = getWorldXForTime(music.currentTime);
    currentSpeed =
  getSpeedForTime(music.currentTime);
  }
if (sectionName) {
  sectionName.textContent =
    getSection(music.currentTime);
}

  // ==========================================================
// PLAYER PHYSICS
// ==========================================================
const wasOnGround =
  player.onGround;
if (player.onGround) {
  coyoteTimer = COYOTE_TIME;
} else {
  coyoteTimer =
    Math.max(0, coyoteTimer - dt);
}

jumpBufferTimer =
  Math.max(0, jumpBufferTimer - dt);

  if (
  !wasOnGround &&
  player.onGround
) {
  createLandingParticles();

  player.rot =
    Math.round(
      player.rot /
      (Math.PI / 2)
    ) *
    (Math.PI / 2);
  }

// Gravity
player.vy +=
  GRAVITY * dt;

player.y +=
  player.vy * dt;


const gy =
  GROUND_Y();


if (
  player.y +
  player.h >=
  gy
) {

  player.y =
    gy -
    player.h;

  player.vy = 0;

  player.onGround =
    true;

  // If jump was pressed slightly
  // before landing, jump immediately.
  if (jumpBufferTimer > 0) {
    performJump();
  }

}

else {

  player.onGround =
    false;

}

  // ==========================================================
  // BEAT CLOCK
  // ==========================================================

  const newBeat =
    Math.floor(
      music.currentTime /
      BEAT_TIME
    );


  if (
    newBeat !==
    currentBeat
  ) {

    currentBeat =
      newBeat;

    beatPulse = 1;

    sectionPulse = 1;

    createBeatParticles();

  }


  beatPulse *=
    Math.pow(
      0.001,
      dt
    );


  sectionPulse *=
    Math.pow(
      0.01,
      dt
    );


  // ==========================================================
  // PLAYER ROTATION
  // ==========================================================

  if (!player.onGround) {

  player.rot +=
    8 * dt;

} else {

  player.rot *=
    Math.pow(
      0.02,
      dt
    );

  }


  // ==========================================================
  // COLLISION
  // ==========================================================

  const playerWorldX =
    worldX +
    player.x;


  for (
    const h of hazards
  ) {

    const hx =
      h.x;


    const hy =
      gy -
      h.h;


    const box = {

      x: hx,

      y: hy,

      w: h.w,

      h: h.h

    };


    /*
      Slight collision forgiveness.

      Visual player remains 34px,
      collision box is slightly smaller.
    */

    const playerBox = {

      x:
        playerWorldX +
        6,

      y:
        player.y +
        6,

      w:
        player.w -
        12,

      h:
        player.h -
        10

    };


    if (
      rectHit(
        playerBox,
        box
      )
    ) {

      die();

      return;

    }

  }


  // ==========================================================
  // PROGRESS
  // ==========================================================

  const progress =
    Math.min(
      100,

      Math.floor(
        (
          music.currentTime /
          LEVEL_DURATION
        ) * 100
      )
    );


  score =
    progress;


  progressFill.style.width =
    score + '%';

  percent.textContent =
    score + '%';


  // ==========================================================
  // END
  // ==========================================================

  if (
    music.currentTime >=
    LEVEL_DURATION - 0.15
  ) {

    finish();

    return;

  }


  updateParticles(dt);

}


// ============================================================
// BACKGROUND
// ============================================================

function drawBackground() {

  const gy =
    GROUND_Y();


  const time =
    music.currentTime;


  const section =
    getSection(time);


  // ==========================================================
  // SECTION-BASED BACKGROUND
  // ==========================================================

  let topColor =
    '#070a12';

  let bottomColor =
    '#101b28';


  if (
    section === 'DROP'
  ) {

    topColor =
      '#090b18';

    bottomColor =
      '#172333';

  }


  if (
    section === 'FINAL DROP'
  ) {

    topColor =
      '#100916';

    bottomColor =
      '#24162c';

  }


  if (
    section === 'FINALE'
  ) {

    topColor =
      '#101018';

    bottomColor =
      '#201f2b';

  }


  const grad =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );


  grad.addColorStop(
    0,
    topColor
  );

  grad.addColorStop(
    1,
    bottomColor
  );


  ctx.fillStyle =
    grad;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  // ==========================================================
  // BEAT FLASH
  // ==========================================================

  ctx.fillStyle =
    `rgba(104,231,255,${
      0.025 +
      beatPulse * 0.10
    })`;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  // ==========================================================
  // DISTANT CITY
  // ==========================================================

  for (
    let i = -2;
    i < 16;
    i++
  ) {

    const x =
      (
        i * 180 -
        (worldX * 0.08) % 180 +
        W
      ) % W;


    const height =
      80 +
      (i % 4) * 38;


    ctx.fillStyle =
      'rgba(40,100,120,.18)';


    ctx.fillRect(
      x,
      gy - height,
      58,
      height
    );


    ctx.fillStyle =
      'rgba(104,231,255,.12)';


    ctx.fillRect(
      x + 8,
      gy - height + 12,
      3,
      height - 20
    );

  }
  
// ==========================================================
// FUTURISTIC ARCHITECTURE
// ==========================================================

const architectureOffset =
  (worldX * 0.12) % 420;

for (let i = -1; i < 6; i++) {

  const x =
    i * 420 -
    architectureOffset +
    80;

  const baseY =
    gy - 18;

  const height =
    150 +
    ((i + 3) % 3) * 55;

  ctx.strokeStyle =
    'rgba(104,231,255,.11)';

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    x,
    baseY
  );

  ctx.lineTo(
    x + 90,
    baseY - height
  );

  ctx.lineTo(
    x + 180,
    baseY
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(
    x + 45,
    baseY
  );

  ctx.lineTo(
    x + 90,
    baseY - height
  );

  ctx.lineTo(
    x + 135,
    baseY
  );

  ctx.stroke();

  for (
    let k = 1;
    k < 4;
    k++
  ) {

    const y =
      baseY -
      (height * k / 4);

    ctx.globalAlpha =
      0.12;

    ctx.beginPath();

    ctx.moveTo(
      x + 90 - k * 10,
      y
    );

    ctx.lineTo(
      x + 90 + k * 10,
      y
    );

    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

  // ==========================================================
  // LARGE RHYTHM RINGS
  // ==========================================================

  for (
    let i = 0;
    i < 5;
    i++
  ) {

    const x =
      (
        i * 260 -
        (worldX * 0.16) % 260 +
        W
      ) % W;


    const y =
      gy -
      180 -
      (i % 2) * 70;


    const radius =
      45 +
      (i % 3) * 15;


    ctx.strokeStyle =
      `rgba(104,231,255,${
        0.07 +
        beatPulse * 0.04
      })`;


    ctx.lineWidth =
      2;


    ctx.beginPath();


    ctx.arc(
      x,
      y,
      radius +
      beatPulse * 12,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    for (
      let k = 0;
      k < 8;
      k++
    ) {

      const a =
        k * Math.PI / 4;


      ctx.beginPath();


      ctx.arc(
        x +
        Math.cos(a) *
        65,

        y +
        Math.sin(a) *
        65,

        3,

        0,

        Math.PI * 2
      );


      ctx.stroke();

    }

  }


  // ==========================================================
  // FLOOR
  // ==========================================================

  ctx.fillStyle =
    '#0a111b';


  ctx.fillRect(
    0,
    gy,
    W,
    H - gy
  );


  ctx.fillStyle =
    '#68e7ff';


  ctx.fillRect(
    0,
    gy,
    W,
    2
  );


  // Beat grid.

  ctx.globalAlpha =
    0.10;


  for (
    let x =
      -(worldX %
      BEAT_DISTANCE);

    x < W;

    x +=
      BEAT_DISTANCE
  ) {

    ctx.fillRect(
      x,
      gy + 20,
      1,
      H - gy - 20
    );

  }


  ctx.globalAlpha =
    1;


  // ==========================================================
  // SECTION LABEL
  // ==========================================================

  ctx.globalAlpha =
    Math.min(
      1,
      0.35 +
      sectionPulse
    );


  ctx.fillStyle =
    '#68e7ff';


  ctx.font =
    '700 11px Arial';


  ctx.textAlign =
    'right';


  ctx.fillText(
    section,
    W - 18,
    H - 18
  );


  ctx.globalAlpha =
    1;

}


// ============================================================
// PLAYER
// ============================================================

function drawPlayer() {

  ctx.save();


  ctx.translate(
    player.x +
    player.w / 2,

    player.y +
    player.h / 2
  );


  ctx.rotate(
    player.rot
  );


  // Outer glow.

  ctx.fillStyle =
    '#f2f6f8';


  ctx.shadowColor =
    '#68e7ff';


  ctx.shadowBlur =
    18;


  ctx.fillRect(
    -player.w / 2,
    -player.h / 2,
    player.w,
    player.h
  );


  ctx.shadowBlur =
    0;


  ctx.strokeStyle =
    '#68e7ff';


  ctx.lineWidth =
    2;


  ctx.strokeRect(
    -player.w / 2,
    -player.h / 2,
    player.w,
    player.h
  );


  // Core.

  ctx.fillStyle =
    '#0b111a';


  ctx.fillRect(
    -7,
    -7,
    14,
    14
  );


  ctx.restore();

}


// ============================================================
// HAZARDS
// ============================================================

function drawHazards() {

  const gy =
    GROUND_Y();


  for (
    const h of hazards
  ) {

    const sx =
      h.x -
      worldX;


    if (
      sx <
      -100 ||
      sx >
      W + 100
    ) {

      continue;

    }


    if (
      h.type ===
      'spike'
    ) {

      ctx.fillStyle =
        '#ff5b4d';


      ctx.shadowColor =
        '#ff5b4d';


      ctx.shadowBlur =
        12;


      ctx.beginPath();


      ctx.moveTo(
        sx,
        gy
      );


      ctx.lineTo(
        sx +
        h.w / 2,

        gy -
        h.h
      );


      ctx.lineTo(
        sx +
        h.w,

        gy
      );


            ctx.closePath();

      ctx.fill();

      ctx.shadowBlur =
        0;

    }


    if (
      h.type ===
      'barrier'
    ) {

      ctx.fillStyle =
        '#ffb347';


      ctx.shadowColor =
        '#ffb347';


      ctx.shadowBlur =
        15;


      ctx.fillRect(
        sx,
        gy - h.h,

        h.w,
        h.h
      );


      ctx.shadowBlur =
        0;


      ctx.strokeStyle =
        '#ffe0a3';


      ctx.lineWidth =
        2;


      ctx.strokeRect(
        sx,
        gy - h.h,

        h.w,
        h.h
      );


      // Internal rhythm lines.

      ctx.strokeStyle =
        'rgba(10,17,27,.7)';


      for (
        let y =
          gy - h.h + 12;

        y <
          gy - 5;

        y += 12
      ) {

        ctx.beginPath();

        ctx.moveTo(
          sx + 5,
          y
        );

        ctx.lineTo(
          sx + h.w - 5,
          y
        );

        ctx.stroke();

      }

    }

  }

}


// ============================================================
// DRAW
// ============================================================

function draw() {

  drawBackground();

  drawHazards();

  drawParticles();

  drawPlayer();

  ctx.fillStyle =
  'rgba(255,255,255,.38)';

ctx.font =
  '600 10px Arial';

ctx.textAlign =
  'right';

ctx.fillText(
  Math.round(currentSpeed) +
  ' PX/S',
  W - 18,
  H - 34
);

}


// ============================================================
// GAME LOOP
// ============================================================

function loop(now) {

  if (
    !running
  ) {

    draw();

    return;

  }


  const dt =
    Math.min(
      (now - last) /
      1000,

      0.033
    );


  last =
    now;


  update(dt);

  draw();


  if (
    running
  ) {

    requestAnimationFrame(
      loop
    );

  }

}


// ============================================================
// INITIAL FRAME
// ============================================================

player.y =
  GROUND_Y() -
  player.h;


draw();


})();
