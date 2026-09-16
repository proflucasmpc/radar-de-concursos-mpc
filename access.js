const RADAR_SITE_URL = "https://radar-de-concursos-mpc.netlify.app/";

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

    const mensagem = encodeURIComponent(`Olá, Prof. Lucas! Meu nome é ${nome}. Quero o código para acessar o Radar de Concursos MPC. Meu objetivo: ${objetivo}.\n\nInteresse atual: ${interesse}.\n\nDepois de receber o código, volto ao site por este link:\n${location.href || RADAR_SITE_URL}`);
    window.open(`https://hotm.io/falarcomproflucasmpc?text=${mensagem}`, "_blank", "noopener");
  }

  function validar() {
    erro.hidden = true;
    const codigo = $("#codigo").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codigo)) {
      erro.textContent = "Digite um código válido de 6 caracteres.";
      erro.hidden = false;
      return;
    }

    localStorage.setItem("radarMpcLiberado", "true");
    localStorage.removeItem("radarMpcCodigoPendente");
    captura.hidden = true;

    if (destinoPendente?.href) {
      const { href, target } = destinoPendente;
      destinoPendente = null;
      if (target === "_blank") window.open(href, "_blank", "noopener");
      else location.href = href;
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
    const acao = evento.target.closest("a, button, input, select, .card");
    if (!acao) return;

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
        evento.preventDefault();
        destinoPendente = { href: acao.href, target: acao.target };
      }
    }
    mostrarDados();
  }, true);

  if (!liberado() && localStorage.getItem("radarMpcCodigoPendente") === "true") mostrarCodigo();

  window.setRadarLeadContext = (valor) => {
    window.radarLeadContext = valor;
    if (valor) localStorage.setItem("radarMpcUltimoInteresse", valor);
  };
})();
