import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- ELEMENTOS DO DOM ---
const productForm = document.getElementById('product-form');
const productListContainer = document.getElementById('product-list-container');
const skuInput = document.getElementById('sku');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const distributorInput = document.getElementById('distributor');
const productCostInput = document.getElementById('product-cost');
const packagingCostInput = document.getElementById('packaging-cost');

// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Renderiza a lista de produtos na tabela.
 * @param {Array<Object>} products - A lista de produtos a ser renderizada.
 */
const renderProducts = (products) => {
    if (products.length === 0) {
        productListContainer.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
        return;
    }

    productListContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nome do Produto</th>
                    <th>Fornecedor</th>
                    <th>Custo Produto</th>
                    <th>Custo Embalagem</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr data-id="${product.id}">
                        <td>${product.sku}</td>
                        <td>${product.name}</td>
                        <td>${product.distributor}</td>
                        <td>R$ ${product.productCost.toFixed(2)}</td>
                        <td>R$ ${product.packagingCost.toFixed(2)}</td>
                        <td class="actions">
                            <button class="edit-btn">Editar</button>
                            <button class="delete-btn">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

// --- FUNÇÕES DE DADOS (FIRESTORE) ---

/**
 * Busca todos os produtos do Firestore e os renderiza.
 */
const fetchAndRenderProducts = async () => {
    try {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);
        const products = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderProducts(products.sort((a, b) => a.sku.localeCompare(b.sku)));
    } catch (error) {
        console.error("Erro ao buscar produtos: ", error);
        productListContainer.innerHTML = '<p style="color: red;">Erro ao carregar produtos. Verifique o console.</p>';
    }
};

/**
 * Verifica se um SKU já existe no banco de dados.
 * @param {string} sku - O SKU a ser verificado.
 * @returns {boolean} - True se o SKU já existe, false caso contrário.
 */
const isSkuDuplicated = async (sku, currentId = null) => {
    const q = query(collection(db, "products"), where("sku", "==", sku));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return false;
    }
    // Se estiver editando, permite salvar se o SKU encontrado for do próprio documento
    if (currentId && querySnapshot.docs[0].id === currentId) {
        return false;
    }
    return true;
};

// --- MANIPULADORES DE EVENTOS ---

/**
 * Manipula o envio do formulário para criar ou atualizar um produto.
 */
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = productIdInput.value;
    const sku = skuInput.value.trim();
    const name = productNameInput.value.trim();
    const distributor = distributorInput.value.trim();
    const productCost = parseFloat(productCostInput.value);
    const packagingCost = parseFloat(packagingCostInput.value);

    if (await isSkuDuplicated(sku, id)) {
        alert('Erro: SKU já cadastrado no sistema.');
        return;
    }

    const productData = { sku, name, distributor, productCost, packagingCost };

    try {
        if (id) {
            // Atualizar produto existente
            const productRef = doc(db, 'products', id);
            await updateDoc(productRef, productData);
            alert('Produto atualizado com sucesso!');
        } else {
            // Criar novo produto
            await addDoc(collection(db, 'products'), productData);
            alert('Produto cadastrado com sucesso!');
        }

        productForm.reset();
        productIdInput.value = ''; // Limpa o campo oculto
        fetchAndRenderProducts(); // Atualiza a lista
    } catch (error) {
        console.error("Erro ao salvar produto: ", error);
        alert('Ocorreu um erro ao salvar o produto. Verifique o console.');
    }
});

/**
 * Manipula cliques na lista de produtos para editar ou excluir.
 */
productListContainer.addEventListener('click', async (e) => {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;

    const id = row.dataset.id;

    if (target.classList.contains('edit-btn')) {
        // Preenche o formulário com os dados do produto para edição
        const productRef = doc(db, 'products', id);
        // A forma mais segura seria buscar os dados novamente, mas para UI podemos usar os da tabela
        productIdInput.value = id;
        skuInput.value = row.cells[0].textContent;
        productNameInput.value = row.cells[1].textContent;
        distributorInput.value = row.cells[2].textContent;
        productCostInput.value = parseFloat(row.cells[3].textContent.replace('R$ ', ''));
        packagingCostInput.value = parseFloat(row.cells[4].textContent.replace('R$ ', ''));
        
        skuInput.focus(); // Foca no campo SKU
        window.scrollTo(0, 0); // Rola a página para o topo
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
                alert('Produto excluído com sucesso!');
                fetchAndRenderProducts(); // Atualiza a lista
            } catch (error) {
                console.error("Erro ao excluir produto: ", error);
                alert('Ocorreu um erro ao excluir o produto.');
            }
        }
    }
});

// --- INICIALIZAÇÃO ---
// Carrega a lista de produtos ao iniciar a página
fetchAndRenderProducts();
