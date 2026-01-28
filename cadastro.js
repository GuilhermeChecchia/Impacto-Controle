import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot // <-- Importando o listener em tempo real
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const skuForm = document.getElementById('sku-form');
    const skuListContainer = document.getElementById('sku-list-container');
    const editingSkuId = document.getElementById('editing-sku');
    const formSubmitButton = document.getElementById('form-submit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');

    const produtosCollection = collection(db, 'produtos');

    // --- FUNÇÃO DE LISTENER EM TEMPO REAL ---
    const escutarMudancasProdutos = () => {
        skuListContainer.innerHTML = '<p>Carregando produtos...</p>';
        
        onSnapshot(produtosCollection, (querySnapshot) => {
            const produtos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (querySnapshot.empty) {
                skuListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda. Comece adicionando um!</p>';
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
        }, (error) => {
            console.error("Erro ao escutar o banco de dados: ", error);
            skuListContainer.innerHTML = '<p class="error-message"><b>Erro de conexão.</b> Não foi possível carregar os produtos. Verifique se as <a href="https://console.firebase.google.com/project/' + db.app.options.projectId + '/firestore/rules" target="_blank">regras de segurança do Firestore</a> foram publicadas corretamente.</p>';
        });
    };

    // --- FUNÇÕES DE INTERAÇÃO COM O FIRESTORE ---

    const salvarProduto = async (produto) => {
        try {
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
            alert('Ocorreu um erro ao salvar o produto. Verifique sua conexão e as regras de segurança do Firebase.');
        }
    };

    const editarProduto = async (id, produto) => {
        try {
            const produtoDoc = doc(db, 'produtos', id);
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
            // A lista irá atualizar sozinha graças ao onSnapshot
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
        // A lista irá atualizar sozinha. Nenhuma ação extra é necessária.
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
            // Para edição, ainda precisamos buscar os dados específicos daquele item
            const querySnapshot = await getDocs(collection(db, 'produtos'));
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

    // Inicia o listener para carregar os dados e observar mudanças
    escutarMudancasProdutos();
});
