const tonearm = document.querySelector('#tonearm');
const record = document.querySelector('#record');
const deck = document.querySelector('.deck');
const audio = document.querySelector('#audio');
const status = document.querySelector('#status');

let dragging = false;
let locked = false;
let pointerId = null;
let startAngle = null;
let audioPrimed = false;

function pivot(){
  const d = deck.getBoundingClientRect();
  return { x: d.left + d.width * 0.86, y: d.top + d.height * 0.13 };
}

function pointerAngle(x, y){
  const p = pivot();
  return Math.atan2(y - p.y, x - p.x) * 180 / Math.PI;
}

function setArm(a){
  const v = Math.max(-55, Math.min(8, a));
  tonearm.style.transform = `rotate(${v}deg)`;
  return v;
}

// Start the audio silently during the user's actual pointer gesture.
// This satisfies browser autoplay rules without making the song audible yet.
async function primeAudio(){
  if (audioPrimed || locked) return true;
  try {
    audio.currentTime = 0;
    audio.muted = true;
    audio.volume = 1;
    const p = audio.play();
    if (p && p.catch) await p;
    audioPrimed = true;
    return true;
  } catch (err) {
    audioPrimed = false;
    status.textContent = 'Hãy chạm vào cần gạt rồi kéo xuống đĩa.';
    return false;
  }
}

function stopPrimedAudio(){
  if (!audioPrimed || locked) return;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = true;
  audioPrimed = false;
}

function lockArm(){
  dragging = false;
  locked = true;
  startAngle = null;
  pointerId = null;
  tonearm.classList.remove('dragging');
  tonearm.classList.add('ready', 'play');
  tonearm.style.transform = 'rotate(-45deg)';
  record.classList.add('spinning');
  deck.classList.add('playing');
  status.textContent = 'Đang phát… 🎵';

  // The audio was already started (muted) by pointerdown.
  // Now it is safe to make it audible.
  audio.muted = false;
  audio.volume = 1;
  audioPrimed = true;
}

async function down(e){
  if (locked) return;
  e.preventDefault();
  dragging = true;
  pointerId = e.pointerId;
  startAngle = pointerAngle(e.clientX, e.clientY);
  tonearm.classList.add('dragging');
  try { tonearm.setPointerCapture(e.pointerId); } catch {}

  // Important: this happens directly inside the user's gesture.
  await primeAudio();
}

function move(e){
  if (!dragging || e.pointerId !== pointerId || locked) return;
  e.preventDefault();
  let a = pointerAngle(e.clientX, e.clientY) - startAngle;
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  const arm = setArm(a);

  if (arm <= -38) lockArm();
}

function up(e){
  if (!dragging || e.pointerId !== pointerId) return;
  e.preventDefault();
  dragging = false;
  pointerId = null;
  startAngle = null;
  tonearm.classList.remove('dragging');
  try { tonearm.releasePointerCapture(e.pointerId); } catch {}

  if (!locked) {
    // If the user released before reaching the record, do not play anything.
    stopPrimedAudio();
    setArm(0);
    status.textContent = 'Kéo cần gạt xuống đĩa để bắt đầu';
  }
}

tonearm.addEventListener('pointerdown', down, { passive:false });
tonearm.addEventListener('pointermove', move, { passive:false });
tonearm.addEventListener('pointerup', up, { passive:false });
tonearm.addEventListener('pointercancel', up, { passive:false });

audio.addEventListener('ended', () => {
  record.classList.remove('spinning');
  deck.classList.remove('playing');
  status.textContent = 'Thanh Xuân · Da LAB';
  tonearm.classList.remove('play');
  locked = false;
  audioPrimed = false;
  audio.muted = false;
});

audio.addEventListener('error', () => {
  status.textContent = 'Không tải được file nhạc. Hãy kiểm tra music.mp3 trong project.';
  record.classList.remove('spinning');
  deck.classList.remove('playing');
});

document.documentElement.style.touchAction = 'none';
document.body.style.touchAction = 'none';
