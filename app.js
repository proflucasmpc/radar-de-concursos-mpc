const SITE_URL = "https://radar-de-concursos-mpc.netlify.app/";
const $ = (selector) => document.querySelector(selector);
const cards = $("#cards");
const captura = $("#captura");
const erro = $("#erro");
let concursos = [];
let statusAtual = "aberto";

const statusNomes = { aberto: "Inscrições abertas", edital: "Edital publicado", banca: "Banca definida", autorizado: "Concursos autorizados", previsto: "Concursos previstos", provas: "Provas anteriores", encerrado: "Inscrições encerradas" };
const normalizar = (valor = "") => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatarData = (valor) => valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${valor}T12:00:00Z`)) : "Não informado";
const escolaridadeTexto = (niveis = []) => niveis.length > 1 ? "Vários níveis" : ({ fundamental: "Ensino fundamental", medio: "Ensino médio", tecnico: "Ensino técnico", superior: "Ensino superior" }[niveis[0]] || "Não informado");
const liberado = () => localStorage.getItem("radarMpcLiberado") === "true";

function dataLocal(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function hojeLocal() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function statusEfetivo(c) {
  if (!["aberto", "edital"].includes(c.status) || !c.inicioInscricoes || !c.fimInscricoes) return c.status;
  const hoje = hojeLocal();
  const inicio = dataLocal(c.inicioInscricoes);
  const fim = dataLocal(c.fimInscricoes);
  if (hoje < inicio) return "edital";
  if (hoje > fim) return "encerrado";
  return "aberto";
}

function diasAte(valor) {
  const fim = dataLocal(valor);
  if (!fim) return null;
  return Math.ceil((fim - hojeLocal()) / 86400000);
}

function etiquetaPrazo(c, status) {
  if (status !== "aberto" || !c.fimInscricoes) return "";
  const dias = diasAte(c.fimInscricoes);
  if (dias === 0) return '<span class="deadline-chip deadline-today">Encerra hoje</span>';
  if (dias === 1) return '<span class="deadline-chip deadline-urgent">Último dia amanhã</span>';
  if (dias > 1 && dias <= 3) return `<span class="deadline-chip deadline-urgent">Últimos ${dias} dias</span>`;
  if (dias > 3 && dias <= 7) return `<span class="deadline-chip">Encerra em ${dias} dias</span>`;
  return "";
}

function preencherEstados() {
  [...new Set(concursos.map((c) => c.estado).filter(Boolean))].sort().forEach((uf) => $("#estado").insertAdjacentHTML("beforeend", `<option value="${uf}">${uf}</option>`));
  [...new Set(concursos.map((c) => c.banca).filter(Boolean))].sort().forEach((banca) => $("#banca").insertAdjacentHTML("beforeend", `<option value="${banca}">${banca}</option>`));
}

function filtrarConcursos() {
  const busca = normalizar($("#busca").value.trim());
  const nivel = $("#nivel").value;
  const estado = $("#estado").value;
  const esfera = $("#esfera").value;
  const banca = $("#banca").value;
  const ordenacao = $("#ordenacao").value;
  const lista = concursos.filter((c) => {
    const status = statusEfetivo(c);
    if (status === "encerrado") return false;
    const pesquisavel = normalizar([c.orgao, c.titulo, c.cidade, c.estado, c.banca, ...(c.cargos || []), ...(c.tags || [])].join(" "));
    return status === statusAtual && (!busca || pesquisavel.includes(busca)) && (nivel === "todos" || c.escolaridade.includes(nivel)) && (estado === "todos" || c.estado === estado) && (esfera === "todos" || c.esfera === esfera) && (banca === "todos" || c.banca === banca);
  });
  return lista.sort((a, b) => {
    if (ordenacao === "prazo") return (a.fimInscricoes || "9999-12-31").localeCompare(b.fimInscricoes || "9999-12-31");
    if (ordenacao === "verificacao") return (b.ultimaVerificacao || "").localeCompare(a.ultimaVerificacao || "");
    if (ordenacao === "orgao") return a.orgao.localeCompare(b.orgao, "pt-BR");
    return Number(b.destaque) - Number(a.destaque) || (a.fimInscricoes || "9999-12-31").localeCompare(b.fimInscricoes || "9999-12-31");
  });
}

function render() {
  const lista = filtrarConcursos();
  $("#status-label").textContent = statusNomes[statusAtual].toUpperCase();
  $("#contador").textContent = `${lista.length} resultado${lista.length === 1 ? "" : "s"}`;
  cards.innerHTML = lista.map((c) => {
    const status = statusEfetivo(c);
    const horario = c.horarioFimInscricoes ? ` às ${c.horarioFimInscricoes}` : "";
    return `<article class="card">${c.destaque ? '<span class="badge">DESTAQUE</span>' : ""}<span class="tag status-${status}">${statusNomes[status]}</span>${etiquetaPrazo(c, status)}<h3>${c.orgao}</h3><p class="card-title">${c.titulo}</p><div class="meta"><span>📍 ${c.cidade} — ${c.estado}</span><span>👥 ${c.vagas}</span><span>🎓 ${escolaridadeTexto(c.escolaridade)}</span><span>🏛️ ${c.esfera[0].toUpperCase() + c.esfera.slice(1)}</span></div><div class="verification">Verificado em ${formatarData(c.ultimaVerificacao)}</div><div class="card-bottom"><div><div class="deadline">Prazo: ${formatarData(c.fimInscricoes)}${horario}</div><small>Banca: ${c.banca}</small></div><a class="details" data-lead-context="${c.orgao} — ${c.titulo}" href="detalhes.html?concurso=${encodeURIComponent(c.slug)}">Ver detalhes</a></div></article>`;
  }).join("");
  $("#empty").hidden = lista.length > 0;
}

function mostrarDados() {
  if (liberado()) return;
  captura.hidden = false;
  $("#etapa-dados").hidden = false;
  $("#etapa-codigo").hidden = true;
  erro.hidden = true;
}

function mostrarCodigo() {
  if (liberado()) return;
  captura.hidden = false;
  $("#etapa-dados").hidden = true;
  $("#etapa-codigo").hidden = false;
  erro.hidden = true;
  setTimeout(() => $("#codigo").focus(), 50);
}

function contextoDoClique(acao) {
  if (acao?.dataset?.leadContext) return acao.dataset.leadContext;
  const card = acao?.closest?.(".card");
  if (card) {
    const orgao = card.querySelector("h3")?.textContent?.trim();
    const titulo = card.querySelector(".card-title")?.textContent?.trim();
    return [orgao, titulo].filter(Boolean).join(" — ");
  }
  return acao?.textContent?.trim() || "Radar de Concursos MPC";
}

function pedirCodigo() {
  erro.hidden = true;
  const nome = $("#nome").value.trim();
  const objetivo = $("#objetivo").value;
  if (nome.length < 2) {
    erro.textContent = "Informe seu nome para continuar.";
    erro.hidden = false;
    return;
  }
  localStorage.setItem("radarMpcCodigoPendente", "true");
  const interesse = localStorage.getItem("radarMpcUltimoInteresse") || "Radar de Concursos MPC";
  mostrarCodigo();
  const retorno = location.href || SITE_URL;
  const mensagem = encodeURIComponent(`Olá, Prof. Lucas! Meu nome é ${nome}. Quero o código para acessar o Radar de Concursos MPC. Meu objetivo: ${objetivo}.\n\nInteresse atual: ${interesse}.\n\nDepois de receber o código, volto ao site por este link:\n${retorno}`);
  window.open(`https://hotm.io/falarcomproflucasmpc?text=${mensagem}`, "_blank", "noopener");
}

async function validar() {
  erro.hidden = true;
  const codigo = $("#codigo").value.trim().toUpperCase();
  if (codigo.length !== 6) {
    erro.textContent = "Digite os 6 caracteres do código.";
    erro.hidden = false;
    return;
  }
  try {
    const response = await fetch("/api/validar-codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) });
    if (!response.ok) throw new Error();
    localStorage.setItem("radarMpcLiberado", "true");
    localStorage.removeItem("radarMpcCodigoPendente");
    captura.hidden = true;
  } catch {
    erro.textContent = "Código inválido ou serviço temporariamente indisponível. Confira e tente novamente.";
    erro.hidden = false;
  }
}

async function iniciar() {
  try {
    const response = await fetch("data/concursos.json", { cache: "no-store" });
    if (!response.ok) throw new Error();
    concursos = await response.json();
    preencherEstados();
    render();
  } catch {
    cards.innerHTML = '<div class="empty"><h3>Não foi possível carregar as oportunidades</h3><p>Tente atualizar a página em alguns instantes.</p></div>';
  }
}

document.querySelectorAll(".tab[data-status]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelector(".tab.active").classList.remove("active");
  tab.classList.add("active");
  statusAtual = tab.dataset.status;
  render();
}));
["#busca", "#nivel", "#estado", "#esfera", "#banca", "#ordenacao"].forEach((id) => $(id).addEventListener(id === "#busca" ? "input" : "change", render));
$("#buscar").onclick = () => $("#oportunidades").scrollIntoView();
$("#fechar").onclick = () => captura.hidden = true;
$("#pedir-codigo").onclick = pedirCodigo;
$("#liberar").onclick = validar;
$("#codigo").oninput = (evento) => evento.target.value = evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
$("#codigo").addEventListener("keydown", (evento) => { if (evento.key === "Enter") validar(); });

document.addEventListener("click", (evento) => {
  if (liberado() || !captura.hidden || evento.target.closest("#captura")) return;
  const acao = evento.target.closest("a, button");
  if (!acao) return;
  localStorage.setItem("radarMpcUltimoInteresse", contextoDoClique(acao));
  const href = acao.tagName === "A" ? acao.getAttribute("href") : null;
  if (href && !href.startsWith("#") && !href.startsWith("javascript:")) evento.preventDefault();
  mostrarDados();
}, true);

if (!liberado()) {
  if (localStorage.getItem("radarMpcCodigoPendente") === "true") mostrarCodigo();
  else setTimeout(() => { if (!liberado() && captura.hidden) mostrarDados(); }, 60000);
}

iniciar();
