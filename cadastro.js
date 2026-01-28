import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const skuForm = document.getElementById('sku-form');
    const skuListContainer = document.getElementById('sku-list-container');
    const editingSkuId = document.getElementById('editing-sku');
    const formSubmitButton = document.getElementById('form-submit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');

    const produtosCollection = collection(db, 'produtos');

    // --- FUNÇÕES DE INTERAÇÃO COM O FIRESTORE ---

    const carregarProdutos = async () => {
        skuListContainer.innerHTML = '<p>Carregando produtos...</p>';
        try {
            const querySnapshot = await getDocs(produtosCollection);
            const produtos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (produtos.length === 0) {
                skuListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
                return;
            }

            skuListContainer.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Nome</th>
                            <th>Fornecedor</th>
                            <th>Custo Total</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${produtos.map(p => `
                            <tr data-id="${p.id}">
                                <td>${p.sku}</td>
                                <td>${p.nome}</td>
                                <td>${p.fornecedor}</td>
                                <td>R$ ${p.custoTotal.toFixed(2)}</td>
                                <td class="action-buttons">
                                    <button class="edit-btn">Editar</button>
                                    <button class="delete-btn">Excluir</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error("Erro ao carregar produtos: ", error);
            skuListContainer.innerHTML = '<p class="error-message">Não foi possível carregar os produtos.</p>';
        }
    };

    const salvarProduto = async (produto) => {
        try {
            // Verifica se o SKU já existe
            const q = query(produtosCollection, where("sku", "==", produto.sku));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                alert('Erro: Este SKU já está cadastrado.');
                return;
            }
            await addDoc(produtosCollection, produto);
            alert('Produto salvo com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar produto: ", error);
            alert('Ocorreu um erro ao salvar o produto.');
        }
    };

    const editarProduto = async (id, produto) => {
        try {
            const produtoDoc = doc(db, 'produtos', id);
             // Verifica se o SKU já existe em outro documento
             const q = query(produtosCollection, where("sku", "==", produto.sku));
             const querySnapshot = await getDocs(q);
             if (!querySnapshot.empty) {
                let idEncontrado = querySnapshot.docs[0].id;
                if(idEncontrado !== id) {
                    alert('Erro: Este SKU já está cadastrado em outro produto.');
                    return;
                }
             }

            await updateDoc(produtoDoc, produto);
            alert('Produto atualizado com sucesso!');
        } catch (error) {
            console.error("Erro ao editar produto: ", error);
            alert('Ocorreu um erro ao editar o produto.');
        }
    };

    const excluirProduto = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return;
        }
        try {
            const produtoDoc = doc(db, 'produtos', id);
            await deleteDoc(produtoDoc);
            alert('Produto excluído com sucesso!');
            carregarProdutos(); // Recarrega a lista
        } catch (error) {
            console.error("Erro ao excluir produto: ", error);
            alert('Ocorreu um erro ao excluir o produto.');
        }
    };


    // --- LÓGICA DO FORMULÁRIO ---

    skuForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = editingSkuId.value;
        const quantidade = document.getElementById('sku-quantity').value;
        const nome = document.getElementById('sku-name').value.toUpperCase();
        const cor = document.getElementById('sku-color').value.toUpperCase();
        const fornecedor = document.getElementById('sku-distributor').value.toUpperCase();
        const custoProduto = parseFloat(document.getElementById('sku-product-cost').value);
        const custoEmbalagem = parseFloat(document.getElementById('sku-packaging-cost').value);

        if (isNaN(custoProduto) || isNaN(custoEmbalagem)) {
            alert('Por favor, insira valores de custo válidos.');
            return;
        }

        const generatedSku = `${quantidade}-${nome}-${cor}`;
        const custoTotal = custoProduto + custoEmbalagem;

        const produto = {
            sku: generatedSku,
            nome: `${quantidade} ${nome} ${cor}`,
            fornecedor,
            custoTotal,
            // Armazenando dados originais para edição
            quantidade: parseInt(quantidade),
            nomeBase: nome,
            cor: cor,
            custoProduto: custoProduto,
            custoEmbalagem: custoEmbalagem
        };

        if (id) {
            await editarProduto(id, produto);
        } else {
            await salvarProduto(produto);
        }

        resetarFormulario();
        carregarProdutos();
    });

    const resetarFormulario = () => {
        skuForm.reset();
        editingSkuId.value = '';
        formSubmitButton.textContent = 'Salvar Produto';
        cancelEditButton.style.display = 'none';
        document.getElementById('form-description').textContent = 'Preencha os dados para gerar o SKU e salvar na base de custos.';
    };

    cancelEditButton.addEventListener('click', resetarFormulario);

    // --- LÓGICA DA LISTA DE PRODUTOS (DELEGAÇÃO DE EVENTOS) ---

    skuListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        if (!tr) return;

        const id = tr.dataset.id;

        if (target.classList.contains('delete-btn')) {
            excluirProduto(id);
        }

        if (target.classList.contains('edit-btn')) {
            const querySnapshot = await getDocs(produtosCollection);
            const produto = querySnapshot.docs.find(doc => doc.id === id)?.data();

            if (produto) {
                document.getElementById('editing-sku').value = id;
                document.getElementById('sku-quantity').value = produto.quantidade;
                document.getElementById('sku-name').value = produto.nomeBase;
                document.getElementById('sku-color').value = produto.cor;
                document.getElementById('sku-distributor').value = produto.fornecedor;
                document.getElementById('sku-product-cost').value = produto.custoProduto;
                document.getElementById('sku-packaging-cost').value = produto.custoEmbalagem;

                formSubmitButton.textContent = 'Atualizar Produto';
                cancelEditButton.style.display = 'inline-block';
                document.getElementById('form-description').textContent = `Editando o produto ${produto.sku}.`;
                skuForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // Carregamento inicial
    carregarProdutos();
});
