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
const INTENSE_SPEED = 390;
const BUILD_SPEED = 345;

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


  /*
    Every object is placed using BEATS.

    This means the level remains synchronized
    with the 128 BPM music.

    beat 100 = exactly 100 beats into PULSE.
  */


  function spike(
    beat,
    width = 38,
    height = 42
  ) {

    hazards.push({

      type: 'spike',

      x: getWorldXForTime(beat * BEAT_TIME),

      w: width,

      h: height

    });

  }


  function doubleSpike(beat) {

    spike(
      beat,
      38,
      42
    );

    spike(
      beat + 1,
      38,
      42
    );

  }


  function tallBarrier(beat) {

    hazards.push({

      type: 'barrier',

      x: getWorldXForTime(beat * BEAT_TIME),

      w: 44,

      h: 72

    });

  }


  // ==========================================================
  // INTRO — LEARN THE RHYTHM
  // ==========================================================

  spike(12);

  spike(16);

  spike(20);

  spike(24);

  spike(28);


  // ==========================================================
  // EARLY RHYTHM
  // ==========================================================

  spike(32);

  spike(36);

  doubleSpike(40);

  spike(44);

  spike(48);

  doubleSpike(52);

  spike(56);

  spike(60);

  spike(64);


  // ==========================================================
  // BUILD
  // ==========================================================

  for (
    let beat = 68;
    beat <= 96;
    beat += 4
  ) {

    spike(beat);

  }


  // ==========================================================
  // FIRST DROP
  // ==========================================================

  doubleSpike(100);

  spike(104);

  doubleSpike(108);

  spike(112);

  doubleSpike(116);

  spike(120);

  doubleSpike(124);

  spike(128);

  doubleSpike(132);

  spike(136);

  doubleSpike(140);

  spike(144);


  // ==========================================================
  // RHYTHMIC SWITCH
  // ==========================================================

  spike(148);

  spike(152);

  doubleSpike(156);

  spike(160);

  spike(164);

  doubleSpike(168);

  spike(172);

  spike(176);


  // ==========================================================
  // BREAKDOWN
  // ==========================================================

  spike(184);

  spike(192);

  tallBarrier(200);


  // ==========================================================
  // BUILD 2
  // ==========================================================

  spike(204);

  spike(208);

  spike(212);

  spike(216);

  spike(220);

  tallBarrier(224);


  // ==========================================================
  // SECOND DROP
  // ==========================================================

  doubleSpike(228);

  spike(232);

  doubleSpike(236);

  spike(240);

  doubleSpike(244);

  spike(248);

  doubleSpike(252);

  spike(256);

  doubleSpike(260);

  spike(264);

  doubleSpike(268);

  spike(272);

  doubleSpike(276);

  spike(280);


  // ==========================================================
  // FINAL SECTION
  // ==========================================================

  spike(284);

  doubleSpike(288);

  spike(292);

  doubleSpike(296);

  spike(300);

  doubleSpike(304);

  spike(308);

  doubleSpike(312);

  spike(316);

  doubleSpike(320);

  spike(324);

  doubleSpike(328);

  spike(332);

  spike(336);

  spike(340);


}

buildLevel();


// ============================================================
// SECTION SYSTEM
// ============================================================

function getSection(time) {

  if (time < 30)
    return 'INTRO';

  if (time < 60)
    return 'RHYTHM';

  if (time < 90)
    return 'BUILD';

  if (time < 120)
    return 'DROP';

  if (time < 150)
    return 'BREAK';

  if (time < 175)
    return 'FINAL DROP';

  return 'FINALE';

}

  function getSpeedForTime(time) {
  const section = getSection(time);

  switch (section) {
    case 'INTRO':
      return NORMAL_SPEED;

    case 'RHYTHM':
      return NORMAL_SPEED;

    case 'BUILD':
      return BUILD_SPEED;

    case 'DROP':
      return INTENSE_SPEED;

    case 'BREAK':
      return NORMAL_SPEED;

    case 'FINAL DROP':
      return INTENSE_SPEED;

    case 'FINALE':
      return INTENSE_SPEED;

    default:
      return NORMAL_SPEED;
  }
  }
  function getWorldXForTime(time) {
  if (time <= 60) {
    return time * NORMAL_SPEED;
  }

  if (time <= 90) {
    return (
      60 * NORMAL_SPEED +
      (time - 60) * BUILD_SPEED
    );
  }

  if (time <= 120) {
    return (
      60 * NORMAL_SPEED +
      30 * BUILD_SPEED +
      (time - 90) * INTENSE_SPEED
    );
  }

  if (time <= 150) {
    return (
      60 * NORMAL_SPEED +
      30 * BUILD_SPEED +
      30 * INTENSE_SPEED +
      (time - 120) * NORMAL_SPEED
    );
  }

  if (time <= 175) {
    return (
      60 * NORMAL_SPEED +
      30 * BUILD_SPEED +
      30 * INTENSE_SPEED +
      30 * NORMAL_SPEED +
      (time - 150) * INTENSE_SPEED
    );
  }

  return (
    60 * NORMAL_SPEED +
    30 * BUILD_SPEED +
    30 * INTENSE_SPEED +
    30 * NORMAL_SPEED +
    25 * INTENSE_SPEED +
    (time - 175) * INTENSE_SPEED
  );
  }

// ============================================================
// RESET
// ============================================================

function reset() {

  music.pause();

  music.currentTime = 0;


  worldX = 0;

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

  }


  // ==========================================================
// PLAYER PHYSICS
// ==========================================================

if (player.onGround) {
  coyoteTimer = COYOTE_TIME;
} else {
  coyoteTimer =
    Math.max(0, coyoteTimer - dt);
}

jumpBufferTimer =
  Math.max(0, jumpBufferTimer - dt);


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

  if (
    !player.onGround
  ) {

    player.rot +=
      8 * dt;

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
