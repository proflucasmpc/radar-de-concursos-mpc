const $=(s)=>document.querySelector(s);
document.head.insertAdjacentHTML("beforeend",'<link rel="stylesheet" href="phase2.css">');
const nomesStatus={aberto:"Inscrições abertas",edital:"Edital publicado",banca:"Banca definida",autorizado:"Concurso autorizado",previsto:"Concurso previsto",provas:"Provas anteriores"};
const data=(v)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(`${v}T12:00:00Z`)):"Não informado";
const dinheiro=(v)=>typeof v==="number"?v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"Não informado";
const seguro=(v)=>String(v??"Não informado").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
async function iniciar(){
  const slug=new URLSearchParams(location.search).get("concurso");
  try{
    const caminhos=["data/concursos.json","data/concursos-lote2.json","data/concursos-lote3.json","data/concursos-gcm.json"];
    const [respostas,respostaMateriais]=await Promise.all([Promise.all(caminhos.map(c=>fetch(c,{cache:"no-store"}))),fetch("data/materiais.json",{cache:"no-store"})]);
    if(respostas.some(r=>!r.ok)||!respostaMateriais.ok)throw new Error();
    const lotes=await Promise.all(respostas.map(r=>r.json()));
    const concursos=lotes.flat();
    const materiais=await respostaMateriais.json();
    const c=concursos.find(item=>item.slug===slug);
    if(!c)return naoEncontrado();
    document.title=`${c.orgao}: edital, vagas e inscrições | Radar de Concursos MPC`;
    document.querySelector('meta[name="description"]').content=`${c.orgao} — ${c.titulo}. Consulte situação, datas, vagas, banca e fontes oficiais.`;
    $("#detail-heading").innerHTML=`<p class="eyebrow">${seguro(nomesStatus[c.status]||c.status)}</p><h1>${seguro(c.orgao)}</h1><p class="hero-copy">${seguro(c.titulo)}</p><p class="verified">Última verificação: ${data(c.ultimaVerificacao)} · ${seguro(c.tipoFonte)}</p>`;
    const salario=c.salarioMinimo||c.salarioMaximo?`${dinheiro(c.salarioMinimo)} a ${dinheiro(c.salarioMaximo)}`:"Não informado";
    const tags=(c.tags||[]).map(t=>t.toLowerCase());
    const recomendados=materiais.filter(m=>(m.tags||[]).includes("todos")||(m.tags||[]).some(tag=>tags.includes(tag.toLowerCase()))).slice(0,4);
    const link=(url,texto,classe)=>url?`<a class="${classe}" href="${url}" target="_blank" rel="noopener">${texto}</a>`:"";
    $("#detail-content").innerHTML=`<div class="detail-main"><section class="detail-card"><h2>Visão geral</h2><p>${seguro(c.descricao)}</p><div class="facts"><div><span>Situação</span><strong>${seguro(nomesStatus[c.status]||c.status)}</strong></div><div><span>Local</span><strong>${seguro(c.cidade)} — ${seguro(c.estado)}</strong></div><div><span>Vagas</span><strong>${seguro(c.vagas)}</strong></div><div><span>Cadastro reserva</span><strong>${seguro(c.cadastroReserva)}</strong></div><div><span>Escolaridade</span><strong>${seguro((c.escolaridade||[]).join(", "))}</strong></div><div><span>Salário</span><strong>${salario}</strong></div><div><span>Banca</span><strong>${seguro(c.banca)}</strong></div><div><span>Taxa</span><strong>${seguro(c.taxa)}</strong></div></div></section><section class="detail-card"><h2>Linha do tempo</h2><ol class="timeline">${(c.linhaDoTempo||[]).map(item=>`<li class="${item.concluida?"done":""}"><span></span><strong>${seguro(item.etapa)}</strong></li>`).join("")}</ol></section><section class="detail-card"><h2>Cargos</h2><ul>${(c.cargos||[]).map(cargo=>`<li>${seguro(cargo)}</li>`).join("")}</ul></section><section class="detail-card"><h2>Atualizações</h2>${(c.atualizacoes||[]).length?`<ul>${c.atualizacoes.map(a=>`<li>${seguro(a.titulo||a)} ${a.data?`— ${data(a.data)}`:""}</li>`).join("")}</ul>`:'<p class="muted">Nenhuma atualização adicional cadastrada.</p>'}</section><section class="detail-card"><h2>Materiais para sua preparação</h2><p class="muted">Sugestões do Prof. Lucas MPC relacionadas à organização e à preparação para concursos.</p><div class="materials-grid">${recomendados.map(m=>`<a class="material-card" href="${m.url}" target="_blank" rel="noopener"><span>${seguro(m.tipo)}</span><strong>${seguro(m.titulo)}</strong><p>${seguro(m.descricao)}</p></a>`).join("")}</div></section></div><aside class="detail-side"><section class="detail-card"><h2>Datas importantes</h2><dl><dt>Início das inscrições</dt><dd>${data(c.inicioInscricoes)}</dd><dt>Fim das inscrições</dt><dd>${data(c.fimInscricoes)}${c.horarioFimInscricoes?` às ${seguro(c.horarioFimInscricoes)}`:""}</dd><dt>Data da prova</dt><dd>${data(c.dataProva)}</dd></dl></section><section class="detail-card action-stack">${link(c.editalUrl,"Acessar edital oficial","primary-action")}${link(c.inscricaoUrl,"Página de inscrição","secondary-action")}${link(c.fonteUrl,"Ver fonte oficial","secondary-action")}</section><section class="source-note"><strong>Aviso importante</strong><p>Confirme todos os dados na fonte oficial antes de realizar sua inscrição.</p></section></aside>`;
  }catch{naoEncontrado("Não foi possível carregar os dados agora.");}
}
function naoEncontrado(mensagem="O concurso solicitado não foi encontrado."){$("#detail-heading").innerHTML='<p class="eyebrow">RADAR DE CONCURSOS</p><h1>Concurso não encontrado</h1>';$ ("#detail-content").innerHTML=`<div class="empty"><p>${mensagem}</p><a class="details" href="index.html">Voltar ao radar</a></div>`;}
iniciar();
