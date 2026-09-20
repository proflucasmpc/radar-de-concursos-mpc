import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "provas");
const ORG_OUT = path.join(OUT, "orgaos");
const CARGO_OUT = path.join(OUT, "cargos");
const BASE = "https://radar.lucasmpc.com.br";
const TODAY = new Date().toISOString().slice(0,10);

const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = (v="") => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slugify = (v="") => norm(v).replace(/\s+/g,"-").replace(/^-|-$/g,"");
const cut = (s,n) => s.length <= n ? s : s.slice(0,n-1).replace(/\s+\S*$/,"")+"…";
const validUrl = v => { try { const u=new URL(v); return ["http:","https:"].includes(u.protocol); } catch { return false; } };
const favicon='<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%23010817%22/%3E%3Ctext x=%2232%22 y=%2241%22 text-anchor=%22middle%22 font-size=%2228%22 font-family=%22Arial%22 font-weight=%22700%22 fill=%22%23D6A928%22%3EMPC%3C/text%3E%3C/svg%3E">';

async function readJson(name){
  try { return JSON.parse(await fs.readFile(path.join(DATA,name),"utf8")); }
  catch { return []; }
}

function standardize(p){
  const ano = Number(p.ano) || null;
  const banca = p.banca || "Vunesp";
  const provaPdfUrl = p.provaPdfUrl || (p.provaUrl && /\.pdf(\?|$)/i.test(p.provaUrl) ? p.provaUrl : null);
  const gabaritoPdfUrl = p.gabaritoPdfUrl || (p.gabaritoUrl && /\.pdf(\?|$)/i.test(p.gabaritoUrl) ? p.gabaritoUrl : null);
  const fonteUrl = p.fonteUrl || ((!provaPdfUrl && p.provaUrl && validUrl(p.provaUrl)) ? p.provaUrl : null);
  return {
    id: p.id || slugify([banca,p.orgao,p.cargo,ano].filter(Boolean).join("-")),
    orgao: p.orgao || "",
    cargo: p.cargo || "",
    banca,
    ano,
    estado: p.estado || "",
    escolaridade: p.escolaridade || "Não informado",
    quantidadeQuestoes: p.quantidadeQuestoes ?? p.questoes ?? null,
    codigoProjeto: p.codigoProjeto || null,
    provaPdfUrl: provaPdfUrl && validUrl(provaPdfUrl) ? provaPdfUrl : null,
    gabaritoPdfUrl: gabaritoPdfUrl && validUrl(gabaritoPdfUrl) ? gabaritoPdfUrl : null,
    fonteArquivo: p.fonteArquivo || p.fonte || null,
    fonteUrl: fonteUrl && validUrl(fonteUrl) ? fonteUrl : null,
    linksVerificadosEm: p.linksVerificadosEm || null,
    destaque: Boolean(p.destaque)
  };
}

function key(p){ return [norm(p.banca),norm(p.orgao),norm(p.cargo),p.ano].join("|"); }
function merge(a,b){
  const score=x => (x.provaPdfUrl?5:0)+(x.gabaritoPdfUrl?3:0)+(x.fonteUrl?2:0)+(x.quantidadeQuestoes?1:0)+(x.linksVerificadosEm?1:0);
  const hi = score(b)>score(a)?b:a, lo=hi===a?b:a;
  return {...lo,...hi,
    provaPdfUrl: hi.provaPdfUrl || lo.provaPdfUrl,
    gabaritoPdfUrl: hi.gabaritoPdfUrl || lo.gabaritoPdfUrl,
    fonteUrl: hi.fonteUrl || lo.fonteUrl,
    quantidadeQuestoes: hi.quantidadeQuestoes ?? lo.quantidadeQuestoes,
    codigoProjeto: hi.codigoProjeto || lo.codigoProjeto,
    linksVerificadosEm: hi.linksVerificadosEm || lo.linksVerificadosEm
  };
}

const sources = [
  "provas.json","provas-lote2.json","provas-lote3.json","provas-lote4.json",
  "provas-outras-bancas.json","provas-instituto-mais.json","vunesp-auditoria-completa.json"
];
let all = [];
for (const f of sources) all.push(...(await readJson(f)).map(standardize));

const names = await fs.readdir(DATA);
const metadataFiles = names.filter(n=>/^vunesp-drive-metadata.*\.json$/i.test(n));
const driveFiles = names.filter(n=>/^vunesp-drive-\d{3}-\d{3}\.json$/i.test(n));
const driveRows = [];
for(const f of driveFiles) driveRows.push(...await readJson(f));
const driveByNumber = new Map(driveRows.map(x=>[Number(x.numero),x]));

for(const mf of metadataFiles){
  const meta = await readJson(mf);
  for(const m of meta){
    if(m.ocultar || m.duplicadoDe || !m.ano || !m.orgao || /identificar/i.test(m.orgao) || !m.cargo) continue;
    const d=driveByNumber.get(Number(m.numero)) || {};
    all.push(standardize({
      id:`vunesp-drive-${m.numero}-${slugify(m.orgao)}-${slugify(m.cargo)}-${m.ano}`,
      orgao:m.orgao,cargo:m.cargo,banca:"Vunesp",ano:m.ano,estado:m.estado||"SP",
      escolaridade:m.escolaridade||"Não informado",quantidadeQuestoes:m.quantidadeQuestoes,
      codigoProjeto:m.codigoProjeto,linksVerificadosEm:m.linksVerificadosEm,
      provaPdfUrl:d.provaId ? `https://drive.google.com/file/d/${d.provaId}/view` : null,
      gabaritoPdfUrl:d.gabaritoId ? `https://drive.google.com/file/d/${d.gabaritoId}/view` : null,
      fonteArquivo:"Acervo Radar de Concursos MPC — arquivo público verificado",
      fonteUrl:m.codigoProjeto ? `https://www.vunesp.com.br/${m.codigoProjeto}` : null
    }));
  }
}

const dedup = new Map();
for(const raw of all){
  if(!raw.orgao || !raw.cargo || !raw.ano || !raw.banca) continue;
  const k=key(raw);
  dedup.set(k,dedup.has(k)?merge(dedup.get(k),raw):raw);
}
let provas=[...dedup.values()].sort((a,b)=>b.ano-a.ano || a.orgao.localeCompare(b.orgao,"pt-BR") || a.cargo.localeCompare(b.cargo,"pt-BR"));

const used = new Set();
for(const p of provas){
  let slug=slugify(`${p.banca}-${p.orgao}-${p.cargo}-${p.ano}`);
  if(slug.length>120) slug=slug.slice(0,120).replace(/-+$/,"");
  let final=slug, i=2;
  while(used.has(final)) final=`${slug}-${i++}`;
  used.add(final);
  p.seoUrl=`provas/${final}.html`;
  p._slug=final;
}

function groupBy(field){
  const m=new Map();
  for(const p of provas){
    const k=norm(p[field]);
    if(!k) continue;
    if(!m.has(k)) m.set(k,{name:p[field],items:[]});
    m.get(k).items.push(p);
  }
  return [...m.values()].sort((a,b)=>b.items.length-a.items.length || a.name.localeCompare(b.name,"pt-BR"));
}
const orgGroups=groupBy("orgao").filter(g=>g.items.length>=3);
const cargoGroups=groupBy("cargo").filter(g=>g.items.length>=3);
const orgMap=new Map(orgGroups.map(g=>[norm(g.name),`provas/orgaos/${slugify(g.name)}.html`]));
const cargoMap=new Map(cargoGroups.map(g=>[norm(g.name),`provas/cargos/${slugify(g.name)}.html`]));

for(const p of provas){
  p.orgHub=orgMap.get(norm(p.orgao)) || null;
  p.cargoHub=cargoMap.get(norm(p.cargo)) || null;
}

for(const dir of [OUT,ORG_OUT,CARGO_OUT]) await fs.mkdir(dir,{recursive:true});
for(const dir of [OUT,ORG_OUT,CARGO_OUT]){
  for(const name of await fs.readdir(dir)) if(name.endsWith(".html")) await fs.unlink(path.join(dir,name));
}

function baseHead(title,meta,url,depth=1){
  const prefix=depth===2?"../../":"../";
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(meta)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${url}">${favicon}<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(meta)}"><meta property="og:url" content="${url}"><link rel="stylesheet" href="${prefix}styles.css"><link rel="stylesheet" href="${prefix}enhancements.css"><link rel="stylesheet" href="${prefix}phase2.css"><link rel="stylesheet" href="${prefix}tabs.css">`;
}

function proofPage(p){
  const title=cut(`Prova ${p.banca} ${p.ano} — ${p.cargo} | Radar MPC`,59);
  const q=p.quantidadeQuestoes ? `${p.quantidadeQuestoes} questões` : "quantidade de questões não informada";
  const meta=cut(`Prova ${p.banca} ${p.ano} para ${p.cargo}, ${p.orgao}. Consulte ${q}, gabarito e fonte quando disponíveis.`,155);
  const url=`${BASE}/${p.seoUrl}`;
  const fonte=p.codigoProjeto ? `Projeto ${p.codigoProjeto}` : (p.fonteArquivo || "Fonte indicada no acervo");
  const verified=p.linksVerificadosEm ? `Links verificados em ${p.linksVerificadosEm.split("-").reverse().join("/")}` : "Consulte a fonte antes de usar o arquivo";
  const schema=JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"WebPage","url":url,"name":title,"description":meta,"isPartOf":{"@type":"WebSite","name":"Radar de Concursos MPC","url":BASE+"/"},"about":["prova anterior",p.banca,p.orgao,p.cargo]},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Radar de Concursos MPC","item":BASE+"/"},
      {"@type":"ListItem","position":2,"name":"Provas anteriores","item":BASE+"/provas.html"},
      {"@type":"ListItem","position":3,"name":`${p.orgao} — ${p.cargo} — ${p.ano}`,"item":url}
    ]}
  ]});
  const orgLink=p.orgHub?`<a class="secondary-action" href="../${p.orgHub}">Mais provas de ${esc(p.orgao)}</a>`:"";
  const cargoLink=p.cargoHub?`<a class="secondary-action" href="../${p.cargoHub}">Mais provas para ${esc(p.cargo)}</a>`:"";
  return `<!doctype html><html lang="pt-BR"><head>${baseHead(title,meta,url,1)}<script type="application/ld+json">${schema}</script></head>
<body><header class="topbar"><div class="shell nav"><a class="brand" href="../index.html"><span>MPC</span><div><strong>Radar de Concursos</strong><small>Prof. Lucas MPC</small></div></a><a class="nav-cta" href="../provas.html">Ver outras provas</a></div></header>
<main><section class="detail-hero"><div class="shell"><p class="eyebrow">PROVA ANTERIOR · ${esc(p.banca.toUpperCase())}</p><h1>${esc(p.cargo)}</h1><p class="hero-copy">${esc(p.orgao)} · ${p.ano} · ${esc(p.estado)}</p></div></section>
<section class="shell detail-layout"><div class="detail-main">
<section class="detail-card"><h2>Informações da prova</h2><div class="facts"><div><span>Órgão</span><strong>${esc(p.orgao)}</strong></div><div><span>Cargo</span><strong>${esc(p.cargo)}</strong></div><div><span>Banca</span><strong>${esc(p.banca)}</strong></div><div><span>Ano</span><strong>${p.ano}</strong></div><div><span>Escolaridade</span><strong>${esc(p.escolaridade)}</strong></div><div><span>Questões</span><strong>${esc(q)}</strong></div></div></section>
<section class="detail-card"><h2>Como usar esta prova anterior</h2><p>Faça a resolução em condições próximas às de prova: defina um tempo, evite consultar respostas durante a tentativa e marque as questões em que teve dúvida. Depois, confira o gabarito e classifique seus erros por assunto.</p><p>Uma prova anterior ajuda a reconhecer o estilo da banca, mas não substitui o edital atual. Compare o conteúdo desta prova com o programa do concurso que você pretende prestar e use apenas os tópicos que continuam previstos.</p></section>
<section class="detail-card"><h2>O que observar no treino</h2><p>Analise o tamanho dos enunciados, o nível de cálculo ou interpretação exigido, os assuntos recorrentes e o tempo gasto por questão. Registre também questões que você acertou com insegurança: elas costumam indicar conteúdos que ainda precisam de revisão.</p><p>Quando houver outras provas do mesmo órgão ou do mesmo cargo, compare anos e bancas para separar características realmente recorrentes de detalhes específicos de uma única seleção. Essa comparação ajuda a montar um treino mais consistente sem transformar uma prova antiga em regra para o edital atual.</p></section>
<section class="detail-card"><h2>Como transformar o resultado em plano de revisão</h2><p>Depois da correção, separe os erros em três grupos: conteúdo que você ainda não estudou, conteúdo que já estudou mas esqueceu e erros de leitura, cálculo ou administração do tempo. Priorize primeiro os tópicos previstos no edital atual e repita questões semelhantes alguns dias depois para verificar se a dificuldade foi superada.</p></section>
<section class="detail-card"><h2>Fonte e verificação</h2><p>${esc(fonte)}. ${esc(verified)}. Arquivos e gabaritos podem ser substituídos ou retirados da fonte original; quando houver divergência, priorize sempre a publicação oficial da banca ou do órgão.</p></section>
</div><aside class="detail-side"><section class="detail-card action-stack">
${p.provaPdfUrl ? `<a class="primary-action" href="${esc(p.provaPdfUrl)}" target="_blank" rel="noopener">Abrir prova</a>` : ""}
${p.gabaritoPdfUrl ? `<a class="secondary-action" href="${esc(p.gabaritoPdfUrl)}" target="_blank" rel="noopener">Abrir gabarito</a>` : ""}
${p.fonteUrl ? `<a class="secondary-action" href="${esc(p.fonteUrl)}" target="_blank" rel="noopener">Ver fonte</a>` : ""}
${orgLink}${cargoLink}<a class="secondary-action" href="../provas.html">Biblioteca de provas</a>
${norm(p.banca).includes("vunesp") ? '<a class="secondary-action" href="../vunesp.html">Hub Vunesp</a>' : '<a class="secondary-action" href="../bancas.html">Bancas</a>'}
</section><section class="source-note"><strong>Uso para estudo</strong><p>Confirme sempre se o conteúdo desta prova é compatível com o edital atual.</p></section></aside></section></main>
<footer><div class="shell"><strong>Radar de Concursos MPC</strong><p>Provas anteriores, bancas e concursos organizados para facilitar sua preparação.</p><nav class="footer-links"><a href="../index.html">Radar</a><a href="../provas.html">Provas anteriores</a><a href="../provas-por-orgao.html">Por órgão</a><a href="../provas-por-cargo.html">Por cargo</a><a href="../vunesp.html">Vunesp</a></nav></div></footer><script src="../access.js" defer></script></body></html>`;
}

function hubPage(group,type){
  const isOrg=type==="orgao";
  const label=isOrg?"órgão":"cargo";
  const value=group.name;
  const slug=slugify(value);
  const rel=`provas/${isOrg?"orgaos":"cargos"}/${slug}.html`;
  const url=`${BASE}/${rel}`;
  const title=cut(isOrg?`Provas de ${value} | Radar MPC`:`Provas para ${value} | Radar MPC`,59);
  const years=[...new Set(group.items.map(x=>x.ano))].sort((a,b)=>b-a);
  const bancas=[...new Set(group.items.map(x=>x.banca))].sort();
  const meta=cut(isOrg?`Veja provas anteriores de ${value}, organizadas por cargo, banca e ano. Acesse provas, gabaritos e fontes quando disponíveis.`:`Veja provas anteriores para ${value}, organizadas por órgão, banca e ano. Acesse provas, gabaritos e fontes quando disponíveis.`,155);
  const items=group.items.map(p=>`<article class="card"><span class="tag">${esc(p.banca)}</span><h3>${esc(isOrg?p.cargo:p.orgao)}</h3><p class="card-title">${esc(p.orgao)} · ${p.ano}</p><div class="meta"><span>📍 ${esc(p.estado)}</span><span>📝 ${esc(p.banca)}</span></div><div class="card-bottom"><a class="details" href="../../${p.seoUrl}">Ver prova</a></div></article>`).join("");
  const schema=JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage","url":url,"name":title,"description":meta,"isPartOf":{"@type":"WebSite","name":"Radar de Concursos MPC","url":BASE+"/"},"about":[label,value,"provas anteriores"]},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Radar de Concursos MPC","item":BASE+"/"},
      {"@type":"ListItem","position":2,"name":isOrg?"Provas por órgão":"Provas por cargo","item":BASE+(isOrg?"/provas-por-orgao.html":"/provas-por-cargo.html")},
      {"@type":"ListItem","position":3,"name":value,"item":url}
    ]}
  ]});
  return `<!doctype html><html lang="pt-BR"><head>${baseHead(title,meta,url,2)}<script type="application/ld+json">${schema}</script></head><body>
<header class="topbar"><div class="shell nav"><a class="brand" href="../../index.html"><span>MPC</span><div><strong>Radar de Concursos</strong><small>Prof. Lucas MPC</small></div></a><a class="nav-cta" href="../../provas.html">Biblioteca de provas</a></div></header>
<main><section class="detail-hero"><div class="shell"><p class="eyebrow">PROVAS POR ${label.toUpperCase()}</p><h1>${esc(value)}</h1><p class="hero-copy">${group.items.length} provas anteriores no acervo · ${years.length} ano(s) · ${bancas.length} banca(s).</p></div></section>
<section class="shell content"><div class="notice"><strong>Compare provas relacionadas.</strong> Esta página reúne provas anteriores associadas a ${esc(value)}. Compare anos, bancas e cargos antes de tirar conclusões sobre o formato da seleção. O edital atual continua sendo a referência para conteúdo, pesos, etapas e critérios de classificação.</div><div class="cards">${items}</div><div class="notice"><strong>Como usar este conjunto de provas.</strong> Comece pelas provas mais próximas do seu objetivo em cargo, escolaridade e banca. Faça uma primeira resolução sem consultar o gabarito, registre o tempo gasto e depois compare os erros. Se o mesmo assunto aparecer em diferentes anos, isso pode indicar um padrão útil de treino, desde que o tópico também esteja previsto no edital atual.</div><div class="notice"><strong>Panorama do acervo.</strong> Nesta coleção aparecem provas dos anos ${years.join(", ")} e das bancas ${esc(bancas.join(", "))}. Use essa variedade para separar características do ${label} de características específicas de uma banca ou de um ano.</div></section></main>
<footer><div class="shell"><strong>Radar de Concursos MPC</strong><nav class="footer-links"><a href="../../provas.html">Provas anteriores</a><a href="../../provas-por-orgao.html">Por órgão</a><a href="../../provas-por-cargo.html">Por cargo</a><a href="../../bancas.html">Bancas</a></nav></div></footer><script src="../../access.js" defer></script></body></html>`;
}

function indexPage(groups,type){
  const isOrg=type==="orgao";
  const title=isOrg?"Provas Anteriores por Órgão | Radar MPC":"Provas Anteriores por Cargo | Radar MPC";
  const meta=isOrg?"Encontre órgãos com várias provas anteriores no acervo do Radar MPC e acesse páginas organizadas por banca, cargo e ano.":"Encontre cargos com várias provas anteriores no acervo do Radar MPC e compare órgãos, bancas e anos.";
  const url=`${BASE}/${isOrg?"provas-por-orgao.html":"provas-por-cargo.html"}`;
  const cards=groups.map(g=>`<a class="card" href="provas/${isOrg?"orgaos":"cargos"}/${slugify(g.name)}.html"><span class="tag">${isOrg?"ÓRGÃO":"CARGO"}</span><h3>${esc(g.name)}</h3><p class="card-title">${g.items.length} provas relacionadas</p><p class="details">Ver coleção</p></a>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${meta}"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}">${favicon}<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="enhancements.css"><link rel="stylesheet" href="phase2.css"><link rel="stylesheet" href="tabs.css"><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","url":url,"name":title,"description":meta})}</script></head><body><header class="topbar"><div class="shell nav"><a class="brand" href="index.html"><span>MPC</span><div><strong>Radar de Concursos</strong><small>Prof. Lucas MPC</small></div></a><a class="nav-cta" href="provas.html">Biblioteca de provas</a></div></header><main><section class="detail-hero"><div class="shell"><p class="eyebrow">ACERVO ORGANIZADO</p><h1>${isOrg?"Provas por órgão":"Provas por cargo"}</h1><p class="hero-copy">Coleções criadas somente quando existem pelo menos três provas relacionadas no acervo.</p></div></section><section class="shell content"><div class="cards">${cards}</div><div class="notice"><strong>Por que agrupar provas?</strong> Comparar mais de uma prova ajuda a enxergar diferenças de banca, ano e cargo e evita tomar uma única seleção como padrão absoluto. Use as coleções como atalho para localizar material relacionado e sempre confira o edital vigente.</div></section></main><footer><div class="shell"><strong>Radar de Concursos MPC</strong><nav class="footer-links"><a href="provas.html">Provas anteriores</a><a href="provas-por-orgao.html">Por órgão</a><a href="provas-por-cargo.html">Por cargo</a><a href="bancas.html">Bancas</a></nav></div></footer><script src="access.js" defer></script></body></html>`;
}

for(const p of provas) await fs.writeFile(path.join(OUT,`${p._slug}.html`),proofPage(p),"utf8");
for(const g of orgGroups) await fs.writeFile(path.join(ORG_OUT,`${slugify(g.name)}.html`),hubPage(g,"orgao"),"utf8");
for(const g of cargoGroups) await fs.writeFile(path.join(CARGO_OUT,`${slugify(g.name)}.html`),hubPage(g,"cargo"),"utf8");
await fs.writeFile(path.join(ROOT,"provas-por-orgao.html"),indexPage(orgGroups,"orgao"),"utf8");
await fs.writeFile(path.join(ROOT,"provas-por-cargo.html"),indexPage(cargoGroups,"cargo"),"utf8");

const clean = provas.map(({_slug,...p})=>p);
await fs.writeFile(path.join(DATA,"provas-seo.json"),JSON.stringify(clean,null,2)+"\n","utf8");

const sitemapProvas = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${provas.map(p=>`  <url><loc>${BASE}/${p.seoUrl}</loc><lastmod>${TODAY}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`).join("\n")}\n</urlset>\n`;
await fs.writeFile(path.join(ROOT,"sitemap-provas.xml"),sitemapProvas,"utf8");

const hubUrls=[
  `${BASE}/provas-por-orgao.html`,`${BASE}/provas-por-cargo.html`,
  ...orgGroups.map(g=>`${BASE}/provas/orgaos/${slugify(g.name)}.html`),
  ...cargoGroups.map(g=>`${BASE}/provas/cargos/${slugify(g.name)}.html`)
];
const sitemapHubs=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${hubUrls.map(u=>`  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join("\n")}\n</urlset>\n`;
await fs.writeFile(path.join(ROOT,"sitemap-hubs.xml"),sitemapHubs,"utf8");

console.log(`SEO gerado: ${provas.length} provas, ${orgGroups.length} hubs de órgão, ${cargoGroups.length} hubs de cargo.`);
