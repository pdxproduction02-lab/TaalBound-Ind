(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const deathScreen = document.getElementById('deathScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const progressFill = document.getElementById('progressFill');
const percent = document.getElementById('percent');

const music = document.getElementById('music');


// ============================================================
// DISPLAY
// ============================================================

let W = innerWidth;
let H = innerHeight;
let dpr = Math.min(devicePixelRatio || 1, 2);

function resize() {
  W = innerWidth;
  H = innerHeight;

  dpr = Math.min(devicePixelRatio || 1, 2);

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener('resize', resize);
resize();


// ============================================================
// PULSE MUSIC
// ============================================================

const BPM = 128;
const BEAT_TIME = 60 / BPM;

// 150 pixels travelled per beat.
// 150 * 128 / 60 = 320 pixels/sec.
const BEAT_DISTANCE = 150;
const SPEED = BEAT_DISTANCE / BEAT_TIME;

// PULSE master is approximately 2:56.
// Leave a little room at the end.
const LEVEL_DURATION = 176;
const WORLD_END = SPEED * LEVEL_DURATION;


// ============================================================
// PHYSICS
// ============================================================

const GRAVITY = 1850;
const JUMP = -720;

const PLAYER_X = 140;

const GROUND_Y = () => H - 105;


// ============================================================
// GAME STATE
// ============================================================

let running = false;
let dead = false;

let last = 0;

let worldX = 0;
let score = 0;

let currentBeat = 0;
let beatPulse = 0;

let player = {
  x: PLAYER_X,
  y: 0,
  w: 34,
  h: 34,
  vy: 0,
  onGround: false,
  rot: 0
};

let hazards = [];


// ============================================================
// LEVEL DATA
// ============================================================

function buildLevel() {

  hazards = [];

  const addSpike = (beat, width = 38, height = 42) => {

    hazards.push({
      x: beat * BEAT_DISTANCE,
      w: width,
      h: height
    });

  };


  /*
    Level is authored in BEATS.

    This makes future level design much easier.

    Example:

    addSpike(16)

    means:

    spike appears exactly on beat 16.
  */


  // ----------------------------------------------------------
  // INTRO
  // ----------------------------------------------------------

  addSpike(12);
  addSpike(16);
  addSpike(20);

  addSpike(24);
  addSpike(28);

  addSpike(32);
  addSpike(36);


  // ----------------------------------------------------------
  // FIRST RHYTHMIC SECTION
  // ----------------------------------------------------------

  addSpike(40);
  addSpike(44);

  addSpike(48);
  addSpike(50);

  addSpike(54);
  addSpike(58);

  addSpike(62);
  addSpike(64);


  // ----------------------------------------------------------
  // BUILD
  // ----------------------------------------------------------

  for (let beat = 68; beat <= 96; beat += 4) {
    addSpike(beat);
  }


  // ----------------------------------------------------------
  // FIRST DROP
  // ----------------------------------------------------------

  addSpike(100);
  addSpike(104);

  addSpike(108);
  addSpike(110);

  addSpike(114);
  addSpike(118);

  addSpike(122);
  addSpike(124);

  addSpike(128);
  addSpike(130);

  addSpike(134);
  addSpike(138);

  addSpike(142);
  addSpike(144);


  // ----------------------------------------------------------
  // SECOND RHYTHMIC PATTERN
  // ----------------------------------------------------------

  for (let beat = 148; beat <= 176; beat += 4) {

    addSpike(beat);

    if ((beat / 4) % 2 === 0) {
      addSpike(beat + 2);
    }

  }


  // ----------------------------------------------------------
  // BREAKDOWN
  // ----------------------------------------------------------

  addSpike(180);
  addSpike(188);
  addSpike(196);


  // ----------------------------------------------------------
  // BUILD 2
  // ----------------------------------------------------------

  for (let beat = 200; beat <= 224; beat += 4) {
    addSpike(beat);
  }


  // ----------------------------------------------------------
  // SECOND DROP
  // ----------------------------------------------------------

  for (let beat = 228; beat <= 280; beat += 4) {

    addSpike(beat);

    if (beat % 8 === 4) {
      addSpike(beat + 2);
    }

  }


  // ----------------------------------------------------------
  // FINAL RUN
  // ----------------------------------------------------------

  for (let beat = 284; beat <= 330; beat += 4) {

    addSpike(beat);

    if (beat % 12 === 4) {
      addSpike(beat + 2);
    }

  }


  // ----------------------------------------------------------
  // END
  // ----------------------------------------------------------

  addSpike(336);
  addSpike(340);

}

buildLevel();


// ============================================================
// RESET
// ============================================================

function reset() {

  worldX = 0;
  score = 0;

  currentBeat = 0;
  beatPulse = 0;

  dead = false;
  running = true;

  player.x = PLAYER_X;
  player.y = GROUND_Y() - player.h;
  player.vy = 0;
  player.onGround = true;
  player.rot = 0;

  deathScreen.classList.add('hidden');
  startScreen.classList.add('hidden');

  progressFill.style.width = '0%';
  percent.textContent = '0%';


  // Reset audio.

  music.pause();
  music.currentTime = 0;


  // Browser allows audio because this function
  // is triggered by a button/touch interaction.

  const playPromise = music.play();

  if (playPromise !== undefined) {

    playPromise.catch(() => {
      console.log('Audio playback was blocked.');
    });

  }


  last = performance.now();

  requestAnimationFrame(loop);
}


// ============================================================
// JUMP
// ============================================================

function jump() {

  if (!running || dead) return;

  if (player.onGround) {

    player.vy = JUMP;
    player.onGround = false;

  }

}


// ============================================================
// INPUT
// ============================================================

addEventListener('keydown', e => {

  if (
    e.code === 'Space' ||
    e.code === 'ArrowUp'
  ) {

    e.preventDefault();
    jump();

  }

});


canvas.addEventListener(
  'pointerdown',
  e => {

    e.preventDefault();
    jump();

  },
  { passive: false }
);


startButton.onclick = reset;
restartButton.onclick = reset;


// ============================================================
// DEATH
// ============================================================

function die() {

  if (dead) return;

  dead = true;
  running = false;

  music.pause();

  deathScreen.classList.remove('hidden');

}


// ============================================================
// COLLISION
// ============================================================

function rectHit(a, b) {

  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );

}


// ============================================================
// UPDATE
// ============================================================

function update(dt) {

  // ----------------------------------------------------------
  // PLAYER PHYSICS
  // ----------------------------------------------------------

  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  const gy = GROUND_Y();


  if (player.y + player.h >= gy) {

    player.y = gy - player.h;
    player.vy = 0;
    player.onGround = true;

  } else {

    player.onGround = false;

  }


  // ----------------------------------------------------------
  // WORLD MOVEMENT
  // ----------------------------------------------------------

  worldX += SPEED * dt;


  // ----------------------------------------------------------
  // PLAYER ROTATION
  // ----------------------------------------------------------

  if (!player.onGround) {

    player.rot += 8 * dt;

  }


  // ----------------------------------------------------------
  // BEAT CALCULATION
  // ----------------------------------------------------------

  const newBeat = Math.floor(worldX / BEAT_DISTANCE);

  if (newBeat !== currentBeat) {

    currentBeat = newBeat;
    beatPulse = 1;

  }

  beatPulse *= Math.pow(0.001, dt);


  // ----------------------------------------------------------
  // COLLISION
  // ----------------------------------------------------------

  const playerWorldX = worldX + player.x;

  for (const h of hazards) {

    const hx = h.x;

    const hy = GROUND_Y() - h.h;

    const box = {
      x: hx,
      y: hy,
      w: h.w,
      h: h.h
    };


    // Small collision forgiveness.

    const playerBox = {
      x: playerWorldX + 5,
      y: player.y + 5,
      w: player.w - 10,
      h: player.h - 8
    };


    if (rectHit(playerBox, box)) {

      die();
      break;

    }

  }


  // ----------------------------------------------------------
  // PROGRESS
  // ----------------------------------------------------------

  score = Math.min(
    100,
    Math.floor(
      (worldX + player.x) /
      WORLD_END *
      100
    )
  );


  progressFill.style.width = score + '%';
  percent.textContent = score + '%';


  // ----------------------------------------------------------
  // END OF LEVEL
  // ----------------------------------------------------------

  if (worldX + player.x >= WORLD_END) {

    running = false;

    music.pause();

  }

}


// ============================================================
// BACKGROUND
// ============================================================

function drawBackground() {

  const gy = GROUND_Y();


  // ----------------------------------------------------------
  // SKY
  // ----------------------------------------------------------

  const grad = ctx.createLinearGradient(
    0,
    0,
    0,
    H
  );

  grad.addColorStop(0, '#070a12');
  grad.addColorStop(1, '#101b28');

  ctx.fillStyle = grad;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  // ----------------------------------------------------------
  // BEAT REACTIVE ATMOSPHERE
  // ----------------------------------------------------------

  const pulseAlpha =
    0.04 +
    beatPulse * 0.12;

  ctx.fillStyle =
    `rgba(104,231,255,${pulseAlpha})`;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  // ----------------------------------------------------------
  // DISTANT TOWERS
  // ----------------------------------------------------------

  for (let i = -2; i < 16; i++) {

    const x =
      ((i * 180 - (worldX * 0.08) % 180) + W) % W;

    const height =
      80 + (i % 4) * 38;

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


  // ----------------------------------------------------------
  // RHYTHM / MANDALA STRUCTURES
  // ----------------------------------------------------------

  for (let i = 0; i < 5; i++) {

    const x =
      ((i * 260 - (worldX * 0.16) % 260) + W) % W;

    const y =
      gy - 180 - (i % 2) * 70;

    const radius =
      45 + (i % 3) * 15;


    ctx.strokeStyle =
      `rgba(104,231,255,${0.09 + beatPulse * 0.04})`;

    ctx.lineWidth = 2;


    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    for (let k = 0; k < 8; k++) {

      const a = k * Math.PI / 4;

      ctx.beginPath();

      ctx.arc(
        x + Math.cos(a) * 65,
        y + Math.sin(a) * 65,
        3,
        0,
        Math.PI * 2
      );

      ctx.stroke();

    }

  }


  // ----------------------------------------------------------
  // FLOOR
  // ----------------------------------------------------------

  ctx.fillStyle = '#0a111b';

  ctx.fillRect(
    0,
    gy,
    W,
    H - gy
  );


  ctx.fillStyle = '#68e7ff';

  ctx.fillRect(
    0,
    gy,
    W,
    2
  );


  // Floor grid.

  ctx.globalAlpha = 0.12;

  const spacing = BEAT_DISTANCE;

  for (
    let x = -(worldX % spacing);
    x < W;
    x += spacing
  ) {

    ctx.fillRect(
      x,
      gy + 20,
      1,
      H - gy - 20
    );

  }

  ctx.globalAlpha = 1;

}


// ============================================================
// PLAYER
// ============================================================

function drawPlayer() {

  ctx.save();

  ctx.translate(
    player.x + player.w / 2,
    player.y + player.h / 2
  );

  ctx.rotate(player.rot);


  ctx.fillStyle = '#f2f6f8';

  ctx.shadowColor = '#68e7ff';
  ctx.shadowBlur = 18;


  ctx.fillRect(
    -player.w / 2,
    -player.h / 2,
    player.w,
    player.h
  );


  ctx.shadowBlur = 0;


  ctx.strokeStyle = '#68e7ff';
  ctx.lineWidth = 2;


  ctx.strokeRect(
    -player.w / 2,
    -player.h / 2,
    player.w,
    player.h
  );


  // Inner core.

  ctx.fillStyle = '#0b111a';

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

  for (const h of hazards) {

    const sx = h.x - worldX;


    if (
      sx < -80 ||
      sx > W + 80
    ) continue;


    const gy = GROUND_Y();


    ctx.fillStyle = '#ff5b4d';

    ctx.shadowColor = '#ff5b4d';
    ctx.shadowBlur = 12;


    ctx.beginPath();

    ctx.moveTo(
      sx,
      gy
    );

    ctx.lineTo(
      sx + h.w / 2,
      gy - h.h
    );

    ctx.lineTo(
      sx + h.w,
      gy
    );

    ctx.closePath();

    ctx.fill();


    ctx.shadowBlur = 0;

  }

}


// ============================================================
// DRAW
// ============================================================

function draw() {

  drawBackground();

  drawHazards();

  drawPlayer();

}


// ============================================================
// GAME LOOP
// ============================================================

function loop(now) {

  if (!running) {

    draw();

    return;

  }


  const dt =
    Math.min(
      (now - last) / 1000,
      0.033
    );


  last = now;


  update(dt);

  draw();


  if (running) {

    requestAnimationFrame(loop);

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
