const $ = (s) => document.querySelector(s);
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="phase2.css"><link rel="stylesheet" href="tabs.css">');

const normalizar = (v = "") => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let provas = [];

function preencher(id, valores) {
  [...new Set(valores.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true }))
    .forEach((v) => $(id).insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`));
}

function drivePreview(id) { return id ? `https://drive.google.com/file/d/${id}/preview` : null; }
function driveView(id) { return id ? `https://drive.google.com/file/d/${id}/view` : null; }
function slugify(v = "") {
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

const ORG_SLUG = {
  MPSP:"ministerio-publico-sp", PMRU:"prefeitura-aruja", PMGR:"prefeitura-guarulhos",
  PMOS:"prefeitura-osasco", PMPR:"prefeitura-piracicaba", PPON:"prefeitura-pontal",
  PMSO:"prefeitura-sorocaba", PMSE:"prefeitura-sao-paulo", PMSZ:"prefeitura-suzano",
  PMJU:"prefeitura-jundiai", PRMA:"prefeitura-marilia", PMMC:"prefeitura-mogi-das-cruzes",
  PMRI:"prefeitura-ribeirao-preto", PVPA:"prefeitura-varzea-paulista",
  PMPP:"prefeitura-presidente-prudente", PMSA:"prefeitura-santo-andre",
  PMRP:"prefeitura-sao-jose-do-rio-preto", PTAU:"prefeitura-taubate",
  PJAG:"prefeitura-jaguariuna", SGUA:"saeg-guaratingueta", TJSP:"tjsp", TJME:"tjm-sp",
  UABC:"ufabc", CMMI:"camara-mogi-mirim", CMPO:"camara-potim", CALT:"camara-altinopolis",
  UNAV:"unesp-aracatuba", UAIQ:"unesp-araraquara", UACF:"unesp-araraquara",
  UNBO:"unesp-botucatu", UNFR:"unesp-franca", FEIS:"unesp-ilha-solteira",
  UNSV:"unesp-litoral-paulista", UNMA:"unesp-marilia", IBLC:"unesp-sao-jose-do-rio-preto",
  USJC:"unesp-sao-jose-dos-campos", UNSP:"unesp-sao-paulo"
};

function provaSlug(meta = {}) {
  const p = String(meta.codigo || "").split("/")[0].toUpperCase();
  return slugify(`vunesp-${ORG_SLUG[p] || "concurso"}-${meta.cargo || "prova"}-${meta.ano || "ano"}-${String(meta.numero || 0).padStart(3, "0")}`);
}

function orgaoPorCodigo(codigo = "") {
  const p = String(codigo).split("/")[0].toUpperCase();
  const mapa = {
    MPSP:"Ministério Público do Estado de São Paulo", PMRU:"Prefeitura de Arujá",
    PMGR:"Prefeitura de Guarulhos", PMOS:"Prefeitura de Osasco", PMPR:"Prefeitura de Piracicaba",
    PPON:"Prefeitura de Pontal", PMSO:"Prefeitura de Sorocaba",
    PMSE:"Prefeitura de São Paulo — Secretaria Municipal de Educação", PMSZ:"Prefeitura de Suzano",
    PMJU:"Prefeitura de Jundiaí", PRMA:"Prefeitura de Marília", PMMC:"Prefeitura de Mogi das Cruzes",
    PMRI:"Prefeitura de Ribeirão Preto", PVPA:"Prefeitura de Várzea Paulista",
    PMPP:"Prefeitura de Presidente Prudente", PMSA:"Prefeitura de Santo André",
    PMRP:"Prefeitura de São José do Rio Preto", PTAU:"Prefeitura de Taubaté",
    PJAG:"Prefeitura de Jaguariúna", VALP:"Prefeitura de Várzea Paulista",
    PGUA:"Prefeitura de Guaratinguetá", SGUA:"SAEG — Guaratinguetá",
    TJSP:"Tribunal de Justiça do Estado de São Paulo", TJME:"Tribunal de Justiça Militar do Estado de São Paulo",
    UABC:"Universidade Federal do ABC", EBSH:"EBSERH", FITO:"Fundação Instituto Tecnológico de Osasco",
    SETP:"SERTPREV — Sertãozinho", CMMI:"Câmara Municipal de Mogi Mirim", CMPO:"Câmara Municipal de Potim",
    CALT:"Câmara Municipal de Altinópolis", FMEC:"Fundação Municipal para Educação Comunitária — Campinas",
    UNAV:"UNESP — Câmpus de Araçatuba", UAIQ:"UNESP — Instituto de Química de Araraquara",
    UACF:"UNESP — Faculdade de Ciências Farmacêuticas de Araraquara", UNBO:"UNESP — Faculdade de Medicina de Botucatu",
    UNFR:"UNESP — Faculdade de Ciências Humanas e Sociais de Franca", FEIS:"UNESP — Faculdade de Engenharia de Ilha Solteira",
    UNSV:"UNESP — Instituto de Biociências do Litoral Paulista", UNMA:"UNESP — Faculdade de Filosofia e Ciências de Marília",
    IBLC:"UNESP — São José do Rio Preto", USJC:"UNESP — Instituto de Ciência e Tecnologia de São José dos Campos",
    UNSP:"UNESP — Instituto de Artes de São Paulo", UCAP:"Instituição pública — Campinas",
    SAEP:"Serviço público municipal — Vunesp"
  };
  return mapa[p] || (p ? `Órgão do concurso Vunesp — ${p}` : "Acervo Vunesp — Prof. Lucas MPC");
}

function normalizarItemDrive(item, meta = {}) {
  const numero = String(item.numero).padStart(3, "0");
  const arquivoUnico = Boolean(meta.gabaritoIntegrado || (item.gabaritoId && item.gabaritoId === item.provaId));
  const gabaritoBloqueado = ["suspeito_copia_prova", "necessita_conferencia", "mesmo_arquivo"].includes(meta.situacaoGabarito);
  return {
    id: `vunesp-drive-${numero}`,
    orgao: meta.orgao || orgaoPorCodigo(meta.codigo),
    cargo: meta.cargo || `Prova / simulado ${numero}`,
    codigo: meta.codigo || null,
    banca: "Vunesp",
    ano: meta.ano || "Acervo",
    estado: meta.estado || "SP",
    escolaridade: meta.escolaridade || "Não informado",
    questoes: meta.questoes || null,
    provaUrl: drivePreview(item.provaId),
    gabaritoUrl: arquivoUnico || gabaritoBloqueado ? null : drivePreview(item.gabaritoId),
    fonteUrl: driveView(item.provaId),
    fonte: "Acervo auditado do Prof. Lucas MPC — Google Drive",
    destaque: false,
    arquivoUnico,
    origem: "drive-vunesp",
    numeroAcervo: item.numero,
    situacao: meta.situacao || "validado",
    situacaoGabarito: meta.situacaoGabarito || (arquivoUnico ? "integrado" : "separado"),
    ocultar: Boolean(meta.ocultar),
    duplicadoDe: meta.duplicadoDe || null,
    detalheUrl: `/provas/${provaSlug(meta)}`
  };
}

function render() {
  const busca = normalizar($("#prova-busca").value);
  const banca = $("#prova-banca").value;
  const ano = $("#prova-ano").value;
  const estado = $("#prova-estado").value;
  const lista = provas.filter((p) =>
    (!busca || normalizar(`${p.orgao} ${p.cargo} ${p.codigo || ""} ${p.banca} ${p.numeroAcervo || ""}`).includes(busca)) &&
    (banca === "todos" || p.banca === banca) &&
    (ano === "todos" || String(p.ano) === ano) &&
    (estado === "todos" || p.estado === estado)
  );

  $("#prova-contador").textContent = `${lista.length} prova${lista.length === 1 ? "" : "s"}`;
  $("#provas-lista").innerHTML = lista.map((p) => {
    const vunesp = normalizar(p.banca).includes("vunesp");
    const contexto = `${p.orgao} — ${p.cargo} — ${p.ano}`;
    const botaoDetalhe = p.detalheUrl ? `<a class="details" href="${p.detalheUrl}">Ver página da prova</a>` : "";
    const botaoProva = p.provaUrl ? `<a class="details" data-lead-context="Prova anterior — ${contexto}" href="${p.provaUrl}" target="_blank" rel="noopener">${p.arquivoUnico ? "Abrir prova + gabarito" : "Abrir prova"}</a>` : '<span class="disabled-action">Prova indisponível</span>';
    const botaoGabarito = p.gabaritoUrl ? `<a class="secondary-action" data-lead-context="Gabarito — ${contexto}" href="${p.gabaritoUrl}" target="_blank" rel="noopener">Ver gabarito</a>` : "";
    const botaoFonte = p.fonteUrl ? `<a class="secondary-action" data-lead-context="Fonte — ${contexto}" href="${p.fonteUrl}" target="_blank" rel="noopener">${p.origem === "drive-vunesp" ? "Ver no Drive" : "Fonte oficial"}</a>` : "";
    const codigo = p.codigo ? `<span>🏷️ ${p.codigo}</span>` : "";
    return `<article class="card${vunesp ? " proof-featured" : ""}">
      <div class="card-topline"><span class="tag">${p.banca}</span>${vunesp ? '<span class="badge">FOCO VUNESP</span>' : ""}</div>
      <h3>${p.orgao}</h3>
      <p class="card-title">${p.cargo}${p.ano ? ` · ${p.ano}` : ""}</p>
      <div class="meta"><span>📍 ${p.estado || "Não informado"}</span><span>🎓 ${p.escolaridade || "Não informado"}</span>${p.questoes ? `<span>🧾 ${p.questoes} questões</span>` : ""}${codigo}</div>
      <div class="verification">Fonte: ${p.fonte || p.banca}</div>
      <div class="card-bottom"><div class="card-actions">${botaoDetalhe}${botaoProva}${botaoGabarito}${botaoFonte}</div></div>
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
      "data/vunesp-drive-001-060.json", "data/vunesp-drive-061-120.json",
      "data/vunesp-drive-121-180.json", "data/vunesp-drive-181-236.json"
    ];

    const [lotesCatalogo, lotesDrive, auditoria] = await Promise.all([
      Promise.all(caminhosCatalogo.map((c) => carregarJson(c, false))),
      Promise.all(caminhosDrive.map((c) => carregarJson(c, true))),
      carregarJson("data/auditoria/vunesp-index.json", true)
    ]);

    const mapaAuditoria = new Map(auditoria.map((m) => [Number(m.numero), m]));
    const mapa = new Map();
    lotesCatalogo.flat().forEach((p) => p?.id && mapa.set(p.id, p));

    const paresDriveVistos = new Set();
    lotesDrive.flat().forEach((item) => {
      if (!item?.provaId) return;
      const meta = mapaAuditoria.get(Number(item.numero)) || {};
      if (meta.ocultar || ["arquivo_incorreto", "necessita_conferencia"].includes(meta.situacao)) return;
      const chavePar = `${item.provaId}|${item.gabaritoId || ""}`;
      if (paresDriveVistos.has(chavePar)) return;
      paresDriveVistos.add(chavePar);
      const normalizado = normalizarItemDrive(item, meta);
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
