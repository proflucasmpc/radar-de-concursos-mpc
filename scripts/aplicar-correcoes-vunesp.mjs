import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const corrections = JSON.parse(await fs.readFile(path.join(DATA, "vunesp-correcoes-auditoria.json"), "utf8"));
const byNumber = new Map(corrections.map(c => [Number(c.numero), c]));

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(DATA, name), "utf8"));
}
async function writeJson(name, value) {
  await fs.writeFile(path.join(DATA, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}
function applyCorrection(row) {
  const correction = byNumber.get(Number(row.numero));
  if (!correction) return row;
  const { numero, ocultar, duplicadoDe, motivo, bloquearGabarito, ...fields } = correction;
  return { ...row, ...fields, ocultar: Boolean(ocultar), duplicadoDe: duplicadoDe || row.duplicadoDe || null, motivoAuditoria: motivo || row.motivoAuditoria || null, bloquearGabarito: Boolean(bloquearGabarito) };
}

// A fonte principal de SEO deve conter apenas registros publicáveis.
const auditName = "vunesp-auditoria-completa.json";
let audit = (await readJson(auditName)).map(applyCorrection);
audit = audit.filter(row => !row.ocultar);
for (const row of audit) {
  if (row.bloquearGabarito) row.gabaritoPdfUrl = null;
}
await writeJson(auditName, audit);

// Corrige os metadados auxiliares usados para enriquecer o catálogo.
const metadataName = "vunesp-drive-metadata.json";
let metadata = (await readJson(metadataName)).map(applyCorrection);
metadata = metadata.filter(row => !row.ocultar);
await writeJson(metadataName, metadata);

// Ajusta somente a cópia usada durante o build. Os JSONs originais no Git continuam intactos.
const names = await fs.readdir(DATA);
for (const name of names.filter(n => /^vunesp-drive-\d{3}-\d{3}\.json$/i.test(n))) {
  const rows = await readJson(name);
  const cleaned = [];
  for (const row of rows) {
    const correction = byNumber.get(Number(row.numero));
    if (correction?.ocultar) continue;
    const copy = { ...row };
    if (correction?.bloquearGabarito || (copy.provaId && copy.gabaritoId && copy.provaId === copy.gabaritoId)) {
      copy.gabaritoId = null;
    }
    cleaned.push(copy);
  }
  await writeJson(name, cleaned);
}

console.log(`Auditoria Vunesp aplicada: ${audit.length} registros publicáveis na fonte principal.`);
