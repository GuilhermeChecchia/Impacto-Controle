# Blueprint: Impacto Vendas Dashboard

## Visão Geral

O "Impacto Vendas Dashboard" é uma aplicação web de duas páginas projetada como uma ferramenta de gestão operacional. A aplicação processa relatórios de vendas diárias para calcular o total de custos a serem pagos aos fornecedores e o volume de unidades de produtos movimentadas, oferecendo uma visão clara para controle de estoque e financeiro.

A base de dados de produtos (SKUs e custos) é gerenciada através do **Firebase Firestore**, permitindo um cadastro centralizado, colaborativo e em tempo real.

O projeto está hospedado na Vercel com deploy contínuo a partir do repositório no GitHub.

## Arquitetura e Design

*   **Frontend:** HTML5, CSS3, JavaScript (ES Modules).
*   **Banco de Dados:** Google Firebase Firestore (NoSQL).
*   **Hospedagem:** Vercel.
*   **Controle de Versão:** Git e GitHub.
*   **Estilo:** Design moderno, responsivo e intuitivo, com foco na clareza da informação e facilidade de uso. Componentes interativos e feedback visual claro para o usuário.

## Funcionalidades

*   **Página de Análise de Vendas (index.html):**
    *   Upload de arquivo CSV com dados de vendas do dia.
    *   Busca os custos dos produtos diretamente do banco de dados Firestore.
    *   Processa os dados para calcular:
        *   Custo total por fornecedor.
        *   Quantidade total de unidades por produto.
    *   Apresenta os resultados em tabelas claras e fáceis de ler.
*   **Página de Cadastro de Produtos (cadastro.html):**
    *   Interface para Criar, Ler, Atualizar e Excluir (CRUD) produtos (SKU, nome, fornecedor, custo).
    *   Todas as operações são salvas e lidas diretamente no banco de dados Firestore.
    *   Validação de formulário para garantir a integridade dos dados.
    *   Tabela de produtos atualizada em tempo real.

---

## Plano de Ação Atual: Migração para Firebase Firestore

**Objetivo:** Substituir o `localStorage` pelo Firebase Firestore para permitir o gerenciamento de produtos de forma centralizada e colaborativa.

**Passos:**

1.  **[CONCLUÍDO] Obter credenciais de configuração do Firebase.**
2.  **[EM ANDAMENTO] Criar `firebase-config.js`:** Adicionar um novo arquivo para inicializar a conexão com o Firebase usando as credenciais fornecidas.
3.  **[PENDENTE] Adicionar SDKs do Firebase:** Incluir os scripts da biblioteca do Firebase nos arquivos `index.html` и `cadastro.html`.
4.  **[PENDENTE] Refatorar `cadastro.js`:** Substituir todas as funções que usam `localStorage` por suas contrapartes assíncronas do Firestore SDK (`getDocs`, `addDoc`, `updateDoc`, `deleteDoc`).
5.  **[PENDENTE] Refatorar `main.js`:** Modificar a lógica de processamento do CSV para que os custos dos produtos sejam buscados do Firestore antes do cálculo.
6.  **[PENDENTE] Testar e Validar:** Garantir que ambas as páginas funcionam corretamente com o novo banco de dados.
7.  **[PENDENTE] Enviar para o GitHub:** Fazer o commit e push das alterações para que a Vercel publique a nova versão.
