const $ = (s) => document.querySelector(s);
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="phase2.css">');
const normalizar = (v = "") => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let provas = [];

function preencher(id, valores) { valores.filter(Boolean).sort().forEach((v) => $(id).insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`)); }
function render() {
  const busca = normalizar($("#prova-busca").value);
  const banca = $("#prova-banca").value, ano = $("#prova-ano").value, estado = $("#prova-estado").value;
  const lista = provas.filter((p) => (!busca || normalizar(`${p.orgao} ${p.cargo} ${p.banca}`).includes(busca)) && (banca === "todos" || p.banca === banca) && (ano === "todos" || String(p.ano) === ano) && (estado === "todos" || p.estado === estado));
  $("#prova-contador").textContent = `${lista.length} prova${lista.length === 1 ? "" : "s"}`;
  $("#provas-lista").innerHTML = lista.map((p) => `<article class="card"><span class="tag">${p.banca}</span><h3>${p.orgao}</h3><p class="card-title">${p.cargo} · ${p.ano}</p><div class="meta"><span>📍 ${p.estado}</span><span>🎓 ${p.escolaridade || "Não informado"}</span></div><div class="card-bottom"><a class="details" href="${p.provaUrl}" target="_blank" rel="noopener">Abrir prova</a>${p.gabaritoUrl ? `<a class="secondary-action" href="${p.gabaritoUrl}" target="_blank" rel="noopener">Gabarito</a>` : ""}</div></article>`).join("");
  $("#provas-vazio").hidden = lista.length > 0;
}
async function iniciar() {
  try {
    const r = await fetch("data/concursos.json");
    const concursos = await r.json();
    provas = concursos.flatMap((c) => (c.provasAnteriores || []).map((p) => ({ ...p, orgao: p.orgao || c.orgao, estado: p.estado || c.estado, banca: p.banca || c.banca })));
    preencher("#prova-banca", [...new Set(provas.map((p) => p.banca))]); preencher("#prova-ano", [...new Set(provas.map((p) => String(p.ano)))]); preencher("#prova-estado", [...new Set(provas.map((p) => p.estado))]); render();
  } catch { $("#provas-lista").innerHTML = '<div class="empty"><p>Não foi possível carregar o acervo agora.</p></div>'; }
}
["#prova-busca", "#prova-banca", "#prova-ano", "#prova-estado"].forEach((id) => $(id).addEventListener(id === "#prova-busca" ? "input" : "change", render)); iniciar();
