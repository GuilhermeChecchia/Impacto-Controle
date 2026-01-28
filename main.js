import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('sales-drop-area');
    const fileInput = document.getElementById('sales-file-input');
    const resultsContainer = document.getElementById('results-list-container');
    const salesTableContainer = document.getElementById('sales-table-display');
    const analysisContainer = document.getElementById('analysis-results-container');

    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const skuFilter = document.getElementById('sku-filter');
    const storeFilter = document.getElementById('store-filter');
    const statusFilter = document.getElementById('status-filter');

    const totalCostToPayValue = document.getElementById('total-cost-to-pay-value');
    const totalUnitsSoldValue = document.getElementById('total-units-sold-value');

    let fullSalesData = [];
    let productDatabase = {}; // Renomeado para refletir que contém mais que apenas custos

    // --- FUNÇÃO PARA BUSCAR DADOS COMPLETOS DO PRODUTO DO FIRESTORE ---
    const fetchProductDatabase = async () => {
        const db = {};
        try {
            const querySnapshot = await getDocs(collection(db, "produtos"));
            querySnapshot.forEach((doc) => {
                const produto = doc.data();
                // **A CORREÇÃO PRINCIPAL ESTÁ AQUI**
                // Armazenamos um objeto com custo E fornecedor, não apenas o custo.
                db[produto.sku] = {
                    cost: produto.custoTotal,
                    supplier: produto.fornecedor
                };
            });
            console.log('Banco de dados de produtos carregado do Firestore:', db);
            return db;
        } catch (error) {
            console.error("Erro ao buscar dados de produtos do Firestore: ", error);
            alert("Não foi possível carregar os dados de produtos do banco de dados. A análise pode ficar incorreta.");
            return {};
        }
    };

    // --- LÓGICA DE UPLOAD E PROCESSAMENTO ---
    const handleFileSelect = async (file) => {
        if (!file || !(file.type.match('text/csv') || file.name.endsWith('.csv'))) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }

        productDatabase = await fetchProductDatabase(); // Carrega o banco de dados completo

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("Erros de parsing do CSV:", results.errors);
                    alert(`Ocorreram erros ao ler o arquivo CSV. Verifique o console (F12) para detalhes.`);
                    return;
                }
                if (!results.data || results.data.length === 0) {
                    alert("O arquivo CSV parece estar vazio ou em um formato não reconhecido.");
                    return;
                }
                fullSalesData = results.data;
                populateFilters(fullSalesData);
                displayFullSalesTable(fullSalesData, results.meta.fields);
                runAnalysis();
                analysisContainer.style.display = 'block';
                analysisContainer.scrollIntoView({ behavior: 'smooth' });
            },
            error: (err) => alert(`Erro crítico ao processar o arquivo CSV: ${err.message}`)
        });
    };

    // --- LÓGICA DOS FILTROS E ANÁLISE ---
    const populateFilters = (data) => {
        if (!data[0]) return;
        const stores = [...new Set(data.map(item => item["Loja Oficial"]))];
        const statuses = [...new Set(data.map(item => item["Estado Atual"]))];
        storeFilter.innerHTML = '<option value="">Todas</option>' + stores.filter(s => s).map(s => `<option value="${s}">${s}</option>`).join('');
        statusFilter.innerHTML = '<option value="">Todos</option>' + statuses.filter(s => s).map(s => `<option value="${s}">${s}</option>`).join('');
    };

    const runAnalysis = () => {
        let filteredData = [...fullSalesData];
        const startDate = startDateFilter.value, endDate = endDateFilter.value;
        const sku = skuFilter.value.toUpperCase(), store = storeFilter.value, status = statusFilter.value;

        if (startDate) filteredData = filteredData.filter(item => item["Data de Compra"] && new Date(item["Data de Compra"]) >= new Date(startDate));
        if (endDate) filteredData = filteredData.filter(item => item["Data de Compra"] && new Date(item["Data de Compra"]) <= new Date(endDate));
        if (sku) filteredData = filteredData.filter(item => item["SKU"] && item["SKU"].toUpperCase().includes(sku));
        if (store) filteredData = filteredData.filter(item => item["Loja Oficial"] === store);
        if (status) filteredData = filteredData.filter(item => item["Estado Atual"] === status);

        processSalesData(filteredData);
    };

    const processSalesData = (data) => {
        const supplierCost = {};
        const productCount = {};
        let totalUnitsSold = 0;

        data.forEach(item => {
            const sku = item["SKU"];
            const units = item["Unidades"];

            if (sku && units && !isNaN(units)) {
                const productInfo = productDatabase[sku];
                
                // **A LÓGICA CORRETA DE CÁLCULO**
                if (productInfo && productInfo.cost > 0) {
                    const cost = productInfo.cost;
                    const supplier = productInfo.supplier; // USA O FORNECEDOR CORRETO DO BANCO DE DADOS

                    if (!supplierCost[supplier]) supplierCost[supplier] = 0;
                    supplierCost[supplier] += cost * units;
                }

                if (!productCount[sku]) productCount[sku] = 0;
                productCount[sku] += units;
                totalUnitsSold += units;
            }
        });

        renderResults(supplierCost, productCount, totalUnitsSold);
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    const renderResults = (supplierCost, productCount, totalUnitsSold) => {
        resultsContainer.innerHTML = '';
        let totalCostToPay = 0;

        let costHtml = '<h3>Custo a Pagar por Fornecedor</h3><table><thead><tr><th>Fornecedor</th><th>Custo Total</th></tr></thead><tbody>';
        Object.keys(supplierCost).sort().forEach(supplier => {
            costHtml += `<tr><td>${supplier}</td><td>R$ ${supplierCost[supplier].toFixed(2)}</td></tr>`;
            totalCostToPay += supplierCost[supplier];
        });
        costHtml += '</tbody></table>';
        resultsContainer.innerHTML = costHtml;

        let productHtml = '<br><h3>Unidades Vendidas por Produto</h3><table><thead><tr><th>SKU</th><th>Unidades</th></tr></thead><tbody>';
        Object.keys(productCount).sort().forEach(sku => {
            productHtml += `<tr><td>${sku}</td><td>${productCount[sku]}</td></tr>`;
        });
        productHtml += '</tbody></table>';
        resultsContainer.innerHTML += productHtml;
        
        totalCostToPayValue.textContent = `R$ ${totalCostToPay.toFixed(2)}`;
        totalUnitsSoldValue.textContent = totalUnitsSold.toString();
    };
    
    const displayFullSalesTable = (data, headers) => {
        if (!data || data.length === 0 || !headers || headers.length === 0) {
            salesTableContainer.innerHTML = '<p>Nenhum dado de venda para exibir ou cabeçalhos não encontrados.</p>';
            return;
        }
        let table = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
        table += data.map(row => '<tr>' + headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('') + '</tr>').join('');
        table += '</tbody></table>';
        salesTableContainer.innerHTML = table;
    };

    // --- EVENT LISTENERS ---
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('active'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('active'));
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('active');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(fileInput.files[0]);
        }
    });
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { fileInput.files.length && handleFileSelect(fileInput.files[0]); });
    [startDateFilter, endDateFilter, skuFilter, storeFilter, statusFilter].forEach(filter => {
        filter.addEventListener('change', runAnalysis);
        if (filter.type === 'text') filter.addEventListener('keyup', runAnalysis);
    });
});