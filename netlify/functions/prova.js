const audit = require("../../data/auditoria/vunesp-index.json");
const drive = [
  ...require("../../data/vunesp-drive-001-060.json"),
  ...require("../../data/vunesp-drive-061-120.json"),
  ...require("../../data/vunesp-drive-121-180.json"),
  ...require("../../data/vunesp-drive-181-236.json")
];

const BASE = "https://radar-de-concursos-mpc.netlify.app";
const ORGAOS = {
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
  UNSP:"UNESP — Instituto de Artes de São Paulo"
};
const ORG_SLUG = {"MPSP":"ministerio-publico-sp","PMRU":"prefeitura-aruja","PMGR":"prefeitura-guarulhos","PMOS":"prefeitura-osasco","PMPR":"prefeitura-piracicaba","PPON":"prefeitura-pontal","PMSO":"prefeitura-sorocaba","PMSE":"prefeitura-sao-paulo","PMSZ":"prefeitura-suzano","PMJU":"prefeitura-jundiai","PRMA":"prefeitura-marilia","PMMC":"prefeitura-mogi-das-cruzes","PMRI":"prefeitura-ribeirao-preto","PVPA":"prefeitura-varzea-paulista","PMPP":"prefeitura-presidente-prudente","PMSA":"prefeitura-santo-andre","PMRP":"prefeitura-sao-jose-do-rio-preto","PTAU":"prefeitura-taubate","PJAG":"prefeitura-jaguariuna","SGUA":"saeg-guaratingueta","TJSP":"tjsp","TJME":"tjm-sp","UABC":"ufabc","CMMI":"camara-mogi-mirim","CMPO":"camara-potim","CALT":"camara-altinopolis","UNAV":"unesp-aracatuba","UAIQ":"unesp-araraquara","UACF":"unesp-araraquara","UNBO":"unesp-botucatu","UNFR":"unesp-franca","FEIS":"unesp-ilha-solteira","UNSV":"unesp-litoral-paulista","UNMA":"unesp-marilia","IBLC":"unesp-sao-jose-do-rio-preto","USJC":"unesp-sao-jose-dos-campos","UNSP":"unesp-sao-paulo"};

function slugify(v="") {
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
}
function prefix(m){ return String(m.codigo||"").split("/")[0].toUpperCase(); }
function slugFor(m){
  return slugify(`vunesp-${ORG_SLUG[prefix(m)]||"concurso"}-${m.cargo||"prova"}-${m.ano||"ano"}-${String(m.numero).padStart(3,"0")}`);
}
function esc(v=""){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function driveView(id){ return id ? `https://drive.google.com/file/d/${id}/view` : null; }

exports.handler = async (event) => {
  const slug = String(event.queryStringParameters?.slug || "").replace(/^\/+|\/+$/g,"");
  const meta = audit.find(m => !m.ocultar && !["arquivo_incorreto","necessita_conferencia"].includes(m.situacao) && slugFor(m) === slug);
  if (!meta) {
    return {statusCode:404,headers:{"Content-Type":"text/html; charset=utf-8","X-Robots-Tag":"noindex"},body:"<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\"><title>Prova não encontrada</title><body><h1>Prova não encontrada</h1><p><a href=\"/provas.html\">Voltar ao acervo</a></p></body></html>"};
  }
  const raw = drive.find(x => Number(x.numero) === Number(meta.numero)) || {};
  const pfx = prefix(meta);
  const orgao = ORGAOS[pfx] || "Concurso organizado pela Vunesp";
  const cargo = meta.cargo || "Prova anterior";
  const ano = meta.ano || "";
  const canonical = `${BASE}/provas/${slug}`;
  const provaUrl = driveView(raw.provaId);
  const integrado = Boolean(meta.gabaritoIntegrado || (raw.provaId && raw.provaId === raw.gabaritoId));
  const bloqueado = ["suspeito_copia_prova","necessita_conferencia","mesmo_arquivo"].includes(meta.situacaoGabarito);
  const gabaritoUrl = (!integrado && !bloqueado) ? driveView(raw.gabaritoId) : null;
  const title = `Prova Vunesp ${cargo}${ano ? " "+ano : ""} | Radar MPC`;
  const desc = `Consulte a prova anterior Vunesp para ${cargo}${ano ? " de "+ano : ""}. ${meta.questoes ? meta.questoes+" questões. " : ""}Acesse a prova e o gabarito disponíveis no acervo Radar de Concursos MPC.`;
  const schema = {
    "@context":"https://schema.org","@type":"CreativeWork",
    "name":`Prova Vunesp — ${cargo}${ano ? " — "+ano : ""}`,
    "url":canonical,"inLanguage":"pt-BR",
    "isPartOf":{"@type":"WebSite","name":"Radar de Concursos MPC","url":BASE},
    "about":[orgao,cargo,"Vunesp"]
  };
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/enhancements.css"><link rel="stylesheet" href="/phase2.css">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script>
</head><body>
<header class="topbar"><div class="shell nav"><a class="brand" href="/"><span>MPC</span><div><strong>Radar de Concursos</strong><small>Prof. Lucas MPC</small></div></a><a class="nav-cta" href="/provas.html">Todas as provas</a></div></header>
<main>
<section class="detail-hero"><div class="shell">
<p class="eyebrow">PROVA ANTERIOR VUNESP</p>
<h1>${esc(cargo)}</h1>
<p class="hero-copy">${esc(orgao)}${ano ? " · "+esc(ano) : ""}</p>
</div></section>
<section class="shell content">
<nav aria-label="Breadcrumb" style="margin-bottom:24px"><a href="/">Início</a> › <a href="/provas.html">Provas anteriores</a> › <span>${esc(cargo)}</span></nav>
<article class="card proof-featured">
<div class="card-topline"><span class="tag">Vunesp</span><span class="badge">ACERVO AUDITADO</span></div>
<h2>Prova Vunesp — ${esc(cargo)}${ano ? " — "+esc(ano) : ""}</h2>
<p>Esta página reúne os dados identificados no caderno de prova do acervo do Prof. Lucas MPC. Use o material para conhecer o estilo da banca, revisar conteúdos e treinar com questões de concursos anteriores.</p>
<div class="meta">
<span>🏛️ ${esc(orgao)}</span>
${meta.questoes ? `<span>🧾 ${meta.questoes} questões</span>` : ""}
${meta.codigo ? `<span>🏷️ ${esc(meta.codigo)}</span>` : ""}
${ano ? `<span>📅 ${esc(ano)}</span>` : ""}
</div>
<div class="notice" style="margin-top:20px"><strong>Fonte do arquivo:</strong> acervo auditado do Prof. Lucas MPC. Para informações oficiais sobre um concurso, consulte sempre o edital e a página da banca.</div>
<div class="card-actions" style="margin-top:24px">
${provaUrl ? `<a class="details" href="${provaUrl}" target="_blank" rel="noopener">${integrado ? "Abrir prova + gabarito" : "Abrir prova"}</a>` : ""}
${gabaritoUrl ? `<a class="secondary-action" href="${gabaritoUrl}" target="_blank" rel="noopener">Ver gabarito</a>` : ""}
<a class="secondary-action" href="/provas.html">Ver mais provas Vunesp</a>
</div>
</article>
<section style="margin-top:32px">
<h2>Como usar esta prova nos estudos</h2>
<p>Resolva as questões sem consultar o gabarito, marque os assuntos em que teve dificuldade e depois revise os erros. Comparar provas da mesma banca ajuda a reconhecer padrões de enunciado e os conteúdos que aparecem com maior frequência.</p>
</section>
</section></main>
<footer><div class="shell"><strong>Radar de Concursos MPC</strong><p>Provas anteriores e informações organizadas para sua preparação.</p><nav class="footer-links"><a href="/provas.html">Provas anteriores</a><a href="/">Concursos</a><a href="/privacidade.html">Privacidade</a></nav></div></footer>
</body></html>`;
  return {statusCode:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=3600","X-Robots-Tag":"index, follow"},body:html};
};