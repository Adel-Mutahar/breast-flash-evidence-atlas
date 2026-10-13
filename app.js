(() => {
const {summary, studies} = window.FLASH_DATA;
let filtered = [...studies];
const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uniq = arr => [...new Set(arr)].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b), undefined, {numeric:true}));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1800)}
function copyText(txt,msg='Copied'){navigator.clipboard.writeText(txt).then(()=>toast(msg)).catch(()=>toast('Copy failed'))}
function pct(n,max){return max ? Math.max(2,(n/max)*100) : 0}

function renderHero(){
  $('#heroStats').innerHTML = [
    [summary.reports,'eligible reports',''],
    [summary.directComparatorReports,'direct biological comparator reports',''],
    [summary.recentReports,'reports published in 2025–2026',''],
    ['2014–2026','publication span','wide']
  ].map(([n,l,c])=>`<div class="hero-stat ${c}"><strong>${n}</strong><span>${l}</span></div>`).join('');
}
function renderMetrics(){
  const items=[
    [summary.recordsRetrieved.toLocaleString(),'records retrieved','before deduplication'],
    [summary.screened,'title/abstract screened',`${summary.duplicatesRemoved} duplicates removed`],
    [summary.fullText,'full texts assessed','0 not retrieved'],
    [summary.reports,'reports included','final formal evidence base']
  ];
  $('#overviewMetrics').innerHTML=items.map(x=>`<div class="metric"><div class="num">${x[0]}</div><div class="label">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');
}
function barList(el, items){
  const max=Math.max(...items.map(d=>d.n));
  el.innerHTML=items.map(d=>`<div class="bar-row"><div class="bar-label">${esc(d.label)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct(d.n,max)}%"></div></div><div class="bar-value">${d.n}</div></div>`).join('');
}
function renderOverview(){
  barList($('#domainBars'), summary.evidenceDepth.map(d=>({label:d.domain,n:d.reports})));
  barList($('#modalityBars'), Object.entries(summary.modalityCounts).map(([label,n])=>({label,n})));
  barList($('#comparatorBars'), summary.comparatorSummary);
  const yc={};studies.forEach(s=>yc[s.year]=(yc[s.year]||0)+1);const years=Object.keys(yc).map(Number).sort();const max=Math.max(...Object.values(yc));
  $('#timelineChart').innerHTML=years.map(y=>`<div class="year-col"><div class="year-count">${yc[y]}</div><div class="year-bar" style="height:${Math.max(4,(yc[y]/max)*160)}px"></div><div class="year-label">${y}</div></div>`).join('');
}
function optionize(id, values){const el=$(id);values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})}
function initFilters(){
  optionize('#domainFilter', uniq(studies.flatMap(s=>s.domains)));
  optionize('#modalityFilter', uniq(studies.map(s=>s.modality)));
  optionize('#comparatorFilter', uniq(studies.map(s=>s.comparator)));
  optionize('#designFilter', uniq(studies.flatMap(s=>s.design)));
  optionize('#directionFilter', uniq(studies.flatMap(s=>s.directionTags)));
  optionize('#yearFilter', uniq(studies.map(s=>s.year)).sort((a,b)=>b-a));
  ['#searchInput','#domainFilter','#modalityFilter','#comparatorFilter','#designFilter','#directionFilter','#yearFilter'].forEach(id=>$(id).addEventListener('input',applyFilters));
  $('#clearFilters').addEventListener('click',()=>{['#searchInput','#domainFilter','#modalityFilter','#comparatorFilter','#designFilter','#directionFilter','#yearFilter'].forEach(id=>$(id).value='');applyFilters();history.replaceState(null,'',location.pathname)});
  readQuery();applyFilters();
}
function filtersState(){return {q:$('#searchInput').value.trim(),domain:$('#domainFilter').value,modality:$('#modalityFilter').value,comparator:$('#comparatorFilter').value,design:$('#designFilter').value,direction:$('#directionFilter').value,year:$('#yearFilter').value}}
function applyFilters(){
  const f=filtersState(), q=f.q.toLowerCase();
  filtered=studies.filter(s=>{
    const hay=[s.id,s.study,s.doi,s.domainsRaw,s.designModel,s.modalityRaw,s.flashRegimen,s.comparatorRaw,s.outcomeDirection,s.keyResult,s.overlap,s.citation].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!f.domain||s.domains.includes(f.domain))&&(!f.modality||s.modality===f.modality)&&(!f.comparator||s.comparator===f.comparator)&&(!f.design||s.design.includes(f.design))&&(!f.direction||s.directionTags.includes(f.direction))&&(!f.year||String(s.year)===String(f.year));
  });
  renderStudyRows();
}
function renderStudyRows(){
  $('#filterCount').innerHTML=`Showing <strong>${filtered.length}</strong> of ${studies.length} reports`;
  $('#studyRows').innerHTML=filtered.map(s=>`<tr><td><span class="study-id">${esc(s.id)}</span><span class="study-name">${esc(s.study)}</span><div class="tag">${esc(s.doi)}</div></td><td>${s.year}</td><td>${s.domains.map(d=>`<span class="tag">${esc(d)}</span>`).join('')}</td><td>${esc(s.modality)}</td><td>${esc(s.comparator)}</td><td class="direction-cell">${esc(s.outcomeDirection)}</td><td><button class="mini-btn details-btn" data-id="${s.id}">Details</button></td></tr>`).join('');
  $$('.details-btn').forEach(b=>b.addEventListener('click',()=>openDrawer(b.dataset.id)));
}
function openDrawer(id){
  const s=studies.find(x=>x.id===id); if(!s)return;
  $('#drawerContent').innerHTML=`<span class="eyebrow">${esc(s.id)} · ${s.year}</span><h2 id="drawerTitle">${esc(s.study)}</h2><p>${esc(s.citation)}</p><div class="detail-grid">
    <div class="detail-block"><span>Domain(s)</span>${esc(s.domainsRaw)}</div><div class="detail-block"><span>Modality</span>${esc(s.modalityRaw)}</div>
    <div class="detail-block detail-wide"><span>Design / model</span>${esc(s.designModel)}</div><div class="detail-block detail-wide"><span>FLASH regimen</span>${esc(s.flashRegimen)}</div>
    <div class="detail-block"><span>Comparator stratum</span>${esc(s.comparatorRaw)}</div><div class="detail-block"><span>Overlap adjudication</span>${esc(s.overlap)}</div>
    <div class="detail-block detail-wide"><span>Outcome direction</span>${esc(s.outcomeDirection)}</div><div class="detail-block detail-wide"><span>Key result / interpretation</span>${esc(s.keyResult)}</div>
    </div><div class="detail-actions"><a class="primary linkbtn" href="${esc(s.doiUrl)}" target="_blank" rel="noopener">Open DOI</a><button class="ghost" id="copyCitationNow">Copy citation</button><button class="ghost" id="copyDoiNow">Copy DOI</button></div>`;
  $('#copyCitationNow').addEventListener('click',()=>copyText(s.citation,'Citation copied'));
  $('#copyDoiNow').addEventListener('click',()=>copyText(s.doi,'DOI copied'));
  const d=$('#detailDrawer');d.classList.add('open');d.setAttribute('aria-hidden','false');
}
function closeDrawer(){const d=$('#detailDrawer');d.classList.remove('open');d.setAttribute('aria-hidden','true')}

function renderDirection(){
  $('#directionMatrix').innerHTML=summary.evidenceDepth.filter(d=>d.classifiable>0).map(d=>{
    const den=d.classifiable;return `<div class="dir-row"><div><div class="dir-name">${esc(d.domain)}</div><div class="dir-n">${den} classifiable comparison${den===1?'':'s'}</div></div><div><strong>${d.favorable}/${den}</strong> favorable</div><div class="stack" title="Favorable ${d.favorable}; mixed ${d.mixed}; neutral ${d.neutral}; unfavorable ${d.unfavorable}"><span class="seg-fav" style="width:${d.favorable/den*100}%"></span><span class="seg-mix" style="width:${d.mixed/den*100}%"></span><span class="seg-neu" style="width:${d.neutral/den*100}%"></span><span class="seg-unf" style="width:${d.unfavorable/den*100}%"></span></div><div class="dir-ci">95% Wilson CI<br>${d.wilson}</div></div>`
  }).join('');
  const domains=['Breast/mammary tumor','Lung','Thoracic skin','Heart/cardiac','Thoracic immune/hematologic','Planning/dosimetry'];
  const mods=['Electron','Proton','Photon/X-ray','Carbon ion','Helium ion','Other/mixed'];
  const counts=domains.map(d=>mods.map(m=>studies.filter(s=>s.domains.includes(d)&&s.modality===m).length));
  const max=Math.max(...counts.flat());
  let html='<table><thead><tr><th></th>'+mods.map(m=>`<th>${esc(m)}</th>`).join('')+'</tr></thead><tbody>';
  domains.forEach((d,i)=>{html+=`<tr><th class="rowhead">${esc(d)}</th>`+mods.map((m,j)=>{const n=counts[i][j];const a=max?n/max:0;return `<td style="background:rgba(140,29,64,${0.05+0.78*a});color:${a>.48?'white':'#2c3640'}" title="${esc(d)} × ${esc(m)}: ${n}">${n||'—'}</td>`}).join('')+'</tr>'});html+='</tbody></table>';$('#domainModalityMatrix').innerHTML=html;
  $('#depthCards').innerHTML=summary.evidenceDepth.map(d=>`<div class="depth-item"><div class="top"><strong>${esc(d.domain)}</strong><span>${d.reports} report${d.reports===1?'':'s'}</span></div><div class="meta">${d.classifiable?`${d.classifiable} classifiable for direction-of-effect synthesis · ${d.favorable} favorable`: 'Descriptive/technical evidence; no direction-of-effect denominator'}</div></div>`).join('');
}
function renderCitations(list=studies){
  $('#citationCount').textContent=`${list.length} references`;
  $('#citationList').innerHTML=list.map(s=>`<article class="citation-card"><div class="top"><div><span class="sid">${s.id}</span> · ${s.year}</div><span class="tag">${esc(s.modality)}</span></div><p>${esc(s.citation)}</p><div class="citation-actions"><a class="mini-btn linkbtn" href="${esc(s.doiUrl)}" target="_blank" rel="noopener">Open DOI</a><button class="mini-btn copy-cite" data-id="${s.id}">Copy citation</button><button class="mini-btn copy-doi" data-id="${s.id}">Copy DOI</button></div></article>`).join('');
  $$('.copy-cite').forEach(b=>b.addEventListener('click',()=>{const s=studies.find(x=>x.id===b.dataset.id);copyText(s.citation,'Citation copied')}));
  $$('.copy-doi').forEach(b=>b.addEventListener('click',()=>{const s=studies.find(x=>x.id===b.dataset.id);copyText(s.doi,'DOI copied')}));
}
function renderMethods(){
  const steps=[['Records retrieved',summary.recordsRetrieved],['Duplicates removed',summary.duplicatesRemoved],['Title/abstract screened',summary.screened],['Full texts assessed',summary.fullText],['Reports included',summary.reports]];
  $('#prismaFlow').innerHTML=steps.map(([l,n])=>`<div class="flow-step"><span>${l}</span><strong>${Number(n).toLocaleString()}</strong></div>`).join('');
}
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function downloadFiltered(){
  const cols=[['Study ID','id'],['Study','study'],['Year','year'],['DOI','doi'],['DOI URL','doiUrl'],['Domain(s)','domainsRaw'],['Design/model','designModel'],['Modality','modalityRaw'],['FLASH regimen','flashRegimen'],['Comparator stratum','comparatorRaw'],['Outcome direction','outcomeDirection'],['Key result / interpretation','keyResult'],['Overlap adjudication','overlap'],['Full citation','citation']];
  const csv=[cols.map(c=>csvEscape(c[0])).join(','),...filtered.map(s=>cols.map(c=>csvEscape(s[c[1]])).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Breast_FLASH_Evidence_Atlas_filtered.csv';a.click();URL.revokeObjectURL(a.href);toast(`Downloaded ${filtered.length} reports`)
}
function publicBaseUrl(){if(location.protocol==='file:')return '[PUBLIC_URL]';return location.origin+location.pathname}
function shareFiltered(){const f=filtersState();const p=new URLSearchParams();Object.entries(f).forEach(([k,v])=>{if(v)p.set(k,v)});const base=publicBaseUrl();if(base==='[PUBLIC_URL]'){toast('Filtered links become active after web deployment');return}const url=base+(p.toString()?`?${p}`:'')+'#explorer';copyText(url,'Filtered link copied')}
function renderResourceCitation(){const url=publicBaseUrl();const authors='Mutahar AZI, Thakur B, Corvino A, Whitmore L, et al.';$('#resourceCitation').innerHTML=`${authors} <em>Breast FLASH Evidence Atlas</em>: interactive companion to “FLASH Radiotherapy in Breast Cancer and Breast-Relevant Organs: A Scoping Review of Preclinical Evidence and the Clinical Roadmap.” Version ${esc(summary.resourceVersion||'1.0')}, 2026. Available at: <strong>${esc(url)}</strong>.`;}
function readQuery(){const p=new URLSearchParams(location.search);const map={q:'#searchInput',domain:'#domainFilter',modality:'#modalityFilter',comparator:'#comparatorFilter',design:'#designFilter',direction:'#directionFilter',year:'#yearFilter'};Object.entries(map).forEach(([k,id])=>{if(p.has(k))$(id).value=p.get(k)})}
function setupTabs(){
  $$('.tab').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.tab,true)));
  if(location.hash){const t=location.hash.replace('#','');if($('#'+t))activateTab(t,false)}
}
function activateTab(id,updateHash){$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));$$('.panel').forEach(x=>x.classList.toggle('active',x.id===id));if(updateHash)history.replaceState(null,'','#'+id)}
function setupGlobal(){
  $('#downloadBtn').addEventListener('click',downloadFiltered);$('#shareBtn').addEventListener('click',shareFiltered);$('#drawerClose').addEventListener('click',closeDrawer);$('#drawerBackdrop').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
  $('#citationSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();renderCitations(studies.filter(s=>!q||[s.citation,s.study,s.doi,s.year].join(' ').toLowerCase().includes(q)))});
  $('#copyResourceCitation').addEventListener('click',()=>copyText($('#resourceCitation').innerText,'Resource citation copied'));
}
renderHero();renderMetrics();renderOverview();initFilters();renderDirection();renderCitations();renderMethods();renderResourceCitation();setupTabs();setupGlobal();
})();
