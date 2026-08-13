/* ============ VAMOS PREMIUM — shared level-page logic ============
   Expects two globals defined by the page before this script loads:
   - LEVEL_ID   e.g. "a1a2"
   - VOCAB      array of {w, pos, m, ex, exm}
   Persistence: localStorage (works on any static host, e.g. Cloudflare Pages)
*/
let currentStudent = null;
let progress = { known:[], matchBest:0, puzzleSolved:0, lastStudyDate:null, streak:0 };

/* ---------- Storage (per student, per level) — localStorage based ---------- */
function storageKey(){ return `vamos:progress:${currentStudent}:${LEVEL_ID}`; }
function studentListKey(){ return 'vamos:students'; }

function loadProgress(){
  if(!currentStudent) return;
  try{
    const raw = localStorage.getItem(storageKey());
    progress = raw ? JSON.parse(raw) : { known:[], matchBest:0, puzzleSolved:0, lastStudyDate:null, streak:0 };
  }catch(e){
    progress = { known:[], matchBest:0, puzzleSolved:0, lastStudyDate:null, streak:0 };
  }
  bumpStreak();
  renderProgress();
}
function saveProgress(){
  if(!currentStudent) return;
  try{ localStorage.setItem(storageKey(), JSON.stringify(progress)); }
  catch(e){ console.error('Storage error', e); }
}

function bumpStreak(){
  const today = new Date().toISOString().slice(0,10);
  if(progress.lastStudyDate === today) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  progress.streak = (progress.lastStudyDate === y) ? (progress.streak||0) + 1 : 1;
  progress.lastStudyDate = today;
  saveProgress();
}

function getStudentList(){
  try{ return JSON.parse(localStorage.getItem(studentListKey()) || '[]'); }
  catch(e){ return []; }
}
function addToStudentList(name){
  const list = getStudentList();
  if(!list.includes(name)){
    list.push(name);
    localStorage.setItem(studentListKey(), JSON.stringify(list));
  }
}

function pickStudent(){
  const existing = getStudentList();
  let msg = "Öğrenci adını yaz (ilerlemen bu isimle ve bu seviyede kaydedilir):";
  if(existing.length){
    msg += `\n\nDaha önce kaydedilenler: ${existing.join(', ')}`;
  }
  const name = prompt(msg);
  if(!name) return;
  currentStudent = name.trim();
  addToStudentList(currentStudent);
  document.getElementById('studentChip').textContent = currentStudent;
  loadProgress();
}

/* ---------- Pronunciation (Web Speech API, no server needed) ---------- */
function speak(text){
  if(!('speechSynthesis' in window)) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }catch(e){ /* silently ignore unsupported browsers */ }
}

/* ---------- Nav ---------- */
function goTo(id){
  document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-section="${id}"]`);
  if(btn) btn.classList.add('active');
  document.getElementById('tabs')?.classList.remove('open');
  if(id==='matching' && !matchInitialized) startMatching();
  if(id==='puzzle' && !puzzleWord) newPuzzle();
}

function toggleMobileMenu(){
  document.getElementById('tabs')?.classList.toggle('open');
}

/* ---------- Flashcards ---------- */
let fcIndex = 0;
let fcDeck = [];
let fcFlipped = false;

function renderCard(){
  const card = fcDeck[fcIndex % fcDeck.length];
  document.getElementById('fcWord').textContent = card.w;
  document.getElementById('fcPos').textContent = card.pos;
  document.getElementById('fcMeaning').textContent = card.m;
  const exEl = document.getElementById('fcExample');
  if(exEl){
    if(card.ex){
      exEl.innerHTML = `<span class="fc-ex-es">${card.ex}</span><span class="fc-ex-tr">${card.exm||''}</span>`;
      exEl.style.display = '';
    } else {
      exEl.style.display = 'none';
    }
  }
  document.getElementById('fcProgress').textContent = `${(fcIndex%fcDeck.length)+1} / ${fcDeck.length}`;
  document.getElementById('fcCard').classList.remove('flipped');
  fcFlipped = false;
}
function flipCard(){
  fcFlipped = !fcFlipped;
  document.getElementById('fcCard').classList.toggle('flipped');
}
function speakCurrentCard(evt){
  evt.stopPropagation();
  const card = fcDeck[fcIndex % fcDeck.length];
  speak(card.w);
}
function answerCard(knewIt){
  const card = fcDeck[fcIndex % fcDeck.length];
  if(knewIt){
    if(currentStudent && !progress.known.includes(card.w)){
      progress.known.push(card.w);
      saveProgress();
      renderProgress();
    }
    fcIndex++;
  } else {
    fcDeck.splice(fcIndex % fcDeck.length, 1);
    fcDeck.splice(Math.min(fcIndex+2, fcDeck.length), 0, card);
  }
  renderCard();
}
function shuffleDeck(){
  fcDeck = [...VOCAB].sort(()=>Math.random()-0.5);
  fcIndex = 0;
  renderCard();
}

/* ---------- Matching ---------- */
let matchInitialized = false;
let matchTimer = null, matchSeconds = 0, matchScoreCount = 0, matchSelected = null, matchLocked = false;

function startMatching(){
  matchInitialized = true;
  clearInterval(matchTimer);
  matchSeconds = 0; matchScoreCount = 0; matchSelected = null; matchLocked = false;
  document.getElementById('matchTime').textContent = '0s';
  document.getElementById('matchScore').textContent = '0/6';

  const chosen = [...VOCAB].sort(()=>Math.random()-0.5).slice(0,6);
  let tiles = [];
  chosen.forEach((c,i)=>{
    tiles.push({key:i, text:c.w, pair:i, type:'es'});
    tiles.push({key:i, text:c.m, pair:i, type:'en'});
  });
  tiles = tiles.sort(()=>Math.random()-0.5);

  const grid = document.getElementById('matchGrid');
  grid.innerHTML = '';
  tiles.forEach((t, idx)=>{
    const div = document.createElement('div');
    div.className = 'match-tile';
    div.textContent = t.text;
    div.dataset.pair = t.pair;
    div.dataset.idx = idx;
    div.onclick = ()=>selectTile(div, t);
    grid.appendChild(div);
  });

  matchTimer = setInterval(()=>{
    matchSeconds++;
    document.getElementById('matchTime').textContent = matchSeconds+'s';
  }, 1000);
}

function selectTile(el, t){
  if(matchLocked || el.classList.contains('matched') || el === matchSelected?.el) return;
  if(!matchSelected){
    el.classList.add('selected');
    matchSelected = {el, t};
    return;
  }
  if(matchSelected.t.pair === t.pair && matchSelected.t.type !== t.type){
    el.classList.add('matched');
    matchSelected.el.classList.add('matched');
    matchSelected.el.classList.remove('selected');
    matchSelected = null;
    matchScoreCount++;
    document.getElementById('matchScore').textContent = matchScoreCount+'/6';
    if(matchScoreCount===6){
      clearInterval(matchTimer);
      celebrate();
      if(currentStudent){
        progress.matchBest = progress.matchBest ? Math.min(progress.matchBest, matchSeconds) : matchSeconds;
        saveProgress();
        renderProgress();
      }
    }
  } else {
    matchLocked = true;
    el.classList.add('wrong');
    matchSelected.el.classList.add('wrong');
    setTimeout(()=>{
      el.classList.remove('wrong','selected');
      matchSelected.el.classList.remove('wrong','selected');
      matchSelected = null;
      matchLocked = false;
    }, 550);
  }
}

/* ---------- Puzzle ---------- */
let puzzleWord = null;

function newPuzzle(){
  const item = VOCAB[Math.floor(Math.random()*VOCAB.length)];
  puzzleWord = item;
  document.getElementById('puzzleHint').textContent = `İpucu: ${item.m} (${item.pos})`;
  document.getElementById('puzzleFeedback').textContent = '';

  const slots = document.getElementById('puzzleSlots');
  slots.innerHTML = '';
  for(let i=0;i<item.w.length;i++){
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.idx = i;
    slots.appendChild(s);
  }

  const letters = item.w.split('').sort(()=>Math.random()-0.5);
  const lettersDiv = document.getElementById('puzzleLetters');
  lettersDiv.innerHTML = '';
  letters.forEach((ch)=>{
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'letter-tile';
    t.textContent = ch;
    t.dataset.used = 'false';
    t.onclick = ()=>placeLetter(t, ch);
    lettersDiv.appendChild(t);
  });
}

function placeLetter(el, ch){
  if(el.dataset.used === 'true') return;
  const slots = document.querySelectorAll('#puzzleSlots .slot');
  const nextEmpty = [...slots].find(s => !s.textContent);
  if(!nextEmpty) return;
  nextEmpty.textContent = ch;
  el.dataset.used = 'true';
  el.style.opacity = '0.25';
  el.style.cursor = 'default';
  checkPuzzle();
}

function checkPuzzle(){
  const slots = [...document.querySelectorAll('#puzzleSlots .slot')];
  if(slots.some(s=>!s.textContent)) return;
  const guess = slots.map(s=>s.textContent).join('');
  const fb = document.getElementById('puzzleFeedback');
  if(guess.toLowerCase() === puzzleWord.w.toLowerCase()){
    fb.textContent = 'Doğru! 🎉';
    fb.style.color = 'var(--teal)';
    speak(puzzleWord.w);
    if(currentStudent){
      progress.puzzleSolved = (progress.puzzleSolved||0) + 1;
      saveProgress();
      renderProgress();
    }
    setTimeout(newPuzzle, 1100);
  } else {
    fb.textContent = 'Tekrar dene';
    fb.style.color = 'var(--coral)';
    setTimeout(clearPuzzle, 700);
  }
}

function clearPuzzle(){
  document.querySelectorAll('#puzzleSlots .slot').forEach(s=>s.textContent='');
  document.querySelectorAll('#puzzleLetters .letter-tile').forEach(t=>{
    t.dataset.used='false'; t.style.opacity='1'; t.style.cursor='pointer';
  });
  document.getElementById('puzzleFeedback').textContent = '';
}

/* ---------- Small celebration (no external libs) ---------- */
function celebrate(){
  const colors = ['#C9A227','#E4C766','#2F7D6E','#D9633B'];
  for(let i=0;i<24;i++){
    const p = document.createElement('div');
    p.className = 'confetti-bit';
    p.style.left = (45 + Math.random()*10) + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random()*0.2) + 's';
    p.style.setProperty('--dx', (Math.random()*260-130)+'px');
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 1400);
  }
}

/* ---------- Progress rendering ---------- */
function renderProgress(){
  document.getElementById('statKnown').textContent = progress.known ? progress.known.length : 0;
  document.getElementById('statMatch').textContent = progress.matchBest ? progress.matchBest+'s' : '—';
  document.getElementById('statPuzzle').textContent = progress.puzzleSolved || 0;
  const streakEl = document.getElementById('statStreak');
  if(streakEl) streakEl.textContent = progress.streak ? progress.streak : 0;

  const totalPct = document.getElementById('levelPct');
  if(totalPct){
    const pct = Math.min(100, Math.round(((progress.known?progress.known.length:0) / VOCAB.length) * 100));
    totalPct.textContent = pct + '%';
    const bar = document.getElementById('levelBar');
    if(bar) bar.style.width = pct + '%';
  }

  const log = document.getElementById('wordLog');
  if(!progress.known || progress.known.length===0){
    log.innerHTML = '<span class="word-pill">Henüz kelime çalışılmadı</span>';
    return;
  }
  log.innerHTML = '';
  progress.known.forEach(w=>{
    const p = document.createElement('span');
    p.className = 'word-pill known';
    p.textContent = w;
    log.appendChild(p);
  });
}

/* ---------- Export / Import progress (teacher review, since data is per-browser) ---------- */
function exportProgress(){
  if(!currentStudent){ alert('Önce öğrenci seç.'); return; }
  const payload = { student: currentStudent, level: LEVEL_ID, progress, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vamos-ilerleme-${currentStudent}-${LEVEL_ID}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importProgressFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const payload = JSON.parse(reader.result);
      if(payload.level !== LEVEL_ID){
        alert('Bu dosya farklı bir seviyeye ait.');
        return;
      }
      currentStudent = payload.student;
      addToStudentList(currentStudent);
      document.getElementById('studentChip').textContent = currentStudent;
      progress = payload.progress || progress;
      saveProgress();
      renderProgress();
      alert('İlerleme içe aktarıldı: ' + currentStudent);
    }catch(e){
      alert('Dosya okunamadı.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

/* ---------- Init ---------- */
function initLevelPage(){
  fcDeck = [...VOCAB];
  document.getElementById('studentChip').addEventListener('click', pickStudent);
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click', ()=>goTo(b.dataset.section));
  });
  const hamburger = document.getElementById('hamburger');
  if(hamburger) hamburger.addEventListener('click', toggleMobileMenu);
  renderCard();
  renderProgress();
}
