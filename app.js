const SITE_URL = "https://radar-de-concursos-mpc.netlify.app/";
const $ = (selector) => document.querySelector(selector);
const cards = $("#cards");
const captura = $("#captura");
const erro = $("#erro");
let concursos = [];
let statusAtual = "aberto";

const statusNomes = { aberto: "Inscrições abertas", edital: "Edital publicado", banca: "Banca definida", autorizado: "Concursos autorizados", previsto: "Concursos previstos", provas: "Provas anteriores" };
const normalizar = (valor = "") => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatarData = (valor) => valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${valor}T12:00:00Z`)) : "Não informado";
const escolaridadeTexto = (niveis = []) => niveis.length > 1 ? "Vários níveis" : ({ fundamental: "Ensino fundamental", medio: "Ensino médio", tecnico: "Ensino técnico", superior: "Ensino superior" }[niveis[0]] || "Não informado");

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
    const pesquisavel = normalizar([c.orgao, c.titulo, c.cidade, c.estado, c.banca, ...(c.cargos || []), ...(c.tags || [])].join(" "));
    return c.status === statusAtual && (!busca || pesquisavel.includes(busca)) && (nivel === "todos" || c.escolaridade.includes(nivel)) && (estado === "todos" || c.estado === estado) && (esfera === "todos" || c.esfera === esfera) && (banca === "todos" || c.banca === banca);
  });
  return lista.sort((a, b) => {
    if (ordenacao === "prazo") return (a.fimInscricoes || "9999-12-31").localeCompare(b.fimInscricoes || "9999-12-31");
    if (ordenacao === "verificacao") return (b.ultimaVerificacao || "").localeCompare(a.ultimaVerificacao || "");
    if (ordenacao === "orgao") return a.orgao.localeCompare(b.orgao, "pt-BR");
    return Number(b.destaque) - Number(a.destaque);
  });
}

function render() {
  const lista = filtrarConcursos();
  $("#status-label").textContent = statusNomes[statusAtual].toUpperCase();
  $("#contador").textContent = `${lista.length} resultado${lista.length === 1 ? "" : "s"}`;
  cards.innerHTML = lista.map((c) => `<article class="card">${c.destaque ? '<span class="badge">DESTAQUE</span>' : ""}<span class="tag status-${c.status}">${statusNomes[c.status]}</span><h3>${c.orgao}</h3><p class="card-title">${c.titulo}</p><div class="meta"><span>📍 ${c.cidade} — ${c.estado}</span><span>👥 ${c.vagas}</span><span>🎓 ${escolaridadeTexto(c.escolaridade)}</span><span>🏛️ ${c.esfera[0].toUpperCase() + c.esfera.slice(1)}</span></div><div class="verification">Verificado em ${formatarData(c.ultimaVerificacao)}</div><div class="card-bottom"><div><div class="deadline">Prazo: ${formatarData(c.fimInscricoes)}</div><small>Banca: ${c.banca}</small></div><a class="details" href="detalhes.html?concurso=${encodeURIComponent(c.slug)}">Ver detalhes</a></div></article>`).join("");
  $("#empty").hidden = lista.length > 0;
}

function mostrarCodigo() {
  captura.hidden = false;
  $("#etapa-dados").hidden = true;
  $("#etapa-codigo").hidden = false;
  setTimeout(() => $("#codigo").focus(), 50);
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
  mostrarCodigo();
  const mensagem = encodeURIComponent(`Olá, Prof. Lucas! Meu nome é ${nome}. Quero o código para acessar o Radar de Concursos MPC. Meu objetivo: ${objetivo}.\n\nDepois de receber o código, volto ao site por este link:\n${SITE_URL}`);
  window.open(`https://hotm.io/falarcomproflucasmpc?text=${mensagem}`, "_blank", "noopener");
}

async function validar() {
  erro.hidden = true;
  const codigo = $("#codigo").value.trim().toUpperCase();
  if (codigo.length !== 6) return;
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
    const response = await fetch("data/concursos.json");
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
if (localStorage.getItem("radarMpcLiberado") !== "true") {
  if (localStorage.getItem("radarMpcCodigoPendente") === "true") mostrarCodigo();
  else setTimeout(() => captura.hidden = false, 60000);
}
iniciar();
