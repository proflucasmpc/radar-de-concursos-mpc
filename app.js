const $ = (selector) => document.querySelector(selector);
const cards = $("#cards");
let concursos = [];
let statusAtual = "aberto";

const statusNomes = { aberto: "Inscrições abertas", edital: "Edital publicado", banca: "Banca definida", autorizado: "Concursos autorizados", previsto: "Concursos previstos", encerrado: "Inscrições encerradas" };
const normalizar = (valor = "") => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatarData = (valor) => valor ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${valor}T12:00:00Z`)) : "Não informado";
const dinheiro = (valor) => typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
const escolaridadeTexto = (niveis = []) => niveis.length > 1 ? "Vários níveis" : ({ fundamental: "Ensino fundamental", medio: "Ensino médio", tecnico: "Ensino técnico", superior: "Ensino superior" }[niveis[0]] || "Não informado");

function hojeLocal() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function dataLocal(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function diasAte(valor) {
  const fim = dataLocal(valor);
  if (!fim) return null;
  return Math.ceil((fim - hojeLocal()) / 86400000);
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

function etiquetaPrazo(c, status) {
  if (!c.fimInscricoes || status !== "aberto") return "";
  const dias = diasAte(c.fimInscricoes);
  if (dias === null) return "";
  if (dias === 0) return '<span class="deadline-chip deadline-today">Encerra hoje</span>';
  if (dias <= 3) return `<span class="deadline-chip deadline-urgent">Últimos ${dias} dia${dias === 1 ? "" : "s"}</span>`;
  if (dias <= 7) return `<span class="deadline-chip">Encerra em ${dias} dias</span>`;
  return `<span class="deadline-chip deadline-neutral">Encerra em ${dias} dias</span>`;
}

function salarioTexto(c) {
  if (c.salarioMinimo && c.salarioMaximo) {
    if (c.salarioMinimo === c.salarioMaximo) return dinheiro(c.salarioMinimo);
    return `${dinheiro(c.salarioMinimo)} a ${dinheiro(c.salarioMaximo)}`;
  }
  return c.salarioMaximo ? `Até ${dinheiro(c.salarioMaximo)}` : c.salarioMinimo ? `A partir de ${dinheiro(c.salarioMinimo)}` : "Não informado";
}

function cargosResumo(c) {
  const cargos = (c.cargos || []).filter(Boolean);
  if (!cargos.length) return "Cargos não informados";
  if (cargos.length <= 2) return cargos.join(" · ");
  return `${cargos.slice(0, 2).join(" · ")} +${cargos.length - 2}`;
}

function preencherFiltros() {
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
    return status === statusAtual && (!busca || pesquisavel.includes(busca)) && (nivel === "todos" || (c.escolaridade || []).includes(nivel)) && (estado === "todos" || c.estado === estado) && (esfera === "todos" || c.esfera === esfera) && (banca === "todos" || c.banca === banca);
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
    const contexto = `${c.orgao} — ${c.titulo}`;
    const horario = c.horarioFimInscricoes ? ` às ${c.horarioFimInscricoes}` : "";
    return `<article class="card">
      <div class="card-topline">${c.destaque ? '<span class="badge">DESTAQUE</span>' : ""}<span class="tag status-${status}">${statusNomes[status]}</span>${etiquetaPrazo(c, status)}</div>
      <h3>${c.orgao}</h3>
      <p class="card-title">${c.titulo}</p>
      <p class="card-cargos">${cargosResumo(c)}</p>
      <div class="card-highlights"><div><span>Vagas</span><strong>${c.vagas || "Não informado"}</strong></div><div><span>Salário</span><strong>${salarioTexto(c)}</strong></div></div>
      <div class="meta"><span>📍 ${c.cidade} — ${c.estado}</span><span>🎓 ${escolaridadeTexto(c.escolaridade)}</span><span>🏛️ ${c.esfera[0].toUpperCase() + c.esfera.slice(1)}</span><span>📝 ${c.banca || "Não informado"}</span></div>
      <div class="verification">Atualizado em ${formatarData(c.ultimaVerificacao)}</div>
      <div class="card-bottom"><div><div class="deadline">Prazo: ${formatarData(c.fimInscricoes)}${horario}</div></div><div class="card-actions"><a class="details" data-lead-context="${contexto}" href="detalhes.html?concurso=${encodeURIComponent(c.slug)}">Ver detalhes</a>${status === "aberto" && c.inscricaoUrl ? `<a class="secondary-action compact" data-lead-context="Inscrição oficial — ${contexto}" href="${c.inscricaoUrl}" target="_blank" rel="noopener">Inscrição oficial</a>` : ""}</div></div>
    </article>`;
  }).join("");

  $("#empty").hidden = lista.length > 0;
}

async function iniciar() {
  try {
    const response = await fetch("data/concursos.json", { cache: "no-store" });
    if (!response.ok) throw new Error();
    concursos = await response.json();
    preencherFiltros();
    render();
  } catch {
    cards.innerHTML = '<div class="empty"><h3>Não foi possível carregar as oportunidades</h3><p>Tente atualizar a página em alguns instantes.</p></div>';
  }
}

document.querySelectorAll(".tab[data-status]").forEach((tab) => tab.addEventListener("click", () => {
  const ativa = document.querySelector(".tab.active");
  if (ativa) ativa.classList.remove("active");
  tab.classList.add("active");
  statusAtual = tab.dataset.status;
  render();
}));
["#busca", "#nivel", "#estado", "#esfera", "#banca", "#ordenacao"].forEach((id) => $(id).addEventListener(id === "#busca" ? "input" : "change", render));
$("#buscar").onclick = () => $("#oportunidades").scrollIntoView();
iniciar();
