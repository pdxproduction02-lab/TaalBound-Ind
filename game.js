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

let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
function resize(){
  W=innerWidth; H=innerHeight; dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.floor(W*dpr); canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize); resize();

const WORLD_END=9000;
const SPEED=330;
const GRAVITY=1850;
const JUMP=-720;
const GROUND_Y=()=>H-105;

let running=false,dead=false,last=0,worldX=0,score=0;
let player={x:140,y:0,w:34,h:34,vy:0,onGround:false,rot:0};
let hazards=[];

function buildLevel(){
  hazards=[];
  const add=(x,w=38,h=42)=>hazards.push({x,w,h});
  [700,1030,1320,1660,2010,2350,2700,3100,3480,3870,4250,4650,5050,5480,5920,6350,6810,7280,7750,8230].forEach((x,i)=>{
    if(i%5===2){ add(x); add(x+62); }
    else add(x);
  });
}
buildLevel();

function reset(){
  worldX=0; score=0; dead=false; running=true;
  player.x=140; player.y=GROUND_Y()-player.h; player.vy=0; player.onGround=true; player.rot=0;
  deathScreen.classList.add('hidden'); startScreen.classList.add('hidden');
  last=performance.now(); requestAnimationFrame(loop);
}

function jump(){
  if(!running || dead) return;
  if(player.onGround){
    player.vy=JUMP; player.onGround=false;
  }
}
addEventListener('keydown',e=>{
  if(e.code==='Space'||e.code==='ArrowUp'){
    e.preventDefault(); jump();
  }
});
canvas.addEventListener('pointerdown',e=>{e.preventDefault(); jump();},{passive:false});
startButton.onclick=reset;
restartButton.onclick=reset;

function die(){
  if(dead) return;
  dead=true; running=false; deathScreen.classList.remove('hidden');
}

function rectHit(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function update(dt){
  player.vy += GRAVITY*dt;
  player.y += player.vy*dt;
  const gy=GROUND_Y();
  if(player.y+player.h>=gy){
    player.y=gy-player.h; player.vy=0; player.onGround=true;
  }else player.onGround=false;

  worldX += SPEED*dt;
  player.rot += (player.onGround?0:8)*dt;

  const px=worldX+player.x;
  for(const h of hazards){
    const hx=h.x;
    const hy=GROUND_Y()-h.h;
    const box={x:hx,y:hy,w:h.w,h:h.h};
    if(rectHit({x:px,y:player.y,w:player.w,h:player.h},box)){ die(); break; }
  }
  if(worldX+player.x>WORLD_END) { running=false; }
  score=Math.min(100,Math.floor((worldX+player.x)/WORLD_END*100));
  progressFill.style.width=score+'%'; percent.textContent=score+'%';
}

function drawBackground(){
  const gy=GROUND_Y();
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#070a12'); grad.addColorStop(1,'#101b28');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // distant rhythm towers
  for(let i=-2;i<14;i++){
    const x=((i*180 - (worldX*.08)%180)+W)%W;
    const height=80+(i%4)*38;
    ctx.fillStyle='rgba(40,100,120,.18)';
    ctx.fillRect(x,gy-height,58,height);
    ctx.fillStyle='rgba(104,231,255,.12)';
    ctx.fillRect(x+8,gy-height+12,3,height-20);
  }

  // subtle mandala-like circles
  for(let i=0;i<5;i++){
    const x=((i*260 - (worldX*.16)%260)+W)%W;
    const y=gy-180-(i%2)*70;
    ctx.strokeStyle='rgba(104,231,255,.09)';
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,45+(i%3)*15,0,Math.PI*2);ctx.stroke();
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      ctx.beginPath();ctx.arc(x+Math.cos(a)*65,y+Math.sin(a)*65,3,0,Math.PI*2);ctx.stroke();
    }
  }

  // floor
  ctx.fillStyle='#0a111b'; ctx.fillRect(0,gy,W,H-gy);
  ctx.fillStyle='#68e7ff'; ctx.fillRect(0,gy,W,2);
  ctx.globalAlpha=.12;
  const spacing=80;
  for(let x=-(worldX%spacing);x<W;x+=spacing) ctx.fillRect(x,gy+20,1,H-gy-20);
  ctx.globalAlpha=1;
}

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x+player.w/2,player.y+player.h/2);
  ctx.rotate(player.rot);
  ctx.fillStyle='#f2f6f8';
  ctx.shadowColor='#68e7ff';ctx.shadowBlur=18;
  ctx.fillRect(-player.w/2,-player.h/2,player.w,player.h);
  ctx.shadowBlur=0;
  ctx.strokeStyle='#68e7ff';ctx.lineWidth=2;ctx.strokeRect(-player.w/2,-player.h/2,player.w,player.h);
  ctx.fillStyle='#0b111a';
  ctx.fillRect(-7,-7,14,14);
  ctx.restore();
}

function drawHazards(){
  for(const h of hazards){
    const sx=h.x-worldX;
    if(sx<-80||sx>W+80) continue;
    const gy=GROUND_Y(), baseY=gy;
    ctx.fillStyle='#ff5b4d';
    ctx.shadowColor='#ff5b4d';ctx.shadowBlur=12;
    ctx.beginPath();
    ctx.moveTo(sx,baseY);
    ctx.lineTo(sx+h.w/2,baseY-h.h);
    ctx.lineTo(sx+h.w,baseY);
    ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;
  }
}

function draw(){
  drawBackground();
  drawHazards();
  drawPlayer();
}

function loop(now){
  if(!running) { draw(); return; }
  const dt=Math.min((now-last)/1000,.033); last=now;
  update(dt); draw();
  if(running) requestAnimationFrame(loop);
}

player.y=GROUND_Y()-player.h;
draw();
})();