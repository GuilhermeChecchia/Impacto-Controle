document.addEventListener('DOMContentLoaded', () => {
    const skuForm = document.getElementById('sku-form');
    const skuListContainer = document.getElementById('sku-list-container');
    const editingSkuInput = document.getElementById('editing-sku');
    const formSubmitButton = document.getElementById('form-submit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const formDescription = document.getElementById('form-description');

    // Campos do formulário
    const skuQuantity = document.getElementById('sku-quantity');
    const skuName = document.getElementById('sku-name');
    const skuColor = document.getElementById('sku-color');
    const skuDistributor = document.getElementById('sku-distributor');
    const skuProductCost = document.getElementById('sku-product-cost');
    const skuPackagingCost = document.getElementById('sku-packaging-cost');

    const DB_KEY = 'impactoVendas_skuDB';

    function getSkuDatabase() {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    }

    function saveSkuDatabase(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function renderSkuList() {
        const db = getSkuDatabase();
        skuListContainer.innerHTML = '';
        if (db.length === 0) {
            skuListContainer.innerHTML = '<p class="placeholder-text">Nenhum produto cadastrado ainda.</p>';
            return;
        }

        db.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'sku-list-item';
            listItem.innerHTML = `
                <div class="sku-list-item-id">${item.sku}</div>
                <div class="sku-list-item-distributor">Fornecedor: <strong>${item.distributor}</strong></div>
                <div class="sku-list-item-cost">Custo Total: <strong>${(parseFloat(item.productCost) + parseFloat(item.packagingCost)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
                <div class="sku-list-item-actions">
                    <button class="edit-btn" data-sku="${item.sku}">Editar</button>
                    <button class="delete-btn" data-sku="${item.sku}">Excluir</button>
                </div>
            `;
            skuListContainer.appendChild(listItem);
        });
    }

    function enterEditMode(sku) {
        const db = getSkuDatabase();
        const itemToEdit = db.find(item => item.sku === sku);
        if (!itemToEdit) return;

        // Preenche o formulário
        const [quantity, name, color] = itemToEdit.sku.split('-');
        skuQuantity.value = quantity;
        skuName.value = name;
        skuColor.value = color;
        skuDistributor.value = itemToEdit.distributor;
        skuProductCost.value = itemToEdit.productCost;
        skuPackagingCost.value = itemToEdit.packagingCost;

        // Entra no modo de edição
        editingSkuInput.value = sku;
        formSubmitButton.textContent = 'Atualizar Produto';
        formDescription.textContent = `Editando o produto: ${sku}. Apenas fornecedor e custos podem ser alterados.`;
        cancelEditButton.style.display = 'inline-block';
        
        // Desabilita campos do SKU
        skuQuantity.disabled = true;
        skuName.disabled = true;
        skuColor.disabled = true;

        window.scrollTo(0, 0); // Rola a página para o topo
    }

    function exitEditMode() {
        skuForm.reset();
        editingSkuInput.value = '';
        formSubmitButton.textContent = 'Salvar Produto';
        formDescription.textContent = 'Preencha os dados para gerar o SKU e salvar na base de custos.';
        cancelEditButton.style.display = 'none';

        // Habilita campos do SKU
        skuQuantity.disabled = false;
        skuName.disabled = false;
        skuColor.disabled = false;
    }

    skuForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const db = getSkuDatabase();
        const isEditing = editingSkuInput.value !== '';

        if (isEditing) {
            // Lógica de Atualização
            const originalSku = editingSkuInput.value;
            const itemIndex = db.findIndex(item => item.sku === originalSku);
            if (itemIndex > -1) {
                db[itemIndex].distributor = skuDistributor.value.trim();
                db[itemIndex].productCost = parseFloat(skuProductCost.value);
                db[itemIndex].packagingCost = parseFloat(skuPackagingCost.value);
                alert(`Produto ${originalSku} atualizado com sucesso!`);
            }
        } else {
            // Lógica de Criação
            const newSku = `${skuQuantity.value.trim()}-${skuName.value.trim().toUpperCase()}-${skuColor.value.trim().toUpperCase()}`;
            const alreadyExists = db.some(item => item.sku === newSku);
            if (alreadyExists) {
                alert(`Erro: O SKU '${newSku}' já está cadastrado.`);
                return;
            }

            const newItem = {
                sku: newSku,
                distributor: skuDistributor.value.trim(),
                productCost: parseFloat(skuProductCost.value),
                packagingCost: parseFloat(skuPackagingCost.value)
            };
            db.push(newItem);
            alert(`Produto ${newSku} salvo com sucesso!`);
        }

        saveSkuDatabase(db);
        renderSkuList();
        exitEditMode();
    });

    skuListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const sku = target.dataset.sku;

        if (target.classList.contains('edit-btn')) {
            enterEditMode(sku);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm(`Tem certeza que deseja excluir o produto ${sku}? Esta ação não pode ser desfeita.`)) {
                let db = getSkuDatabase();
                db = db.filter(item => item.sku !== sku);
                saveSkuDatabase(db);
                renderSkuList();
                alert(`Produto ${sku} excluído com sucesso.`);
            }
        }
    });

    cancelEditButton.addEventListener('click', exitEditMode);

    // Renderização inicial
    renderSkuList();
});
