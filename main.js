import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('sales-drop-area');
    const fileInput = document.getElementById('sales-file-input');
    const resultsContainer = document.getElementById('results-list-container');
    const salesTableContainer = document.getElementById('sales-table-display');
    const analysisContainer = document.getElementById('analysis-results-container');

    // Variáveis para os filtros
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const skuFilter = document.getElementById('sku-filter');
    const storeFilter = document.getElementById('store-filter');
    const statusFilter = document.getElementById('status-filter');

    // Cards de resumo
    const totalCostToPayValue = document.getElementById('total-cost-to-pay-value');
    const totalUnitsSoldValue = document.getElementById('total-units-sold-value');

    let fullSalesData = [];
    let costData = {};

    // --- FUNÇÃO PARA BUSCAR CUSTOS DO FIRESTORE ---
    const buscarCustosDoFirestore = async () => {
        const custos = {};
        try {
            const querySnapshot = await getDocs(collection(db, "produtos"));
            querySnapshot.forEach((doc) => {
                const produto = doc.data();
                custos[produto.sku] = produto.custoTotal;
            });
            console.log('Dados de custo carregados do Firestore com sucesso!');
            return custos;
        } catch (error) {
            console.error("Erro ao buscar custos do Firestore: ", error);
            alert("Não foi possível carregar os dados de custo do banco de dados. A análise pode ficar incorreta.");
            return {}; // Retorna objeto vazio em caso de erro
        }
    };

    // --- LÓGICA DE UPLOAD E PROCESSAMENTO ---

    const handleFileSelect = async (file) => {
        if (!file || !file.type.match('text/csv')) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }

        costData = await buscarCustosDoFirestore();

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            newline: "\r\n", // <-- A CORREÇÃO FINAL ESTÁ AQUI!
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("Erros de parsing:", results.errors);
                    alert("Ocorreram erros ao ler o arquivo CSV. Verifique o formato do arquivo e tente novamente.");
                    return;
                }
                fullSalesData = results.data;
                populateFilters(fullSalesData);
                displayFullSalesTable(fullSalesData);
                runAnalysis(); 
                analysisContainer.style.display = 'block';
                analysisContainer.scrollIntoView({ behavior: 'smooth' });
            },
            error: (err) => {
                alert(`Erro crítico ao processar o arquivo CSV: ${err.message}`);
            }
        });
    };

    // --- LÓGICA DOS FILTROS E ANÁLISE ---

    const populateFilters = (data) => {
        const stores = [...new Set(data.map(item => item["Loja Oficial"]))];
        const statuses = [...new Set(data.map(item => item["Estado Atual"]))];

        storeFilter.innerHTML = '<option value="">Todas</option>';
        stores.forEach(store => {
            if(store) storeFilter.innerHTML += `<option value="${store}">${store}</option>`;
        });

        statusFilter.innerHTML = '<option value="">Todos</option>';
        statuses.forEach(status => {
            if(status) statusFilter.innerHTML += `<option value="${status}">${status}</option>`;
        });
    };

    const runAnalysis = () => {
        let filteredData = [...fullSalesData];
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        const sku = skuFilter.value.toUpperCase();
        const store = storeFilter.value;
        const status = statusFilter.value;

        if (startDate) filteredData = filteredData.filter(item => item["Data de Compra"] && new Date(item["Data de Compra"]) >= new Date(startDate));
        if (endDate) filteredData = filteredData.filter(item => item["Data de Compra"] && new Date(item["Data de Compra"]) <= new Date(endDate));
        if (sku) filteredData = filteredData.filter(item => item["SKU"] && item["SKU"].toUpperCase().includes(sku));
        if (store) filteredData = filteredData.filter(item => item["Loja Oficial"] === store);
        if (status) filteredData = filteredData.filter(item => item["Estado Atual"] === status);

        processSalesData(filteredData);
    };

    const processSalesData = (data) => {
        const distributorCost = {};
        const productCount = {};
        let totalUnitsSold = 0;

        data.forEach(item => {
            const sku = item["SKU"];
            const units = parseInt(item["Unidades"], 10);

            if (sku && !isNaN(units)) {
                const cost = costData[sku] || 0;
                const distributor = sku.split('-').pop(); 

                if (cost > 0) {
                    if (!distributorCost[distributor]) {
                        distributorCost[distributor] = 0;
                    }
                    distributorCost[distributor] += cost * units;
                }

                if (!productCount[sku]) {
                    productCount[sku] = 0;
                }
                productCount[sku] += units;
                totalUnitsSold += units;
            }
        });

        renderResults(distributorCost, productCount, totalUnitsSold);
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    const renderResults = (distributorCost, productCount, totalUnitsSold) => {
        resultsContainer.innerHTML = '';
        let totalCostToPay = 0;

        let costHtml = '<h3>Custo a Pagar por Fornecedor</h3><table><tr><th>Fornecedor</th><th>Custo Total</th></tr>';
        for (const distributor in distributorCost) {
            costHtml += `<tr><td>${distributor}</td><td>R$ ${distributorCost[distributor].toFixed(2)}</td></tr>`;
            totalCostToPay += distributorCost[distributor];
        }
        costHtml += '</table>';
        resultsContainer.innerHTML += costHtml;

        let productHtml = '<br><h3>Unidades Vendidas por Produto</h3><table><tr><th>SKU</th><th>Unidades</th></tr>';
        for (const sku in productCount) {
            productHtml += `<tr><td>${sku}</td><td>${productCount[sku]}</td></tr>`;
        }
        productHtml += '</table>';
        resultsContainer.innerHTML += productHtml;
        
        totalCostToPayValue.textContent = `R$ ${totalCostToPay.toFixed(2)}`;
        totalUnitsSoldValue.textContent = totalUnitsSold.toString();
    };
    
    const displayFullSalesTable = (data) => {
        if(data.length === 0){
            salesTableContainer.innerHTML = '<p>Nenhum dado de venda para exibir.</p>';
            return;
        }

        const headers = Object.keys(data[0]);
        let table = '<table><thead><tr>';
        headers.forEach(h => table += `<th>${h}</th>`);
        table += '</tr></thead><tbody>';

        data.slice(0, 100).forEach(row => { // Limita a 100 linhas para performance
            table += '<tr>';
            headers.forEach(h => table += `<td>${row[h] || ''}</td>`);
            table += '</tr>';
        });

        table += '</tbody></table>';
        salesTableContainer.innerHTML = table;
    };

    // --- EVENT LISTENERS ---
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('active');
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('active');
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('active');
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(fileInput.files[0]);
    });
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files[0]));

    [startDateFilter, endDateFilter, skuFilter, storeFilter, statusFilter].forEach(filter => {
        filter.addEventListener('change', runAnalysis);
        if (filter.type === 'text') {
            filter.addEventListener('keyup', runAnalysis);
        }
    });

});
