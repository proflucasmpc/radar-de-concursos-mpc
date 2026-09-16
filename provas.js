const $ = (s) => document.querySelector(s);
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="phase2.css"><link rel="stylesheet" href="tabs.css">');
const normalizar = (v = "") => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let provas = [];

function preencher(id, valores) { valores.filter(Boolean).sort().forEach((v) => $(id).insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`)); }
function render() {
  const busca=normalizar($("#prova-busca").value), banca=$("#prova-banca").value, ano=$("#prova-ano").value, estado=$("#prova-estado").value;
  const lista=provas.filter(p=>(!busca||normalizar(`${p.orgao} ${p.cargo} ${p.banca}`).includes(busca))&&(banca==="todos"||p.banca===banca)&&(ano==="todos"||String(p.ano)===ano)&&(estado==="todos"||p.estado===estado));
  $("#prova-contador").textContent=`${lista.length} prova${lista.length===1?"":"s"}`;
  $("#provas-lista").innerHTML=lista.map(p=>`<article class="card"><div class="card-topline"><span class="tag">${p.banca}</span>${normalizar(p.banca).includes("vunesp")?'<span class="badge">FOCO VUNESP</span>':""}</div><h3>${p.orgao}</h3><p class="card-title">${p.cargo} · ${p.ano}</p><div class="meta"><span>📍 ${p.estado}</span><span>🎓 ${p.escolaridade||"Não informado"}</span>${p.questoes?`<span>🧾 ${p.questoes} questões</span>`:""}</div><div class="verification">Fonte: ${p.fonte||p.banca}</div><div class="card-bottom"><div class="card-actions"><a class="details" data-lead-context="Prova anterior — ${p.orgao} — ${p.cargo} — ${p.ano}" href="${p.provaUrl}" target="_blank" rel="noopener">Abrir prova</a>${p.gabaritoUrl?`<a class="secondary-action" data-lead-context="Gabarito — ${p.orgao} — ${p.cargo} — ${p.ano}" href="${p.gabaritoUrl}" target="_blank" rel="noopener">Ver gabarito</a>`:""}${p.fonteUrl?`<a class="secondary-action" data-lead-context="Fonte oficial — ${p.orgao} — ${p.cargo} — ${p.ano}" href="${p.fonteUrl}" target="_blank" rel="noopener">Fonte oficial</a>`:""}</div></div></article>`).join("");
  $("#provas-vazio").hidden=lista.length>0;
}
async function iniciar(){
  try{
    const caminhos=["data/provas.json","data/provas-lote2.json","data/provas-lote3.json"];
    const respostas=await Promise.all(caminhos.map(c=>fetch(c,{cache:"no-store"})));
    if(respostas.some(r=>!r.ok))throw new Error();
    const lotes=await Promise.all(respostas.map(r=>r.json()));
    const mapa=new Map(); lotes.flat().forEach(p=>mapa.set(p.id,p)); provas=[...mapa.values()];
    preencher("#prova-banca",[...new Set(provas.map(p=>p.banca))]); preencher("#prova-ano",[...new Set(provas.map(p=>String(p.ano)))]); preencher("#prova-estado",[...new Set(provas.map(p=>p.estado))]); render();
  }catch{$("#provas-lista").innerHTML='<div class="empty"><p>Não foi possível carregar o acervo agora.</p></div>';}
}
["#prova-busca","#prova-banca","#prova-ano","#prova-estado"].forEach(id=>$(id).addEventListener(id==="#prova-busca"?"input":"change",render)); iniciar();
