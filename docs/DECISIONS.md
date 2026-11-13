# SafeRoute — Registro de decisões

Toda decisão técnica relevante entra aqui com data, o que foi decidido e por quê (regra 10 do `CLAUDE.md`).

Status: `[DECIDIDO]` = definido pelo responsável pelo projeto · `[ASSUMIDO]` = escolha técnica, vale até ser contestada · `[HIPÓTESE]` = número ou regra a calibrar com dado.

## Decisões da SPEC v0 (12/11/2026)

| # | Decisão | Status | Por quê |
|---|---|---|---|
| D1 | Região de demonstração: distrito do Tatuapé + faixa de 500 m | [DECIDIDO] como região-exemplo | 30º DP: 5.726 → 6.713 roubos e furtos (2024 → 2025), +17,2% |
| D2 | Escopo de risco: só crime patrimonial (roubo e furto) | [DECIDIDO] | Acidentes, enchentes e assédio ficam fora |
| D3 | Dois modos: a pé e carro | [DECIDIDO] | A pé entra primeiro (M3), carro logo depois (M5) |
| D4 | Código aberto | [DECIDIDO] | Licença MIT para o código [ASSUMIDO, confirmar com a equipe] |
| D5 | App web responsivo instalável (PWA), não app de loja | [ASSUMIDO] | Sem conta de loja nem revisão da Apple/Google; vira link para o formulário e para o pitch. React Native fica para depois da validação |
| D6 | Backend = Supabase (PostGIS + pgRouting) + Next.js na Vercel | [ASSUMIDO] | Nenhum servidor para operar; substitui GraphHopper/Valhalla por algo que uma pessoa mantém |
| D7 | Risco calculado por segmento de rua (aresta), não por célula H3 | [ASSUMIDO] | Extensão H3 não disponível no Supabase; o grafo do piloto é pequeno; cumpre a promessa "por trecho" |
| D8 | Tempo em 8 faixas: 4 períodos do dia × (dia útil / fim de semana) | [ASSUMIDO] | Só 62,3% dos registros têm hora exata; 99% têm ao menos o período |
| D9 | Sem login, sem guardar rotas de ninguém | [ASSUMIDO] | Privacidade por padrão; reduz a superfície de LGPD a quase zero na v0 |
| D10 | O app nunca diz "rota segura" | [ASSUMIDO] | Diz "menor risco registrado"; evita promessa que não se pode cumprir |
| D11 | Banco fechado ao público; só o servidor Next.js acessa | [ASSUMIDO] | Modelo de segurança mais simples de acertar |

## Decisões tomadas no M0 (12/11/2026)

| # | Decisão | Status | Por quê |
|---|---|---|---|
| D12 | PostGIS e pgRouting instalados no schema `extensions`, não em `public` (única diferença da migração `0001_init.sql` em relação ao texto do item 6 da SPEC) | [ASSUMIDO] | Em `public`, o PostGIS cria a tabela `spatial_ref_sys` exposta e sem RLS; o Security Advisor do Supabase acusa erro e o checklist 11.2 exige zerar os alertas. As colunas usam `extensions.geometry(...)`. O esboço de `get_routes` da SPEC já prevê `search_path = public, extensions` |
| D13 | O repositório fica em uma pasta própria; a pasta de dados brutos é outra, fora do Git, indicada por `SAFEROUTE_DATA_DIR` | [ASSUMIDO] | Iniciar o Git na pasta de dados colocaria cerca de 6 GB de dados brutos ao alcance de um commit acidental (regra 3) |
| D14 | Versões estáveis conferidas no registro npm em 12/11/2026: Next.js 16.4.6, React 19.3, TypeScript 5.9, ESLint 9, Vitest 5.1, Playwright 1.65, pytest 9.2. `@types/node` na linha 24 | [ASSUMIDO] | O Vitest 5 exige `@types/node` 22 ou 24+; o modelo do `create-next-app` vinha com a linha 20 e a instalação falhava |
| D15 | Sem Tailwind e sem fontes do Google por enquanto; CSS simples e fontes do sistema | [ASSUMIDO] | A página "olá" não precisa; a escolha de estilo é feita no M3, junto com as telas. Fontes do sistema evitam qualquer chamada a terceiros |
| D16 | Cabeçalhos de segurança básicos já no M0 (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); a CSP completa entra no M3 | [ASSUMIDO] | A CSP depende dos servidores de mapa, que só entram com o MapLibre |
| D17 | A integração contínua roda em Node LTS e Python 3.13; `npm audit` barra só vulnerabilidade alta em dependência de produção | [ASSUMIDO] | Em 12/11/2026 há 7 alertas moderados só em ferramentas de desenvolvimento (cadeia do `typescript-eslint`), que não vão para o app publicado |
| D18 | Testes ficam em `tests/unit` (Vitest), `tests/e2e` (Playwright, viewport de celular) e `tests/data` (pytest) | [ASSUMIDO] | Uma pasta `tests/` como na estrutura do `CLAUDE.md`, separada por ferramenta |

## Decisões da demo enxuta (12/11/2026)

O responsável autorizou seguir M1 → M2 → núcleo do M3 sem parar entre os marcos, para ter um link de demonstração no mesmo dia. Ficaram de fora, de propósito: modo carro, busca por endereço, "minha localização", "Por que este trecho?", camada de risco, validação (PAI e curva de trade-off), PWA instalável, perfilamento formal (`DATA_PROFILE.md`), limite de taxa e o checklist de segurança do M3.

| # | Decisão | Status | Por quê |
|---|---|---|---|
| D19 | O peso de cada faixa é dividido pelo número de dias do tipo (5 em dia útil, 2 em fim de semana) | [HIPÓTESE] | Sem isso, o fim de semana sempre pareceria menos arriscado só por ter menos dias. Parâmetro `normalize_by_days` em `risk.yaml` |
| D20 | `/api/routes` é `POST`, com origem e destino no corpo | [ASSUMIDO] | Em `GET`, as coordenadas iriam na URL e ficariam nos registros de acesso da hospedagem, contra a regra 8. Muda o item 9 da SPEC |
| D21 | A conexão do app com o banco sempre verifica o certificado TLS; o certificado raiz do provedor entra por `DATABASE_CA_CERT_B64` quando necessário | [ASSUMIDO] | Desligar a verificação seria um atalho inseguro |
| D22 | `statement_timeout` de 5 s fica no papel `app_api` (definido em `07_load_db.py --app-role`), não na função | [ASSUMIDO] | O `set` na definição da função não interrompe a própria chamada |
| D23 | O papel `app_api` é criado sem login na migração 0002; a senha é gerada e gravada em `.env.local` pelo script de carga, sem aparecer na tela nem no Git | [ASSUMIDO] | Senha fora do Git (item 8 da SPEC) |
| D24 | Ocorrências com data do fato fora de 2024–2025 são descartadas, mesmo registradas nesses anos | [ASSUMIDO] | Há boletins de 2024 sobre fatos de 2006; não pertencem ao período do modelo |
| D25 | Coluna de período do dia: `DESC_PERIODO`. Tipo de local: `DESCR_TIPOLOCAL` em 2025 e só `DESCR_SUBTIPOLOCAL` em 2024; o pipeline usa as duas | [VERIFICADO nos arquivos] | O esquema da SSP muda entre anos |
| D26 | O worker do MapLibre 6 é copiado para `public/` antes de `dev` e `build` (`scripts/copy-map-worker.mjs`) | [ASSUMIDO] | O empacotador do Next.js não resolve o worker sozinho; sem isso o mapa não carrega |
| D27 | Mapa-base OpenFreeMap (estilo `positron`), sem chave | [VERIFICADO: respondeu em 12/11/2026] | Termos de uso e disponibilidade a longo prazo continuam como ponto de atenção |
| D28 | A configuração da área do piloto fica em `data/config/pilot.yaml`; os testes de tela usam um exemplo real pré-calculado (`tests/fixtures/demo.json`) com o nome "Área de teste" | [ASSUMIDO] | Regra 12: o nome do distrito só aparece na configuração |

| D29 | O certificado raiz público do Supabase ("Supabase Root 2021 CA", válido até 26/04/2031) fica em `supabase/ca/` e entra no app por `DATABASE_CA_CERT_B64` | [VERIFICADO] | Sem ele a verificação TLS falha (`SELF_SIGNED_CERT_IN_CHAIN`). Baixado do endereço oficial do Supabase e conferido: valida a conexão real do pooler. SHA-256 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA` |
| D30 | As migrações são aplicadas por `data/pipeline/00_migrate.py`, que confere o identificador do projeto com o `CLAUDE.md` e registra em `supabase_migrations.schema_migrations` | [ASSUMIDO] | A CLI do Supabase não está instalada e a conexão assistida só enxerga outra organização. A tabela de controle é a mesma da CLI |

| D31 | Identidade visual aplicada conforme o kit de marca (paleta, logo, Montserrat); detalhes em `docs/BRAND.md`. O verde da marca não é usado para indicar risco de trecho | [DECIDIDO: aplicar a identidade] · [ASSUMIDO: regras de uso] | Verde em uma rota sugeriria garantia de segurança, contra D10. A escala de risco segue em âmbar → vinho |
| D32 | O slogan do kit ("vá pela rota segura", "Segurança em cada trajeto") não entra no app | [PENDENTE: decisão da equipe] | Conflita com a regra 7 do `CLAUDE.md` e com D10. O app mantém "Tudo começa pelo caminho." |

### Verificação no banco real (12/11/2026)

- Projeto `susosoyygixcmouhzyta` (sa-east-1), PostgreSQL 17.11. `postgis_version()` = 3.3; `pgr_version()` = 3.4.1. As duas extensões aceitaram o schema `extensions`.
- Carga: 3.364 nós, 9.496 arestas, 18.796 ocorrências, 48.656 linhas de risco; run 1 ativo.
- O papel `app_api` conecta pelo pooler em modo transação (porta 6543) como `app_api.<projeto>`, executa `get_meta` e `get_routes`, e recebe erro 42501 ao tentar ler `edges` ou `crime_events`.
- `get_routes` devolveu exatamente as mesmas três rotas do cálculo local de conferência.
- 30 pedidos aleatórios pelo servidor local: mediana 0,08 s, máximo 0,12 s (meta da SPEC: p95 abaixo de 3 s).
- Não verificado: Security Advisor e Performance Advisor do Supabase (a conexão assistida não enxerga este projeto); limite de taxa.

### Verificação do link publicado (12/11/2026)

Endereço: https://saferoute-nine-theta.vercel.app (Vercel, funções na região `gru1`).

Checklist de segurança do item 11.2 da SPEC:

1. `NEXT_PUBLIC_`: nenhuma variável com esse prefixo no código nem no build. **OK.**
2. Navegador: nos 11 arquivos de código e respostas de API recebidos, nenhuma ocorrência de string de conexão, endereço do banco, nome do papel, identificador do projeto ou certificado. Só dois servidores são contatados (o próprio app e o de mapa-base). Nenhum cookie. **OK.**
3. Security Advisor e Performance Advisor do Supabase: **não executados** (a conexão assistida não enxerga este projeto). Pendência humana.
4. Entradas inválidas e maliciosas (texto no lugar de número, `' OR 1=1 --`, coordenadas absurdas, faixa 99, corpo vazio, JSON quebrado): todas devolvem 400 com mensagem genérica. **OK.**
5. Limite de taxa: **não existe.** O link não deve ser divulgado amplamente antes disso.
6. Erro de servidor: a resposta traz só código e mensagem genérica, sem pilha nem texto do banco (conferido com o banco fora de configuração, antes do certificado). **OK.**

Desempenho: 20 pedidos aleatórios contra o link publicado, mediana 0,10 s e máximo 0,22 s; o primeiro pedido após inatividade levou 1,3 s.

### Números da primeira execução do pipeline (12/11/2026)

- Área: 15,74 km² (distrito + 500 m). Grafo a pé: 3.364 nós, 9.496 arestas dirigidas, 607 km.
- Ocorrências de roubo e furto na área em 2024–2025: 18.796 (85,3% em via pública; 72,5% com hora exata; 99,1% com ao menos o período; 1,2% em ponto suspeito).
- No município, sem coordenada válida: 70.937 de 411.483 em 2024 e 66.656 de 397.097 em 2025 (cerca de 17%).
- Modo a pé: 11.714 ocorrências usadas; 9.202 trechos com algum registro a até 60 m; 48.656 linhas em `edge_risk`.
- Exemplo usado nos testes (noite de dia útil, cerca de 4 km): Equilibrada +1 min e −17% de exposição; Menor risco +11 min e −31%. É um par só, não é validação.

## Fatos externos conferidos no M0 (12/11/2026)

| Item [VERIFICAR] da SPEC | Resultado | Fonte |
|---|---|---|
| Vercel Hobby importa repositório de organização? | Sim, se o repositório for **público**. Repositório privado de organização exige plano Pro | vercel.com/docs/git |
| Vercel Hobby e colaboração | No Hobby, **só commits cujo autor é o dono da conta Vercel são publicados**. Commits de outro membro não geram deploy enquanto o projeto estiver no Hobby | vercel.com/docs/git |
| Supabase gratuito: 2 projetos | Confirmado: dois projetos ativos, somando todas as organizações em que a pessoa é Owner ou Administrator; projeto pausado não conta | supabase.com/docs (billing) |
| Pooler em modo transação | Porta 6543 (`aws-[região].pooler.supabase.com`); **não aceita prepared statements**, é preciso desligá-los no driver (afeta o M3) | supabase.com/docs (connecting to Postgres) |
| pgRouting no Supabase | Disponível; a documentação habilita com `create extension pgrouting cascade` | supabase.com/docs/guides/database/extensions/pgrouting |

Não confirmado na documentação: se a demo de uma competição estudantil se enquadra como uso "não comercial" do Hobby da Vercel. Fica como ponto de atenção humano.

## Pontos da SPEC a resolver nos próximos marcos

Levantados na leitura do M0; nenhum bloqueia o M0. Cada um vira decisão quando o marco chegar.

1. **Origem e destino na URL (M3).** `GET /api/routes?o=...&d=...` coloca as coordenadas na URL, e a Vercel registra URLs (com IP) nos logs de acesso da plataforma. Isso contraria a regra 8. Proposta: `POST` com os pontos no corpo.
2. **`statement_timeout` dentro da função (M3).** `set statement_timeout` na definição da função não interrompe a própria chamada que a executa; o limite precisa ficar no papel (`alter role app_api set statement_timeout`). Testar antes de depender.
3. **Testes de banco pedem Docker (M3).** "pytest contra Supabase local" exige Docker Desktop, que não está instalado. Alternativas: instalar o Docker ou testar em um schema temporário do próprio projeto.
4. **Texto da SPEC inconsistente (item 3 × item 9).** O diagrama fala em "chave secreta do Supabase"; o item 9 proíbe `service_role` e manda usar o papel `app_api`. Vale o item 9.
5. **Skill `frontend-design` (M3).** Citada no `CLAUDE.md`, mas não está instalada nesta máquina.
6. **Python 3.15 local × 3.13 na integração contínua.** OSMnx, GeoPandas, pandas e psycopg têm instalador para o 3.15 (conferido com `pip --dry-run`), então o M1 não está bloqueado.
7. **Pausa do Supabase gratuito após 7 dias sem uso.** Risco para o dia da avaliação, já previsto no item 3 da SPEC.
8. **Nome "SafeRoute" (INPI e domínio).** Pendência humana do item 14; idealmente antes de divulgar o repositório público.
