const RADAR_SITE_URL = "https://radar.lucasmpc.com.br/";
const RADAR_WHATSAPP_NUMBER = "5511960189698";

// Consolida os lotes adicionais antes de app.js, detalhes.js e provas.js carregarem os catálogos.
(() => {
  const originalFetch = window.fetch.bind(window);

  async function carregarLote(caminho) {
    try {
      const resposta = await originalFetch(caminho, { cache: "no-store" });
      return resposta.ok ? await resposta.json() : [];
    } catch {
      return [];
    }
  }

  function normalizarProva(p) {
    return {
      ...p,
      quantidadeQuestoes: p.quantidadeQuestoes ?? p.questoes ?? null,
      provaPdfUrl: p.provaPdfUrl ?? p.provaUrl ?? null,
      gabaritoPdfUrl: p.gabaritoPdfUrl ?? p.gabaritoUrl ?? null,
      fonteArquivo: p.fonteArquivo ?? p.fonte ?? null
    };
  }

  function normalizarDrive(item, metadado = {}) {
    const numero = String(item.numero).padStart(3, "0");
    const preview = (id) => id ? `https://drive.google.com/file/d/${id}/preview` : null;
    const view = (id) => id ? `https://drive.google.com/file/d/${id}/view` : null;
    const arquivoUnico = Boolean(item.gabaritoId && item.gabaritoId === item.provaId);
    return {
      id: `vunesp-drive-${numero}`,
      orgao: metadado.orgao || "Acervo Vunesp — Prof. Lucas MPC",
      cargo: metadado.cargo || `Prova / simulado ${numero}`,
      banca: "Vunesp",
      ano: metadado.ano || "Acervo",
      estado: metadado.estado || "Não informado",
      escolaridade: metadado.escolaridade || "Não informado",
      quantidadeQuestoes: metadado.quantidadeQuestoes ?? null,
      codigoProjeto: metadado.codigoProjeto || null,
      provaPdfUrl: preview(item.provaId),
      gabaritoPdfUrl: arquivoUnico ? null : preview(item.gabaritoId),
      fonteArquivo: arquivoUnico ? "Prova e gabarito no mesmo PDF — Google Drive" : "Acervo do Prof. Lucas MPC — Google Drive",
      fonteUrl: view(item.provaId),
      destaque: false
    };
  }

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);

    if (url.pathname.endsWith("/data/concursos.json")) {
      const base = await originalFetch(input, init);
      if (!base.ok) return base;
      const principal = await base.clone().json();
      const caminhos = [
        "data/concursos-lote2.json",
        "data/concursos-lote3.json",
        "data/concursos-gcm.json",
        "data/concursos-lote4.json",
        "data/concursos-lote5.json"
      ];
      const extras = await Promise.all(caminhos.map(carregarLote));
      const mapa = new Map();
      [principal, ...extras].flat().forEach((c) => c?.id && mapa.set(c.id, c));
      return new Response(JSON.stringify([...mapa.values()]), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (url.pathname.endsWith("/data/provas.json")) {
      const base = await originalFetch(input, init);
      if (!base.ok) return base;
      const principal = (await base.clone().json()).map(normalizarProva);
      const caminhosCatalogo = [
        "data/provas-lote2.json",
        "data/provas-lote3.json",
        "data/provas-lote4.json",
        "data/provas-outras-bancas.json",
        "data/provas-instituto-mais.json"
      ];
      const caminhosDrive = [
        "data/vunesp-drive-001-060.json",
        "data/vunesp-drive-061-120.json",
        "data/vunesp-drive-121-180.json",
        "data/vunesp-drive-181-236.json"
      ];
      const [lotesCatalogo, lotesDrive, metadadosDrive] = await Promise.all([
        Promise.all(caminhosCatalogo.map(carregarLote)),
        Promise.all(caminhosDrive.map(carregarLote)),
        carregarLote("data/vunesp-drive-metadata.json")
      ]);
      const mapaMetadados = new Map((metadadosDrive || []).map(m => [Number(m.numero), m]));
      const mapa = new Map();
      principal.forEach((p) => p?.id && mapa.set(p.id, p));
      lotesCatalogo.flat().map(normalizarProva).forEach((p) => p?.id && mapa.set(p.id, p));
      const pares = new Set();
      lotesDrive.flat().forEach((item) => {
        if (!item?.provaId) return;
        const chave = `${item.provaId}|${item.gabaritoId || ""}`;
        if (pares.has(chave)) return;
        pares.add(chave);
        const metadado = mapaMetadados.get(Number(item.numero)) || {};
        if (metadado.ocultar) return;
        const p = normalizarDrive(item, metadado);
        mapa.set(p.id, p);
      });
      return new Response(JSON.stringify([...mapa.values()]), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    return originalFetch(input, init);
  };

  const nav = document.querySelector(".topbar .nav");

  // Navegação editorial do portal.
  if (document.body && !document.querySelector(".portal-shortcuts")) {
    const atalhos = document.createElement("nav");
    atalhos.className = "portal-shortcuts";
    atalhos.innerHTML = '<a href="bancas.html" data-lead-context="Explorar bancas">Bancas</a><a href="gcm.html" data-lead-context="Concursos GCM">GCM / Guarda Municipal</a><a href="processos.html" data-lead-context="Processos seletivos">Processos seletivos</a><a href="provas.html" data-lead-context="Biblioteca de provas">Provas anteriores</a>';
    const topo = document.querySelector(".topbar");
    topo?.insertAdjacentElement("afterend", atalhos);
    const estiloAtalhos = document.createElement("style");
    estiloAtalhos.textContent = '.portal-shortcuts{display:flex;gap:8px;overflow:auto;padding:9px max(16px,calc((100% - 1180px)/2));background:#0b2445;border-bottom:1px solid #ffffff18;position:sticky;top:72px;z-index:29}.portal-shortcuts a{white-space:nowrap;color:#dbeaff;text-decoration:none;font-weight:800;font-size:13px;padding:7px 11px;border-radius:999px;border:1px solid #ffffff24}.portal-shortcuts a:hover{background:#ffffff12}@media(max-width:760px){.portal-shortcuts{top:66px}}';
    document.head.appendChild(estiloAtalhos);
  }
  const acaoAtual = nav?.querySelector(":scope > .nav-cta");
  if (nav && acaoAtual && !nav.querySelector(".nav-courses-cta")) {
    const grupo = document.createElement("div");
    grupo.className = "nav-actions-runtime";
    acaoAtual.before(grupo);
    grupo.appendChild(acaoAtual);

    const cursos = document.createElement("a");
    cursos.className = "nav-cta nav-courses-cta";
    cursos.href = "https://hotmart.com/pt-br/club/metodo-mpc-com-professor-lucas";
    cursos.target = "_blank";
    cursos.rel = "noopener";
    cursos.dataset.leadContext = "Cursos e materiais para concursos";
    cursos.textContent = "Cursos e materiais para concursos";
    grupo.prepend(cursos);

    const estilo = document.createElement("style");
    estilo.textContent = `.nav-actions-runtime{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-left:auto}.nav-courses-cta{background:transparent!important;border:1px solid #6aa8ff!important;color:#fff!important}.nav-courses-cta:hover{background:#ffffff12!important}@media(max-width:760px){.nav-actions-runtime{gap:6px}.nav-actions-runtime .nav-cta{font-size:11px;padding:9px 10px}.nav-courses-cta{max-width:170px;line-height:1.15;text-align:center}}@media(max-width:520px){.nav-actions-runtime{max-width:68%}.nav-actions-runtime .nav-cta{font-size:10px;padding:8px 9px}}`;
    document.head.appendChild(estilo);
  }
})();

(() => {
  const liberado = () => localStorage.getItem("radarMpcLiberado") === "true";
  let destinoPendente = null;

  function criarModalSeNecessario() {
    if (document.querySelector("#captura")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop" id="captura" hidden>
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button class="close" id="fechar" aria-label="Fechar">×</button>
          <div class="shield">✓</div>
          <div id="etapa-dados">
            <h2 id="modal-title">Continue acompanhando gratuitamente</h2>
            <p>Informe seu nome e peça seu código de acesso diretamente pelo WhatsApp.</p>
            <label>Seu nome<input id="nome" autocomplete="name" placeholder="Como podemos chamar você?"></label>
            <label>Seu objetivo<select id="objetivo"><option>Concurso público</option><option>Vestibular / ENEM</option><option>Outro</option></select></label>
            <small>O site usa esses dados apenas para montar a mensagem que será aberta no WhatsApp. A liberação deste dispositivo fica salva localmente no navegador.</small>
            <button class="whatsapp" id="pedir-codigo">Pedir código no WhatsApp</button>
          </div>
          <div id="etapa-codigo" hidden>
            <h2>Insira seu código de acesso</h2>
            <p>Digite o código de 6 caracteres que você recebeu pelo WhatsApp.</p>
            <div class="code-row"><input id="codigo" maxlength="6" autocomplete="one-time-code" placeholder="CÓDIGO"><button id="liberar">Liberar</button></div>
          </div>
          <p class="error" id="erro" hidden></p>
        </section>
      </div>`);
  }

  criarModalSeNecessario();
  const captura = document.querySelector("#captura");
  const erro = document.querySelector("#erro");
  const $ = (s) => document.querySelector(s);

  function contextoAtual(elemento) {
    return elemento?.dataset?.leadContext || window.radarLeadContext || localStorage.getItem("radarMpcUltimoInteresse") || "Radar de Concursos MPC";
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
    setTimeout(() => $("#codigo")?.focus(), 50);
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
    const interesse = contextoAtual();
    localStorage.setItem("radarMpcUltimoInteresse", interesse);
    mostrarCodigo();

    const retorno = location.href || RADAR_SITE_URL;
    const mensagem = encodeURIComponent(`Olá, Prof. Lucas! Meu nome é ${nome}. Estou no Radar de Concursos MPC e quero meu código de acesso.\n\nMeu objetivo: ${objetivo}.\nConcurso/interesse: ${interesse}.\n\nLink para eu retornar depois do código:\n${retorno}`);
    window.open(`https://api.whatsapp.com/send/?phone=${RADAR_WHATSAPP_NUMBER}&text=${mensagem}`, "_blank", "noopener");
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
      const resposta = await fetch("/api/validar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo })
      });
      if (!resposta.ok) throw new Error("Código inválido");

      localStorage.setItem("radarMpcLiberado", "true");
      localStorage.removeItem("radarMpcCodigoPendente");
      captura.hidden = true;

      if (destinoPendente?.href) {
        const { href, target } = destinoPendente;
        destinoPendente = null;
        if (target === "_blank") window.open(href, "_blank", "noopener");
        else location.href = href;
      }
    } catch {
      erro.textContent = "Código inválido ou serviço temporariamente indisponível.";
      erro.hidden = false;
    }
  }

  $("#fechar").onclick = () => captura.hidden = true;
  $("#pedir-codigo").onclick = pedirCodigo;
  $("#liberar").onclick = validar;
  $("#codigo").oninput = (evento) => evento.target.value = evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  $("#codigo").addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") validar();
  });

  document.addEventListener("click", (evento) => {
    if (liberado() || !captura.hidden || evento.target.closest("#captura")) return;
    const acao = evento.target.closest("a, button");
    if (!acao) return;

    const altaIntencao = acao.matches(".details, .secondary-action, .whatsapp-float, .whatsapp, .material-card, .nav-courses-cta") ||
      acao.dataset.leadContext?.match(/inscri|prova|gabarito|edital|fonte|material|whatsapp|detalhe/i);
    if (!altaIntencao) return;

    if (acao.tagName === "A") {
      const hrefBruto = acao.getAttribute("href") || "";
      if (/^(privacidade|termos)\.html(?:$|[?#])/i.test(hrefBruto)) return;
    }

    evento.preventDefault();
    evento.stopImmediatePropagation();

    const interesse = contextoAtual(acao);
    if (interesse) localStorage.setItem("radarMpcUltimoInteresse", interesse);

    if (acao.tagName === "A") {
      const href = acao.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        destinoPendente = { href: acao.href, target: acao.target };
      }
    }
    mostrarDados();
  }, true);

  if (!liberado() && localStorage.getItem("radarMpcCodigoPendente") === "true") mostrarCodigo();

  // Indicadores de volume no topo da home.
  if (location.pathname === "/" || location.pathname.endsWith("/index.html")) {
    Promise.all([
      window.fetch("data/concursos.json", { cache: "no-store" }).then(r => r.json()).catch(() => []),
      window.fetch("data/provas.json", { cache: "no-store" }).then(r => r.json()).catch(() => [])
    ]).then(([cs, ps]) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const abertas = cs.filter(c => c.status === "aberto" && (!c.inicioInscricoes || c.inicioInscricoes <= hoje) && (!c.fimInscricoes || c.fimInscricoes >= hoje)).length;
      const bancas = new Set([...cs.map(c => c.banca), ...ps.map(p => p.banca)].filter(Boolean)).size;
      const hero = document.querySelector(".hero .shell");
      if (hero && !hero.querySelector(".portal-stats")) {
        const box = document.createElement("div");
        box.className = "portal-stats";
        box.innerHTML = `<div><strong>${abertas}</strong><span>inscrições abertas</span></div><div><strong>${ps.length}+</strong><span>provas no acervo</span></div><div><strong>${bancas}</strong><span>bancas</span></div>`;
        hero.appendChild(box);
        const st = document.createElement("style");
        st.textContent = '.portal-stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.portal-stats>div{min-width:150px;padding:12px 16px;border:1px solid #ffffff28;border-radius:14px;background:#ffffff0d}.portal-stats strong,.portal-stats span{display:block}.portal-stats strong{font-size:24px;color:#fff}.portal-stats span{font-size:12px;color:#b8cae0;font-weight:700}';
        document.head.appendChild(st);
      }
    });
  }

  window.setRadarLeadContext = (valor) => {
    window.radarLeadContext = valor;
    if (valor) localStorage.setItem("radarMpcUltimoInteresse", valor);
  };
})();
