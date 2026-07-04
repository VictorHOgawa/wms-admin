# Modelo Operacional de Localizacao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o `wms-admin-business` de cadastro simples de enderecos para um modelo front-only de localizacoes operacionais preparado para backend futuro.

**Architecture:** O admin continua sem API e com Zustand em memoria. A mudanca centraliza o dominio em `Localizacao`, mantem compatibilidade de rota/tela onde for util, e troca strings soltas por IDs, tipos e flags operacionais no modelo administrativo.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Zustand 5, Tailwind 3, lucide-react, Node native test style used elsewhere in the monorepo.

## Global Constraints

- Nao criar backend, API, banco ou migrations.
- Nao integrar o `wms-frontend` nesta etapa.
- Manter `armazemId` em todas as entidades operacionais.
- O codigo visivel da localizacao continua existindo para alimentar telas antigas.
- Usar ASCII em arquivos novos ou editados.
- Preservar padroes atuais de React, Zustand, componentes `ui.tsx` e `form.tsx`.
- Nao reverter mudancas existentes no worktree que nao pertencem a esta tarefa.

---

## File Structure

- Modify: `wms-admin-business/package.json`
  - Add script `test:domain` for native domain tests.
- Modify: `wms-admin-business/src/lib/types.ts`
  - Add `TipoLocalizacao`, `EstruturaLocalizacao`, `Localizacao`.
  - Expand `TipoZona`.
  - Update `Doca` to include `localizacaoId`.
  - Update `CollectionKey` from `enderecos` to `localizacoes`.
- Create: `wms-admin-business/src/lib/localizacoes.ts`
  - Own code generation, defaults, factory helpers, filters, and compatibility helpers for structured locations.
- Modify: `wms-admin-business/src/lib/mock.ts`
  - Replace `ENDERECOS` with `LOCALIZACOES`.
  - Add coherent seed zones and locations.
  - Add labels for location type and structure.
  - Keep `TIPO_ENDERECO_LABEL` as compatibility export if needed by legacy imports during migration.
- Modify: `wms-admin-business/src/store/useStore.ts`
  - Replace `enderecos` collection with `localizacoes`.
  - Keep CRUD generic behavior.
- Modify: `wms-admin-business/src/components/MapaPreview.tsx`
  - Accept `Localizacao[]` and render only structured locations.
- Modify: `wms-admin-business/src/pages/Dashboard.tsx`
  - Replace enderecos counts with localizacoes counts.
- Modify: `wms-admin-business/src/components/nav.ts`
  - Rename menu label from `Enderecos` to `Localizacoes`; route may stay `/enderecos` for compatibility in this pass.
- Modify: `wms-admin-business/src/pages/Enderecos.tsx`
  - Evolve copy and behavior into Localizacoes.
  - Add filters and generator models.
- Modify: `wms-admin-business/src/pages/Docas.tsx`
  - Require or create a linked `Localizacao` for each doca.
- Modify: `wms-admin-business/src/pages/Zonas.tsx`
  - Support expanded zone types and labels.
- Test: `wms-admin-business/tests/localizacoes.test.ts`
  - Validate code generation, default flags, seed coverage, and doca linkage.

---

### Task 1: Add Domain Types And Test Script

**Files:**
- Modify: `wms-admin-business/package.json`
- Modify: `wms-admin-business/src/lib/types.ts`
- Create: `wms-admin-business/tests/localizacoes.test.ts`

**Interfaces:**
- Produces:
  - `type TipoLocalizacao`
  - `type EstruturaLocalizacao`
  - `interface Localizacao`
  - `type TipoZona` with `doca`, `porta-palete`, `bloqueio`
  - `interface Doca` with `localizacaoId: string`
  - `CollectionKey` with `localizacoes`

- [ ] **Step 1: Add a failing domain test for types/import surface**

Create `wms-admin-business/tests/localizacoes.test.ts`:

```ts
import assert from 'node:assert/strict'
import type { Doca, Localizacao, TipoZona } from '../src/lib/types.ts'

const zonaPortaPalete: TipoZona = 'porta-palete'
assert.equal(zonaPortaPalete, 'porta-palete', 'tipo de zona deve aceitar porta-palete')

const localizacao: Localizacao = {
  id: 'loc-test',
  armazemId: 'cd-sp',
  zonaId: 'zn-pp-a',
  codigo: 'A-01-03-02',
  nome: 'Porta-palete A-01-03-02',
  tipo: 'porta-palete',
  estrutura: 'porta-palete',
  rua: 'A',
  coluna: 1,
  nivel: 3,
  posicao: 2,
  capacidadePeso: 800,
  capacidadePaletes: 1,
  transitorio: false,
  pickFace: false,
  permiteArmazenagem: true,
  permitePicking: false,
  permiteMovimentacao: true,
  bloqueado: false,
  ativo: true,
}

assert.equal(localizacao.codigo, 'A-01-03-02', 'localizacao deve carregar codigo operacional')

const doca: Doca = {
  id: 'dk-test',
  armazemId: 'cd-sp',
  localizacaoId: 'loc-doca-01',
  codigo: 'DOCA-01',
  nome: 'Doca 01',
  tipo: 'recebimento',
  niveladora: true,
  ativo: true,
}

assert.equal(doca.localizacaoId, 'loc-doca-01', 'doca deve apontar para uma localizacao fisica')
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test wms-admin-business/tests/localizacoes.test.ts
```

Expected: FAIL with TypeScript/type-strip error mentioning missing exported member `Localizacao` or missing `localizacaoId`.

- [ ] **Step 3: Add native test script**

Modify `wms-admin-business/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:domain": "node --test tests/*.test.ts"
  }
}
```

- [ ] **Step 4: Update domain types**

Modify `wms-admin-business/src/lib/types.ts`.

Replace `TipoZona` with:

```ts
export type TipoZona =
  | 'recebimento'
  | 'expedicao'
  | 'doca'
  | 'picking'
  | 'pulmao'
  | 'porta-palete'
  | 'avaria'
  | 'bloqueio'
  | 'quarentena'
  | 'cross-docking'
```

Keep `Temperatura` unchanged.

Add below `TipoDoca`:

```ts
export type TipoLocalizacao =
  | 'recebimento'
  | 'expedicao'
  | 'doca'
  | 'staging'
  | 'picking'
  | 'pulmao'
  | 'porta-palete'
  | 'avaria'
  | 'bloqueio'
  | 'quarentena'
  | 'cross-docking'

export type EstruturaLocalizacao =
  | 'piso'
  | 'porta-palete'
  | 'doca'
  | 'bancada'
  | 'virtual'
```

Replace `Doca` with:

```ts
export interface Doca {
  id: string
  armazemId: string
  localizacaoId: string
  codigo: string // ex.: DOCA-03
  nome: string
  tipo: TipoDoca
  niveladora: boolean // possui niveladora/plataforma
  ativo: boolean
}
```

Replace `TipoEndereco` and `Endereco` with:

```ts
export type TipoEndereco = TipoLocalizacao

export interface Localizacao {
  id: string
  armazemId: string
  zonaId: string | null
  codigo: string
  nome?: string
  tipo: TipoLocalizacao
  estrutura: EstruturaLocalizacao
  rua?: string | null
  coluna?: number | null
  nivel?: number | null
  posicao?: number | null
  capacidadePeso: number
  capacidadePaletes: number
  transitorio: boolean
  pickFace: boolean
  permiteArmazenagem: boolean
  permitePicking: boolean
  permiteMovimentacao: boolean
  bloqueado: boolean
  ativo: boolean
}

export type Endereco = Localizacao
```

Update `CollectionKey`:

```ts
export type CollectionKey =
  | 'armazens'
  | 'skus'
  | 'owners'
  | 'fornecedores'
  | 'transportadoras'
  | 'zonas'
  | 'docas'
  | 'localizacoes'
  | 'parametros'
  | 'usuarios'
  | 'perfis'
  | 'reasonCodes'
  | 'checklists'
```

- [ ] **Step 5: Run the domain test**

Run:

```bash
npm run test:domain --prefix wms-admin-business
```

Expected: PASS for `tests/localizacoes.test.ts`.

- [ ] **Step 6: Run TypeScript build to catch affected imports**

Run:

```bash
npm run build --prefix wms-admin-business
```

Expected: FAIL because other files still reference `enderecos` and old `Doca` mocks. This failure is expected in Task 1.

- [ ] **Step 7: Commit**

```bash
git add wms-admin-business/package.json wms-admin-business/src/lib/types.ts wms-admin-business/tests/localizacoes.test.ts
git commit -m "feat(admin): add localizacao domain types"
```

---

### Task 2: Create Location Domain Helpers And Generators

**Files:**
- Create: `wms-admin-business/src/lib/localizacoes.ts`
- Modify: `wms-admin-business/tests/localizacoes.test.ts`

**Interfaces:**
- Consumes:
  - `Localizacao`
  - `TipoLocalizacao`
  - `EstruturaLocalizacao`
- Produces:
  - `montarCodigoEstruturado(rua: string, col: number, nivel: number, pos: number): string`
  - `parseRuas(input: string): string[]`
  - `contarLocalizacoes(p: Pick<GeradorLocalizacoesParams, 'ruas' | 'colunas' | 'niveis' | 'posicoes'>): number`
  - `criarLocalizacao(input: LocalizacaoInput): Localizacao`
  - `gerarLocalizacoesEstruturadas(p: GeradorLocalizacoesParams): Localizacao[]`
  - `criarLocalizacoesSequenciais(p: GeradorSequencialParams): Localizacao[]`
  - `isLocalizacaoEstruturada(localizacao: Localizacao): boolean`

- [ ] **Step 1: Extend failing test for helper behavior**

Append to `wms-admin-business/tests/localizacoes.test.ts`:

```ts
import {
  contarLocalizacoes,
  criarLocalizacao,
  criarLocalizacoesSequenciais,
  gerarLocalizacoesEstruturadas,
  isLocalizacaoEstruturada,
  montarCodigoEstruturado,
  parseRuas,
} from '../src/lib/localizacoes.ts'

assert.deepEqual(parseRuas('A-C'), ['A', 'B', 'C'], 'deve expandir intervalo de ruas')
assert.equal(montarCodigoEstruturado('A', 1, 3, 2), 'A-01-03-02', 'deve montar codigo porta-palete canonico')
assert.equal(contarLocalizacoes({ ruas: ['A', 'B'], colunas: 2, niveis: 3, posicoes: 1 }), 12)

const recebimento = criarLocalizacao({
  id: 'loc-rec-01',
  armazemId: 'cd-sp',
  zonaId: 'zn-receb',
  codigo: 'REC-01',
  tipo: 'recebimento',
  estrutura: 'piso',
})

assert.equal(recebimento.transitorio, true, 'recebimento deve ser transitorio por padrao')
assert.equal(recebimento.permitePicking, false, 'recebimento nao deve permitir picking')

const picking = gerarLocalizacoesEstruturadas({
  armazemId: 'cd-sp',
  zonaId: 'zn-pick-a',
  ruas: ['P'],
  colunas: 1,
  niveis: 1,
  posicoes: 2,
  tipo: 'picking',
  estrutura: 'porta-palete',
  codigoPrefixo: 'PIC',
  capacidadePeso: 100,
  capacidadePaletes: 0,
})

assert.equal(picking[0].codigo, 'PIC-P-01-01-01', 'picking com prefixo deve manter codigo legivel')
assert.equal(picking[0].pickFace, true, 'picking deve marcar pickFace por padrao')
assert.equal(isLocalizacaoEstruturada(picking[0]), true, 'picking gerado deve ser estruturado')

const pulmao = criarLocalizacoesSequenciais({
  armazemId: 'cd-sp',
  zonaId: 'zn-pulm-a',
  prefixo: 'PUL-A',
  quantidade: 4,
  tipo: 'pulmao',
  estrutura: 'piso',
  capacidadePeso: 1200,
  capacidadePaletes: 4,
})

assert.deepEqual(
  pulmao.map((item) => item.codigo),
  ['PUL-A01', 'PUL-A02', 'PUL-A03', 'PUL-A04'],
  'pulmao deve gerar pracas sequenciais',
)
assert.equal(pulmao[0].permitePicking, false, 'pulmao nao deve permitir separacao direta')
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:domain --prefix wms-admin-business
```

Expected: FAIL with missing module `../src/lib/localizacoes.ts`.

- [ ] **Step 3: Create location helpers**

Create `wms-admin-business/src/lib/localizacoes.ts`:

```ts
import type {
  EstruturaLocalizacao,
  Localizacao,
  TipoLocalizacao,
} from './types'
import { uid } from './utils'

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function parseRuas(input: string): string[] {
  const txt = input.trim().toUpperCase()
  if (!txt) return []
  const range = txt.match(/^([A-Z])\s*-\s*([A-Z])$/)
  if (range) {
    const [a, b] = [range[1].charCodeAt(0), range[2].charCodeAt(0)]
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    return Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCharCode(lo + i))
  }
  return [...new Set(txt.split(/[\s,]+/).filter(Boolean))]
}

export function montarCodigoEstruturado(rua: string, col: number, nivel: number, pos: number) {
  return `${rua.toUpperCase()}-${pad2(col)}-${pad2(nivel)}-${pad2(pos)}`
}

export interface LocalizacaoInput {
  id?: string
  armazemId: string
  zonaId: string | null
  codigo: string
  nome?: string
  tipo: TipoLocalizacao
  estrutura: EstruturaLocalizacao
  rua?: string | null
  coluna?: number | null
  nivel?: number | null
  posicao?: number | null
  capacidadePeso?: number
  capacidadePaletes?: number
  transitorio?: boolean
  pickFace?: boolean
  permiteArmazenagem?: boolean
  permitePicking?: boolean
  permiteMovimentacao?: boolean
  bloqueado?: boolean
  ativo?: boolean
}

const transitorios = new Set<TipoLocalizacao>(['recebimento', 'expedicao', 'doca', 'staging', 'cross-docking'])
const bloqueados = new Set<TipoLocalizacao>(['avaria', 'bloqueio'])
const armazenamento = new Set<TipoLocalizacao>(['picking', 'pulmao', 'porta-palete', 'quarentena'])

export function criarLocalizacao(input: LocalizacaoInput): Localizacao {
  const tipo = input.tipo
  const isBloqueado = input.bloqueado ?? bloqueados.has(tipo)
  const pickFace = input.pickFace ?? tipo === 'picking'

  return {
    id: input.id ?? uid('loc'),
    armazemId: input.armazemId,
    zonaId: input.zonaId,
    codigo: input.codigo.toUpperCase(),
    nome: input.nome,
    tipo,
    estrutura: input.estrutura,
    rua: input.rua ?? null,
    coluna: input.coluna ?? null,
    nivel: input.nivel ?? null,
    posicao: input.posicao ?? null,
    capacidadePeso: input.capacidadePeso ?? 0,
    capacidadePaletes: input.capacidadePaletes ?? 0,
    transitorio: input.transitorio ?? transitorios.has(tipo),
    pickFace,
    permiteArmazenagem: input.permiteArmazenagem ?? (armazenamento.has(tipo) && !isBloqueado),
    permitePicking: input.permitePicking ?? (pickFace && !isBloqueado),
    permiteMovimentacao: input.permiteMovimentacao ?? !isBloqueado,
    bloqueado: isBloqueado,
    ativo: input.ativo ?? true,
  }
}

export interface GeradorLocalizacoesParams {
  armazemId: string
  zonaId: string | null
  ruas: string[]
  colunas: number
  niveis: number
  posicoes: number
  tipo: TipoLocalizacao
  estrutura: EstruturaLocalizacao
  codigoPrefixo?: string
  capacidadePeso: number
  capacidadePaletes: number
}

export function contarLocalizacoes(p: Pick<GeradorLocalizacoesParams, 'ruas' | 'colunas' | 'niveis' | 'posicoes'>) {
  return p.ruas.length * p.colunas * p.niveis * p.posicoes
}

export function gerarLocalizacoesEstruturadas(p: GeradorLocalizacoesParams): Localizacao[] {
  const out: Localizacao[] = []
  for (const rua of p.ruas) {
    for (let col = 1; col <= p.colunas; col++) {
      for (let nivel = 1; nivel <= p.niveis; nivel++) {
        for (let pos = 1; pos <= p.posicoes; pos++) {
          const base = montarCodigoEstruturado(rua, col, nivel, pos)
          out.push(criarLocalizacao({
            armazemId: p.armazemId,
            zonaId: p.zonaId,
            codigo: p.codigoPrefixo ? `${p.codigoPrefixo}-${base}` : base,
            tipo: p.tipo,
            estrutura: p.estrutura,
            rua: rua.toUpperCase(),
            coluna: col,
            nivel,
            posicao: pos,
            capacidadePeso: p.capacidadePeso,
            capacidadePaletes: p.capacidadePaletes,
          }))
        }
      }
    }
  }
  return out
}

export interface GeradorSequencialParams {
  armazemId: string
  zonaId: string | null
  prefixo: string
  quantidade: number
  tipo: TipoLocalizacao
  estrutura: EstruturaLocalizacao
  capacidadePeso: number
  capacidadePaletes: number
}

export function criarLocalizacoesSequenciais(p: GeradorSequencialParams): Localizacao[] {
  return Array.from({ length: p.quantidade }, (_, index) =>
    criarLocalizacao({
      armazemId: p.armazemId,
      zonaId: p.zonaId,
      codigo: `${p.prefixo}${pad2(index + 1)}`,
      tipo: p.tipo,
      estrutura: p.estrutura,
      capacidadePeso: p.capacidadePeso,
      capacidadePaletes: p.capacidadePaletes,
    }),
  )
}

export function isLocalizacaoEstruturada(localizacao: Localizacao) {
  return !!localizacao.rua && !!localizacao.coluna && !!localizacao.nivel && !!localizacao.posicao
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:domain --prefix wms-admin-business
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add wms-admin-business/src/lib/localizacoes.ts wms-admin-business/tests/localizacoes.test.ts
git commit -m "feat(admin): add localizacao generators"
```

---

### Task 3: Replace Seeds And Labels With Operational Locations

**Files:**
- Modify: `wms-admin-business/src/lib/mock.ts`
- Modify: `wms-admin-business/tests/localizacoes.test.ts`

**Interfaces:**
- Consumes:
  - `criarLocalizacao`
  - `criarLocalizacoesSequenciais`
  - `gerarLocalizacoesEstruturadas`
- Produces:
  - `LOCALIZACOES: Localizacao[]`
  - compatibility export `ENDERECOS = LOCALIZACOES`
  - `TIPO_LOCALIZACAO_LABEL`
  - `ESTRUTURA_LOCALIZACAO_LABEL`
  - updated `DOCAS` with `localizacaoId`

- [ ] **Step 1: Add failing seed coverage tests**

Append to `wms-admin-business/tests/localizacoes.test.ts`:

```ts
import { DOCAS, LOCALIZACOES, ZONAS } from '../src/lib/mock.ts'

const codigosZona = new Set(ZONAS.filter((zona) => zona.armazemId === 'cd-sp').map((zona) => zona.codigo))
for (const codigo of ['RECEB', 'EXPED', 'DOCAS', 'PICK-A', 'PULM-A', 'PP-A', 'AVARIA', 'BLOQ', 'QUA', 'XD']) {
  assert.equal(codigosZona.has(codigo), true, `seed deve conter zona ${codigo}`)
}

const porCodigo = new Map(LOCALIZACOES.map((item) => [item.codigo, item]))
for (const codigo of ['REC-01', 'EXP-01', 'DOCA-01', 'PIC-A-01-01', 'PUL-A01', 'A-01-03-02', 'AVA-01', 'BLO-01', 'QUA-01', 'STG-XD-03']) {
  assert.equal(porCodigo.has(codigo), true, `seed deve conter localizacao ${codigo}`)
}

assert.equal(porCodigo.get('REC-01')?.transitorio, true, 'recebimento deve ser transitorio')
assert.equal(porCodigo.get('PIC-A-01-01')?.pickFace, true, 'picking deve marcar pick face')
assert.equal(porCodigo.get('PUL-A01')?.permitePicking, false, 'pulmao nao deve permitir picking')
assert.equal(porCodigo.get('AVA-01')?.bloqueado, true, 'avaria deve nascer bloqueada')

for (const docaSeed of DOCAS.filter((docaSeed) => docaSeed.armazemId === 'cd-sp')) {
  assert.equal(
    LOCALIZACOES.some((localizacaoSeed) => localizacaoSeed.id === docaSeed.localizacaoId),
    true,
    `doca ${docaSeed.codigo} deve apontar para localizacao existente`,
  )
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:domain --prefix wms-admin-business
```

Expected: FAIL with missing export `LOCALIZACOES` or missing zones.

- [ ] **Step 3: Update imports in mock**

Modify top of `wms-admin-business/src/lib/mock.ts`.

Replace:

```ts
  Endereco,
```

with:

```ts
  Localizacao,
```

Replace:

```ts
import { gerarEnderecos } from './enderecos'
```

with:

```ts
import {
  criarLocalizacao,
  criarLocalizacoesSequenciais,
  gerarLocalizacoesEstruturadas,
} from './localizacoes'
```

- [ ] **Step 4: Replace zone seeds**

Replace `export const ZONAS: Zona[] = [...]` with:

```ts
export const ZONAS: Zona[] = [
  { id: 'zn-receb', armazemId: 'cd-sp', codigo: 'RECEB', nome: 'Recebimento', tipo: 'recebimento', temperatura: 'ambiente', cor: '#2563eb', ativo: true },
  { id: 'zn-exped', armazemId: 'cd-sp', codigo: 'EXPED', nome: 'Expedicao', tipo: 'expedicao', temperatura: 'ambiente', cor: '#d97706', ativo: true },
  { id: 'zn-docas', armazemId: 'cd-sp', codigo: 'DOCAS', nome: 'Docas', tipo: 'doca', temperatura: 'ambiente', cor: '#64748b', ativo: true },
  { id: 'zn-pick-a', armazemId: 'cd-sp', codigo: 'PICK-A', nome: 'Picking Seco A', tipo: 'picking', temperatura: 'ambiente', cor: '#00a88e', ativo: true },
  { id: 'zn-pulm-a', armazemId: 'cd-sp', codigo: 'PULM-A', nome: 'Pulmao A', tipo: 'pulmao', temperatura: 'ambiente', cor: '#7c3aed', ativo: true },
  { id: 'zn-pp-a', armazemId: 'cd-sp', codigo: 'PP-A', nome: 'Porta-palete A', tipo: 'porta-palete', temperatura: 'ambiente', cor: '#0891b2', ativo: true },
  { id: 'zn-avaria', armazemId: 'cd-sp', codigo: 'AVARIA', nome: 'Avaria', tipo: 'avaria', temperatura: 'ambiente', cor: '#dc2626', ativo: true },
  { id: 'zn-bloq', armazemId: 'cd-sp', codigo: 'BLOQ', nome: 'Bloqueio', tipo: 'bloqueio', temperatura: 'ambiente', cor: '#991b1b', ativo: true },
  { id: 'zn-qua', armazemId: 'cd-sp', codigo: 'QUA', nome: 'Quarentena', tipo: 'quarentena', temperatura: 'ambiente', cor: '#64748b', ativo: true },
  { id: 'zn-xd', armazemId: 'cd-sp', codigo: 'XD', nome: 'Cross-docking', tipo: 'cross-docking', temperatura: 'ambiente', cor: '#f59e0b', ativo: true },
  { id: 'zn-pick-rj', armazemId: 'cd-rj', codigo: 'PICK-RJ', nome: 'Picking Geral', tipo: 'picking', temperatura: 'ambiente', cor: '#00a88e', ativo: true },
]
```

- [ ] **Step 5: Replace location and dock seeds**

Replace `DOCAS` and `ENDERECOS` sections with:

```ts
export const LOCALIZACOES: Localizacao[] = [
  ...criarLocalizacoesSequenciais({
    armazemId: 'cd-sp',
    zonaId: 'zn-receb',
    prefixo: 'REC-',
    quantidade: 3,
    tipo: 'recebimento',
    estrutura: 'piso',
    capacidadePeso: 1500,
    capacidadePaletes: 2,
  }),
  ...criarLocalizacoesSequenciais({
    armazemId: 'cd-sp',
    zonaId: 'zn-exped',
    prefixo: 'EXP-',
    quantidade: 2,
    tipo: 'expedicao',
    estrutura: 'piso',
    capacidadePeso: 1500,
    capacidadePaletes: 2,
  }),
  criarLocalizacao({ id: 'loc-doca-01', armazemId: 'cd-sp', zonaId: 'zn-docas', codigo: 'DOCA-01', nome: 'Doca 01', tipo: 'doca', estrutura: 'doca' }),
  criarLocalizacao({ id: 'loc-doca-02', armazemId: 'cd-sp', zonaId: 'zn-docas', codigo: 'DOCA-02', nome: 'Doca 02', tipo: 'doca', estrutura: 'doca' }),
  ...gerarLocalizacoesEstruturadas({
    armazemId: 'cd-sp',
    zonaId: 'zn-pick-a',
    ruas: ['A'],
    colunas: 1,
    niveis: 1,
    posicoes: 4,
    tipo: 'picking',
    estrutura: 'porta-palete',
    codigoPrefixo: 'PIC',
    capacidadePeso: 100,
    capacidadePaletes: 0,
  }),
  ...criarLocalizacoesSequenciais({
    armazemId: 'cd-sp',
    zonaId: 'zn-pulm-a',
    prefixo: 'PUL-A',
    quantidade: 4,
    tipo: 'pulmao',
    estrutura: 'piso',
    capacidadePeso: 2000,
    capacidadePaletes: 4,
  }),
  ...criarLocalizacoesSequenciais({
    armazemId: 'cd-sp',
    zonaId: 'zn-pulm-a',
    prefixo: 'PUL-B',
    quantidade: 4,
    tipo: 'pulmao',
    estrutura: 'piso',
    capacidadePeso: 2000,
    capacidadePaletes: 4,
  }),
  ...gerarLocalizacoesEstruturadas({
    armazemId: 'cd-sp',
    zonaId: 'zn-pp-a',
    ruas: ['A'],
    colunas: 2,
    niveis: 3,
    posicoes: 2,
    tipo: 'porta-palete',
    estrutura: 'porta-palete',
    capacidadePeso: 800,
    capacidadePaletes: 1,
  }),
  criarLocalizacao({ id: 'loc-ava-01', armazemId: 'cd-sp', zonaId: 'zn-avaria', codigo: 'AVA-01', tipo: 'avaria', estrutura: 'piso' }),
  criarLocalizacao({ id: 'loc-blo-01', armazemId: 'cd-sp', zonaId: 'zn-bloq', codigo: 'BLO-01', tipo: 'bloqueio', estrutura: 'piso' }),
  criarLocalizacao({ id: 'loc-qua-01', armazemId: 'cd-sp', zonaId: 'zn-qua', codigo: 'QUA-01', tipo: 'quarentena', estrutura: 'piso', capacidadePeso: 1000, capacidadePaletes: 2 }),
  criarLocalizacao({ id: 'loc-stg-xd-03', armazemId: 'cd-sp', zonaId: 'zn-xd', codigo: 'STG-XD-03', tipo: 'cross-docking', estrutura: 'piso', capacidadePeso: 1500, capacidadePaletes: 2 }),
  criarLocalizacao({ id: 'loc-padrao-pe', armazemId: 'lj-pe', zonaId: null, codigo: 'PADRAO', tipo: 'picking', estrutura: 'virtual', capacidadePeso: 0, capacidadePaletes: 0 }),
]

export const ENDERECOS = LOCALIZACOES

export const DOCAS: Doca[] = [
  { id: 'dk-1', armazemId: 'cd-sp', localizacaoId: 'loc-doca-01', codigo: 'DOCA-01', nome: 'Doca 01 - Recebimento', tipo: 'recebimento', niveladora: true, ativo: true },
  { id: 'dk-2', armazemId: 'cd-sp', localizacaoId: 'loc-doca-02', codigo: 'DOCA-02', nome: 'Doca 02 - Expedicao', tipo: 'expedicao', niveladora: true, ativo: true },
  { id: 'dk-5', armazemId: 'cd-rj', localizacaoId: 'loc-doca-rj-01', codigo: 'DOCA-01', nome: 'Doca 01', tipo: 'ambas', niveladora: true, ativo: true },
]
```

- [ ] **Step 6: Update labels**

Replace `TIPO_ZONA_LABEL` with:

```ts
export const TIPO_ZONA_LABEL: Record<string, string> = {
  recebimento: 'Recebimento',
  expedicao: 'Expedicao',
  doca: 'Doca',
  picking: 'Picking',
  pulmao: 'Pulmao / Reserva',
  'porta-palete': 'Porta-palete',
  avaria: 'Avaria',
  bloqueio: 'Bloqueio',
  quarentena: 'Quarentena',
  'cross-docking': 'Cross-docking',
}
```

Replace `TIPO_ENDERECO_LABEL` with:

```ts
export const TIPO_LOCALIZACAO_LABEL: Record<string, string> = {
  recebimento: 'Recebimento',
  expedicao: 'Expedicao',
  doca: 'Doca',
  staging: 'Staging',
  picking: 'Picking',
  pulmao: 'Pulmao',
  'porta-palete': 'Porta-palete',
  avaria: 'Avaria',
  bloqueio: 'Bloqueio',
  quarentena: 'Quarentena',
  'cross-docking': 'Cross-docking',
}

export const ESTRUTURA_LOCALIZACAO_LABEL: Record<string, string> = {
  piso: 'Piso',
  'porta-palete': 'Porta-palete',
  doca: 'Doca',
  bancada: 'Bancada',
  virtual: 'Virtual',
}

export const TIPO_ENDERECO_LABEL = TIPO_LOCALIZACAO_LABEL
```

- [ ] **Step 7: Run domain tests**

Run:

```bash
npm run test:domain --prefix wms-admin-business
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add wms-admin-business/src/lib/mock.ts wms-admin-business/tests/localizacoes.test.ts
git commit -m "feat(admin): seed operational locations"
```

---

### Task 4: Migrate Store And Read-Only Consumers To `localizacoes`

**Files:**
- Modify: `wms-admin-business/src/store/useStore.ts`
- Modify: `wms-admin-business/src/pages/Dashboard.tsx`
- Modify: `wms-admin-business/src/components/MapaPreview.tsx`
- Modify: `wms-admin-business/src/components/nav.ts`

**Interfaces:**
- Consumes:
  - `LOCALIZACOES`
  - `Localizacao`
- Produces:
  - Zustand state property `localizacoes: Localizacao[]`

- [ ] **Step 1: Run build to capture current failures**

Run:

```bash
npm run build --prefix wms-admin-business
```

Expected: FAIL with references to removed `enderecos` collection or old `Doca` shape.

- [ ] **Step 2: Update store imports and state**

Modify `wms-admin-business/src/store/useStore.ts`.

Replace import `ENDERECOS` with:

```ts
  LOCALIZACOES,
```

Replace type import `Endereco` with:

```ts
  Localizacao,
```

Replace state field:

```ts
  enderecos: Endereco[]
```

with:

```ts
  localizacoes: Localizacao[]
```

Replace initialization:

```ts
  enderecos: structuredClone(ENDERECOS),
```

with:

```ts
  localizacoes: structuredClone(LOCALIZACOES),
```

- [ ] **Step 3: Update Dashboard counts**

In `wms-admin-business/src/pages/Dashboard.tsx`, replace the enderecos card expression with:

```ts
{ to: '/enderecos', label: 'Localizacoes', icon: MapPin, total: s.localizacoes.filter((e) => e.armazemId === s.armazemId).length, sub: `${num(s.localizacoes.filter((e) => e.armazemId === s.armazemId && e.ativo && !e.bloqueado).length)} ativas`, group: 'Estrutura fisica' },
```

- [ ] **Step 4: Update nav label**

In `wms-admin-business/src/components/nav.ts`, replace:

```ts
{ to: '/enderecos', label: 'Endereços', icon: MapPin, group: 'Estrutura física' },
```

with:

```ts
{ to: '/enderecos', label: 'Localizacoes', icon: MapPin, group: 'Estrutura fisica' },
```

- [ ] **Step 5: Update MapaPreview type and structured check**

Modify `wms-admin-business/src/components/MapaPreview.tsx`.

Replace imports:

```ts
import type { Endereco, TipoEndereco } from '../lib/types'
```

with:

```ts
import type { Localizacao, TipoLocalizacao } from '../lib/types'
import { isLocalizacaoEstruturada } from '../lib/localizacoes'
```

Replace prop type:

```ts
export function MapaPreview({ enderecos }: { enderecos: Endereco[] }) {
```

with:

```ts
export function MapaPreview({ localizacoes }: { localizacoes: Localizacao[] }) {
```

Replace structured filter:

```ts
const estruturados = useMemo(() => enderecos.filter((e) => e.rua !== 'PADRAO'), [enderecos])
```

with:

```ts
const estruturados = useMemo(() => localizacoes.filter(isLocalizacaoEstruturada), [localizacoes])
```

Replace remaining `enderecos` variable references in the component with `localizacoes`.

Replace `Record<TipoEndereco, string>` with `Partial<Record<TipoLocalizacao, string>>`.

Use fallback color:

```ts
className={cn('h-3 w-6 rounded-sm transition-transform hover:scale-110', blocked ? 'bg-bad' : (tipoCor[tipo] ?? 'bg-slate-300'))}
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm run test:domain --prefix wms-admin-business
npm run build --prefix wms-admin-business
```

Expected: domain tests PASS. Build may still FAIL because `Enderecos.tsx` and `Docas.tsx` are not migrated yet.

- [ ] **Step 7: Commit**

```bash
git add wms-admin-business/src/store/useStore.ts wms-admin-business/src/pages/Dashboard.tsx wms-admin-business/src/components/MapaPreview.tsx wms-admin-business/src/components/nav.ts
git commit -m "feat(admin): expose localizacoes in store"
```

---

### Task 5: Evolve Enderecos Page Into Localizacoes Page

**Files:**
- Modify: `wms-admin-business/src/pages/Enderecos.tsx`

**Interfaces:**
- Consumes:
  - `localizacoes` Zustand collection
  - `criarLocalizacao`
  - `criarLocalizacoesSequenciais`
  - `gerarLocalizacoesEstruturadas`
  - `parseRuas`
  - `contarLocalizacoes`
  - `TIPO_LOCALIZACAO_LABEL`
  - `ESTRUTURA_LOCALIZACAO_LABEL`
- Produces:
  - `/enderecos` route rendering Localizacoes operational UI

- [ ] **Step 1: Update imports**

In `wms-admin-business/src/pages/Enderecos.tsx`, replace imports from `enderecos` with:

```ts
import {
  contarLocalizacoes,
  criarLocalizacao,
  criarLocalizacoesSequenciais,
  gerarLocalizacoesEstruturadas,
  parseRuas,
  type GeradorLocalizacoesParams,
} from '../lib/localizacoes'
```

Replace labels import with:

```ts
import { armazemName, ESTRUTURA_LOCALIZACAO_LABEL, TIPO_LOCALIZACAO_LABEL } from '../lib/mock'
```

Replace type import with:

```ts
import type { EstruturaLocalizacao, TipoLocalizacao } from '../lib/types'
```

- [ ] **Step 2: Rename local state and store usage**

Replace:

```ts
const { enderecos, zonas, armazens, armazemId, upsert, remove, bulkAdd, toast } = useStore()
```

with:

```ts
const { localizacoes, zonas, armazens, armazemId, upsert, remove, bulkAdd, toast } = useStore()
```

Replace all `doArmazem` calculations to use `localizacoes`.

Use:

```ts
const [filtroTipo, setFiltroTipo] = useState<TipoLocalizacao | 'todos'>('todos')
const [filtroEstrutura, setFiltroEstrutura] = useState<EstruturaLocalizacao | 'todos'>('todos')
```

- [ ] **Step 3: Update header and metrics**

Set header:

```tsx
<PageHeader title="Localizacoes" subtitle={`Pontos operacionais de ${armazemName(armazemId)}: staging, docas, picking, pulmao, porta-palete e bloqueios`}>
```

Use badges:

```tsx
<Badge tone="neutral">{num(doArmazem.length)} localizacoes</Badge>
{bloqueados > 0 && <Badge tone="bad">{num(bloqueados)} bloqueadas</Badge>}
<Badge tone="info">{num(doArmazem.filter((e) => e.transitorio).length)} transitorias</Badge>
```

- [ ] **Step 4: Replace PADRAO creator**

Replace `criarPadrao` body with:

```ts
const criarPadrao = () => {
  if (doArmazem.some((e) => e.codigo === 'PADRAO')) {
    toast({ tipo: 'aviso', titulo: 'Ja existe', texto: 'Este armazem ja tem a localizacao PADRAO.' })
    return
  }
  bulkAdd('localizacoes', [
    criarLocalizacao({
      armazemId,
      zonaId: null,
      codigo: 'PADRAO',
      tipo: 'picking',
      estrutura: 'virtual',
    }),
  ])
  toast({ tipo: 'sucesso', titulo: 'Localizacao PADRAO criada', texto: 'Modo simples - localizacao unica.' })
}
```

- [ ] **Step 5: Update table columns**

Use columns:

```tsx
<th className="th">Localizacao</th>
<th className="th">Rua/Col/Nivel/Pos</th>
<th className="th">Zona</th>
<th className="th">Tipo</th>
<th className="th">Estrutura</th>
<th className="th">Flags</th>
<th className="th text-right">Cap. (kg / pal)</th>
<th className="th">Status</th>
<th className="th text-right">Acoes</th>
```

For flags cell:

```tsx
<td className="td">
  <div className="flex flex-wrap gap-1">
    {e.transitorio && <Badge tone="info">transitorio</Badge>}
    {e.pickFace && <Badge tone="primary">pick face</Badge>}
    {e.permitePicking && <Badge tone="ok">picking</Badge>}
    {e.permiteArmazenagem && <Badge tone="neutral">armazenagem</Badge>}
  </div>
</td>
```

- [ ] **Step 6: Update MapaPreview usage**

Replace:

```tsx
{aba === 'planta' && <MapaPreview enderecos={doArmazem} />}
```

with:

```tsx
{aba === 'planta' && <MapaPreview localizacoes={doArmazem} />}
```

- [ ] **Step 7: Implement generator model selector**

In `GeradorModal`, add:

```ts
type ModeloGeracao = 'porta-palete' | 'picking' | 'pulmao' | 'recebimento' | 'expedicao' | 'doca' | 'avaria' | 'bloqueio' | 'quarentena' | 'cross-docking'
```

Use state:

```ts
const [modelo, setModelo] = useState<ModeloGeracao>('porta-palete')
const [prefixo, setPrefixo] = useState('A')
const [quantidade, setQuantidade] = useState(3)
const [estrutura, setEstrutura] = useState<EstruturaLocalizacao>('porta-palete')
```

For submit, compute:

```ts
const tipo = modelo === 'porta-palete' ? 'porta-palete' : modelo
const estruturado = modelo === 'porta-palete' || modelo === 'picking'
const novas = estruturado
  ? gerarLocalizacoesEstruturadas({
      armazemId,
      zonaId: zonaId || null,
      ruas,
      colunas,
      niveis,
      posicoes,
      tipo,
      estrutura,
      codigoPrefixo: modelo === 'picking' ? 'PIC' : undefined,
      capacidadePeso: capPeso,
      capacidadePaletes: capPal,
    } satisfies GeradorLocalizacoesParams)
  : criarLocalizacoesSequenciais({
      armazemId,
      zonaId: zonaId || null,
      prefixo,
      quantidade,
      tipo,
      estrutura,
      capacidadePeso: capPeso,
      capacidadePaletes: capPal,
    })
```

Pass `novas` to parent through `onGerar`.

- [ ] **Step 8: Run build**

Run:

```bash
npm run build --prefix wms-admin-business
```

Expected: Build may still FAIL only if `Docas.tsx` still references missing `localizacaoId`. That failure is addressed in Task 6.

- [ ] **Step 9: Commit**

```bash
git add wms-admin-business/src/pages/Enderecos.tsx
git commit -m "feat(admin): manage operational locations"
```

---

### Task 6: Link Docas To Localizacoes

**Files:**
- Modify: `wms-admin-business/src/pages/Docas.tsx`
- Modify: `wms-admin-business/tests/localizacoes.test.ts`

**Interfaces:**
- Consumes:
  - `localizacoes` collection
  - `Doca.localizacaoId`
  - `criarLocalizacao`
- Produces:
  - New doca creation creates or selects linked `Localizacao`.

- [ ] **Step 1: Add test for dock location creation helper if extracted**

If extracting a pure helper, add to `tests/localizacoes.test.ts`:

```ts
const docaLocation = criarLocalizacao({
  id: 'loc-doca-test-03',
  armazemId: 'cd-sp',
  zonaId: 'zn-docas',
  codigo: 'DOCA-03',
  tipo: 'doca',
  estrutura: 'doca',
})

assert.equal(docaLocation.transitorio, true, 'localizacao de doca deve ser transitoria')
assert.equal(docaLocation.permitePicking, false, 'doca nao deve permitir picking')
```

- [ ] **Step 2: Update new Doca factory**

In `wms-admin-business/src/pages/Docas.tsx`, replace `novaDoca` with:

```ts
const novaDoca = (armazemId: string, localizacaoId = ''): Doca => ({
  id: uid('dk'),
  armazemId,
  localizacaoId,
  codigo: '',
  nome: '',
  tipo: 'recebimento',
  niveladora: true,
  ativo: true,
})
```

- [ ] **Step 3: Read localizacoes from store**

Replace:

```ts
const { docas, armazemId, upsert, remove, toast } = useStore()
```

with:

```ts
const { docas, localizacoes, zonas, armazemId, upsert, remove, bulkAdd, toast } = useStore()
```

Add:

```ts
const localizacoesDoca = useMemo(
  () => localizacoes.filter((item) => item.armazemId === armazemId && item.tipo === 'doca' && item.ativo),
  [armazemId, localizacoes],
)
const zonaDocas = zonas.find((zona) => zona.armazemId === armazemId && zona.tipo === 'doca') ?? null
```

- [ ] **Step 4: Update save behavior**

Replace `salvar` with:

```ts
const salvar = (d: Doca) => {
  if (!d.codigo.trim() || !d.nome.trim()) {
    toast({ tipo: 'erro', titulo: 'Campos obrigatorios', texto: 'Codigo e nome sao obrigatorios.' })
    return
  }

  let localizacaoId = d.localizacaoId
  if (!localizacaoId) {
    const existente = localizacoes.find((item) => item.armazemId === armazemId && item.codigo === d.codigo)
    if (existente) {
      localizacaoId = existente.id
    } else {
      const novaLocalizacao = criarLocalizacao({
        armazemId,
        zonaId: zonaDocas?.id ?? null,
        codigo: d.codigo,
        nome: d.nome,
        tipo: 'doca',
        estrutura: 'doca',
      })
      bulkAdd('localizacoes', [novaLocalizacao])
      localizacaoId = novaLocalizacao.id
    }
  }

  upsert('docas', { ...d, codigo: d.codigo.toUpperCase(), localizacaoId })
  toast({ tipo: 'sucesso', titulo: novo ? 'Doca criada' : 'Doca atualizada', texto: d.nome })
  setEdit(null)
  setNovo(false)
}
```

Add import:

```ts
import { criarLocalizacao } from '../lib/localizacoes'
```

- [ ] **Step 5: Add location field to modal**

Inside modal form after Tipo field:

```tsx
<SelectField
  label="Localizacao vinculada"
  value={edit.localizacaoId}
  onChange={(v) => setEdit({ ...edit, localizacaoId: v })}
  options={[
    { value: '', label: 'Criar automaticamente pelo codigo da doca' },
    ...localizacoesDoca.map((item) => ({ value: item.id, label: `${item.codigo} - ${item.nome ?? item.tipo}` })),
  ]},
/>
```

- [ ] **Step 6: Show linked location on card**

Inside doca card, add:

```tsx
<p className="mt-1 text-[11px] text-ink-muted mono">
  Localizacao: {localizacoes.find((item) => item.id === d.localizacaoId)?.codigo ?? 'sem vinculo'}
</p>
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm run test:domain --prefix wms-admin-business
npm run build --prefix wms-admin-business
```

Expected: PASS for both.

- [ ] **Step 8: Commit**

```bash
git add wms-admin-business/src/pages/Docas.tsx wms-admin-business/tests/localizacoes.test.ts
git commit -m "feat(admin): link docas to locations"
```

---

### Task 7: Final Compatibility Cleanup And Verification

**Files:**
- Modify if needed: `wms-admin-business/src/pages/Zonas.tsx`
- Modify if needed: `wms-admin-business/README.md`
- Modify if needed: `wms-admin-business/PLANO.md`

**Interfaces:**
- Consumes all prior tasks.
- Produces documented front-only domain model ready for future backend.

- [ ] **Step 1: Search for stale copy and old collection references**

Run:

```bash
rg -n "enderecos|Enderecos|Endereco|ENDERECOS|GeradorParams|gerarEnderecos|enderecoPadrao" wms-admin-business/src wms-admin-business/tests
```

Expected: remaining matches are compatibility aliases in `types.ts` or intentional route path `/enderecos`. No component should read `s.enderecos`.

- [ ] **Step 2: Fix stale user-facing copy**

For user-facing text in `wms-admin-business/src/pages/Zonas.tsx`, `wms-admin-business/src/pages/Enderecos.tsx`, `wms-admin-business/src/pages/Dashboard.tsx`, use ASCII terms:

```txt
Localizacoes
Estrutura fisica
Pulmao
Expedicao
Codigo
Endereco estruturado
```

Keep route path `/enderecos` in `App.tsx` for compatibility in this pass.

- [ ] **Step 3: Update README implemented scope**

In `wms-admin-business/README.md`, replace the Fase 2 paragraph with:

```md
**Fase 2 - Estrutura fisica.** Zonas, Docas e Localizacoes operacionais. O modelo representa staging de recebimento/expedicao, docas, picking, pulmao, porta-palete, avaria, bloqueio, quarentena e cross-docking por meio de tipos, estrutura e flags operacionais. A rota historica `/enderecos` continua existindo, mas a tela passa a operar como cadastro de Localizacoes.
```

- [ ] **Step 4: Update PLANO integration note**

In `wms-admin-business/PLANO.md`, add under "Decisoes do dia 1":

```md
- **Localizacao operacional como fonte da verdade** - recebimento, staging, doca, picking, pulmao, porta-palete, avaria, bloqueio, quarentena e cross-docking sao localizacoes com atributos, nao strings soltas.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run test:domain --prefix wms-admin-business
npm run build --prefix wms-admin-business
git diff --check
```

Expected:

```txt
PASS tests/localizacoes.test.ts
vite build completes successfully
git diff --check exits 0
```

- [ ] **Step 6: Commit**

```bash
git add wms-admin-business/src wms-admin-business/tests wms-admin-business/README.md wms-admin-business/PLANO.md wms-admin-business/package.json
git commit -m "chore(admin): finalize localizacao model migration"
```

---

## Self-Review Notes

- Spec coverage:
  - `Localizacao` model: Tasks 1 and 2.
  - Expanded zones and location seeds: Task 3.
  - Docas linked to physical locations: Task 6.
  - Localizacoes UI and generator models: Task 5.
  - Front-only, no backend: all tasks constrain changes to `wms-admin-business`.
  - Compatibility with `wms-frontend`: Task 5 keeps route/codigo compatibility; no frontend integration.
  - Verification: Tasks 1-7 include domain tests and build.
- No known placeholders remain in task steps.
- Type names are consistent: `Localizacao`, `TipoLocalizacao`, `EstruturaLocalizacao`, `localizacoes`, `LOCALIZACOES`.
