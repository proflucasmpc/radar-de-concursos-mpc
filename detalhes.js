const $ = (s) => document.querySelector(s);
const nomesStatus = { aberto: "Inscrições abertas", edital: "Edital publicado", banca: "Banca definida", autorizado: "Concurso autorizado", previsto: "Concurso previsto", encerrado: "Inscrições encerradas" };
const data = (v) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${v}T12:00:00Z`)) : "Não informado";
const dinheiro = (v) => typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
const seguro = (v) => String(v ?? "Não informado").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

function dataLocal(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function statusEfetivo(c) {
  if (!["aberto", "edital"].includes(c.status) || !c.inicioInscricoes || !c.fimInscricoes) return c.status;
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicio = dataLocal(c.inicioInscricoes);
  const fim = dataLocal(c.fimInscricoes);
  if (hoje < inicio) return "edital";
  if (hoje > fim) return "encerrado";
  return "aberto";
}

function diasAte(valor) {
  const fim = dataLocal(valor);
  if (!fim) return null;
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.ceil((fim - hoje) / 86400000);
}

function prazoTexto(c, status) {
  if (!c.fimInscricoes) return "";
  if (status === "encerrado") return '<span class="deadline-chip deadline-ended detail-deadline">Inscrições encerradas</span>';
  if (status !== "aberto") return `<span class="deadline-chip deadline-neutral detail-deadline">Inscrições começam em ${data(c.inicioInscricoes)}</span>`;
  const dias = diasAte(c.fimInscricoes);
  if (dias === 0) return '<span class="deadline-chip deadline-today detail-deadline">Encerra hoje</span>';
  if (dias <= 3) return `<span class="deadline-chip deadline-urgent detail-deadline">Últimos ${dias} dia${dias === 1 ? "" : "s"}</span>`;
  return `<span class="deadline-chip detail-deadline">Encerra em ${dias} dias</span>`;
}

function salario(c) {
  if (c.salarioMinimo && c.salarioMaximo) {
    return c.salarioMinimo === c.salarioMaximo ? dinheiro(c.salarioMinimo) : `${dinheiro(c.salarioMinimo)} a ${dinheiro(c.salarioMaximo)}`;
  }
  if (c.salarioMaximo) return `Até ${dinheiro(c.salarioMaximo)}`;
  if (c.salarioMinimo) return `A partir de ${dinheiro(c.salarioMinimo)}`;
  return "Não informado";
}

function materiaisRelacionados(materiais, c) {
  const tagsConcurso = new Set([...(c.tags || []), c.banca || "", ...(c.cargos || [])].map((t) => String(t).toLowerCase()));
  return materiais
    .map((m) => {
      const tags = (m.tags || []).map((t) => String(t).toLowerCase());
      let score = tags.includes("todos") ? 1 : 0;
      tags.forEach((tag) => {
        if ([...tagsConcurso].some((t) => t.includes(tag) || tag.includes(t))) score += 4;
      });
      if (normalizar(c.banca).includes("vunesp") && tags.includes("vunesp")) score += 8;
      return { ...m, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

const normalizar = (v = "") => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function iniciar() {
  const slug = new URLSearchParams(location.search).get("concurso");
  try {
    const [resposta, respostaMateriais] = await Promise.all([fetch("data/concursos.json", { cache: "no-store" }), fetch("data/materiais.json", { cache: "no-store" })]);
    if (!resposta.ok || !respostaMateriais.ok) throw new Error();
    const concursos = await resposta.json();
    const materiais = await respostaMateriais.json();
    const c = concursos.find((item) => item.slug === slug);
    if (!c) return naoEncontrado();

    const status = statusEfetivo(c);
    const contexto = `${c.orgao} — ${c.titulo}`;
    window.setRadarLeadContext?.(contexto);
    document.title = `${c.orgao}: edital, vagas e inscrições | Radar de Concursos MPC`;
    document.querySelector('meta[name="description"]').content = `${c.orgao} — ${c.titulo}. Consulte situação, datas, vagas, banca e fontes oficiais.`;
    $("#detail-heading").innerHTML = `<p class="eyebrow">${seguro(nomesStatus[status] || nomesStatus[c.status])}</p><h1>${seguro(c.orgao)}</h1><p class="hero-copy">${seguro(c.titulo)}</p>${prazoTexto(c, status)}<p class="verified">Última verificação: ${data(c.ultimaVerificacao)} · ${seguro(c.tipoFonte)}</p>`;

    const recomendados = materiaisRelacionados(materiais, c);
    const horario = c.horarioFimInscricoes ? ` às ${seguro(c.horarioFimInscricoes)}` : "";
    const inscricaoDisponivel = status === "aberto" && c.inscricaoUrl;

    $("#detail-content").innerHTML = `<div class="detail-main">
      <section class="detail-card"><h2>Visão geral</h2><p>${seguro(c.descricao)}</p><div class="facts">
        <div><span>Situação</span><strong>${seguro(nomesStatus[status] || nomesStatus[c.status])}</strong></div>
        <div><span>Local</span><strong>${seguro(c.cidade)} — ${seguro(c.estado)}</strong></div>
        <div><span>Vagas</span><strong>${seguro(c.vagas)}</strong></div>
        <div><span>Cadastro reserva</span><strong>${seguro(c.cadastroReserva)}</strong></div>
        <div><span>Escolaridade</span><strong>${seguro((c.escolaridade || []).join(", "))}</strong></div>
        <div><span>Salário</span><strong>${seguro(salario(c))}</strong></div>
        <div><span>Banca</span><strong>${seguro(c.banca)}</strong></div>
        <div><span>Taxa</span><strong>${seguro(c.taxa)}</strong></div>
      </div></section>
      <section class="detail-card"><h2>Linha do tempo</h2><ol class="timeline">${(c.linhaDoTempo || []).map((item) => `<li class="${item.concluida ? "done" : ""}"><span></span><strong>${seguro(item.etapa)}</strong></li>`).join("")}</ol></section>
      <section class="detail-card"><h2>Cargos</h2><ul>${(c.cargos || []).map((cargo) => `<li>${seguro(cargo)}</li>`).join("")}</ul></section>
      <section class="detail-card"><h2>Atualizações</h2>${(c.atualizacoes || []).length ? `<ul>${c.atualizacoes.map((a) => `<li>${seguro(a.titulo || a)} ${a.data ? `— ${data(a.data)}` : ""}</li>`).join("")}</ul>` : '<p class="muted">Nenhuma atualização adicional cadastrada.</p>'}</section>
      <section class="detail-card"><h2>Materiais para sua preparação</h2><p class="muted">Sugestões relacionadas à banca, ao concurso e à organização dos estudos.</p><div class="materials-grid">${recomendados.map((m) => `<a class="material-card" data-lead-context="Material recomendado — ${seguro(m.titulo)} — ${seguro(contexto)}" href="${seguro(m.url)}" target="_blank" rel="noopener"><span>${seguro(m.tipo)}</span><strong>${seguro(m.titulo)}</strong><p>${seguro(m.descricao)}</p></a>`).join("")}</div></section>
    </div>
    <aside class="detail-side">
      <section class="detail-card"><h2>Datas importantes</h2><dl><dt>Início das inscrições</dt><dd>${data(c.inicioInscricoes)}</dd><dt>Fim das inscrições</dt><dd>${data(c.fimInscricoes)}${horario}</dd><dt>Data da prova</dt><dd>${data(c.dataProva)}</dd></dl></section>
      <section class="detail-card action-stack">
        ${c.editalUrl ? `<a class="primary-action" data-lead-context="Edital oficial — ${seguro(contexto)}" href="${seguro(c.editalUrl)}" target="_blank" rel="noopener">Acessar edital oficial</a>` : ""}
        ${inscricaoDisponivel ? `<a class="secondary-action" data-lead-context="Inscrição oficial — ${seguro(contexto)}" href="${seguro(c.inscricaoUrl)}" target="_blank" rel="noopener">Página de inscrição</a>` : status === "edital" ? '<span class="secondary-action muted">Inscrições ainda não iniciadas</span>' : '<span class="secondary-action muted">Inscrições encerradas</span>'}
        ${c.fonteUrl ? `<a class="secondary-action" data-lead-context="Fonte oficial — ${seguro(contexto)}" href="${seguro(c.fonteUrl)}" target="_blank" rel="noopener">Ver fonte oficial</a>` : ""}
      </section>
      <section class="source-note"><strong>Aviso importante</strong><p>Confirme todos os dados na fonte oficial antes de realizar sua inscrição.</p></section>
    </aside>`;
  } catch {
    naoEncontrado("Não foi possível carregar os dados agora.");
  }
}

function naoEncontrado(mensagem = "O concurso solicitado não foi encontrado.") {
  $("#detail-heading").innerHTML = '<p class="eyebrow">RADAR DE CONCURSOS</p><h1>Concurso não encontrado</h1>';
  $("#detail-content").innerHTML = `<div class="empty"><p>${mensagem}</p><a class="details" href="index.html">Voltar ao radar</a></div>`;
}

iniciar();
