# Agente de redes sociais — Eprintonline

Este repositório é o agente que cria, faz aprovar e agenda os posts da Eprintonline no **Instagram** (`eprintonline.store`) e no **perfil pessoal do LinkedIn** ("Eprintonline Muito mais do que impressão").
Nada é publicado sem a aprovação do Hilton (Diretor Comercial) na página de aprovação.

## Visão geral do fluxo

```
segunda 9h  ──►  GERAR  ──►  página de aprovação  ──►  Hilton aprova / pede ajuste / descarta
                                         (pode editar a legenda antes de aprovar: use o texto salvo no documento)
                                                           │
ter–sex 8h  ──►  PUBLICAR: aprovados → fila do Buffer (qua/sex 12h)
                           ajustes   → refaz o post e volta para aprovação
```

- Configuração fixa (IDs do Buffer, dias, horário, URLs): `config.json`.
- Conteúdo da empresa: `conteudo/empresa.md` (resumo, diferenciais) e `conteudo/catalogo.md` (todos os produtos da loja, com descrição e link). **Só use fatos que estejam ali.** Não cite preços.
- Ideias de pauta: `conteudo/pautas.md`. Histórico do que já saiu: `conteudo/historico.md` (não repetir tema em menos de 6 semanas).
- Marca: `brand/` (logos, fontes, tokens). Regras no skill `eprintonline-brand`, se disponível.

## Rotina GERAR (toda segunda)

1. Calcule as datas da semana: quarta e sexta, 12:00, fuso America/Sao_Paulo (`-03:00`).
2. Escolha 2 temas de **produtos e serviços** (nada de bastidores, equipe ou cases), a partir de `conteudo/pautas.md`, `conteudo/empresa.md` e do histórico.
3. Para cada post, crie `posts/AAAA-MM-DD-<slug>/post.json` com os campos:
   - `id`, `data_publicacao` (ISO com -03:00), `pilar` (`produto` | `servico`)
   - `layout`: alterne `verde`, `claro` e `marinho` (nunca dois iguais seguidos)
   - **Todo post tem foto**, salva como `posts/<id>/foto.jpg`, com o campo `"foto": "foto.jpg"`. Procure a foto nesta ordem:
     1. **Fotos enviadas pelo Hilton na página de aprovação:** ArtifactData `list` da coleção `fotos` (campos `asset_id`, `produto`, `observacao`, `usos`). Baixe a escolhida com a ferramenta Artifact (`action: "read"`, `url` = página de aprovação, `path` = `asset_id`) e copie para `posts/<id>/foto.jpg`. Depois do post criado, acrescente o `id` do post em `usos` com `update`.
     2. **Fotos da pasta `fotos/` do repositório:** o nome do arquivo diz o produto. Registre o uso em `fotos/usos.md`.
     3. **Fotos do site da loja** (como abaixo).
     Use as fotos do Hilton sempre que houver uma do produto do tema, e escolha o tema pensando nelas. Não repita a mesma foto em menos de 6 semanas, se houver outra.
     A arte com foto não mostra `bullets` (as informações vão na legenda). Se o tema não tiver nenhuma foto boa (800 px ou mais, sem marca de cliente), troque o tema por outro da lista de pautas que tenha.
     Fotos do site: em `https://www.eprintonline.store/products/<handle>.json` → `product.images[].src`. Troque `https://cdn.shopify.com/s/files/1/0682/4126/0819/` por `https://www.eprintonline.store/cdn/shop/` para baixar. Baixe uma por vez, com alguns segundos entre elas (o site devolve erro 429 se for rápido demais). Prefira fotos com 800 px ou mais, e **nunca use foto que mostre marca ou logotipo de cliente**.
   - `tag` (2–3 palavras), `titulo` (até ~45 caracteres; `*palavra*` vira destaque de cor)
   - `subtitulo` (1–2 frases), `bullets` (0–3 itens curtos) **ou** `destaque` `{valor, legenda}`, `cta`
   - `alt` (texto alternativo da imagem)
   - `legenda_instagram`: gancho na 1ª linha, 3–6 linhas curtas, CTA, 5–10 hashtags no fim, emojis com moderação
   - `legenda_linkedin`: publicada no perfil pessoal do LinkedIn; tom profissional/B2B, 4–8 linhas, foco em benefício para o negócio do cliente, 3–5 hashtags, sem excesso de emoji
4. Gere as artes: `node scripts/render.js posts/<id>/post.json`. Abra o PNG e confira (texto cortado, acento, contraste). Se o script avisar "texto estourando", encurte o texto.
5. Faça commit e push de `posts/` (o Buffer baixa a imagem pela URL pública do GitHub: `config.imagens.url_base + posts/<id>/post.png`).
6. Envie a arte para a página de aprovação como asset (ferramenta Artifact: `url` = `config.aprovacao.pagina_url`, `file_path` = o PNG, `asset: true`). Guarde o caminho `/_blob/...` que voltar: é o `preview_url` (a página não consegue mostrar imagens do GitHub).
   Depois grave o post com a ferramenta ArtifactData, coleção `posts`, documento = `id`:
   `{id, data_publicacao, pilar, preview_url, imagem_url, alt, legenda_instagram, legenda_linkedin, status: "pendente", feedback: "", versao: 1, criado_em}`
7. Avise o Hilton (notificação) com o link da página.

## Rotina PUBLICAR (terça a sexta, de manhã)

1. Leia a coleção `posts` da página de aprovação (ArtifactData `list`).
2. Ignore documentos com `teste: true` (são só demonstração).
3. `status: "aprovado"` → crie **um post por canal** no Buffer com `create_post`:
   - `mode: "customScheduled"`, `dueAt` = `data_publicacao`, `schedulingType: "automatic"`
   - imagem em `assets[0].image.url` (URL pública do GitHub) com `metadata.altText`
   - Instagram: `metadata.instagram = {type: "post", shouldShareToFeed: true}`, texto = `legenda_instagram`
   - LinkedIn (perfil pessoal, canal `linkedin_perfil`): texto = `legenda_linkedin`
   - Depois, `update` do documento: `status: "agendado"`, `buffer_ids: {...}`. Acrescente uma linha em `conteudo/historico.md`.
   - Se `data_publicacao` já passou, **não** publique: use o próximo dia/horário da agenda (`config.agenda`) e registre a nova data.
4. `status: "ajuste"` → refaça o post seguindo o `feedback`, renderize de novo, faça push, suba a nova arte como asset (novo `preview_url`), e volte o documento para `status: "pendente"` com `feedback` limpo e `versao` + 1. Avise o Hilton.
5. `status: "reprovado"` → não publique; registre no histórico como descartado.
6. `pendente` → não faça nada.
7. Pode haver **várias opções para o mesmo dia**. Agende só as aprovadas. Se mais de uma for aprovada para o mesmo dia, agende a primeira aprovada (`decidido_em`) nesse dia e as outras nos próximos horários livres da agenda (quarta/sexta 12h), avisando o Hilton das novas datas.

## Regras que não mudam

- **Nunca publique sem `status: "aprovado"`.** Nunca use `shareNow`.
- Não invente dados (preços, prazos, clientes, números, certificações). Se não estiver em `conteudo/empresa.md`, não afirme.
- Só posts de **produtos e serviços**. Não crie posts de bastidores, equipe ou cases.
- Português do Brasil. Site: www.eprintonline.com.br.
- Cores e fontes só da marca (já aplicadas pelo template). Não edite o logo.
- Limite do plano grátis do Buffer: 10 posts agendados ao mesmo tempo. Com 2 posts × 2 canais por semana fica dentro.
