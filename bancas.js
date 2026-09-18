const $=s=>document.querySelector(s);
const n=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const hoje=()=>new Date().toISOString().slice(0,10);
function atual(c){if(c.status==="encerrado")return false;if(c.fimInscricoes&&c.fimInscricoes<hoje())return false;return true}
async function iniciar(){
  const [c,p]=await Promise.all([
    fetch("data/concursos.json",{cache:"no-store"}).then(r=>r.json()),
    fetch("data/provas.json",{cache:"no-store"}).then(r=>r.json())
  ]);
  const nomes=["Vunesp","IBAM","Instituto Mais","Objetiva","Nosso Rumo","Avança SP","Instituto ACCESS","ITAME"];
  const todos=[...new Set([...c.map(x=>x.banca),...p.map(x=>x.banca)].filter(Boolean))];
  const ordem=[...nomes.filter(x=>todos.some(y=>n(y).includes(n(x)))),...todos.filter(x=>!nomes.some(y=>n(x).includes(n(y))))];
  $("#bancas-lista").innerHTML=ordem.map(b=>{
    const cc=c.filter(x=>n(x.banca).includes(n(b))&&atual(x)).length;
    const pp=p.filter(x=>n(x.banca).includes(n(b))).length;
    return `<a class="card" href="banca.html?banca=${encodeURIComponent(b)}"><span class="tag">BANCA</span><h3>${b}</h3><div class="card-highlights"><div><span>Oportunidades atuais</span><strong>${cc}</strong></div><div><span>Provas</span><strong>${pp}</strong></div></div><p class="details">Ver banca</p></a>`;
  }).join("");
}
iniciar();