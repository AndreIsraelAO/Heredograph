# HeredoStudio: Construtor Profissional de Heredogramas e Genealogia

Uma plataforma web de grau clínico e científico para construção, edição interativa, cálculo de layout geracional automático e exportação de heredogramas médicos e árvores genealógicas em SVG, PNG, PDF e GEDCOM 5.5.1.

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisões alinhadas e confirmadas com o usuário antes do desenvolvimento:

- **Modo Padrão Inicial**: Modo genético e clínico ativado por padrão, com simbologia médica oficial (quadrado masculino, círculo feminino, losango outro/indeterminado, preenchido para afetados, ponto central para portadores, seta diagnóstica para probando, numeração romana para gerações e arábica para indivíduos).
- **Dados Iniciais de Demonstração**: Carregamento automático de uma família clínica com herança genética através de 3 gerações (avós, pais, tios, probando afetado, indivíduos portadores e relações de consanguinidade/gêmeos).
- **Controle de Histórico (Undo/Redo)**: Barra de ações com botões visuais dedicados táteis de Desfazer e Refazer com contadores de estados, preservando o canvas de interferências acidentais.

---

### 1. Overview & Core Concept

- **O que faz**: Permite criar, modelar e analisar árvores familiares e heredogramas clínicos completos. Inclui cálculo algorítmico de layout por gerações (DAG), arrasto livre com restauração de layout, destaque dinâmico de linhagens (ancestrais e descendentes), validação em tempo real de integridade biológica (prevenção de ciclos, filhos antes dos pais, uniões inválidas), e múltiplos formatos de exportação.
- **Público-alvo**: Geneticistas clínicos, pesquisadores em biologia/medicina, genealogistas, estudantes e famílias.
- **Valor Principal**: Rigor científico nos símbolos e regras, combinado com usabilidade fluida, navegação suave com pan/zoom para centenas de nós, suporte a múltiplos projetos e conformidade total com os padrões GEDCOM 5.5.1 e JSON.

---

### 2. User Experience & Visual Design

#### Fluxos Principais
1. **Visualização Inicial e Exploração**: O usuário abre o sistema e vê imediatamente o heredograma clínico de 3 gerações renderizado em SVG com nitidez vetorial. A legenda médica explica cada símbolo presente.
2. **Navegação no Canvas**: Arrastar para pan, scroll para zoom, botão "Encaixar na Tela" (Fit to View), centralização e reset de zoom com coordenadas precisas.
3. **Edição e Cadastro Rápido**:
   - Clique em qualquer indivíduo para abrir o painel lateral com dados biográficos e clínicos.
   - Botões de ação rápida no nó ("Adicionar Pais", "Adicionar Cônjuge/Parceiro", "Adicionar Filho", "Adicionar Irmão/Gêmeo").
   - Formulário com validação imediata de regras biológicas e avisos amigáveis.
4. **Alternância entre Modos**:
   - **Modo Genético (Clínico)**: Símbolos geométricos oficiais, gerações romanas (I, II, III), identificação de indivíduos (1, 2, 3...), seta de probando, linhas duplas para consanguinidade, traços de falecimento e preenchimentos clínicos.
   - **Modo Genealógico**: Estilo visual com nomes proeminentes, datas de nascimento/óbito, fotos/avatares e indicadores de união civil/religiosa.
5. **Destaque de Parentesco e Busca**: Digitação no campo de busca com autocompletar e foco com zoom no indivíduo; ao selecionar uma pessoa, destaca-se a árvore de ancestrais (azul) e de descendentes (verde).
6. **Importação e Exportação**:
   - Exportação em SVG vetorial limpo, PNG de alta resolução e PDF paginado (formatos A4 e A3 com orientação paisagem/retrato).
   - Exportação e importação completa em GEDCOM 5.5.1 e JSON.
7. **Projetos e Persistência**: Troca rápida entre múltiplos projetos salvos no IndexedDB local, com cópia de segurança e projeto em branco.

#### Identidade Visual & Tema
- **Diretriz Estética**: Bancada científica limpa (*Publication-Grade Scientific Workbench*), inspirada em diretrizes de genômica e biotecnologia.
- **Paleta de Cores (60-30-10)**:
  - 60% Fundo: Branco laboratório `#FFFFFF` e tela técnica `#F8FAFC`.
  - 30% Estrutura: Superfícies em `#F1F5F9`, bordas capilares de 1px `#E2E8F0`, tipografia escura `#0F172A` e secundária `#64748B`.
  - 10% Acentos: Azul clínico `#0284C7` (ações principais e probando), carmesim `#DC2626` (afetados), âmbar `#D97706` (portadores) e esmeralda `#059669` (destaque de linhagem).
- **Tipografia**: `Plus Jakarta Sans` para interface e legendas; `JetBrains Mono` / `tabular-nums` para códigos de geração (I-1, II-4), datas e métricas.

---

### 3. Key Product Decisions & Trade-Offs

- **Motor de Layout Sugiyama Adaptado para Heredogramas**:
  - *Abordagem*: Algoritmo em 4 passos: (1) Atribuição de gerações por nível topológico, (2) Agrupamento de casais e nós de união na mesma linha, (3) Distribuição horizontal com ordenação para minimizar cruzamento de conexões de filhos, (4) Roteamento ortogonal de linhas com pontos de ramificação (barramento de irmãos).
  - *Vantagem*: Gera heredogramas claros e esteticamente corretos sem bibliotecas pesadas externas; permite que o usuário arraste nós manualmente e restaure o layout quando desejar.
- **Renderização SVG Própria com Transform Matrix**:
  - *Abordagem*: SVG nativo no React com `viewBox` e grupo matricial `<g transform="...">`.
  - *Vantagem*: Suporte nativo e perfeito para exportação vetorial SVG/PDF sem rasterização, renderização ultra-rápida para mais de 500 indivíduos, e estilo CSS uniforme.
- **Persistência IndexedDB com Repositório em Camadas**:
  - *Abordagem*: Camada de abstração sobre `indexedDB` com armazenamento de múltiplos projetos, histórico de alterações (snapshots reversíveis) e metadados.
  - *Vantagem*: Capacidade ilimitada sem travar a cota de 5MB do `localStorage`, persistência offline instantânea.
- **Parser e Serializador GEDCOM 5.5.1 Nativo**:
  - *Abordagem*: Implementação em TypeScript tratando tags fundamentais (`INDI`, `FAM`, `HUSB`, `WIFE`, `CHIL`, `BIRT`, `DEAT`, `NOTE`).
  - *Vantagem*: Interoperabilidade total com ferramentas de genealogia (FamilySearch, MyHeritage, Gramps).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HeredoStudio App UI                           │
├────────────────────────────────────────────────────────────────────────┤
│ Top Bar: Marca · Seletor Projetos · Alternador Modo · Undo/Redo · Exp │
├───────────────────────────────┬────────────────────────────────────────┤
│                               │                                        │
│   Canvas Interativo (SVG)     │     Painel Lateral Inspector          │
│   ────────────────────────    │     ──────────────────────────         │
│   · Camada de Conexões (bus)  │     · Dados Pessoais (Nome, Sexo, etc) │
│   · Nós Clínicos/Genealógicos │     · Status Clínico (Afetado/Portador)│
│   · Indicador de Probando (↗) │     · Pais, Cônjuges, Filhos, Gêmeos   │
│   · Numeração Romana (I, II)  │     · Ações Rápidas de Parentesco      │
│   · Destaque Ancestrais/Desc  │     · Alertas de Validação Biológica   │
│   · Pan & Zoom + Grid         │                                        │
├───────────────────────────────┴────────────────────────────────────────┤
│ Barra Inferior: Legenda Médica Configurável · Busca & Foco · Mini-mapa │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Camada de Domínio                             │
├───────────────────────┬────────────────────────┬───────────────────────┤
│    Modelo de Dados    │   Regras & Validação   │   Motor de Layout     │
│  · Person & Relations │   · Detecção de Ciclos │   · Geração / Níveis  │
│  · Clinical Status    │   · Coerência de Datas │   · Casais & Irmãos   │
│  · Union & Twin Types │   · Auto-união         │   · Roteamento Linhas │
└───────────────────────┴────────────────────────┴───────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│        Exportação & I/O         │   │       Persistência Local         │
│ · SVG / PNG (Canvas 300 DPI)    │   │ · IndexedDB Projects Store       │
│ · PDF (A4/A3 Paisagem/Retrato)  │   │ · Snapshot Undo / Redo Stacks    │
│ · GEDCOM 5.5.1 Import / Export  │   │ · Demonstrações Pré-carregadas   │
│ · JSON Backup & Restore         │   │                                  │
└─────────────────────────────────┘   └──────────────────────────────────┘
```

#### Modelo de Entidades Principais
- `Person`: `id`, `name`, `sex` ('M' | 'F' | 'OTHER' | 'UNKNOWN'), `birthDate`, `birthPlace`, `deathDate`, `deathPlace`, `isDeceased`, `notes`, `photoUrl`, `clinicalStatus` ('UNAFFECTED' | 'AFFECTED' | 'CARRIER' | 'UNKNOWN'), `isProband`, `generation` (calculada), `generationIndex` (calculado).
- `UnionRelation`: `id`, `partner1Id`, `partner2Id`, `type` ('MARRIAGE' | 'CIVIL_UNION' | 'NON_FORMAL' | 'DIVORCED'), `isConsanguineous`, `startDate`, `endDate`.
- `ParentChildRelation`: `id`, `childId`, `parentId` (ou `unionId`), `filiationType` ('BIOLOGICAL' | 'ADOPTED' | 'FOSTER' | 'STEP'), `twinGroupId`, `twinType` ('MONOZYGOTIC' | 'DIZYGOTIC' | 'UNKNOWN').
- `ValidationRuleResult`: Relatório com lista de avisos (warnings) e violações (errors), impedindo operações inválidas e alertando sobre datas.

#### Estrutura de Módulos
1. `src/domain/`: Tipos fundamentais, validações de ciclos e datas, importador e exportador GEDCOM e JSON.
2. `src/layout/`: Algoritmo de posicionamento hierárquico por geração, alinhamento de casais, barramento de filhos e conexões ortogonais.
3. `src/storage/`: IndexedDB client com gestão de múltiplos heredogramas e undo/redo.
4. `src/export/`: Utilitários para renderização e download em SVG, PNG (alta fidelidade) e PDF (A4/A3).
5. `src/components/`:
   - `Canvas/`: Superfície SVG com pan, zoom, arrasto de nós, linhas de união e legenda.
   - `Nodes/`: Símbolos clínicos médicos (quadrado, círculo, losango, metade preenchida, ponto, traço de óbito, seta probando) e cartões genealógicos.
   - `Inspector/`: Formulário completo de edição do indivíduo selecionado, relações e parentesco rápido.
   - `Modals/`: Modais de exportação, importação GEDCOM/JSON, novo projeto e atalhos.
   - `Toolbar/`: Barra superior e controles de zoom e busca.
