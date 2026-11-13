# SafeRoute — instruções para o Claude Code

App web (PWA) que mostra rotas com menor risco registrado de roubo e furto, usando dados públicos da SSP-SP. Piloto: distrito do Tatuapé, São Paulo. Projeto de código aberto.

**A especificação completa está em `docs/SPEC.md`. Leia antes de qualquer tarefa.** Se algo aqui ou no código divergir dela, pare e pergunte.

## Quem está do outro lado

O responsável não é programador. Portanto:
- Explique o que vai fazer em português simples antes de fazer, e o que fez depois.
- Quando precisar que ele faça algo fora do terminal (criar conta, copiar chave, clicar em painel), dê o passo a passo exato.
- Nunca presuma que um comando foi rodado; verifique.

## Stack

- Interface e servidor: Next.js (App Router) + TypeScript, publicado na Vercel
- Mapa: MapLibre GL JS
- Banco: Supabase Postgres com PostGIS e pgRouting
- Pipeline de dados: Python 3.11+ (OSMnx, GeoPandas, pandas)
- Testes: pytest, Vitest, Playwright

Use a versão estável atual de cada biblioteca e confira a documentação oficial antes de usar uma API. Não confie em versões lembradas de memória.

## Estrutura

```
app/            telas e rotas de API (Next.js)
components/     componentes de interface
lib/            utilitários, esquemas de validação, cliente Supabase de servidor
supabase/
  migrations/   SQL numerado (0001_init.sql, 0002_functions.sql, ...)
data/
  pipeline/     scripts 01 a 06
  config/       categories.yaml, speeds.yaml, risk.yaml
  README.md     como obter os dados brutos (que NÃO ficam no repositório)
docs/
  SPEC.md  DECISIONS.md  DATA_PROFILE.md  VALIDATION.md
tests/
```

## Regras que não se quebram

1. **Trabalhe por marcos (M0 a M6, item 13 da SPEC).** Ao terminar um marco, pare, mostre o resultado e espere aprovação.
2. **Sem dado pessoal.** Nenhuma coluna de vítima, autor, placa, IMEI ou documento dos boletins entra no banco ou no repositório.
3. **Sem dados brutos no Git.** Arquivos da SSP, parquet, gpkg e afins ficam fora (`.gitignore`).
4. **Sem segredos no Git nem no navegador.** Chaves só em variável de ambiente de servidor; nunca com prefixo `NEXT_PUBLIC_`. Mantenha `.env.example` sem valores.
5. **Esquema só por migração.** Toda mudança no banco é um novo arquivo em `supabase/migrations/`. Nunca edite migração já aplicada.
6. **Pergunte antes de qualquer ação destrutiva** no banco (drop, truncate, delete em massa) ou no Git (force push, reset).
7. **O app nunca diz "rota segura" nem "bairro perigoso".** Use "menor risco registrado" e fale de trechos, não de bairros.
8. **Não registre origem, destino ou IP** de pedidos de rota em log.
9. **Nada de escopo extra.** Login, relatos, anúncios, assinatura, navegação por voz e painel administrativo estão fora da v0 (item 2 da SPEC). Se parecer necessário, pergunte.
10. **Toda decisão técnica relevante vai para `docs/DECISIONS.md`** com data, o que foi decidido e por quê.
11. **Parâmetros do modelo ficam em `data/config/`**, nunca espalhados no código.
12. **Nada no código cita "Tatuapé"** fora da configuração da área do piloto.
13. **Sem `service_role` e sem `supabase-js` no app.** O servidor conecta com o papel `app_api`, que só executa funções (item 9 da SPEC). Nunca desligue o RLS para resolver consulta vazia.
14. **SQL nunca concatena texto do usuário.** Valores entram por parâmetro ou por `format()` com `%L`.
15. **Erros para o usuário são genéricos.** Nada de pilha, mensagem do Postgres ou caminho de arquivo na resposta; detalhe só no log do servidor.
16. **Ao fim de M0, M3 e M6, rode o checklist de segurança do item 11.2 da SPEC** e mostre o resultado.
17. **Sem recurso exclusivo de fornecedor no código** (item 3 da SPEC, portabilidade).
18. **Só mexa no projeto Supabase do SafeRoute.** As contas conectadas podem enxergar projetos de outras empresas. Antes de qualquer comando no banco (migração, SQL, painel), confira que o identificador do projeto é o anotado abaixo. Se não houver identificador anotado, pergunte.
    - Projeto Supabase do SafeRoute: `susosoyygixcmouhzyta` (região sa-east-1; anotado em 12/11/2026 a partir da conexão do `.env.local`)
19. **Nenhum rastreador de terceiros** (Google Analytics, pixel de anúncio, ferramenta com cookie). Métrica de uso só agregada e sem cookies, conforme o item 10.5 da SPEC.

## Definição de pronto

Uma tarefa só está pronta quando: testes passam, lint está limpo, a documentação afetada foi atualizada, e (se mexe em tela) foi conferida no navegador em largura de celular.

## Ao construir telas

Use a skill `frontend-design`. Siga as diretrizes do item 10.4 da SPEC: celular primeiro, tom calmo, tema claro e escuro, contraste AA, risco indicado por cor e espessura juntas.

## Dados locais

Os dados brutos ficam em uma pasta local, fora do repositório. Scripts de análise anteriores estão em `06 - Scripts\` dessa pasta e servem de referência para nomes de colunas e regras de limpeza. O pipeline lê o caminho da pasta de dados de uma variável de ambiente (`SAFEROUTE_DATA_DIR`), nunca de caminho fixo no código.
