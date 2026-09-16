# Radar de Concursos MPC

Portal do Prof. Lucas MPC para acompanhar concursos previstos, autorizados, com banca definida, edital publicado, inscrições abertas e provas anteriores.

## Publicação

Projeto estático preparado para publicação contínua pela Netlify a partir da branch `main`.

- Diretório publicado: raiz (`.`)
- Funções: `netlify/functions`
- Variável protegida necessária: `ACCESS_CODE`
- Captura de acesso: fluxo pelo WhatsApp + validação do código pela Netlify Function
- Liberação do dispositivo: `localStorage`
- Não há banco próprio de leads nem Netlify Forms ativo na versão atual

## Estrutura de conteúdo

- `data/concursos.json`: fonte dos concursos exibidos no portal
- `data/provas.json`: acervo independente de provas anteriores
- `data/materiais.json`: recomendações de cursos, simulados e ferramentas
- `detalhes.html` + `detalhes.js`: página individual reutilizável
- `app.js`: busca, filtros, cartões e controle automático dos prazos
- `access.js`: captura reutilizável de acesso pelo WhatsApp
- `provas.html` + `provas.js`: biblioteca de provas anteriores
- `privacidade.html` e `termos.html`: páginas legais

Cada concurso precisa de `id` e `slug` permanentes, situação editorial, fonte oficial e data da última verificação. Informações não confirmadas devem permanecer como `null`, `Não informado` ou `Em conferência`.

## Controle de prazos

Para registros com `inicioInscricoes` e `fimInscricoes`, o frontend deriva automaticamente a situação operacional:

- antes da data inicial: `Edital publicado`;
- entre o início e o fim: `Inscrições abertas`;
- depois da data final: removido automaticamente da aba de inscrições abertas.

Os cartões também exibem alertas como `Encerra hoje`, `Últimos X dias` e `Encerra em X dias`.

## Fluxo de acesso

O visitante pode visualizar o portal. Quando realiza uma ação ou permanece cerca de 60 segundos sem liberação, a captura pode ser exibida. O nome, objetivo e contexto da oportunidade são usados para montar a mensagem aberta no WhatsApp. Após receber e validar o código de 6 caracteres, o navegador registra a liberação localmente.

## Manutenção

Antes de enviar alterações de conteúdo, execute:

```bash
npm run validar-dados
```

O validador confere JSON, IDs/slugs duplicados, status, datas, URLs, níveis de escolaridade e campos essenciais.

## Fluxo de desenvolvimento

As alterações podem ser concluídas em uma branch do GitHub antes de um novo deploy. Não publicar na Netlify nem incorporar uma branch de desenvolvimento em `main` até autorização expressa do Prof. Lucas MPC.
