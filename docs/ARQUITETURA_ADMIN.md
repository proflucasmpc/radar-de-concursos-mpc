# Arquitetura recomendada para o painel administrativo

## Decisão de segurança

Não criar um `admin.html` protegido apenas por PIN em JavaScript. Isso exporia as operações e não ofereceria autenticação real.

## Arquitetura proposta

1. **Autenticação real:** Supabase Auth em projeto exclusivo do Radar de Concursos MPC.
2. **Banco separado:** tabelas próprias para concursos, cargos, fontes, atualizações, provas anteriores e leads.
3. **Permissões:** Row Level Security permitindo escrita somente ao usuário administrador autorizado.
4. **Frontend público:** continua leve e rápido, consumindo apenas registros publicados.
5. **Painel administrativo:** rota separada, autenticada, com formulários de cadastro e revisão.
6. **Histórico:** toda mudança relevante registra data, autor e campos alterados.

## Entidades futuras

- `concursos`
- `cargos`
- `fontes`
- `atualizacoes`
- `provas_anteriores`
- `materiais`
- `leads`
- `historico_alteracoes`

## Fluxo editorial

`rascunho → em revisão → publicado → arquivado`

Somente registros `publicados` aparecem no site público. Alterações de situação, datas, vagas e fontes devem registrar a data da última verificação.

## Recursos do painel

- cadastrar, editar, publicar e arquivar concursos;
- cadastrar vários cargos por concurso;
- anexar fontes e indicar a fonte principal;
- registrar retificações e mudanças de situação;
- cadastrar provas e gabaritos com origem verificada;
- destacar oportunidades;
- localizar registros desatualizados;
- visualizar e exportar leads conforme as regras de privacidade;
- registrar histórico das alterações.

## Condição para implementação

Criar um projeto Supabase exclusivo e definir o e-mail administrador. Não reutilizar AulaCerta, Parceiro de Estudos ou Gerador de Cronogramas.
