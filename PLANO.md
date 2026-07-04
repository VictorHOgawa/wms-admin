# Plano-guia — `wms-admin-business`

> Documento de contexto e roadmap. Use como referência ao continuar qualquer fase.
> Princípios de domínio vêm da skill `wms-architect` (raiz do monorepo).

## 1. O que este app É

O **plano de controle** (control plane) do Integra WMS. Enquanto `wms-frontend` (desktop) e
`wms-mobile` (coletor) **executam** a operação, o `wms-admin-business` é onde se **modela o
armazém e ligam-se as regras** que a operação obedece — *antes* de qualquer operação rodar.

**Princípio-mestre:** parametrização é **dado**, não código. "Conferência cega" não é um `if`
no `Recebimento.tsx`; é uma linha numa tabela `config` que o operacional lê. Assim o mesmo
schema serve da padaria ao operador de 40 mil posições — **a escala está em quais chaves o
admin liga, não em ter duas versões do sistema** (chave-mestra: `Armazem.modo` simples↔completo).

## 2. Decisões do dia 1 (não retrofitar)

- **Multi-armazém** — `armazemId` em tudo desde o início.
- **Config é dado** — por isso o admin é app separado da operação.
- **Endereço estruturado sempre** (`RUA-COLUNA-NÍVEL-POSIÇÃO`), escondido na UI no modo simples.
- **Permissão por AÇÃO, não por tela** (ex.: `quarentena.liberar`), nunca gatear só telas.
- **Fiscal no SKU** (NCM/CEST/origem) é obrigatório no BR, não "campo extra".
- Código de endereço é **compartilhado** com `wms-frontend/src/lib/warehouse.ts` (planta 3D).

## 3. Stack e convenções

React 19 · Vite 8 · TS 6 · react-router 7 · Tailwind 3 (tokens `#21274e`/`#00a88e`,
Poppins/Fira Code) · Zustand 5 · lucide-react. **Sem API — mock em memória.** Layout clonado do
`wms-frontend` (`ui.tsx`, `form.tsx`, `Brand`, Shell) para consistência total.

- **CRUD genérico** no store: `upsert/remove/bulkAdd(collection, item)`.
- Páginas seguem o padrão: `PageHeader` + filtros + tabela/cards + `Modal` de edição.
- Toda entidade nova entra em `lib/types.ts` e no `CollectionKey`; seed em `lib/mock.ts`.

## 4. Roadmap (status)

| Fase | Escopo | Status |
|---|---|---|
| 0 | Scaffold / fundação clonada | ✅ |
| 1 | Modelo + Cadastros mestres (SKU fiscal, Armazéns, Owners, Fornecedores, Transportadoras) | ✅ |
| 2 | Estrutura física (Zonas, Docas, Endereços + gerador em massa + planta 2D) | ✅ |
| 3 | **Parâmetros operacionais** (escopo global→CD→owner, resolução hierárquica) | ✅ |
| 4 | **Acessos & Governança** (Usuários, Perfis×Permissões por ação, Alçadas, Reason Codes) | ✅ |
| 5 | Regras avançadas + Editor de Mapa (slotting, picking/ondas, editor→`warehouse.ts`) | ⬜ |
| 6 | Auditoria (log de "quem mudou qual config") | ⬜ |

## 5. Detalhe das fases concluídas (3 e 4)

### Fase 3 — Parâmetros operacionais

A "tela que escreve a tabela `config`". Modelo em duas partes:

- **Catálogo** (`DefinicaoParametro`, estático em `mock.ts`): `chave`, `label`, `grupo`, `tipo`
  (boolean|number|enum), `default`, e os textos `modoSimples`/`modoCompleto`.
- **Overrides** (`ValorParametro`, em store): `chave` + `escopo` (`global`|`cd`|`owner`) +
  `escopoId` + `valor` serializado.

**Resolução hierárquica** (`lib/parametros.ts → resolverPara`): no escopo CD/owner, o valor
efetivo é `override-no-escopo ?? global ?? default`. Owner sobrepõe global; CD sobrepõe global.
A tela `Parametros.tsx` tem um seletor de escopo (Global / CD atual / Owner), mostra a origem do
valor vigente (Definido aqui / Herdado: Global / Padrão) e permite "Resetar para herdado".

Migra as chaves antes soltas no `Configuracoes.tsx` do operacional (conferência cega, FEFO,
endereçamento caótico, interleaving, controle por série, aprovação/alçada de ajuste).

### Fase 4 — Acessos & Governança

- **Permissão por ação** — catálogo `PermissaoDef` (estático, agrupado por área). `Perfil` guarda
  `permissoes: string[]` + alçadas numéricas (`alcadaAjusteQtd`, `alcadaAjusteValor`; `-1` = ilimitado).
- **Perfis & Permissões** (`Perfis.tsx`): matriz perfil × ação (checkboxes agrupados) + alçadas.
- **Usuários** (`Usuarios.tsx`): vínculo a um perfil e a N armazéns.
- **Reason Codes** (`ReasonCodes.tsx`): motivos de ajuste obrigatórios (`exigeAprovacao`), tipados.

## 6. Próximas fases (a fazer)

**Fase 5 — Regras avançadas + Editor de Mapa.**
Entidades: `RegraSlotting` (ABC/família/restrição física/segregação), `EstrategiaArmazenagem`
(fixa/dinâmica/híbrida), `EstrategiaPicking`, `RegraOnda`. Editor de planta paramétrico + preview 2D
(base: `components/MapaPreview.tsx`) que gera o modelo `RUAS/COLS/LEVELS` consumido pela Planta 3D.
**Armadilha:** não construir editor 3D arrasta-e-solta. Paramétrico + 2D = 95% do valor.

**Fase 6 — Auditoria.** Log append-only de mudança de configuração (quem, o quê, quando, escopo).

## 7. Integração futura (quando houver API)

- `Configuracoes.tsx` do `wms-frontend` vira **somente-leitura** ("regras vigentes — editar no admin").
- O admin é o **dono** das chaves de config; operacional só lê via resolução.
- Expedição é o ponto de integração **WMS↔TMS** (Redful): carga, romaneio, CT-e — não reimplementar.
