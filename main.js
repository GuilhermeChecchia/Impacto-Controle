document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DA DOM ---
    const salesSheetContainer = document.getElementById('sales-sheet-container');
    const salesTableDisplay = document.getElementById('sales-table-display');
    const analysisResultsContainer = document.getElementById('analysis-results-container');
    const totalCostToPayValue = document.getElementById('total-cost-to-pay-value');
    const totalUnitsSoldValue = document.getElementById('total-units-sold-value');
    const resultsListContainer = document.getElementById('results-list-container');

    // Upload
    const dropArea = document.getElementById('sales-drop-area');
    const fileInput = document.getElementById('sales-file-input');

    // Filtros
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const skuFilterInput = document.getElementById('sku-filter');
    const storeFilter = document.getElementById('store-filter');
    const statusFilter = document.getElementById('status-filter');

    // --- ESTADO DA APLICAÇÃO ---
    const DB_KEY = 'impactoVendas_skuDB';
    let fullSalesData = [];
    let salesFileName = '';

    // ==================================================
    // FLUXO DE UPLOAD E PROCESSAMENTO
    // ==================================================

    dropArea.addEventListener('dragover', e => e.preventDefault());
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        salesFileName = file.name;
        const reader = new FileReader();

        reader.onload = (event) => {
            const fileContent = event.target.result;
            const lines = fileContent.split(/\r\n|\n/);
            const contentWithoutFirstLine = lines.slice(1).join('\n');

            Papa.parse(contentWithoutFirstLine, {
                header: true,
                skipEmptyLines: true,
                delimiter: ';',
                complete: (results) => {
                    if (results.errors.length) {
                        return alert(`Erro ao processar o arquivo: ${results.errors[0].message}`);
                    }
                    if (!results.data || results.data.length === 0) {
                        return alert("O arquivo de vendas está vazio ou em formato incorreto.");
                    }

                    fullSalesData = results.data;
                    populateDynamicFilters(fullSalesData);

                    const filteredData = applyFilters(fullSalesData);
                    runAnalysis(filteredData);
                },
                error: (err) => alert(`Ocorreu um erro ao ler o arquivo: ${err.message}`)
            });
        };
        reader.readAsText(file, 'UTF-8');
    }

    // Listeners que disparam a re-análise
    [startDateFilter, endDateFilter, storeFilter, statusFilter].forEach(filter => {
        filter.addEventListener('change', () => {
            if (fullSalesData.length > 0) {
                const filteredData = applyFilters(fullSalesData);
                runAnalysis(filteredData);
            }
        });
    });
    skuFilterInput.addEventListener('input', () => {
        if (fullSalesData.length > 0) {
            const filteredData = applyFilters(fullSalesData);
            runAnalysis(filteredData);
        }
    });

    // ==================================================
    // LÓGICA DE CÁLCULO E ANÁLISE
    // ==================================================

    function getCostsDatabase() {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    }

    function runAnalysis(salesData) {
        const costsDb = getCostsDatabase();
        analysisResultsContainer.style.display = 'block'; // Mostra o container de resultados

        if (costsDb.length === 0) {
            salesSheetContainer.style.display = 'none';
            resultsListContainer.innerHTML = `<div class="placeholder-text" style="padding: 2rem;"><h3>Base de Dados Vazia</h3><p>Nenhum produto encontrado. Por favor, vá para a tela de <a href="cadastro.html">Cadastro</a> para adicionar SKUs e custos.</p></div>`;
            totalCostToPayValue.textContent = "R$ 0,00";
            totalUnitsSoldValue.textContent = "0";
            return;
        }

        const analysisResult = calculateCostsAndUnits(salesData, costsDb);
        displayResults(analysisResult, salesData.length);
        displayRawSalesData(salesData, salesFileName);
    }

    function calculateCostsAndUnits(sales, costs) {
        const costsMap = new Map(costs.map(item => [item.sku, item]));
        let totalCostToPay = 0;
        let totalUnitsSold = 0;
        let processedCount = 0;
        const results = [];

        sales.forEach(sale => {
            const saleSku = sale.SKU;
            if (!saleSku || sale['Quantidade por SKU'] === undefined) return;

            const skuParts = saleSku.split('-');
            const unitsPerSku = parseInt(skuParts[0], 10);
            if (isNaN(unitsPerSku)) return;

            const baseSku = `1-${skuParts.slice(1).join('-')}`;

            if (costsMap.has(baseSku)) {
                const costInfo = costsMap.get(baseSku);
                const quantityOfPacksSold = parseInt(sale['Quantidade por SKU'], 10) || 0;
                const unitsSoldInThisSale = unitsPerSku * quantityOfPacksSold;
                const unitCost = parseFloat(costInfo.productCost) + parseFloat(costInfo.packagingCost);
                const saleTotalCost = unitCost * unitsSoldInThisSale;

                totalCostToPay += saleTotalCost;
                totalUnitsSold += unitsSoldInThisSale;
                processedCount++;

                results.push({
                    sku: saleSku,
                    date: sale['Data da Venda'],
                    status: sale['Estado Atual'],
                    units: unitsSoldInThisSale,
                    cost: saleTotalCost
                });
            }
        });

        return { results, totalCostToPay, totalUnitsSold, processedCount };
    }

    function applyFilters(data) {
        const startDateStr = startDateFilter.value;
        const endDateStr = endDateFilter.value;
        const skuFilterText = skuFilterInput.value.trim().toUpperCase();
        const selectedStore = storeFilter.value;
        const selectedStatus = statusFilter.value;

        return data.filter(row => {
            let isDateMatch = true;
            let isSkuMatch = true;
            let isStoreMatch = true;
            let isStatusMatch = true;

            const saleDate = parseCustomDate(row['Data da Venda']);

            if (!saleDate) {
                 isDateMatch = false;
            }
            
            if (isDateMatch && (startDateStr || endDateStr)) {
                const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
                if (startDateStr) {
                    const startDate = new Date(startDateStr);
                    startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
                    if (saleDateOnly < startDate) isDateMatch = false;
                }
                if (endDateStr) {
                    const endDate = new Date(endDateStr);
                    endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
                    if (saleDateOnly > endDate) isDateMatch = false;
                }
            }

            if (skuFilterText) {
                isSkuMatch = row.SKU && row.SKU.toUpperCase().includes(skuFilterText);
            }

            if (selectedStore) {
                isStoreMatch = row['Loja Oficial'] === selectedStore;
            }

            if (selectedStatus) {
                isStatusMatch = row['Estado Atual'] === selectedStatus;
            }

            return isDateMatch && isSkuMatch && isStoreMatch && isStatusMatch;
        });
    }

    function populateDynamicFilters(data) {
        const stores = new Set();
        const statuses = new Set();

        data.forEach(row => {
            if(row['Loja Oficial']) stores.add(row['Loja Oficial']);
            if(row['Estado Atual']) statuses.add(row['Estado Atual']);
        });

        updateSelectOptions(storeFilter, Array.from(stores).sort());
        updateSelectOptions(statusFilter, Array.from(statuses).sort());
    }

    function updateSelectOptions(selectElement, options) {
        const currentValue = selectElement.value;
        selectElement.innerHTML = '<option value="">Todos</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElement.appendChild(optionElement);
        });
        selectElement.value = currentValue;
    }

    function parseCustomDate(dateString) {
        if (!dateString) return null;
        const months = { 'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11 };
        const cleanedString = dateString.replace(' hs.', '');
        const parts = cleanedString.split(' de '); 
        if (parts.length < 3) return null;
        const day = parseInt(parts[0], 10);
        const monthName = parts[1].toLowerCase();
        const month = months[monthName];
        const yearAndTime = parts[2].split(' ');
        const year = parseInt(yearAndTime[0], 10);
        let hour = 0, minute = 0;
        if (yearAndTime.length > 1 && yearAndTime[1].includes(':')) {
            const timeParts = yearAndTime[1].split(':');
            hour = parseInt(timeParts[0], 10);
            minute = parseInt(timeParts[1], 10);
        }
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day, hour || 0, minute || 0);
        }
        return null;
    }


    // ==================================================
    // FUNÇÕES DE EXIBIÇÃO
    // ==================================================

    function displayRawSalesData(data, fileName) {
        salesSheetContainer.style.display = 'block';
        const tableHtml = createHtmlTable(data.slice(0, 100));
        salesTableDisplay.innerHTML = tableHtml ? tableHtml : '<p class="placeholder-text">Nenhuma venda corresponde aos filtros atuais.</p>';
        if (fileName) {
            dropArea.classList.add('filled');
            dropArea.innerHTML = `<p><strong>${fileName}</strong> carregado. ${fullSalesData.length} linhas no total.</p>`;
        }
    }

    function displayResults({ results, totalCostToPay, totalUnitsSold, processedCount }, totalFiltered) {
        totalCostToPayValue.textContent = totalCostToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        totalUnitsSoldValue.textContent = totalUnitsSold.toString();

        resultsListContainer.innerHTML = '';
        const resultHeader = document.createElement('p');
        resultHeader.className = 'section-description';
        resultHeader.textContent = `Mostrando ${results.length} resultados. (${processedCount} de ${totalFiltered} vendas filtradas encontradas na base de custos).`;
        resultsListContainer.appendChild(resultHeader);

        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <span class="result-card-sku">${result.sku}</span>
                <span class="result-card-units">Unidades: <strong>${result.units}</strong></span>
                <span class="result-card-status">${result.status}</span>
                <span class="result-card-cost">Custo: <strong>${result.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
            `;
            resultsListContainer.appendChild(card);
        });
    }

    function createHtmlTable(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const headerHtml = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        const bodyHtml = `<tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
        return `<div class="preview-table-container"><table>${headerHtml}${bodyHtml}</table></div>`;
    }
});
