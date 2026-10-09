const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const COLS = 21, ROWS = 21;
let CELL = Math.min(Math.floor(Math.min(window.innerWidth - 32, 600) / COLS), 28);
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

const WALL=1, DOT=2, POWER=3, EMPTY=0;

const BASE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,1,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,0,0,0,0,0,0,0,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1],
  [0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0],
  [1,1,1,1,2,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,1,0,0,0,0,0,0,0,1,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,1,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,0,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,1,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GHOST_COLORS = ['#FF4444','#FF88FF','#FFB852','#00E5FF'];
const GHOST_NAMES  = ['Carvão','Diesel','Fumaça','Tempestade'];

let map, player, ghosts, score, lives, level, gameState, animFrame, lastT;
let mouthAngle, mouthOpen, ghostFrightTimer;

function cloneMap(){ return BASE_MAP.map(r=>[...r]); }
function countDots(m){ let n=0; for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(m[r][c]===DOT||m[r][c]===POWER) n++; return n; }
function cellAt(x,y){ const c=Math.round(x),r=Math.round(y); if(r<0||r>=ROWS||c<0||c>=COLS) return EMPTY; return map[r][c]; }
function setCell(x,y,v){ const c=Math.round(x),r=Math.round(y); if(r>=0&&r<ROWS&&c>=0&&c<COLS) map[r][c]=v; }
function canMove(x, y, dx, dy) {
  const nx = x + dx * 0.5;
  const ny = y + dy * 0.5;

  const col = Math.floor(nx + 0.5);
  const row = Math.floor(ny + 0.5);

  if (
    row < 0 ||
    row >= ROWS ||
    col < 0 ||
    col >= COLS
  ) {
    return false;
  }

  return map[row][col] !== WALL;
}
function initGame(){
  map=cloneMap(); score=0; lives=3; level=1; ghostFrightTimer=0;
  mouthAngle=0.25; mouthOpen=true;
  player={x:10,y:16,dx:0,dy:0,ndx:1,ndy:0};
  spawnGhosts();
  gameState='ready';
  updateHUD();
  setMsg('Pressione Iniciar ou use as setas');
  draw();
}

function spawnGhosts(){
  ghosts=[
    {x:9,y:10,dx:1,dy:0,color:GHOST_COLORS[0],frightened:false,scatter:350,eaten:false},
    {x:10,y:10,dx:-1,dy:0,color:GHOST_COLORS[1],frightened:false,scatter:450,eaten:false},
    {x:11,y:10,dx:0,dy:1,color:GHOST_COLORS[2],frightened:false,scatter:250,eaten:false},
    {x:10,y:11,dx:0,dy:-1,color:GHOST_COLORS[3],frightened:false,scatter:550,eaten:false},
  ];
}

function updateHUD(){
  document.getElementById('score').textContent=score;
  document.getElementById('lives').textContent='☀'.repeat(Math.max(0,lives));
  document.getElementById('level').textContent=level;
}
function setMsg(t){ document.getElementById('msg-bar').textContent=t; }

const PSPEED=5.5, GSPEED=4.8;

function updatePlayer(dt){
  const spd=PSPEED*dt;
  if(canMove(player.x,player.y,player.ndx,player.ndy)){ player.dx=player.ndx; player.dy=player.ndy; }
  if(canMove(player.x,player.y,player.dx,player.dy)){ player.x+=player.dx*spd; player.y+=player.dy*spd; }
  if(player.x<0) player.x=COLS-0.5;
  if(player.x>=COLS) player.x=0.5;
  const cell=cellAt(player.x,player.y);
  if(cell===DOT){ setCell(player.x,player.y,EMPTY); score+=10; updateHUD(); }
  else if(cell===POWER){ setCell(player.x,player.y,EMPTY); score+=50; ghostFrightTimer=7; ghosts.forEach(g=>{g.frightened=true; g.dx*=-1; g.dy*=-1;}); updateHUD(); setMsg('⚡ Poder solar ativado! Coma os vilões!'); }
  if(countDots(map)===0){ level++; map=cloneMap(); spawnGhosts(); ghostFrightTimer=0; updateHUD(); setMsg('🌞 Nível '+level+'! Continue coletando!'); }
}

function ghostAI(g, dt) {
  const spd = (g.frightened ? GSPEED * 0.50 : GSPEED * (0.88 + level * 0.04)) * dt;

  const dirs = [
    {dx:1,dy:0},
    {dx:-1,dy:0},
    {dx:0,dy:1},
    {dx:0,dy:-1}
  ];

  const valid = dirs.filter(d =>
    !(d.dx === -g.dx && d.dy === -g.dy) &&
    canMove(g.x, g.y, d.dx, d.dy)
  );

  if (!canMove(g.x,g.y,g.dx,g.dy) || Math.random() < 0.015) {

    let targetX = player.x;
    let targetY = player.y;

    // 🔴 Carvão = perseguidor direto
    if (g.color === '#FF4444') {
      targetX = player.x;
      targetY = player.y;
    }

    // 🟣 Diesel = tenta interceptar
    else if (g.color === '#FF88FF') {
      targetX = player.x + player.dx * 4;
      targetY = player.y + player.dy * 4;
    }

    // 🟠 Fumaça = foge quando perto
    else if (g.color === '#FFB852') {
      const dist = Math.hypot(player.x - g.x, player.y - g.y);

      if (dist < 5) {
        targetX = g.x - (player.x - g.x);
        targetY = g.y - (player.y - g.y);
      } else {
        targetX = player.x;
        targetY = player.y;
      }
    }

    // 🔵 Tempestade = patrulha e ataca
    else if (g.color === '#00E5FF') {
      if (Math.random() < 0.5) {
        targetX = 18;
        targetY = 2;
      } else {
        targetX = player.x;
        targetY = player.y;
      }
    }

    if (valid.length) {

      let best = valid[0];
      let bestDist = Infinity;

      for (const d of valid) {

        const nx = g.x + d.dx;
        const ny = g.y + d.dy;

        const dist =
          (nx - targetX) ** 2 +
          (ny - targetY) ** 2;

        if (dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }

      if (g.frightened) {
        best = valid[Math.floor(Math.random() * valid.length)];
      }

      g.dx = best.dx;
      g.dy = best.dy;
    }
  }

  g.x += g.dx * spd;
  g.x = Math.max(0.5, Math.min(COLS - 0.5, g.x));
g.y = Math.max(0.5, Math.min(ROWS - 0.5, g.y));
  g.y += g.dy * spd;

  if (g.x < 0) g.x = COLS - 0.5;
  if (g.x >= COLS) g.x = 0.5;

}

function checkCollisions(){
  for(const g of ghosts){
    if(g.eaten) continue;
    const dist=Math.abs(g.x-player.x)+Math.abs(g.y-player.y);
    if(dist<0.85){
      if(g.frightened){
        g.frightened=false; g.eaten=true; score+=200; updateHUD();
        setTimeout(()=>{ g.eaten=false; g.x=10; g.y=10; g.scatter=300; },3000);
        setMsg('💥 +200! Vilão eliminado!');
      } else {
        lives--; updateHUD();
        if(lives<=0){ gameState='gameover'; setMsg('⚡ Sem energia! Pontuação: '+score); return; }
        player.x=10; player.y=16; player.dx=0; player.dy=0;
        setMsg('Vida perdida! Restam '+lives+' ☀');
      }
    }
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function drawSun(cx, cy, r, big, t){
  ctx.save(); ctx.translate(cx, cy);
  const pulse = big ? 1 + Math.sin(t*3)*0.12 : 1;
  ctx.scale(pulse, pulse);
  const rays=big?8:6;
  ctx.strokeStyle=big?'#ffd700':'#ffa500';
  ctx.lineWidth=big?1.5:1;
  for(let i=0;i<rays;i++){
    const a=(i/rays)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*(r+1),Math.sin(a)*(r+1));
    ctx.lineTo(Math.cos(a)*(r+(big?5:3)),Math.sin(a)*(r+(big?5:3)));
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle=big?'#ffd700':'#ffa500';
  ctx.fill();
  if(big){
    ctx.beginPath(); ctx.arc(-r*0.25,-r*0.25,r*0.25,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fill();
  }
  ctx.restore();
}

function drawPanel(t){
  const cx=player.x*CELL+CELL/2, cy=player.y*CELL+CELL/2;
  const angle=Math.atan2(player.dy,player.dx)||0;
  const mouth=mouthAngle*Math.PI;
  const r=CELL*0.42;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0,r,mouth,Math.PI*2-mouth);
  ctx.closePath();

  const g2=ctx.createLinearGradient(-r,-r,r,r);
  g2.addColorStop(0,'#4fc3f7');
  g2.addColorStop(0.4,'#0288d1');
  g2.addColorStop(1,'#0d47a1');
  ctx.fillStyle=g2; ctx.fill();
  ctx.strokeStyle='rgba(100,200,255,0.4)'; ctx.lineWidth=1; ctx.stroke();

  // grid lines
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=0.5;
  for(let i=1;i<3;i++){
    const rr=(i/3)*r*0.9;
    ctx.beginPath(); ctx.arc(0,0,rr,mouth,Math.PI*2-mouth); ctx.stroke();
  }
  for(let i=0;i<5;i++){
    const a=mouth+(i/5)*(Math.PI*2-2*mouth);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r*0.9,Math.sin(a)*r*0.9); ctx.stroke();
  }
  // center sun
  ctx.beginPath(); ctx.arc(0,0,r*0.14,0,Math.PI*2);
  ctx.fillStyle='#fff176'; ctx.fill();
  ctx.restore();
}

function drawGhost(g, t){
  if(g.eaten) return;
  const cx=g.x*CELL+CELL/2, cy=g.y*CELL+CELL/2;
  const r=CELL*0.4;
  const col=g.frightened?(t%1<0.5&&ghostFrightTimer<2?'#ffffff':'#1565c0'):g.color;
  ctx.save(); ctx.translate(cx,cy);

  // body
  ctx.beginPath();
  ctx.arc(0,-r*0.15,r,Math.PI,0);
  const by=r*0.85;
  ctx.lineTo(r,by);
  const bumps=4;
  for(let i=bumps;i>=0;i--){
    const bx=r-(i*(2*r/bumps));
    const wave=i%2===0?by-r*0.28:by;
    ctx.lineTo(bx,wave);
  }
  ctx.lineTo(-r,by);
  ctx.closePath();
  ctx.fillStyle=col; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=0.5; ctx.stroke();

  if(!g.frightened){
    [-r*0.28,r*0.28].forEach(ex=>{
      ctx.beginPath(); ctx.arc(ex,-r*0.15,r*0.2,0,Math.PI*2);
      ctx.fillStyle='white'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+r*0.06,-r*0.1,r*0.1,0,Math.PI*2);
      ctx.fillStyle='#1a1aff'; ctx.fill();
    });
  } else {
    ctx.beginPath();
    ctx.moveTo(-r*0.38,r*0.08);
    for(let i=0;i<5;i++) ctx.lineTo(-r*0.38+i*r*0.19,i%2===0?r*0.08:r*0.28);
    ctx.strokeStyle='white'; ctx.lineWidth=1.5; ctx.stroke();
    [-r*0.22,r*0.22].forEach(ex=>{
      ctx.beginPath(); ctx.arc(ex,-r*0.2,r*0.12,0,Math.PI*2);
      ctx.fillStyle='white'; ctx.fill();
    });
  }
  ctx.restore();
}

let sunPulse=0;
function draw(t=0){
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#050a14'; ctx.fillRect(0,0,W,H);

  // subtle grid bg
  ctx.strokeStyle='rgba(30,58,110,0.3)'; ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,H); ctx.stroke(); }
  for(let r=0;r<=ROWS;r++){ ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(W,r*CELL); ctx.stroke(); }

  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell=map[r][c];
      const x=c*CELL, y=r*CELL;
      if(cell===WALL){
        ctx.fillStyle='#0d1829';
        ctx.fillRect(x,y,CELL,CELL);
        ctx.strokeStyle='#1e3a6e'; ctx.lineWidth=1;
        ctx.strokeRect(x+0.5,y+0.5,CELL-1,CELL-1);
        // inner highlight
        ctx.strokeStyle='rgba(30,100,220,0.15)'; ctx.lineWidth=0.5;
        ctx.strokeRect(x+2,y+2,CELL-4,CELL-4);
      } else if(cell===DOT){
        drawSun(x+CELL/2, y+CELL/2, CELL*0.14, false, t);
      } else if(cell===POWER){
        drawSun(x+CELL/2, y+CELL/2, CELL*0.24, true, t);
      }
    }
  }

  ghosts.forEach(g=>drawGhost(g,t));
  drawPanel(t);

  if(gameState==='gameover'){
    ctx.fillStyle='rgba(5,10,20,0.78)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.font=`bold ${CELL*1.1}px Orbitron,monospace`;
    ctx.fillStyle='#ffd700';
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=30;
    ctx.fillText('FIM DE JOGO', W/2, H/2-CELL*0.6);
    ctx.shadowBlur=0;
    ctx.font=`${CELL*0.6}px Orbitron,monospace`;
    ctx.fillStyle='#6b8fbd';
    ctx.fillText('Energia coletada: '+score+' pts', W/2, H/2+CELL*0.3);
    ctx.fillText('Pressione Reiniciar', W/2, H/2+CELL*1.1);
    ctx.textAlign='left';
  } else if(gameState==='ready'){
    ctx.fillStyle='rgba(5,10,20,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.font=`bold ${CELL*0.9}px Orbitron,monospace`;
    ctx.fillStyle='#00e5ff';
    ctx.shadowColor='#00e5ff'; ctx.shadowBlur=20;
    ctx.fillText('PRONTO?', W/2, H/2);
    ctx.shadowBlur=0;
    ctx.textAlign='left';
  }
}

function loop(t){
  const dt=Math.min((t-lastT)/1000,0.05);
  lastT=t;
  mouthAngle=mouthOpen?mouthAngle-1.8*dt:mouthAngle+1.8*dt;
  if(mouthAngle<=0.03) mouthOpen=false;
  if(mouthAngle>=0.32) mouthOpen=true;
  if(ghostFrightTimer>0){ ghostFrightTimer-=dt; if(ghostFrightTimer<=0) ghosts.forEach(g=>g.frightened=false); }
  updatePlayer(dt);
  ghosts.forEach(g=>ghostAI(g,dt));
  checkCollisions();
  draw(t/1000);
  if(gameState==='running') animFrame=requestAnimationFrame(loop);
  else draw(t/1000);
}

function startGame(){
  if(gameState==='gameover') initGame();
  if(gameState==='running') return;
  gameState='running';
  setMsg('Colete toda a energia solar!');
  lastT=performance.now();
  animFrame=requestAnimationFrame(loop);
}

document.getElementById('btn-start').addEventListener('click',startGame);
document.getElementById('btn-pause').addEventListener('click',()=>{
  if(gameState==='running'){ gameState='paused'; cancelAnimationFrame(animFrame); setMsg('Pausado'); draw(); }
  else if(gameState==='paused') startGame();
});
document.getElementById('btn-reset').addEventListener('click',()=>{ cancelAnimationFrame(animFrame); initGame(); });

const DIR={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
document.addEventListener('keydown',e=>{
  if(DIR[e.key]){ e.preventDefault(); [player.ndx,player.ndy]=DIR[e.key]; if(gameState!=='running') startGame(); }
});

document.getElementById('up').addEventListener('click',()=>{player.ndx=0;player.ndy=-1;if(gameState!=='running')startGame();});
document.getElementById('down').addEventListener('click',()=>{player.ndx=0;player.ndy=1;if(gameState!=='running')startGame();});
document.getElementById('left').addEventListener('click',()=>{player.ndx=-1;player.ndy=0;if(gameState!=='running')startGame();});
document.getElementById('right').addEventListener('click',()=>{player.ndx=1;player.ndy=0;if(gameState!=='running')startGame();});

initGame();