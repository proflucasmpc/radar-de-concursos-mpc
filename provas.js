const $ = (s) => document.querySelector(s);
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="phase2.css"><link rel="stylesheet" href="tabs.css">');
const normalizar = (v = "") => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let provas = [];

function preencher(id, valores) {
  [...new Set(valores.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true })).forEach((v) => $(id).insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`));
}

function drivePreview(id) {
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

function driveView(id) {
  return id ? `https://drive.google.com/file/d/${id}/view` : null;
}

function normalizarItemDrive(item) {
  const numero = String(item.numero).padStart(3, "0");
  const arquivoUnico = Boolean(item.gabaritoId && item.gabaritoId === item.provaId);
  return {
    id: `vunesp-drive-${numero}`,
    orgao: "Acervo Vunesp — Prof. Lucas MPC",
    cargo: `Prova / simulado ${numero}`,
    banca: "Vunesp",
    ano: "Acervo",
    estado: "Não informado",
    escolaridade: "Não informado",
    questoes: null,
    provaUrl: drivePreview(item.provaId),
    gabaritoUrl: arquivoUnico ? null : drivePreview(item.gabaritoId),
    fonteUrl: driveView(item.provaId),
    fonte: "Acervo do Prof. Lucas MPC — Google Drive",
    destaque: false,
    arquivoUnico,
    origem: "drive-vunesp",
    numeroAcervo: item.numero
  };
}

function render() {
  const busca = normalizar($("#prova-busca").value);
  const banca = $("#prova-banca").value;
  const ano = $("#prova-ano").value;
  const estado = $("#prova-estado").value;

  const lista = provas.filter((p) =>
    (!busca || normalizar(`${p.orgao} ${p.cargo} ${p.banca} ${p.numeroAcervo || ""}`).includes(busca)) &&
    (banca === "todos" || p.banca === banca) &&
    (ano === "todos" || String(p.ano) === ano) &&
    (estado === "todos" || p.estado === estado)
  );

  $("#prova-contador").textContent = `${lista.length} prova${lista.length === 1 ? "" : "s"}`;
  $("#provas-lista").innerHTML = lista.map((p) => {
    const vunesp = normalizar(p.banca).includes("vunesp");
    const contexto = `${p.orgao} — ${p.cargo} — ${p.ano}`;
    const botaoProva = p.provaUrl
      ? `<a class="details" data-lead-context="Prova anterior — ${contexto}" href="${p.provaUrl}" target="_blank" rel="noopener">${p.arquivoUnico ? "Abrir prova + gabarito" : "Abrir prova"}</a>`
      : '<span class="disabled-action">Prova indisponível</span>';
    const botaoGabarito = p.gabaritoUrl
      ? `<a class="secondary-action" data-lead-context="Gabarito — ${contexto}" href="${p.gabaritoUrl}" target="_blank" rel="noopener">Ver gabarito</a>`
      : "";
    const botaoFonte = p.fonteUrl
      ? `<a class="secondary-action" data-lead-context="Fonte — ${contexto}" href="${p.fonteUrl}" target="_blank" rel="noopener">${p.origem === "drive-vunesp" ? "Ver no Drive" : "Fonte oficial"}</a>`
      : "";
    return `<article class="card${vunesp ? " proof-featured" : ""}">
      <div class="card-topline"><span class="tag">${p.banca}</span>${vunesp ? '<span class="badge">FOCO VUNESP</span>' : ""}</div>
      <h3>${p.orgao}</h3>
      <p class="card-title">${p.cargo}${p.ano ? ` · ${p.ano}` : ""}</p>
      <div class="meta"><span>📍 ${p.estado || "Não informado"}</span><span>🎓 ${p.escolaridade || "Não informado"}</span>${p.questoes ? `<span>🧾 ${p.questoes} questões</span>` : ""}</div>
      <div class="verification">Fonte: ${p.fonte || p.banca}</div>
      <div class="card-bottom"><div class="card-actions">${botaoProva}${botaoGabarito}${botaoFonte}</div></div>
    </article>`;
  }).join("");
  $("#provas-vazio").hidden = lista.length > 0;
}

async function carregarJson(caminho, obrigatorio = true) {
  const resposta = await fetch(caminho, { cache: "no-store" });
  if (!resposta.ok) {
    if (obrigatorio) throw new Error(`Falha ao carregar ${caminho}`);
    return [];
  }
  return resposta.json();
}

async function iniciar() {
  try {
    const caminhosCatalogo = ["data/provas.json", "data/provas-lote2.json", "data/provas-lote3.json"];
    const caminhosDrive = [
      "data/vunesp-drive-001-060.json",
      "data/vunesp-drive-061-120.json",
      "data/vunesp-drive-121-180.json",
      "data/vunesp-drive-181-236.json"
    ];

    const [lotesCatalogo, lotesDrive] = await Promise.all([
      Promise.all(caminhosCatalogo.map((c) => carregarJson(c, false))),
      Promise.all(caminhosDrive.map((c) => carregarJson(c, true)))
    ]);

    const mapa = new Map();
    lotesCatalogo.flat().forEach((p) => p?.id && mapa.set(p.id, p));

    const paresDriveVistos = new Set();
    lotesDrive.flat().forEach((item) => {
      if (!item?.provaId) return;
      const chavePar = `${item.provaId}|${item.gabaritoId || ""}`;
      if (paresDriveVistos.has(chavePar)) return;
      paresDriveVistos.add(chavePar);
      const normalizado = normalizarItemDrive(item);
      mapa.set(normalizado.id, normalizado);
    });

    provas = [...mapa.values()].sort((a, b) => {
      if (a.origem === "drive-vunesp" && b.origem === "drive-vunesp") return (a.numeroAcervo || 0) - (b.numeroAcervo || 0);
      if (a.origem === "drive-vunesp") return 1;
      if (b.origem === "drive-vunesp") return -1;
      return Number(b.destaque) - Number(a.destaque) || Number(b.ano || 0) - Number(a.ano || 0) || a.orgao.localeCompare(b.orgao, "pt-BR");
    });

    preencher("#prova-banca", provas.map((p) => p.banca));
    preencher("#prova-ano", provas.map((p) => String(p.ano || "Não informado")));
    preencher("#prova-estado", provas.map((p) => p.estado || "Não informado"));
    render();
  } catch (erro) {
    console.error(erro);
    $("#provas-lista").innerHTML = '<div class="empty"><p>Não foi possível carregar o acervo agora.</p></div>';
  }
}

["#prova-busca", "#prova-banca", "#prova-ano", "#prova-estado"].forEach((id) => $(id).addEventListener(id === "#prova-busca" ? "input" : "change", render));
iniciar();
