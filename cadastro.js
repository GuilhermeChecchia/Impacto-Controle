import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp, // Importa o serverTimestamp
    query,
    orderBy         // Importa as funções de consulta e ordenação
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const productList = document.getElementById('product-list');
    const formTitle = document.getElementById('form-title');
    const submitButton = productForm.querySelector('button[type="submit"]');
    let editingProductId = null;

    // --- FUNÇÃO PARA RENDERIZAR PRODUTOS EM UMA TABELA ---
    const renderProdutos = (produtos) => {
        productList.innerHTML = ''; // Limpa a lista atual

        // Cria a estrutura da tabela
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nome do Produto</th>
                    <th>Fornecedor</th>
                    <th>Custo Total (R$)</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        // Popula a tabela com os produtos
        produtos.forEach(produto => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', produto.id);
            tr.innerHTML = `
                <td>${produto.sku}</td>
                <td>${produto.nome}</td>
                <td>${produto.fornecedor}</td>
                <td>${produto.custoTotal.toFixed(2)}</td>
                <td class="actions">
                    <button class="edit-btn">Editar</button>
                    <button class="delete-btn">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        productList.appendChild(table);
    };

    // --- FUNÇÃO PARA BUSCAR E ORDENAR OS PRODUTOS ---
    const getProdutos = async () => {
        try {
            // **A CORREÇÃO ESTÁ AQUI: Query para ordenar por data de criação**
            const q = query(collection(db, "produtos"), orderBy("createdAt", "asc"));
            const querySnapshot = await getDocs(q);

            const produtos = [];
            querySnapshot.forEach((doc) => {
                produtos.push({ id: doc.id, ...doc.data() });
            });
            renderProdutos(produtos);
        } catch (error) {
            console.error("Erro ao buscar produtos: ", error);
        }
    };

    // --- MANIPULAÇÃO DO FORMULÁRIO (CRIAR E ATUALIZAR) ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sku = document.getElementById('sku').value.trim();
        const nome = document.getElementById('nome').value.trim();
        const fornecedor = document.getElementById('fornecedor').value.trim();
        const custoTotal = parseFloat(document.getElementById('custoTotal').value);

        if (!sku || !nome || !fornecedor || isNaN(custoTotal)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const produtoData = { sku, nome, fornecedor, custoTotal };

        try {
            if (editingProductId) {
                // Atualizar produto existente
                const productRef = doc(db, "produtos", editingProductId);
                await updateDoc(productRef, produtoData);
                alert('Produto atualizado com sucesso!');
            } else {
                // **A CORREÇÃO ESTÁ AQUI: Adiciona o timestamp na criação**
                produtoData.createdAt = serverTimestamp();
                await addDoc(collection(db, "produtos"), produtoData);
                alert('Produto cadastrado com sucesso!');
            }
            resetForm();
            getProdutos(); // Recarrega a lista ordenada
        } catch (error) {
            console.error("Erro ao salvar produto: ", error);
            alert('Ocorreu um erro ao salvar o produto.');
        }
    });

    // --- AÇÕES DE EDITAR E EXCLUIR ---
    productList.addEventListener('click', async (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        const id = tr.getAttribute('data-id');

        if (target.classList.contains('edit-btn')) {
            // Preenche o formulário para edição
            const produto = (await getDocs(query(collection(db, "produtos")))).docs.find(doc => doc.id === id).data();
            document.getElementById('sku').value = produto.sku;
            document.getElementById('nome').value = produto.nome;
            document.getElementById('fornecedor').value = produto.fornecedor;
            document.getElementById('custoTotal').value = produto.custoTotal;
            
            editingProductId = id;
            formTitle.textContent = 'Editar Produto';
            submitButton.textContent = 'Atualizar';
            window.scrollTo(0, 0);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                try {
                    await deleteDoc(doc(db, "produtos", id));
                    alert('Produto excluído com sucesso!');
                    getProdutos(); // Recarrega a lista
                } catch (error) {
                    console.error("Erro ao excluir produto: ", error);
                    alert('Ocorreu um erro ao excluir o produto.');
                }
            }
        }
    });
    
    // --- FUNÇÃO PARA RESETAR O FORMULÁRIO ---
    const resetForm = () => {
        productForm.reset();
        editingProductId = null;
        formTitle.textContent = 'Cadastrar Novo Produto';
        submitButton.textContent = 'Salvar';
    };

    // Carrega a lista inicial de produtos
    getProdutos();
});
