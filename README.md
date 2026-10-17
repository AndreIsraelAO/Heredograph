# HeredoStudio

> Construtor de heredogramas e árvores genealógicas no navegador, com layout automático por gerações e exportação em múltiplos formatos.

🔗 **Demo:** [heredograph.vercel.app](https://heredograph.vercel.app/)

<!-- TODO: adicionar screenshot ou GIF do app aqui -->

## Sobre

O HeredoStudio é uma aplicação para construir, editar, visualizar e exportar **heredogramas clínicos** (pedigrees) e **árvores genealógicas**. O layout é calculado automaticamente por gerações, e o projeto suporta importação e exportação nos formatos GEDCOM 5.5.1, JSON, LaTeX e PDF.

## Funcionalidades

- Criação e edição de indivíduos e relações (casamentos, filiação)
- Layout automático organizado por gerações
- Visualização do heredograma/árvore no navegador
- Importação e exportação em **GEDCOM 5.5.1** (padrão para dados genealógicos)
- Exportação em **JSON** para salvar e reabrir projetos
- Exportação em **LaTeX** e **PDF** para documentos e publicações

<!-- TODO: confirmar e detalhar as funcionalidades reais (ex.: símbolos clínicos, edição por arrastar, desfazer/refazer) -->

## Tecnologias

<!-- TODO: confirmar a stack no package.json -->
- TypeScript / JavaScript
- React
- Vite
- Vercel (deploy)

## Como executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- npm, yarn ou pnpm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/AndreIsraelAO/Heredograph.git
cd Heredograph

# Instale as dependências
npm install

# Rode o servidor de desenvolvimento
npm run dev
```

<!-- TODO: ajustar os comandos caso o projeto use outro gerenciador ou script -->

Depois, acesse `http://localhost:5173` (ou a porta indicada no terminal).

## Build para produção

```bash
npm run build
```

## Formatos suportados

| Formato   | Importar | Exportar | Uso                                         |
|-----------|:--------:|:--------:|---------------------------------------------|
| GEDCOM 5.5.1 | ✅ | ✅ | Intercâmbio com softwares genealógicos      |
| JSON      | ✅ | ✅ | Salvar e reabrir projetos                   |
| LaTeX     | — | ✅ | Inserir heredogramas em documentos acadêmicos |
| PDF       | — | ✅ | Compartilhar e imprimir                     |

<!-- TODO: confirmar quais formatos permitem importação -->

## Estrutura do projeto

```
Heredograph/
├── src/          # Código-fonte da aplicação
├── public/       # Arquivos estáticos
├── index.html    # Ponto de entrada
└── package.json
```

<!-- TODO: ajustar conforme a estrutura real -->

## Contribuindo

Contribuições são bem-vindas!

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Faça commit das alterações (`git commit -m 'Adiciona minha feature'`)
4. Envie para o seu fork (`git push origin feature/minha-feature`)
5. Abra um Pull Request

## Licença

<!-- TODO: definir uma licença (ex.: MIT) e adicionar o arquivo LICENSE -->
Este projeto ainda não possui uma licença definida.

## Autor

**André Israel** — [@AndreIsraelAO](https://github.com/AndreIsraelAO)
