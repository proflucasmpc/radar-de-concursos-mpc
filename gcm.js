const $=s=>document.querySelector(s);
const n=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const d=v=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(v+"T12:00:00Z")):"Não informado";
function abertoAgora(x){
  const hoje=new Date().toISOString().slice(0,10);
  if(!["aberto","edital"].includes(x.status)) return false;
  if(x.inicioInscricoes&&x.inicioInscricoes>hoje) return false;
  if(x.fimInscricoes&&x.fimInscricoes<hoje) return false;
  return true;
}
async function iniciar(){
  const c=await fetch("data/concursos.json",{cache:"no-store"}).then(r=>r.json());
  const lista=c.filter(x=>{
    const t=n([x.titulo,...(x.cargos||[]),...(x.tags||[])].join(" "));
    return (t.includes("guarda")||t.includes("gcm"))&&abertoAgora(x);
  }).sort((a,b)=>(a.fimInscricoes||"9999").localeCompare(b.fimInscricoes||"9999"));
  $("#gcm-count").textContent=`${lista.length} oportunidade(s) com inscrições abertas`;
  $("#gcm-lista").innerHTML=lista.map(x=>`<article class="card"><span class="tag">${x.banca}</span><h3>${x.orgao}</h3><p class="card-title">${x.titulo}</p><div class="card-highlights"><div><span>Vagas</span><strong>${x.vagas}</strong></div><div><span>Prazo</span><strong>${d(x.fimInscricoes)}</strong></div></div><div class="card-bottom"><a class="details" data-lead-context="Detalhes GCM — ${x.orgao}" href="detalhes.html?concurso=${encodeURIComponent(x.slug)}">Ver detalhes</a>${x.inscricaoUrl?`<a class="secondary-action compact" data-lead-context="Inscrição oficial GCM — ${x.orgao}" href="${x.inscricaoUrl}" target="_blank" rel="noopener">Inscrição oficial</a>`:""}</div></article>`).join("")||'<div class="empty">Nenhum concurso de Guarda Municipal com inscrições abertas no momento.</div>';
}
iniciar();