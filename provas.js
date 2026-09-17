const $ = (s) => document.querySelector(s);
const normalizar = (v = "") => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let provas = [];

function preencher(id, valores) {
  valores.filter(Boolean).sort().forEach((v) => $(id).insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`));
}

function render() {
  const busca = normalizar($("#prova-busca").value);
  const banca = $("#prova-banca").value;
  const ano = $("#prova-ano").value;
  const estado = $("#prova-estado").value;
  const lista = provas
    .filter((p) => (!busca || normalizar(`${p.orgao} ${p.cargo} ${p.banca}`).includes(busca)) && (banca === "todos" || p.banca === banca) && (ano === "todos" || String(p.ano) === ano) && (estado === "todos" || p.estado === estado))
    .sort((a, b) => Number(b.destaque) - Number(a.destaque) || b.ano - a.ano || a.orgao.localeCompare(b.orgao, "pt-BR"));

  $("#prova-contador").textContent = `${lista.length} prova${lista.length === 1 ? "" : "s"}`;
  $("#provas-lista").innerHTML = lista.map((p) => {
    const contexto = `${p.orgao} — ${p.cargo} — ${p.ano}`;
    const questoes = p.quantidadeQuestoes ? `${p.quantidadeQuestoes} questões` : "Quantidade não informada";
    const classe = normalizar(p.banca).includes("vunesp") ? "card proof-featured" : "card";
    const botaoProva = p.provaPdfUrl
      ? `<a class="details" data-lead-context="Abrir prova — ${contexto}" href="${p.provaPdfUrl}" target="_blank" rel="noopener">Abrir prova</a>`
      : '<span class="secondary-action compact disabled-action" aria-disabled="true">PDF da prova em conferência</span>';
    const botaoGabarito = p.gabaritoPdfUrl
      ? `<a class="secondary-action compact" data-lead-context="Abrir gabarito — ${contexto}" href="${p.gabaritoPdfUrl}" target="_blank" rel="noopener">Abrir gabarito</a>`
      : '<span class="secondary-action compact disabled-action" aria-disabled="true">Gabarito em conferência</span>';
    const fonteArquivo = p.fonteArquivo ? `<span>Arquivo: ${p.fonteArquivo}</span>` : "";

    return `<article class="${classe}">
      <div class="card-topline"><span class="tag">${p.banca}</span>${normalizar(p.banca).includes("vunesp") ? '<span class="deadline-chip">FOCO VUNESP</span>' : ""}</div>
      <h3>${p.orgao}</h3>
      <p class="card-title">${p.cargo} · ${p.ano}</p>
      <div class="card-highlights"><div><span>Escolaridade</span><strong>${p.escolaridade || "Não informado"}</strong></div><div><span>Questões</span><strong>${questoes}</strong></div></div>
      <div class="meta"><span>📍 ${p.estado}</span><span>📝 ${p.banca}</span></div>
      <p class="proof-source">${fonteArquivo || "PDF direto ainda não confirmado"}</p>
      <div class="card-bottom"><div class="card-actions">${botaoProva}${botaoGabarito}${p.fonteUrl ? `<a class="secondary-action compact" data-lead-context="Fonte oficial — ${contexto}" href="${p.fonteUrl}" target="_blank" rel="noopener">Fonte oficial</a>` : ""}</div></div>
    </article>`;
  }).join("");
  $("#provas-vazio").hidden = lista.length > 0;
}

async function iniciar() {
  try {
    const r = await fetch("data/provas.json", { cache: "no-store" });
    if (!r.ok) throw new Error();
    provas = await r.json();
    preencher("#prova-banca", [...new Set(provas.map((p) => p.banca))]);
    preencher("#prova-ano", [...new Set(provas.map((p) => String(p.ano)))]);
    preencher("#prova-estado", [...new Set(provas.map((p) => p.estado))]);
    render();
  } catch {
    $("#provas-lista").innerHTML = '<div class="empty"><p>Não foi possível carregar o acervo agora.</p></div>';
  }
}

["#prova-busca", "#prova-banca", "#prova-ano", "#prova-estado"].forEach((id) => $(id).addEventListener(id === "#prova-busca" ? "input" : "change", render));
iniciar();
