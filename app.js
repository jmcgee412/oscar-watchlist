/* Oscar Watchlist PWA — no backend, no external libraries. */
'use strict';

const STORAGE_KEY = 'oscar-watchlist-2027-v1';
const FILTERS = new Set(['all', 'unwatched', 'watched', 'available']);
const el = id => document.getElementById(id);
const $list = el('movieList');
const $overlay = el('overlay');
const $modal = el('modal');
let toastTimer;
let editCategories = null;
let drag = null;
let pendingBackup = null;
let beforeInstall = null;

const ICONS = {
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M16 4v16M4 8h16M4 16h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM6 15a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm12 7a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM8.7 10.7l6.5-4M8.7 13.3l6.5 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l12-12-4-4L4 16v4ZM14 6l4 4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>'
};

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function makeId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function slug(s) { return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }
function normTitle(s) { return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function defaultState() {
  const movies = clone(SEED_MOVIES);
  const categories = clone(DEFAULT_CATEGORIES);
  const all = movies.map(m => m.id);
  const rankings = {all};
  for (const c of categories) rankings[c.id] = all.filter(id => movies.find(m => m.id === id).nominations[c.id] !== undefined);
  return {version:1, movies, categories, rankings, preferences:{category:'all', filter:'all', showSynopsis:true}};
}
function normalizeMovie(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.title !== 'string') throw Error('Invalid movie record.');
  const title = raw.title.trim().slice(0,150);
  if (!title || !raw.id.trim()) throw Error('Movie title and ID are required.');
  const noms = {};
  if (raw.nominations && typeof raw.nominations === 'object' && !Array.isArray(raw.nominations)) {
    for (const [id, names] of Object.entries(raw.nominations)) {
      if (!/^[a-z0-9-]{1,80}$/.test(id) || !Array.isArray(names)) continue;
      noms[id] = names.slice(0,10).filter(n => typeof n === 'string').map(n => n.trim().slice(0,120)).filter(Boolean);
    }
  }
  const year = raw.year === null || raw.year === undefined || raw.year === '' ? null : Number(raw.year);
  const rating = raw.rating === null || raw.rating === undefined || raw.rating === '' ? null : Number(raw.rating);
  return {
    id:raw.id.slice(0,120), title,
    year:Number.isInteger(year) && year >= 1880 && year <= 2100 ? year : null,
    rating:Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : null,
    available:raw.available === true,
    availabilityDetails:String(raw.availabilityDetails ?? '').slice(0,240),
    watched:raw.watched === true,
    synopsis:String(raw.synopsis ?? '').slice(0,400),
    nominations:noms
  };
}
function restoreState(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.movies) || !Array.isArray(raw.categories)) throw Error('Unsupported or invalid backup format.');
  if (raw.movies.length > 4000 || raw.categories.length > 100) throw Error('Backup is too large.');
  const categories = raw.categories.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(c.id) || typeof c.label !== 'string' || !c.label.trim()) throw Error('Invalid category.');
    return {id:c.id, label:c.label.trim().slice(0,80), people:c.people === true};
  });
  if (new Set(categories.map(c=>c.id)).size !== categories.length) throw Error('Duplicate category IDs.');
  const movies = raw.movies.map(normalizeMovie);
  if (new Set(movies.map(m=>m.id)).size !== movies.length) throw Error('Duplicate movie IDs.');
  for (const movie of movies) for (const id of Object.keys(movie.nominations)) if (!categories.some(c=>c.id===id)) delete movie.nominations[id];
  const preferences = raw.preferences && typeof raw.preferences === 'object' ? raw.preferences : {};
  const state = {version:1,movies,categories,rankings:raw.rankings && typeof raw.rankings==='object'?raw.rankings:{},preferences:{
    category:preferences.category==='all'||categories.some(c=>c.id===preferences.category)?preferences.category:'all',
    filter:FILTERS.has(preferences.filter)?preferences.filter:'all',
    showSynopsis:preferences.showSynopsis !== false
  }};
  repairRankings(state);
  return state;
}
function repairRankings(s) {
  const byId = new Map(s.movies.map(m=>[m.id,m]));
  const existing = s.rankings || {};
  const expectedAll = s.movies.map(m=>m.id);
  const cleanOrder = (source, expected) => {
    const allowed=new Set(expected), used=new Set(), result=[];
    for (const id of Array.isArray(source)?source:[]) if (typeof id==='string'&&allowed.has(id)&&!used.has(id)){used.add(id);result.push(id);}
    for (const id of expected) if(!used.has(id)){used.add(id);result.push(id);}
    return result;
  };
  const all = cleanOrder(existing.all, expectedAll);
  const rankings = {all};
  for (const c of s.categories) {
    const expected=all.filter(id=>Object.prototype.hasOwnProperty.call(byId.get(id).nominations,c.id));
    rankings[c.id]=cleanOrder(existing[c.id],expected);
  }
  s.rankings=rankings;
}
let startupWarning = '';
let isFirstLaunch = false;
function readState() {
  try { const raw=localStorage.getItem(STORAGE_KEY); if(!raw){isFirstLaunch=true;return defaultState();} return restoreState(JSON.parse(raw)); }
  catch(e) { startupWarning='Stored data could not be read. Import a backup before making changes if you need to recover it.'; return defaultState(); }
}
let state=readState();
function save() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; }
  catch(e){toast('Could not save local data. Check device storage.');return false;}
}
function toast(message) {
  const t=el('toast');t.textContent=message;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true;},3500);
}
function findMovie(id){return state.movies.find(m=>m.id===id);}
function currentOrder(){return state.rankings[state.preferences.category]||state.rankings.all;}
function selectedCategory(){return state.categories.find(c=>c.id===state.preferences.category);}
function filteredIds(){return currentOrder().filter(id=>{const m=findMovie(id);if(!m)return false;switch(state.preferences.filter){case 'watched':return m.watched;case 'unwatched':return !m.watched;case 'available':return !m.watched&&m.available;default:return true;}});}
function rankLabel(rank){return String(rank+1).padStart(2,'0');}
function isReorderable(){return state.preferences.filter==='all';}
function renderCategoryOptions() {
  const sel=el('categorySelect');sel.innerHTML='<option value="all">All Movies</option>'+state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
  sel.value=state.preferences.category;
}
function cardHTML(movie, rank, totalInCategory) {
  const canMove=isReorderable();
  const awards=state.categories.filter(c=>Object.prototype.hasOwnProperty.call(movie.nominations,c.id));
  const awardsMarkup=awards.length?awards.map(c=>`<span class="award-chip"><span>${esc(c.label)}</span>${movie.nominations[c.id].length?`<span class="person-name">${esc(movie.nominations[c.id].join(', '))}</span>`:''}</span>`).join(''):'<span class="uncategorized">No categories selected</span>';
  const status=movie.available?'Available':'Not Available';
  return `<article class="movie-card${movie.watched?' watched':''}" data-id="${esc(movie.id)}" aria-label="Rank ${rank+1}: ${esc(movie.title)}">
    <div class="rank-rail"><span class="rank-number">${rankLabel(rank)}</span>
      <button class="drag-handle" aria-label="Drag to reorder ${esc(movie.title)}" title="Drag to reorder" ${canMove?'':'disabled'}>${ICONS.dots}</button>
      <div class="rank-stepper">
        <button data-action="move-up" data-id="${esc(movie.id)}" title="Move up" aria-label="Move ${esc(movie.title)} up" ${canMove&&rank>0?'':'disabled'}>${ICONS.up}</button>
        <button data-action="move-down" data-id="${esc(movie.id)}" title="Move down" aria-label="Move ${esc(movie.title)} down" ${canMove&&rank<totalInCategory-1?'':'disabled'}>${ICONS.down}</button>
      </div>
    </div>
    <div class="movie-content">
      <div class="movie-heading"><h2 class="movie-title">${esc(movie.title)}${movie.year?`<span class="movie-year">(${movie.year})</span>`:''}</h2><span class="rating"><span class="star">★</span>${movie.rating===null?'IMDb —':`IMDb ${movie.rating.toFixed(1)}`}</span></div>
      <div class="availability"><strong class="${movie.available?'available':'unavailable'}">${status}</strong>${movie.availabilityDetails?`<span class="availability-detail">(${esc(movie.availabilityDetails)})</span>`:''}</div>
      <div class="awards">${awardsMarkup}</div>
      ${state.preferences.showSynopsis&&movie.synopsis?`<p class="synopsis">${esc(movie.synopsis)}</p>`:''}
      <div class="card-actions">
        <label class="watched-check"><input type="checkbox" data-watched="${esc(movie.id)}" ${movie.watched?'checked':''} aria-label="Mark ${esc(movie.title)} watched"><span>${movie.watched?'Watched':'Watched?'}</span></label>
        <button class="action-btn trailer" data-action="trailer" data-id="${esc(movie.id)}" title="Watch trailer">${ICONS.play}Trailer</button>
        <button class="action-btn" data-action="share" data-id="${esc(movie.id)}" title="Share movie">${ICONS.share}Share</button>
        <button class="action-btn icon-only" data-action="edit" data-id="${esc(movie.id)}" aria-label="Edit ${esc(movie.title)}" title="Edit movie">${ICONS.edit}</button>
      </div>
    </div>
  </article>`;
}
function render(){
  const total=state.movies.length, watched=state.movies.filter(m=>m.watched).length;
  el('totalCount').textContent=total;el('remainingCount').textContent=total-watched;el('watchedCount').textContent=watched;
  el('progressFill').style.width=(total?100*watched/total:0)+'%';
  el('categorySelect').value=state.preferences.category;
  el('filters').querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===state.preferences.filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});
  const ids=filteredIds(), order=currentOrder(), cat=selectedCategory();
  const filterText={all:'',unwatched:' · Unwatched',watched:' · Watched',available:' · Available now'}[state.preferences.filter];
  el('listContext').textContent=`${ids.length} ${ids.length===1?'film':'films'} · ${cat?cat.label:'All Movies'}${filterText}`;
  el('orderHint').innerHTML=isReorderable()?'Drag <span aria-hidden="true">⠿</span> to rank':'Rank order preserved';
  $list.innerHTML=ids.length?ids.map(id=>cardHTML(findMovie(id),order.indexOf(id),order.length)).join(''):
    `<div class="empty-state"><div class="empty-icon">✦</div><h2>No films to show</h2><p>Try another category or viewing filter.</p></div>`;
}
function updateAndRender(){repairRankings(state);save();render();}
function moveRank(id, delta){
  if(!isReorderable())return;
  const order=currentOrder(),idx=order.indexOf(id),next=idx+delta;
  if(idx<0||next<0||next>=order.length)return;
  [order[idx],order[next]]=[order[next],order[idx]];save();render();
}
function setWatched(id,flag){const m=findMovie(id);if(!m)return;m.watched=flag;save();render();}

function showModal(contents,focusSelector){
  $modal.innerHTML=contents;$overlay.hidden=false;document.body.style.overflow='hidden';
  requestAnimationFrame(()=>{($modal.querySelector(focusSelector||'button, input, select, textarea')||$modal).focus();});
}
function closeModal(){
  $overlay.hidden=true;$modal.innerHTML='';document.body.style.overflow='';editCategories=null;pendingBackup=null;
}
function modalHead(title){return `<div class="modal-header"><h2 id="modalTitle">${title}</h2><button class="form-close" data-modal-close aria-label="Close">${ICONS.close}</button></div>`;}
function categoryRow(c,selected,names=[]){
  return `<div class="category-edit-row${selected?' selected':''}" data-cat-row="${esc(c.id)}"><label class="category-check"><input type="checkbox" data-category-check="${esc(c.id)}" ${selected?'checked':''}><span>${esc(c.label)}</span></label>${c.people?`<input class="form-input nominee-edit" data-nominees="${esc(c.id)}" value="${esc(names.join(', '))}" placeholder="Names, separated by commas" maxlength="500" aria-label="Names for ${esc(c.label)}">`:''}</div>`;
}
function editMovie(id=null) {
  const existing=id?findMovie(id):null;if(id&&!existing)return;
  editCategories=clone(state.categories);
  const m=existing||{title:'',year:null,rating:null,available:false,availabilityDetails:'',synopsis:'',nominations:{}};
  showModal(`${modalHead(existing?'Edit <em>Movie</em>':'Add <em>Movie</em>')}
    <form id="movieForm" novalidate>
      <div class="form-field"><label class="modal-label" for="movieTitle">MOVIE TITLE *</label><input class="form-input" id="movieTitle" name="title" maxlength="150" required value="${esc(m.title)}" placeholder="Movie title"></div>
      <div class="form-grid">
        <div class="form-field"><label class="modal-label" for="movieYear">RELEASE YEAR</label><input class="form-input" id="movieYear" name="year" type="number" min="1880" max="2100" value="${m.year??''}" placeholder="Optional"></div>
        <div class="form-field"><label class="modal-label" for="movieRating">IMDB SCORE</label><input class="form-input" id="movieRating" name="rating" type="number" min="0" max="10" step="0.1" value="${m.rating??''}" placeholder="0.0–10.0"></div>
      </div>
      <div class="form-grid">
        <div class="form-field"><label class="modal-label" for="movieAvailable">AVAILABILITY</label><select class="form-input" id="movieAvailable" name="available"><option value="false" ${!m.available?'selected':''}>Not Available</option><option value="true" ${m.available?'selected':''}>Available</option></select></div>
        <div class="form-field"><label class="modal-label" for="movieDetails">DETAILS</label><input class="form-input" id="movieDetails" name="availabilityDetails" maxlength="240" value="${esc(m.availabilityDetails)}" placeholder="Netflix, Theaters, etc."></div>
      </div>
      <div class="form-field"><label class="modal-label" for="movieSynopsis">ONE-LINE SYNOPSIS (OPTIONAL)</label><textarea class="form-input" id="movieSynopsis" name="synopsis" rows="2" maxlength="400" placeholder="A quick reminder of what the film is about">${esc(m.synopsis)}</textarea><p class="form-help">Can be shown or hidden on cards from Settings.</p></div>
      <div class="form-field"><label class="modal-label">AWARD CATEGORIES & PEOPLE</label><div id="editorCategories" class="category-editor">${editCategories.map(c=>categoryRow(c,Object.prototype.hasOwnProperty.call(m.nominations,c.id),m.nominations[c.id]||[])).join('')}</div>
        <div class="inline-add"><input class="form-input" id="newCategoryName" maxlength="80" placeholder="New category name (optional)" aria-label="New category name"><button class="secondary-btn" type="button" id="newCategoryBtn">+ Category</button></div>
        <label class="form-help category-people-check"><input type="checkbox" id="newCategoryPeople"> This category includes person names</label>
      </div>
      <div class="modal-actions">${existing?`<button class="danger-btn" type="button" id="deleteMovieBtn" data-id="${esc(existing.id)}">Delete</button>`:''}<button type="button" class="secondary-btn" data-modal-close>Cancel</button><button type="submit" class="primary-btn">${existing?'Save Changes':'Add Movie'}</button></div>
    </form>`, '#movieTitle');
  el('movieForm').dataset.editId=id||'';
}
function addCustomCategory(){
  const input=el('newCategoryName'),label=input.value.trim();
  if(!label){input.focus();return;}
  if(editCategories.some(c=>c.label.toLowerCase()===label.toLowerCase())){toast('That category already exists.');return;}
  let id='custom-'+(slug(label)||'category');
  let suffix=2;while(editCategories.some(c=>c.id===id))id='custom-'+slug(label)+'-'+suffix++;
  const c={id,label:label.slice(0,80),people:el('newCategoryPeople')?.checked===true};editCategories.push(c);
  el('editorCategories').insertAdjacentHTML('beforeend',categoryRow(c,true,[]));input.value='';el('newCategoryPeople').checked=false;toast('Category will be added when you save this movie.');
}
function saveMovieForm(form){
  const title=el('movieTitle').value.trim();if(!title){toast('Enter a movie title.');el('movieTitle').focus();return;}
  const yearRaw=el('movieYear').value.trim(),ratingRaw=el('movieRating').value.trim();
  const year=yearRaw?Number(yearRaw):null,rating=ratingRaw?Number(ratingRaw):null;
  if(year!==null&&(!Number.isInteger(year)||year<1880||year>2100)){toast('Enter a valid release year.');return;}
  if(rating!==null&&(!Number.isFinite(rating)||rating<0||rating>10)){toast('IMDb rating must be between 0 and 10.');return;}
  const existingId=form.dataset.editId, existing=existingId?findMovie(existingId):null;
  const duplicate=state.movies.find(m=>m.id!==existingId&&normTitle(m.title)===normTitle(title)&&(m.year===year||m.year===null||year===null));
  if(duplicate){toast('That movie already appears to be on your list.');return;}
  const nominations={};
  for (const c of editCategories){
    const checkbox=$modal.querySelector(`[data-category-check="${c.id}"]`);
    if(!checkbox?.checked)continue;
    const nomineeInput=$modal.querySelector(`[data-nominees="${c.id}"]`);
    nominations[c.id]=c.people&&nomineeInput?nomineeInput.value.split(/[,\n]/).map(x=>x.trim().slice(0,120)).filter(Boolean).slice(0,10):[];
  }
  const movie={id:existing?existing.id:makeId(),title,year,rating,available:el('movieAvailable').value==='true',availabilityDetails:el('movieDetails').value.trim(),watched:existing?existing.watched:false,synopsis:el('movieSynopsis').value.trim(),nominations};
  state.categories=clone(editCategories);
  if(existing){state.movies[state.movies.indexOf(existing)]=movie;}else{state.movies.push(movie);}
  updateAndRender();renderCategoryOptions();closeModal();toast(existing?'Movie updated.':'Movie added to your watchlist.');
}
function deleteMovie(id){
  const m=findMovie(id);if(!m)return;
  if(!confirm(`Delete “${m.title}” from your watchlist? This cannot be undone unless you have a backup.`))return;
  state.movies=state.movies.filter(m=>m.id!==id);updateAndRender();closeModal();toast('Movie deleted.');
}
function trailerUrl(movie){return 'https://www.youtube.com/results?search_query='+encodeURIComponent(`${movie.title} ${movie.year||''} official trailer`.replace(/\s+/g,' ').trim());}
function packShare(movie){
  return {v:1,title:movie.title,year:movie.year,rating:movie.rating,available:movie.available,availabilityDetails:movie.availabilityDetails,
    categories:Object.entries(movie.nominations).map(([id,names])=>{const cat=state.categories.find(c=>c.id===id);return {id,label:cat?.label||id,people:cat?.people||false,names};})};
}
function encodePayload(payload){const binary=Array.from(new TextEncoder().encode(JSON.stringify(payload)),b=>String.fromCharCode(b)).join('');return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodePayload(code){if(code.length>8000)throw Error('Shared link is too large.');const base64=code.replace(/-/g,'+').replace(/_/g,'/');const binary=atob(base64);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
function shareURL(movie){return window.location.href.split('#')[0]+'#film='+encodePayload(packShare(movie));}
async function copyText(text){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(e){}
  const box=document.createElement('textarea');box.value=text;box.style.position='fixed';box.style.top='0';box.style.opacity='0';document.body.appendChild(box);box.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}box.remove();return ok;
}
async function shareMovie(id){
  const movie=findMovie(id);if(!movie)return;const url=shareURL(movie);
  if(navigator.share){try{await navigator.share({title:movie.title,text:`Oscar watchlist suggestion: ${movie.title}`,url});return;}
    catch(e){if(e.name==='AbortError')return;}}
  if(await copyText(url)){toast('Movie link copied. Paste it into a text message.');return;}
  showModal(`${modalHead('Share <em>Movie</em>')}<p class="backup-info">Copy this movie link and send it via text message.</p><textarea class="form-input" readonly rows="5" id="shareFallback">${esc(url)}</textarea><div class="modal-actions"><button class="primary-btn" id="copyShare">Select Link</button></div>`);
}
function validatedShare(raw){
  if(!raw||typeof raw!=='object'||raw.v!==1||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>150)throw Error('Invalid movie link.');
  const year=raw.year===null||raw.year===undefined?null:Number(raw.year);
  const rating=raw.rating===null||raw.rating===undefined?null:Number(raw.rating);
  if(year!==null&&(!Number.isInteger(year)||year<1880||year>2100))throw Error('Invalid release year in link.');
  if(rating!==null&&(!Number.isFinite(rating)||rating<0||rating>10))throw Error('Invalid IMDb score in link.');
  if(typeof raw.availabilityDetails!=='string'||raw.availabilityDetails.length>240||typeof raw.available!=='boolean')throw Error('Invalid availability in link.');
  if(!Array.isArray(raw.categories)||raw.categories.length>100)throw Error('Invalid category data.');
  const categories=raw.categories.map(c=>{
    if(!c||typeof c.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(c.id)||typeof c.label!=='string'||!c.label.trim()||c.label.length>80||!Array.isArray(c.names)||c.names.length>10||c.names.some(n=>typeof n!=='string'||n.length>120))throw Error('Invalid category information.');
    return {id:c.id,label:c.label,people:c.people===true,names:c.names.map(n=>n.trim()).filter(Boolean)};
  });
  return {title:raw.title.trim(),year,rating,available:raw.available,availabilityDetails:raw.availabilityDetails,categories};
}
function duplicateMovie(data){return state.movies.find(m=>normTitle(m.title)===normTitle(data.title)&&(m.year===data.year||m.year===null||data.year===null));}
function openImportPreview(data){
  const duplicate=duplicateMovie(data);
  const categoryNames=data.categories.map(c=>c.label+(c.names.length?' · '+c.names.join(', '):'')).join(' / ');
  window._pendingFilmImport=data;
  showModal(`${modalHead('Import <em>Movie</em>')}
    <div class="import-preview"><strong>${esc(data.title)}${data.year?` (${data.year})`:''}</strong>
    <div>IMDb ${data.rating===null?'—':data.rating.toFixed(1)} · ${data.available?'Available':'Not Available'}${data.availabilityDetails?' ('+esc(data.availabilityDetails)+')':''}</div><div>${esc(categoryNames||'No award categories')}</div></div>
    ${duplicate?`<div class="notice">This movie already appears in your watchlist as “${esc(duplicate.title)}”. Its existing rankings, watched status, and details will be kept.</div>`:'<p class="backup-info">The movie will be added as Not Watched at the bottom of your rankings. The sender’s personal rankings and watched status are not shared.</p>'}
    <div class="modal-actions"><button class="secondary-btn" data-modal-close>Cancel</button>${duplicate?'<button class="primary-btn" data-modal-close>Keep Existing</button>':'<button class="primary-btn" id="confirmFilmImport">Add to Watchlist</button>'}</div>`);
}
function importFilm(data){
  if(duplicateMovie(data)){toast('Movie already exists. Nothing imported.');return;}
  const nominations={};
  for(const c of data.categories){
    const present=state.categories.find(cat=>cat.id===c.id);
    if(!present)state.categories.push({id:c.id,label:c.label,people:c.people});
    nominations[c.id]=c.names;
  }
  state.movies.push({id:makeId(),title:data.title,year:data.year,rating:data.rating,available:data.available,availabilityDetails:data.availabilityDetails,watched:false,synopsis:'',nominations});
  updateAndRender();renderCategoryOptions();closeModal();toast('Shared movie added.');
}
function importFromLink(raw){
  try{
    const input=String(raw).trim();let hash='';
    if(input.startsWith('#'))hash=input;
    else {const url=new URL(input,location.href);hash=url.hash;}
    if(!hash.startsWith('#film='))throw Error('No shared movie data was found.');
    openImportPreview(validatedShare(decodePayload(hash.slice(6))));
  }catch(e){toast(e.message||'Could not read movie link.');}
}
function scanIncomingLink(){
  if(location.hash.startsWith('#film=')){
    const fragment=location.hash;
    history.replaceState(null,'',location.pathname+location.search);
    importFromLink(fragment);
  }
}
function backupJSON(){
  const exportData={app:'Oscar Watchlist 2027',exportedAt:new Date().toISOString(),state:clone(state)};
  const json=JSON.stringify(exportData,null,2),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`oscar-watchlist-2027-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('JSON backup downloaded.');
}
function openSettings(){
  showModal(`${modalHead('Watchlist <em>Settings</em>')}
    <div class="settings-section"><h3>Card appearance</h3><p>Show a short synopsis on cards when a description has been entered for a movie.</p><label class="setting-toggle"><input id="showSynopsisToggle" type="checkbox" ${state.preferences.showSynopsis?'checked':''}><span>Display movie synopses</span></label></div>
    <div class="settings-section"><h3>Backup & restore</h3><p>Everything is stored only in this device’s browser storage. Export a JSON backup occasionally, especially before changing phones or clearing browser data.</p><div class="settings-buttons"><button class="primary-btn" id="exportBackup">Export JSON</button><button class="secondary-btn" id="importBackupBtn">Import JSON</button></div></div>
    <div class="settings-section"><h3>Import shared movie</h3><p>Use this if a text-message movie link opens in a different browser or needs to be pasted manually.</p><textarea id="pasteFilmURL" class="form-input" rows="2" placeholder="Paste the shared movie link here" aria-label="Shared movie link"></textarea><div class="settings-buttons" style="margin-top:9px"><button class="secondary-btn" id="importPasteBtn">Preview Movie</button></div></div>
    <div class="settings-section"><h3>Install & offline access</h3><p>Open this app using Chrome on Android, then select <strong>Add to Home screen</strong> or <strong>Install app</strong>. Once opened online, its files are cached for offline use. Each phone keeps separate data.</p><div class="settings-buttons" id="installContainer">${beforeInstall?'<button class="secondary-btn" id="installBtn">Install App</button>':''}</div></div>
    <div class="backup-info">Version 1 · No accounts · No cloud sync · No automatic availability updates</div>`);
}
function handleBackupFile(file){
  if(!file)return;
  if(file.size>4*1024*1024){toast('Backup file is too large.');return;}
  file.text().then(text=>{
    let incoming;
    try {const parsed=JSON.parse(text);incoming=restoreState(parsed.state??parsed);}catch(e){toast(e.message||'Invalid backup.');return;}
    pendingBackup=incoming;
    showModal(`${modalHead('Restore <em>Backup</em>')}<div class="notice"><strong>Replace all data on this phone?</strong> Importing a backup replaces this phone’s current movies, watched statuses, categories, and rankings. Export your current data first if you want to keep it.</div>
      <div class="import-preview"><strong>${incoming.movies.length} movies</strong><div>${incoming.categories.length} categories · ${incoming.movies.filter(m=>m.watched).length} watched</div></div>
      <div class="modal-actions"><button class="secondary-btn" data-modal-close>Cancel</button><button class="danger-btn" id="confirmBackup">Replace Watchlist</button></div>`);
  }).catch(()=>toast('Could not read backup file.'));
}

// Touch-friendly Pointer Events sorting. It is intentionally available only in unfiltered rank mode.
function beginDrag(e){
  const handle=e.target.closest('.drag-handle');if(!handle||!isReorderable()||e.button!==0)return;
  const card=handle.closest('.movie-card');if(!card)return;
  const rect=card.getBoundingClientRect();
  drag={id:card.dataset.id,pointerId:e.pointerId,handle,card,rect,startY:e.clientY,y:e.clientY,started:false,placeholder:null,raf:0};
  try{handle.setPointerCapture(e.pointerId);}catch(err){}
}
function activateDrag(){
  if(!drag||drag.started)return;
  drag.started=true;
  const {card,rect}=drag;
  const p=document.createElement('div');p.className='drag-placeholder';p.style.height=rect.height+'px';
  card.parentElement.insertBefore(p,card);
  drag.placeholder=p;
  Object.assign(card.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'1000',margin:'0'});
  card.classList.add('dragging');
  if(navigator.vibrate)try{navigator.vibrate(15);}catch(err){}
  drag.raf=requestAnimationFrame(autoScrollLoop);
}
function placePlaceholder(){
  if(!drag?.started)return;
  const targetY=drag.y, children=Array.from($list.children).filter(node=>node.classList.contains('movie-card')&&!node.classList.contains('dragging'));
  let before=null;
  for(const node of children){const rect=node.getBoundingClientRect();if(targetY < rect.top+rect.height/2){before=node;break;}}
  if(before)$list.insertBefore(drag.placeholder,before);else $list.appendChild(drag.placeholder);
}
function autoScrollLoop(){
  if(!drag?.started)return;
  const edge=75, y=drag.y,h=window.innerHeight;let speed=0;
  if(y<edge)speed=-Math.min(13,Math.ceil((edge-y)/5));
  else if(y>h-edge)speed=Math.min(13,Math.ceil((y-(h-edge))/5));
  if(speed){window.scrollBy(0,speed);placePlaceholder();}
  drag.raf=requestAnimationFrame(autoScrollLoop);
}
function dragMove(e){
  if(!drag||drag.pointerId!==e.pointerId)return;
  drag.y=e.clientY;
  if(!drag.started){if(Math.abs(e.clientY-drag.startY)<7)return;activateDrag();}
  e.preventDefault();
  drag.card.style.top=(drag.rect.top+e.clientY-drag.startY)+'px';
  placePlaceholder();
}
function dragEnd(e,canceled=false){
  if(!drag||drag.pointerId!==e.pointerId)return;
  const d=drag;drag=null;cancelAnimationFrame(d.raf);
  try{d.handle.releasePointerCapture(e.pointerId);}catch(err){}
  if(!d.started)return;
  if(d.placeholder?.parentElement)d.placeholder.replaceWith(d.card);
  d.card.classList.remove('dragging');
  for(const key of ['position','left','top','width','height','zIndex','margin'])d.card.style[key]='';
  if(canceled){render();return;}
  const ids=Array.from($list.querySelectorAll('.movie-card')).map(x=>x.dataset.id);
  const order=currentOrder();
  if(ids.length===order.length&&ids.every(id=>order.includes(id))){state.rankings[state.preferences.category]=ids;save();}
  render();
}

// App event wiring
el('categorySelect').addEventListener('change',e=>{state.preferences.category=e.target.value;save();render();});
el('filters').addEventListener('click',e=>{const btn=e.target.closest('[data-filter]');if(!btn)return;state.preferences.filter=btn.dataset.filter;save();render();});
el('addMovieBtn').addEventListener('click',()=>editMovie());
el('settingsBtn').addEventListener('click',openSettings);
$list.addEventListener('change',e=>{const box=e.target.closest('[data-watched]');if(box)setWatched(box.dataset.watched,box.checked);});
$list.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const id=btn.dataset.id,m=findMovie(id);if(!m)return;
  switch(btn.dataset.action){case'move-up':moveRank(id,-1);break;case'move-down':moveRank(id,1);break;case'edit':editMovie(id);break;case'trailer':window.open(trailerUrl(m),'_blank','noopener,noreferrer');break;case'share':shareMovie(id);break;}
});
$list.addEventListener('pointerdown',beginDrag);
document.addEventListener('pointermove',dragMove,{passive:false});
document.addEventListener('pointerup',e=>dragEnd(e));
document.addEventListener('pointercancel',e=>dragEnd(e,true));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag)dragEnd({pointerId:drag.pointerId},true);if(!$overlay.hidden)closeModal();}});
$overlay.addEventListener('click',e=>{
  if(e.target.closest('[data-close-modal], [data-modal-close]')){closeModal();return;}
  if(e.target.id==='newCategoryBtn'){addCustomCategory();return;}
  if(e.target.id==='deleteMovieBtn'){deleteMovie(e.target.dataset.id);return;}
  if(e.target.id==='exportBackup'){backupJSON();return;}
  if(e.target.id==='importBackupBtn'){el('backupFile').click();return;}
  if(e.target.id==='importPasteBtn'){const input=el('pasteFilmURL');const url=input?.value.trim();if(url)importFromLink(url);else toast('Paste a shared movie URL first.');return;}
  if(e.target.id==='confirmFilmImport'){const data=window._pendingFilmImport;if(data)importFilm(data);return;}
  if(e.target.id==='confirmBackup'&&pendingBackup){state=pendingBackup;renderCategoryOptions();updateAndRender();closeModal();toast('JSON backup restored.');return;}
  if(e.target.id==='copyShare'){const box=el('shareFallback');box.focus();box.select();return;}
  if(e.target.id==='installBtn'&&beforeInstall){beforeInstall.prompt();beforeInstall.userChoice.then(()=>{beforeInstall=null;});return;}
});
$overlay.addEventListener('change',e=>{
  const cat=e.target.closest('[data-category-check]');if(cat){const row=cat.closest('.category-edit-row');row.classList.toggle('selected',cat.checked);return;}
  if(e.target.id==='showSynopsisToggle'){state.preferences.showSynopsis=e.target.checked;save();render();}
});
$overlay.addEventListener('submit',e=>{if(e.target.id==='movieForm'){e.preventDefault();saveMovieForm(e.target);}});
el('backupFile').addEventListener('change',e=>{handleBackupFile(e.target.files?.[0]);e.target.value='';});
window.addEventListener('hashchange',scanIncomingLink);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();beforeInstall=e;});
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

if(isFirstLaunch)save();
renderCategoryOptions();render();scanIncomingLink();if(startupWarning)toast(startupWarning);
