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
        if (!file || !(file.type.match('text/csv') || file.name.endsWith('.csv'))) {
            alert('Por favor, selecione um arquivo CSV.');
            return;
        }

        costData = await buscarCustosDoFirestore();

        // Abordagem Robusta: Deixar o Papa Parse autodetectar o formato.
        Papa.parse(file, {
            header: true,         // O cabeçalho é a primeira linha.
            skipEmptyLines: true, // Pular linhas vazias.
            dynamicTyping: true,  // Converte tipos (números, booleanos) automaticamente.
            // Removido 'delimiter' e 'newline' para permitir autodeteção.
            
            complete: (results) => {
                // NOVO: Verificador de erros de parsing
                if (results.errors.length > 0) {
                    console.error("Erros de parsing do CSV:", results.errors);
                    alert(`Ocorreram erros ao ler o arquivo CSV. O erro mais comum é a falta de um cabeçalho ou delimitadores inconsistentes. Verifique o console (F12) para detalhes e tente novamente.`);
                    return;
                }

                if (!results.data || results.data.length === 0) {
                    alert("O arquivo CSV parece estar vazio ou em um formato não reconhecido.");
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
        // Validação: Garante que os campos existem antes de tentar usá-los.
        if (!data[0] || !data[0]["Loja Oficial"] || !data[0]["Estado Atual"]) {
            console.warn("Os cabeçalhos 'Loja Oficial' ou 'Estado Atual' não foram encontrados no CSV.");
            return;
        }

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

        // Filtros com checagem de segurança
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
            const units = item["Unidades"]; // dynamicTyping já converte para número

            if (sku && units && !isNaN(units)) {
                const cost = costData[sku] || 0;
                const distributor = sku.split('-').pop(); 

                if (cost > 0) {
                    if (!distributorCost[distributor]) distributorCost[distributor] = 0;
                    distributorCost[distributor] += cost * units;
                }

                if (!productCount[sku]) productCount[sku] = 0;
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

        let costHtml = '<h3>Custo a Pagar por Fornecedor</h3><table><thead><tr><th>Fornecedor</th><th>Custo Total</th></tr></thead><tbody>';
        Object.keys(distributorCost).forEach(distributor => {
            costHtml += `<tr><td>${distributor}</td><td>R$ ${distributorCost[distributor].toFixed(2)}</td></tr>`;
            totalCostToPay += distributorCost[distributor];
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
    
    const displayFullSalesTable = (data) => {
        if(data.length === 0){
            salesTableContainer.innerHTML = '<p>Nenhum dado de venda para exibir.</p>';
            return;
        }

        const headers = results.meta.fields;
        let table = '<table><thead><tr>';
        headers.forEach(h => table += `<th>${h}</th>`);
        table += '</tr></thead><tbody>';

        data.forEach(row => {
            table += '<tr>';
            headers.forEach(h => table += `<td>${row[h] !== undefined ? row[h] : ''}</td>`);
            table += '</tr>';
        });

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
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    [startDateFilter, endDateFilter, skuFilter, storeFilter, statusFilter].forEach(filter => {
        filter.addEventListener('change', runAnalysis);
        if (filter.type === 'text') {
            filter.addEventListener('keyup', runAnalysis);
        }
    });
});