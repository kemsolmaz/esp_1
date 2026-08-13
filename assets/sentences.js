/* ============ VAMOS — 100 Cümle sayfası ortak mantık ============
   Expects globals: SENT_LEVEL_ID, SENTENCES (array of {es,en,tr})
*/
function speakEs(text){
  if(!('speechSynthesis' in window)) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }catch(e){ /* silently ignore unsupported browsers */ }
}

function renderSentences(list){
  const wrap = document.getElementById('sentList');
  wrap.innerHTML = '';
  list.forEach((s, i)=>{
    const row = document.createElement('div');
    row.className = 'sent-row';
    row.innerHTML = `
      <div class="sent-num mono">${String(i+1).padStart(3,'0')}</div>
      <div class="sent-body">
        <div class="sent-es">${s.es}</div>
        <div class="sent-en">${s.en}</div>
        <div class="sent-tr">${s.tr}</div>
      </div>
      <button class="sent-speak" aria-label="Telaffuz et">🔊</button>
    `;
    row.querySelector('.sent-speak').addEventListener('click', ()=>speakEs(s.es));
    wrap.appendChild(row);
  });
}

function filterSentences(query){
  const q = query.trim().toLowerCase();
  if(!q){ renderSentences(SENTENCES); return; }
  const filtered = SENTENCES.filter(s =>
    s.es.toLowerCase().includes(q) || s.en.toLowerCase().includes(q) || s.tr.toLowerCase().includes(q)
  );
  renderSentences(filtered);
  document.getElementById('sentCount').textContent = `${filtered.length} sonuç`;
}

function toggleMobileMenuSent(){
  document.getElementById('tabs')?.classList.toggle('open');
}

function initSentencesPage(){
  renderSentences(SENTENCES);
  document.getElementById('sentCount').textContent = `${SENTENCES.length} cümle`;
  const search = document.getElementById('sentSearch');
  if(search){
    search.addEventListener('input', (e)=>filterSentences(e.target.value));
  }
  const hamburger = document.getElementById('hamburger');
  if(hamburger) hamburger.addEventListener('click', toggleMobileMenuSent);
}
