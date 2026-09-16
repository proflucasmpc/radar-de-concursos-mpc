# Radar de Concursos MPC

Portal do Prof. Lucas MPC para acompanhar concursos previstos, autorizados, com banca definida, edital publicado, inscrições abertas e provas anteriores.

## Publicação

Projeto estático preparado para publicação contínua pela Netlify a partir da branch `main`.

- Diretório publicado: raiz (`.`)
- Funções: `netlify/functions`
- Variável protegida necessária: `ACCESS_CODE`
- Captura de leads: Netlify Forms (`radar-leads`)

## Estrutura de conteúdo

- `data/concursos.json`: fonte dos concursos exibidos no portal
- `detalhes.html` + `detalhes.js`: página individual reutilizável
- `app.js`: busca, filtros, cartões e captura
- `privacidade.html` e `termos.html`: páginas legais

Cada concurso precisa de `id` e `slug` permanentes, situação, fonte oficial e data da última verificação. Informações não confirmadas devem permanecer como `null` ou `Não informado`.

## Fluxo de desenvolvimento

As alterações podem ser concluídas no GitHub antes de um novo deploy. Não publicar na Netlify até autorização expressa do Prof. Lucas MPC.
