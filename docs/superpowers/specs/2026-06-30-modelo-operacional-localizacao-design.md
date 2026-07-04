# Modelo Operacional de Localizacao - Design

## Contexto

O `wms-admin-business` hoje ja possui a base administrativa do armazem:
`Armazem`, `Zona`, `Doca` e `Endereco`. Essa base permite cadastrar CDs,
zonas, docas e gerar enderecos no padrao `RUA-COLUNA-NIVEL-POSICAO`.

O problema e que o modelo atual ainda trata parte importante da operacao como
texto ou convencao de tela. Para putaway, cross-docking, picking, avaria,
quarentena e staging funcionarem com backend no futuro, o admin precisa virar a
fonte da verdade das localizacoes operacionais.

Esta evolucao continua front-only por enquanto. Nao cria backend, API ou banco.
O objetivo e organizar o dominio para que a futura persistencia seja uma
materializacao direta do contrato criado agora.

## Decisao

Evoluir o admin de "cadastro de enderecos" para "modelo operacional de
localizacoes".

Tudo que representa um ponto fisico ou logico onde mercadoria pode estar, passar
ou ser conferida vira uma `Localizacao`:

- `REC-01`: praca de recebimento/staging de entrada.
- `EXP-01`: staging de expedicao.
- `DOCA-01`: porta de caminhao.
- `PIC-A-01-01`: face de picking.
- `PUL-A01`: pulmao/piso.
- `A-01-03-02`: porta-palete estruturado.
- `AVA-01`: area de avaria.
- `BLO-01`: area de bloqueio.
- `QUA-01`: quarentena.
- `STG-XD-03`: staging de cross-docking.

O codigo continua visivel para o usuario, mas o sistema passa a depender de
`id`, `armazemId`, `zonaId`, `tipo`, `estrutura` e atributos operacionais.

## Modelo De Dados

### Armazem

Permanece como raiz multi-CD:

```ts
interface Armazem {
  id: string
  codigo: string
  nome: string
  tipo: 'cd' | 'loja' | 'fabrica' | 'transito'
  cidade: string
  uf: string
  modo: 'simples' | 'completo'
  ativo: boolean
}
```

Todas as entidades operacionais mantem `armazemId` desde o inicio.

### Zona

`Zona` continua sendo o agrupamento fisico/logico, mas seus tipos passam a
cobrir o desenho real do armazem:

```ts
type TipoZona =
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

Zona nao deve carregar todas as regras finas. Ela classifica a area. As regras
executaveis ficam na `Localizacao`.

### Localizacao

`Endereco` deve evoluir conceitualmente para `Localizacao`.

Para reduzir risco, a implementacao pode preservar nomes internos temporarios
quando necessario, mas a direcao de dominio e esta:

```ts
type TipoLocalizacao =
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

type EstruturaLocalizacao =
  | 'piso'
  | 'porta-palete'
  | 'doca'
  | 'bancada'
  | 'virtual'

interface Localizacao {
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
```

### Doca

`Doca` permanece como entidade propria porque tem comportamento operacional de
agenda, veiculo, entrada e saida. Porem ela deve apontar para uma localizacao:

```ts
interface Doca {
  id: string
  armazemId: string
  localizacaoId: string
  codigo: string
  nome: string
  tipo: 'recebimento' | 'expedicao' | 'ambas'
  niveladora: boolean
  ativo: boolean
}
```

O vinculo `localizacaoId` evita que a doca exista fora da planta operacional.

## Regras Operacionais

Os atributos da `Localizacao` devem expressar as regras que hoje estao apenas
nas descricoes:

| Localizacao | Atributos principais |
| --- | --- |
| Recebimento (`REC-01`) | `transitorio=true`, `permiteArmazenagem=false`, `permitePicking=false` |
| Expedicao (`EXP-01`) | `transitorio=true`, `permiteArmazenagem=false`, `permitePicking=false` |
| Doca (`DOCA-01`) | `estrutura=doca`, `transitorio=true`, vinculada a `Doca` |
| Picking (`PIC-A-01-01`) | `pickFace=true`, `permitePicking=true`, `permiteArmazenagem=true` |
| Pulmao (`PUL-A01`) | `capacidadePaletes` alta, `permitePicking=false`, `permiteArmazenagem=true` |
| Porta-palete (`A-01-03-02`) | estrutura rigida com rua, coluna, nivel e posicao |
| Avaria (`AVA-01`) | `bloqueado=true`, `permitePicking=false` |
| Bloqueio (`BLO-01`) | `bloqueado=true`, `permitePicking=false` |
| Quarentena (`QUA-01`) | `permitePicking=false`, liberacao depende de permissao |
| Cross-docking (`STG-XD-03`) | `transitorio=true`, destino direto para expedicao |

Essas flags sao o contrato que o operacional usara depois para sugerir destino,
bloquear separacao, validar putaway e criar tarefas.

## Seeds

O seed do admin deve deixar de nascer quase todo como picking. O CD de demo deve
representar um armazem minimamente real:

- Zonas:
  - `RECEB` - Recebimento
  - `EXPED` - Expedicao
  - `DOCAS` - Docas
  - `PICK-A` - Picking
  - `PULM-A` - Pulmao
  - `PP-A` - Porta-palete
  - `AVARIA` - Avaria
  - `BLOQ` - Bloqueio
  - `QUA` - Quarentena
  - `XD` - Cross-docking
- Localizacoes:
  - `REC-01`, `REC-02`, `REC-03`
  - `EXP-01`, `EXP-02`
  - `DOCA-01`, `DOCA-02`
  - `PIC-A-01-01` em diante
  - `PUL-A01` ate `PUL-B04`
  - `A-01-03-02` e demais porta-paletes estruturados
  - `AVA-01`
  - `BLO-01`
  - `QUA-01`
  - `STG-XD-03`

## Telas

### Zonas

A tela de Zonas deve permitir os novos tipos. Ela continua simples:
codigo, nome, tipo, temperatura, cor e status.

### Localizacoes

A tela atual de Enderecos deve evoluir para Localizacoes. Pode manter a rota por
compatibilidade no primeiro passo, mas o texto e o modelo da tela devem tratar
localizacoes operacionais.

Funcionalidades esperadas:

- Lista filtravel por tipo, zona, estrutura, status e bloqueio.
- Preview 2D por rua quando houver estrutura de porta-palete ou picking.
- Indicadores de transitorio, pick face, permite picking e bloqueado.
- Bloquear/desbloquear localizacao.
- Geradores por modelo:
  - staging de recebimento;
  - staging de expedicao;
  - docas;
  - picking;
  - pulmao/piso;
  - porta-paletes;
  - avaria/bloqueio/quarentena;
  - cross-docking.

### Docas

A tela de Docas deve exigir ou criar uma localizacao vinculada. O usuario pode
ver a doca como porta de caminhao, mas o sistema guarda o vinculo fisico via
`localizacaoId`.

## Compatibilidade Com O wms-frontend

O `wms-frontend` ainda usa strings em `origem`, `destino`, `doca` e `endereco`.
Esta spec nao muda o operacional agora.

O contrato futuro e:

- Tarefas devem apontar para `origemLocalizacaoId` e `destinoLocalizacaoId`.
- Estoque deve apontar para `localizacaoId`.
- Recebimento deve apontar para `docaId` e/ou localizacao de staging.
- Cross-docking deve apontar para staging de entrada, staging/cross e doca de
  saida.

Durante a transicao, o codigo da localizacao continua sendo exibido e pode
alimentar telas antigas.

## Fora De Escopo

- Criar backend, API, banco ou migrations.
- Integrar o `wms-frontend` nesta etapa.
- Implementar agenda de docas.
- Implementar motor completo de slotting.
- Implementar auditoria append-only.

## Testes E Verificacao

Como a primeira entrega sera front-only, a verificacao deve cobrir:

- Tipos aceitam os novos tipos de zona/localizacao.
- Geradores produzem codigos esperados.
- Seeds contem as zonas e localizacoes minimas.
- Tela lista e filtra localizacoes por tipo/estrutura/status.
- Preview 2D continua funcionando para enderecos estruturados.
- Build TypeScript do `wms-admin-business` passa.

## Criterio De Sucesso

O admin deve conseguir representar o desenho operacional do armazem sem depender
de texto solto:

- Pracas de recebimento e expedicao existem como localizacoes transitorias.
- Docas existem como localizacoes e como entidade operacional vinculada.
- Picking, pulmao, porta-palete, avaria, bloqueio, quarentena e cross-docking
  existem com atributos distintos.
- O modelo resultante pode virar tabelas de backend sem redesenho conceitual.
