# Blueprint: Impacto Vendas Dashboard

## Visão Geral

O "Impacto Vendas Dashboard" é uma aplicação web de duas páginas projetada como uma ferramenta de gestão operacional. A aplicação processa relatórios de vendas diárias para calcular o total de custos a serem pagos aos fornecedores e o volume de unidades de produtos movimentadas, oferecendo uma visão clara para controle de estoque e financeiro.

---

## Estrutura e Funcionalidades

A aplicação é dividida em duas telas principais: **Análise** e **Cadastro**.

### 1. Tela de Cadastro (`cadastro.html`)

Esta tela funciona como a **base de dados central** para todos os produtos e seus custos associados.

*   **Formulário de Cadastro e Edição:** Permite registrar e atualizar produtos.
*   **Gestão Completa:** Funcionalidades de criar, visualizar, editar e excluir produtos na base de dados local (`localStorage`).

### 2. Tela de Análise (`index.html`)

Esta é a central de controle de pagamentos e estoque, focada na operação diária.

*   **Fonte de Dados:** Upload do relatório de vendas diário (`dados-tratados.csv`).
*   **Fluxo de Análise Visual:**
    1.  **Cards de Resumo:** Exibição imediata do Custo Total a Pagar e Unidades Totais Vendidas.
    2.  **Pré-visualização do Relatório:** Tabela com os dados brutos do arquivo carregado.
    3.  **Resultados Detalhados:** Lista de produtos processados após a aplicação dos filtros.
*   **Inteligência de Cálculo:** Cruza as vendas com a base de custos para calcular o total a pagar e as unidades vendidas.
*   **Filtros Avançados:** Permite análises por data, SKU, loja e status da entrega.

---

## Plano de Implementação da Mudança Atual

**Objetivo:** Reordenar os painéis na tela de Análise e ajustar o espaçamento dos cards de resumo.

1.  **Atualizar `blueprint.md`:** Documentar a nova ordem lógica da tela. (Concluído)
2.  **Modificar `index.html`:** Mover a seção de "Pré-visualização do Relatório" para que apareça antes da seção de "Resultados Encontrados".
3.  **Modificar `style.css`:** Aumentar o espaçamento (`gap`) no contêiner dos cards de resumo para melhorar a separação visual.
