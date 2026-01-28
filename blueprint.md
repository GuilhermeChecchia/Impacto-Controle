# Blueprint do Projeto: Impacto Controle

Este documento serve como a fonte única de verdade para o design, funcionalidades e regras de negócio da aplicação.

## Visão Geral

A aplicação **Impacto Controle** é um dashboard de gestão de vendas projetado para fornecer insights financeiros e operacionais a partir de relatórios de vendas. O sistema permite o cadastro detalhado de produtos (SKUs) e a análise de custos com base em arquivos de vendas diárias.

## Estrutura da Aplicação

A aplicação é composta por duas telas principais:

1.  **Análise (index.html):** A tela principal para visualização e análise de dados de vendas.
2.  **Cadastro (cadastro.html):** A tela dedicada à gestão de produtos (SKUs).

A navegação entre as telas é feita por um menu no cabeçalho. Todas as páginas possuem um cabeçalho e um rodapé padronizados.

---

## Tela de Cadastro (`cadastro.html`)

### Propósito

Centralizar o registro de todos os produtos (SKUs) vendidos, seus custos associados e fornecedores. Esta tela é a base para que a tela de **Análise** possa calcular os custos corretamente.

### Regras de Negócio do SKU

Um SKU (Stock Keeping Unit) possui um padrão de nomenclatura obrigatório:

`QUANTIDADE-NOMEPRODUTO-COR`

*   **QUANTIDADE:** Um número inteiro (ex: `1`, `4`, `10`) que indica quantas unidades do produto compõem o kit/pacote vendido.
*   **NOMEPRODUTO:** O nome do produto (ex: `ALLEGRA`, `LARISSA`).
*   **COR:** A abreviação da cor do produto (ex: `PT`, `BR`, `ND`).

**Exemplos:** `1-ALLEGRA-PT`, `4-LARISSA-ND`, `10-CHIFRE-BR`.

### Funcionalidades

1.  **Formulário de Cadastro:**
    *   **SKU:** Campo de texto, segue o padrão `QTD-NOME-COR`.
    *   **Nome do Produto:** Campo de texto.
    *   **Fornecedor:** Campo de texto para o nome do distribuidor/fornecedor.
    *   **Custo do Produto (R$):** Campo numérico para o valor pago ao fornecedor pelo produto.
    *   **Custo da Embalagem (R$):** Campo numérico para o valor pago pela embalagem.

2.  **Persistência de Dados:**
    *   Os dados de cadastro são salvos no **Firestore**.
    *   Isso garante que os dados não sejam perdidos ao recarregar a página ou fechar o navegador.
    *   O sistema **não permite o cadastro de SKUs duplicados**.

3.  **Listagem de Produtos:**
    *   Abaixo do formulário, uma tabela exibe todos os produtos já cadastrados no Firestore.
    *   A lista é atualizada automaticamente após cada novo cadastro.

---

## Tela de Análise (`index.html`)

### Propósito

Calcular o **custo total a ser pago aos fornecedores** com base nas vendas de um determinado período. A análise cruza os dados do relatório de vendas com os custos cadastrados no sistema.

### Lógica de Cálculo

1.  **Upload de Arquivo:** O usuário insere um arquivo `dados-tratados.csv`.
2.  **Processamento:** O sistema lê o arquivo linha por linha.
3.  **Cruzamento de Dados:** Para cada venda no arquivo:
    *   O sistema extrai o SKU (ex: `4-ALLEGRA-PT`).
    *   Ele interpreta o SKU: `4` unidades do produto `ALLEGRA-PT`.
    *   Busca no **Firestore** (dados da tela de Cadastro) o custo do produto e da embalagem para o SKU `ALLEGRA-PT`.
    *   **Cálculo:** `Custo da Venda = (Custo do Produto + Custo da Embalagem) * Quantidade`.
4.  **Regra Crítica:** Vendas de SKUs que **não estiverem previamente cadastrados** na tela de Cadastro devem ser **ignoradas** no cálculo.

### Funcionalidades

1.  **Filtros de Análise:**
    *   **Data de Início e Fim:** Para filtrar vendas por período.
    *   **Filtrar por SKU:** Para analisar um produto específico.
    *   **Filtrar por Loja Oficial:** Para analisar vendas de uma loja específica.
    *   **Filtrar por Estado Atual:** Para filtrar pelo status da entrega.

2.  **Exibição de Resultados:**
    *   **Cards de Resumo:** Exibem totais calculados (ex: Custo Total a Pagar).
    *   **Tabela de Resultados:** Mostra os dados detalhados que correspondem aos filtros aplicados.

## Design e Layout

*   **Fonte:** Poppins.
*   **Cores:** Paleta moderna com azul primário, cinzas e cores de suporte.
*   **Layout:** Componentes organizados em seções (cards) com espaçamento adequado para uma leitura clara.
*   **Rodapé:** Fixo, na cor branca, com o texto `© 2026 Impacto Vendas. Todos os direitos reservados.`

