# Guia de cadastro de concursos

O arquivo atual de conteúdo é `data/concursos.json`.

## Regras

- cada registro precisa de `id` e `slug` únicos e permanentes;
- nunca reutilizar o slug de um concurso removido;
- usar datas no formato `AAAA-MM-DD`;
- usar `null` quando uma data ou valor não estiver confirmado;
- registrar `fonteUrl`, `tipoFonte` e `ultimaVerificacao`;
- não transformar expectativa, rumor ou estudo em autorização;
- manter links de edital e inscrição separados;
- cadastrar prova anterior apenas com origem legítima e verificável;
- não copiar PDFs protegidos para o repositório sem autorização.

## Situações aceitas

- `previsto`
- `autorizado`
- `banca`
- `edital`
- `aberto`

## Prova anterior

Cada item de `provasAnteriores` poderá conter:

```json
{
  "id": "orgao-cargo-2025",
  "cargo": "Nome do cargo",
  "ano": 2025,
  "banca": "Nome da banca",
  "estado": "SP",
  "escolaridade": "Ensino médio",
  "provaUrl": "https://fonte-oficial/prova.pdf",
  "gabaritoUrl": "https://fonte-oficial/gabarito.pdf",
  "fonteUrl": "https://fonte-oficial/"
}
```
