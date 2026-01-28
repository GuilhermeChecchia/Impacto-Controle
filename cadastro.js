import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productForm = document.getElementById('product-form');
const productList = document.getElementById('product-list');

const getProducts = async () => {
    const productsCol = collection(db, 'products');
    const productSnapshot = await getDocs(productsCol);
    const products = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderProducts(products);
};

const renderProducts = (products) => {
    productList.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Nome do Produto</th>
                    <th>Preço de Custo</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr>
                        <td>${product.sku}</td>
                        <td>${product.name}</td>
                        <td>R$ ${product.cost}</td>
                        <td class="actions">
                            <button class="edit-btn" data-id="${product.id}" data-sku="${product.sku}" data-name="${product.name}" data-cost="${product.cost}">Editar</button>
                            <button class="delete-btn" data-id="${product.id}">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('product-id').value;
    const sku = document.getElementById('sku').value;
    const name = document.getElementById('product-name').value;
    const cost = parseFloat(document.getElementById('cost-price').value);

    if (id) {
        // Update
        const productRef = doc(db, 'products', id);
        await updateDoc(productRef, { sku, name, cost });
    } else {
        // Create
        await addDoc(collection(db, 'products'), { sku, name, cost });
    }

    productForm.reset();
    document.getElementById('product-id').value = '';
    getProducts();
});

productList.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        const sku = e.target.dataset.sku;
        const name = e.target.dataset.name;
        const cost = e.target.dataset.cost;

        document.getElementById('product-id').value = id;
        document.getElementById('sku').value = sku;
        document.getElementById('product-name').value = name;
        document.getElementById('cost-price').value = cost;
    }

    if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        const productRef = doc(db, 'products', id);
        deleteDoc(productRef);
        getProducts();
    }
});

getProducts();
