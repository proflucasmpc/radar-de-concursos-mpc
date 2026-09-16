import fs from "node:fs/promises";

const arquivos = {
  concursos: "data/concursos.json",
  provas: "data/provas.json",
  materiais: "data/materiais.json"
};

const statusPermitidos = new Set(["previsto", "autorizado", "banca", "edital", "aberto"]);
const niveisPermitidos = new Set(["fundamental", "medio", "tecnico", "superior"]);
const erros = [];

function erro(mensagem) {
  erros.push(mensagem);
}

function urlValida(valor) {
  if (!valor) return true;
  try {
    const url = new URL(valor);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function dataValida(valor) {
  if (valor === null || valor === undefined || valor === "") return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T12:00:00Z`));
}

async function carregar(nome, caminho) {
  try {
    const texto = await fs.readFile(caminho, "utf8");
    const dados = JSON.parse(texto);
    if (!Array.isArray(dados)) erro(`${nome}: a raiz precisa ser um array.`);
    return dados;
  } catch (e) {
    erro(`${nome}: JSON inválido ou arquivo inacessível (${e.message}).`);
    return [];
  }
}

const concursos = await carregar("concursos", arquivos.concursos);
const provas = await carregar("provas", arquivos.provas);
const materiais = await carregar("materiais", arquivos.materiais);

const idsConcursos = new Set();
const slugs = new Set();
concursos.forEach((c, i) => {
  const ref = `concursos[${i}]`;
  ["id", "slug", "titulo", "orgao", "status", "esfera", "estado", "cidade", "banca", "ultimaVerificacao"].forEach((campo) => {
    if (!c[campo]) erro(`${ref}: campo obrigatório ausente: ${campo}.`);
  });
  if (c.id) {
    if (idsConcursos.has(c.id)) erro(`${ref}: id duplicado: ${c.id}.`);
    idsConcursos.add(c.id);
  }
  if (c.slug) {
    if (slugs.has(c.slug)) erro(`${ref}: slug duplicado: ${c.slug}.`);
    slugs.add(c.slug);
  }
  if (c.status && !statusPermitidos.has(c.status)) erro(`${ref}: status inválido: ${c.status}.`);
  if (!Array.isArray(c.escolaridade) || !c.escolaridade.length) erro(`${ref}: escolaridade precisa ser um array não vazio.`);
  (c.escolaridade || []).forEach((nivel) => {
    if (!niveisPermitidos.has(nivel)) erro(`${ref}: escolaridade inválida: ${nivel}.`);
  });
  if (!Array.isArray(c.cargos) || !c.cargos.length) erro(`${ref}: informe ao menos um cargo ou marcador de conferência.`);
  ["inicioInscricoes", "fimInscricoes", "dataProva", "ultimaVerificacao"].forEach((campo) => {
    if (!dataValida(c[campo])) erro(`${ref}: data inválida em ${campo}: ${c[campo]}.`);
  });
  if (c.inicioInscricoes && c.fimInscricoes && c.inicioInscricoes > c.fimInscricoes) erro(`${ref}: início das inscrições é posterior ao fim.`);
  ["editalUrl", "inscricaoUrl", "fonteUrl"].forEach((campo) => {
    if (!urlValida(c[campo])) erro(`${ref}: URL inválida em ${campo}: ${c[campo]}.`);
  });
});

const idsProvas = new Set();
provas.forEach((p, i) => {
  const ref = `provas[${i}]`;
  ["id", "orgao", "cargo", "banca", "ano", "estado", "provaUrl"].forEach((campo) => {
    if (!p[campo]) erro(`${ref}: campo obrigatório ausente: ${campo}.`);
  });
  if (p.id) {
    if (idsProvas.has(p.id)) erro(`${ref}: id duplicado: ${p.id}.`);
    idsProvas.add(p.id);
  }
  ["provaUrl", "gabaritoUrl", "fonteUrl"].forEach((campo) => {
    if (!urlValida(p[campo])) erro(`${ref}: URL inválida em ${campo}: ${p[campo]}.`);
  });
});

const idsMateriais = new Set();
materiais.forEach((m, i) => {
  const ref = `materiais[${i}]`;
  ["id", "titulo", "descricao", "url", "tipo"].forEach((campo) => {
    if (!m[campo]) erro(`${ref}: campo obrigatório ausente: ${campo}.`);
  });
  if (m.id) {
    if (idsMateriais.has(m.id)) erro(`${ref}: id duplicado: ${m.id}.`);
    idsMateriais.add(m.id);
  }
  if (!urlValida(m.url)) erro(`${ref}: URL inválida: ${m.url}.`);
  if (!Array.isArray(m.tags) || !m.tags.length) erro(`${ref}: tags precisa ser um array não vazio.`);
});

if (erros.length) {
  console.error(`\nFalha na validação: ${erros.length} problema(s) encontrado(s):\n`);
  erros.forEach((mensagem) => console.error(`- ${mensagem}`));
  process.exit(1);
}

console.log(`Dados válidos: ${concursos.length} concursos, ${provas.length} provas e ${materiais.length} materiais.`);
