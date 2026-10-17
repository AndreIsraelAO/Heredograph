# HeredoStudio — Construtor Profissional de Heredogramas e Genealogia

Uma aplicação web profissional e publicação-grade para construção, edição interativa, cálculo de layout automático em gerações e exportação de **heredogramas clínicos** e **árvores genealógicas**.

---

## 🔬 Principais Características

- **Modo Genético (Clínico)**:
  - Notação médica padronizada internacionalmente:
    - Quadrado (Masculino), Círculo (Feminino), Losango (Outro / Desconhecido).
    - Símbolos preenchidos para indivíduos **afetados**.
    - Ponto central para **portadores** heterozigotos assintomáticos.
    - Seta diagnóstica `P` para **probando** e consultando.
    - Barra diagonal para indivíduos **falecidos**.
    - Linha dupla para **casamentos consanguíneos**.
    - Conexão em 'V' para **gêmeos dizigóticos** e com barra transversal para **monozigóticos**.
  - Numeração romana de gerações (`I`, `II`, `III`...) na margem e numeração arábica (`1`, `2`, `3`...) dos indivíduos.
  
- **Modo Genealógico**:
  - Cartões com visualização clara de nome completo, datas de nascimento e falecimento (`*1945  †2019`), locais e foto/avatar.

- **Motor de Layout Automático por Gerações**:
  - Algoritmo hierárquico (DAG topológico) que organiza famílias em linhas horizontais por geração.
  - Alinhamento de casais lado a lado com barramento ortogonal de prole, minimizando cruzamento de linhas.
  - Suporte a reposicionamento manual com botão de 1 clique para restaurar o layout automático.

- **Integridade Biológica e Cronológica**:
  - Prevenção em tempo real de ciclos de ancestralidade (um indivíduo não pode ser ancestral de si mesmo).
  - Alerta sobre incoerências de datas (filho nascido antes dos pais, falecimento antes do nascimento, idade improvável).
  - Impedimento de união consigo mesmo.

- **Interatividade & Exploração**:
  - Pan e Zoom contínuos com controle de escala, centralização e ajuste à tela (*Fit to Screen*).
  - Destaque dinâmico de linhagens: ao selecionar uma pessoa, destaca em azul os ancestrais e em verde os descendentes.
  - Busca rápida por nome com autocompletar e foco no nó correspondente.
  - Pilha de Desfazer e Refazer (*Undo/Redo*) com botões visuais e contadores.

- **Formatos de Exportação e Importação**:
  - **PDF de Impressão**: Formatos A4 ou A3, orientação Paisagem ou Retrato, com cabeçalho clínico formatado.
  - **PNG**: Em alta resolução (1x, 2x e 3x / 300 DPI para publicações).
  - **SVG**: Arquivo vetorial puro editável no Inkscape, Illustrator ou Figma.
  - **LaTeX (TikZ)**: Geração de código TikZ com preâmbulo completo ou snippet para inclusão direta em artigos científicos e teses.
  - **GEDCOM 5.5.1**: Importação e exportação em conformidade com softwares de genealogia (Gramps, FamilySearch, MyHeritage).
  - **JSON**: Backup e restauração completa de projetos com coordenadas e metadados.

---

## 🏛️ Arquitetura do Software

O código é estritamente desacoplado em módulos:

```
src/
├── domain/                  # Camada de Domínio e Regras de Negócio
│   ├── types.ts             # Tipos TypeScript fundamentais (Person, Union, Layout, etc.)
│   ├── validation.ts        # Detecção de ciclos (DFS), consistência cronológica e regras
│   ├── gedcom.ts            # Parser e serializador GEDCOM 5.5.1
│   ├── latex.ts             # Gerador de código LaTeX com macros TikZ
│   ├── samples.ts           # Famílias de demonstração (Fibrose Cística e Família Silva)
│   └── __tests__/           # Testes automatizados (validação, layout, GEDCOM)
├── layout/                  # Camada de Layout e Geometria
│   └── engine.ts            # Algoritmo de geração topológica, barramentos e numeração romana
├── storage/                 # Camada de Persistência
│   └── db.ts                # Repositório IndexedDB com fallback em LocalStorage e Undo/Redo
├── export/                  # Camada de Saída e Renderização
│   └── exportUtils.ts       # Utilitários de conversão SVG, Canvas PNG, PDF jsPDF e downloads
├── components/              # Interface do Usuário (React + Tailwind)
│   ├── Canvas/              # PedigreeCanvas e ConnectionLines (barramentos, gêmeos, uniões)
│   ├── Nodes/               # GeneticSymbol (símbolos médicos) e GenealogicalCard
│   ├── Inspector/           # Painel lateral de edição clínica e parentesco rápido
│   ├── Toolbar/             # Header com navegação, busca, histórico e alternador
│   ├── Legend/              # Legenda clínica oficial retrátil
│   └── Modals/              # Modais de Exportação, Importação, Projetos e Validação
├── App.tsx                  # Orquestração do estado e fluxo principal
└── index.css                # Estilos Tailwind e regras de mídia de impressão (@media print)
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js** >= 18
- **npm** >= 9

### 1. Instalar Dependências
```bash
npm install
```

### 2. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:3000`

### 3. Compilar para Produção
```bash
npm run build
```

---

## 🧪 Testes Automatizados

O projeto utiliza **Vitest** para testar as regras de integridade de domínio, cálculo de layout e integridade do parser GEDCOM:

```bash
npx vitest run
```

Os testes cobrem:
- `validation.test.ts`: Detecção de auto-união, ciclos de ancestralidade no grafo e filho nascido antes do progenitor.
- `layout.test.ts`: Conversão romana, atribuição topológica de gerações e cálculo de dimensões.
- `gedcom.test.ts`: Exportação GEDCOM 5.5.1 e importação com preservação de notas clínicas e atributos de probando.

---

## 📋 Demonstrações Incluídas

1. **Heredograma Clínico: Fibrose Cística (Autossômica Recessiva)**:
   - 3 gerações completas.
   - Casais de avós portadores (I-2 e I-4) e avô falecido (I-1).
   - Pais portadores assintomáticos (II-2 e II-3) e tia afetada (II-4).
   - Sofia Santos (III-2): Probando afetada com a seta `P`.
   - Irmãos gêmeos dizigóticos (III-3 e III-4): Lucas afetado e Mariana portadora.
2. **Árvore Genealógica da Família Silva e Vasconcelos**:
   - 3 gerações registrando imigração, locais de nascimento (Porto, Petrópolis, BH, Rio) e datas históricas.
