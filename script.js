// script.js - Sistema NSO - Versão Completa com Dashboard Funcional
const API_BASE_URL = 'http://localhost:8000/api';

// VARIÁVEL GLOBAL para o dashboard
let dashboardInstance = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM carregado! Sistema NSO inicializando...');
    
    initApp();
});

async function initApp() {
    try {
        setupNavigation();
        setupEventListeners();
        setupDashboardTabs();

        // Configurar data de envio para hoje
        const today = new Date().toISOString().split('T')[0];
        const dataEnvio = document.getElementById('data-envio');
        if (dataEnvio) dataEnvio.value = today;

        // Verificar status da API
        await checkAPIStatus();
        
        // Carregar dados iniciais
        await loadEquipamentos();
        
        // Inicializar dashboard se estiver na aba correta
        if (document.getElementById('dashboard').classList.contains('active')) {
            await initializeDashboard();
        }
        
        console.log('✅ Sistema NSO inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showNotification('Erro ao inicializar o sistema', 'error');
    }
}

// ====================== NAVEGAÇÃO =========================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            const target = this.dataset.target;

            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.content-section')
                .forEach(s => s.classList.remove('active'));

            document.getElementById(target).classList.add('active');

            // Atualizar título da página
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                if (target === "cadastrar") {
                    pageTitle.textContent = "Cadastrar Equipamento";
                } else if (target === "lista") {
                    pageTitle.textContent = "Lista de Equipamentos";
                    await loadEquipamentos();
                } else if (target === "dashboard") {
                    pageTitle.textContent = "Dashboard & Análises";
                    // Inicializar dashboard se ainda não foi
                    await initializeDashboard();
                }
            }
        });
    });
}

// ====================== DASHBOARD CLASS =========================
class DashboardNSO {
    constructor() {
        this.charts = {};
        this.currentData = [];
        this.filters = {
            dataInicio: null,
            dataFim: null,
            empresa: 'todas',
            fornecedor: 'todos'
        };
    }
    
    async init() {
        console.log('📊 Inicializando dashboard...');
        try {
            await this.loadData();
            this.updateFilters();
            this.renderDashboard();
            console.log('✅ Dashboard inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar dashboard:', error);
            showNotification('Erro ao carregar dashboard', 'error');
        }
    }
    
    async loadData() {
        console.log('📥 Carregando dados da API...');
        try {
            const response = await fetch(`${API_BASE_URL}/equipamentos`);
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ Dados carregados: ${data.length} equipamentos`);
            
            this.currentData = data.map(item => {
                // Converter datas
                const dataEnvio = new Date(item.data_envio);
                const dataRetorno = item.data_retorno ? new Date(item.data_retorno) : null;
                
                // Calcular dias em assistência
                const fim = dataRetorno || new Date();
                const diasAssistencia = Math.max(0, Math.ceil((fim - dataEnvio) / (1000 * 60 * 60 * 24)));
                
                return {
                    ...item,
                    data_envio: dataEnvio,
                    data_retorno: dataRetorno,
                    dias_assistencia: diasAssistencia,
                    retornou: Boolean(item.retornou),
                    tem_arquivo: Boolean(item.tem_arquivo),
                    mes_envio: dataEnvio.toISOString().slice(0, 7),
                    ano: dataEnvio.getFullYear(),
                    mes: dataEnvio.getMonth() + 1
                };
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            showNotification('Erro ao carregar dados do dashboard', 'error');
            // Usar dados de exemplo se a API não estiver disponível
            if (this.currentData.length === 0) {
                this.currentData = this.getDadosExemplo();
                console.log('⚠️ Usando dados de exemplo');
            }
            return false;
        }
    }
    
    getDadosExemplo() {
        const hoje = new Date();
        const umMesAtras = new Date();
        umMesAtras.setMonth(hoje.getMonth() - 1);
        
        return [
            {
                id: 1,
                projeto: 'Intermunicipal',
                fornecedor: 'Autopass',
                modelo: 'K4',
                numero_serie: '00187',
                defeito: 'Falhando ao digitar',
                data_envio: umMesAtras,
                data_retorno: new Date(umMesAtras.getTime() + 10 * 24 * 60 * 60 * 1000),
                empresa: 'AVUL',
                filial: 'Osasco',
                retornou: true,
                tem_arquivo: true,
                dias_assistencia: 10,
                mes_envio: umMesAtras.toISOString().slice(0, 7),
                ano: umMesAtras.getFullYear(),
                mes: umMesAtras.getMonth() + 1
            },
            {
                id: 2,
                projeto: 'Municipal',
                fornecedor: 'Prodata',
                modelo: 'V3680',
                numero_serie: '3372',
                defeito: 'Desligando ao encostar cartão',
                data_envio: new Date(umMesAtras.getTime() + 2 * 24 * 60 * 60 * 1000),
                data_retorno: new Date(umMesAtras.getTime() + 12 * 24 * 60 * 60 * 1000),
                empresa: 'VSBL',
                filial: 'Jaguara',
                retornou: true,
                tem_arquivo: true,
                dias_assistencia: 10,
                mes_envio: new Date(umMesAtras.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
                ano: new Date(umMesAtras.getTime() + 2 * 24 * 60 * 60 * 1000).getFullYear(),
                mes: new Date(umMesAtras.getTime() + 2 * 24 * 60 * 60 * 1000).getMonth() + 1
            },
            {
                id: 3,
                projeto: 'Intermunicipal',
                fornecedor: 'Autopass',
                modelo: 'K4',
                numero_serie: 's/n',
                defeito: 'Tecla 2 com mau contato',
                data_envio: new Date(umMesAtras.getTime() + 5 * 24 * 60 * 60 * 1000),
                data_retorno: null,
                empresa: 'AVUL',
                filial: 'Osasco',
                retornou: false,
                tem_arquivo: false,
                dias_assistencia: 25,
                mes_envio: new Date(umMesAtras.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
                ano: new Date(umMesAtras.getTime() + 5 * 24 * 60 * 60 * 1000).getFullYear(),
                mes: new Date(umMesAtras.getTime() + 5 * 24 * 60 * 60 * 1000).getMonth() + 1
            },
            {
                id: 4,
                projeto: 'Municipal',
                fornecedor: 'Noxxon',
                modelo: 'V3695',
                numero_serie: '4456',
                defeito: 'Tela não liga',
                data_envio: new Date(umMesAtras.getTime() + 7 * 24 * 60 * 60 * 1000),
                data_retorno: new Date(umMesAtras.getTime() + 20 * 24 * 60 * 60 * 1000),
                empresa: 'VCCL',
                filial: 'Franco',
                retornou: true,
                tem_arquivo: false,
                dias_assistencia: 13,
                mes_envio: new Date(umMesAtras.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
                ano: new Date(umMesAtras.getTime() + 7 * 24 * 60 * 60 * 1000).getFullYear(),
                mes: new Date(umMesAtras.getTime() + 7 * 24 * 60 * 60 * 1000).getMonth() + 1
            }
        ];
    }
    
    updateFilters() {
        console.log('🔄 Atualizando filtros...');
        
        // Preencher filtros de empresa
        const empresas = [...new Set(this.currentData.map(item => item.empresa))].sort();
        const empresaSelect = document.getElementById('filter-empresa');
        if (empresaSelect) {
            empresaSelect.innerHTML = '<option value="todas">Todas</option>';
            empresas.forEach(empresa => {
                const option = document.createElement('option');
                option.value = empresa;
                option.textContent = empresa;
                empresaSelect.appendChild(option);
            });
        }
        
        // Preencher filtros de fornecedor
        const fornecedores = [...new Set(this.currentData.map(item => item.fornecedor))].sort();
        const fornecedorSelect = document.getElementById('filter-fornecedor');
        if (fornecedorSelect) {
            fornecedorSelect.innerHTML = '<option value="todos">Todos</option>';
            fornecedores.forEach(fornecedor => {
                const option = document.createElement('option');
                option.value = fornecedor;
                option.textContent = fornecedor;
                fornecedorSelect.appendChild(option);
            });
        }
        
        // Preencher datalist para busca por número de série
        const series = [...new Set(this.currentData.map(item => item.numero_serie))].sort();
        const serieDatalist = document.getElementById('series-list');
        if (serieDatalist) {
            serieDatalist.innerHTML = '';
            series.forEach(serie => {
                if (serie && serie !== "SN NÃO INFORMADO") {
                    const option = document.createElement('option');
                    option.value = serie;
                    serieDatalist.appendChild(option);
                }
            });
        }
        
        // Configurar datas padrão
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);
        
        const dataInicioInput = document.getElementById('filter-data-inicio');
        const dataFimInput = document.getElementById('filter-data-fim');
        
        if (dataInicioInput) {
            dataInicioInput.value = seisMesesAtras.toISOString().split('T')[0];
        }
        if (dataFimInput) {
            dataFimInput.value = hoje.toISOString().split('T')[0];
        }
        
        this.filters.dataInicio = seisMesesAtras;
        this.filters.dataFim = hoje;
    }
    
    getFilteredData() {
        let filtered = [...this.currentData];
        
        // Aplicar filtros
        if (this.filters.dataInicio) {
            filtered = filtered.filter(item => item.data_envio >= this.filters.dataInicio);
        }
        
        if (this.filters.dataFim) {
            const dataFimAjustada = new Date(this.filters.dataFim);
            dataFimAjustada.setHours(23, 59, 59, 999);
            filtered = filtered.filter(item => item.data_envio <= dataFimAjustada);
        }
        
        if (this.filters.empresa !== 'todas') {
            filtered = filtered.filter(item => item.empresa === this.filters.empresa);
        }
        
        if (this.filters.fornecedor !== 'todos') {
            filtered = filtered.filter(item => item.fornecedor === this.filters.fornecedor);
        }
        
        console.log(`📊 Dados filtrados: ${filtered.length} registros`);
        return filtered;
    }
    
    applyFilters() {
        console.log('🔍 Aplicando filtros...');
        const dataInicio = document.getElementById('filter-data-inicio').value;
        const dataFim = document.getElementById('filter-data-fim').value;
        const empresa = document.getElementById('filter-empresa').value;
        const fornecedor = document.getElementById('filter-fornecedor').value;
        
        this.filters = {
            dataInicio: dataInicio ? new Date(dataInicio) : null,
            dataFim: dataFim ? new Date(dataFim) : null,
            empresa,
            fornecedor
        };
        
        this.renderDashboard();
        showNotification('Filtros aplicados com sucesso!', 'success');
    }
    
    async refreshDashboard() {
        console.log('🔄 Atualizando dashboard...');
        showNotification('Atualizando dados do dashboard...', 'info');
        await this.loadData();
        this.renderDashboard();
        showNotification('Dashboard atualizado com sucesso!', 'success');
    }
    
    renderDashboard() {
        console.log('🎨 Renderizando dashboard...');
        try {
            const data = this.getFilteredData();
            
            // Atualizar métricas gerais
            this.updateMetrics(data);
            
            // Atualizar abas
            this.renderModelAnalysis(data);
            this.renderSupplierAnalysis(data);
            this.renderDefectsAnalysis(data);
            this.renderTrends();
            
            // Atualizar insights rápidos
            this.updateQuickInsights(data);
            
            console.log('✅ Dashboard renderizado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao renderizar dashboard:', error);
            showNotification('Erro ao renderizar dashboard', 'error');
        }
    }
    
    updateMetrics(data) {
        const total = data.length;
        const retornados = data.filter(item => item.retornou).length;
        const emAssistencia = total - retornados;
        const taxaRetorno = total > 0 ? (retornados / total * 100).toFixed(1) : 0;
        
        console.log(`📈 Métricas: Total=${total}, Retornados=${retornados}, Em assistência=${emAssistencia}, Taxa=${taxaRetorno}%`);
        
        const totalElement = document.getElementById('total-equipamentos');
        const retornadosElement = document.getElementById('equipamentos-retornados');
        const emAssistenciaElement = document.getElementById('em-assistencia');
        const taxaRetornoElement = document.getElementById('taxa-retorno');
        
        if (totalElement) totalElement.textContent = total;
        if (retornadosElement) retornadosElement.textContent = retornados;
        if (emAssistenciaElement) emAssistenciaElement.textContent = emAssistencia;
        if (taxaRetornoElement) taxaRetornoElement.textContent = `${taxaRetorno}%`;
    }
    
    renderModelAnalysis(data) {
        // Agrupar por modelo
        const modelGroups = {};
        
        data.forEach(item => {
            if (!modelGroups[item.modelo]) {
                modelGroups[item.modelo] = {
                    total: 0,
                    uniqueSeries: new Set(),
                    totalDays: 0,
                    returned: 0
                };
            }
            
            modelGroups[item.modelo].total++;
            modelGroups[item.modelo].uniqueSeries.add(item.numero_serie);
            modelGroups[item.modelo].totalDays += item.dias_assistencia;
            if (item.retornou) modelGroups[item.modelo].returned++;
        });
        
        // Converter para array e ordenar
        const modelArray = Object.entries(modelGroups).map(([modelo, stats]) => ({
            modelo,
            totalEnvios: stats.total,
            equipUnicos: stats.uniqueSeries.size,
            diasMedios: stats.total > 0 ? (stats.totalDays / stats.total).toFixed(1) : 0,
            taxaRetorno: stats.total > 0 ? ((stats.returned / stats.total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.totalEnvios - a.totalEnvios);
        
        // Atualizar tabela
        const tableBody = document.querySelector('#table-modelos tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            modelArray.slice(0, 10).forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.modelo}</strong></td>
                    <td>${item.totalEnvios}</td>
                    <td>${item.equipUnicos}</td>
                    <td>${item.diasMedios} dias</td>
                    <td>${item.taxaRetorno}%</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Criar gráfico
        this.renderChart('chart-modelos', {
            type: 'bar',
            data: {
                labels: modelArray.slice(0, 10).map(item => item.modelo),
                datasets: [{
                    label: 'Total de Envios',
                    data: modelArray.slice(0, 10).map(item => item.totalEnvios),
                    backgroundColor: '#FFD700',
                    borderColor: '#FFC400',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Modelos com Mais Envios',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#333' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#333' }
                    }
                }
            }
        });
    }
    
    renderSupplierAnalysis(data) {
        // Agrupar por fornecedor
        const supplierGroups = {};
        
        data.forEach(item => {
            if (!supplierGroups[item.fornecedor]) {
                supplierGroups[item.fornecedor] = {
                    total: 0,
                    totalDays: 0,
                    returned: 0
                };
            }
            
            supplierGroups[item.fornecedor].total++;
            supplierGroups[item.fornecedor].totalDays += item.dias_assistencia;
            if (item.retornou) supplierGroups[item.fornecedor].returned++;
        });
        
        // Converter para array
        const supplierArray = Object.entries(supplierGroups).map(([fornecedor, stats]) => ({
            fornecedor,
            totalEnvios: stats.total,
            diasMedios: stats.total > 0 ? (stats.totalDays / stats.total).toFixed(1) : 0,
            taxaRetorno: stats.total > 0 ? ((stats.returned / stats.total) * 100).toFixed(1) : 0,
            status: stats.total > 0 ? ((stats.returned / stats.total) * 100 > 80 ? '👍 Bom' : 
                    (stats.returned / stats.total) * 100 > 50 ? '⚠️ Médio' : '👎 Ruim') : 'N/A'
        })).sort((a, b) => b.totalEnvios - a.totalEnvios);
        
        // Atualizar tabela
        const tableBody = document.querySelector('#table-fornecedores tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            supplierArray.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.fornecedor}</strong></td>
                    <td>${item.totalEnvios}</td>
                    <td>${item.diasMedios} dias</td>
                    <td>${item.taxaRetorno}%</td>
                    <td>${item.status}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Criar gráfico de pizza
        this.renderChart('chart-fornecedores', {
            type: 'doughnut',
            data: {
                labels: supplierArray.map(item => item.fornecedor),
                datasets: [{
                    data: supplierArray.map(item => item.totalEnvios),
                    backgroundColor: [
                        '#FFD700', '#FFC400', '#FFA000', '#FF8F00', '#FF6F00',
                        '#FF5722', '#E64A19', '#D84315', '#BF360C', '#8D6E63'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Fornecedor',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'right',
                        labels: { color: '#333', font: { size: 12 } }
                    }
                }
            }
        });
    }
    
    renderDefectsAnalysis(data) {
        // Contar defeitos
        const defectCounts = {};
        
        data.forEach(item => {
            const defeito = item.defeito || 'Não especificado';
            if (!defectCounts[defeito]) {
                defectCounts[defeito] = 0;
            }
            defectCounts[defeito]++;
        });
        
        // Converter para array e ordenar
        const defectArray = Object.entries(defectCounts)
            .map(([defeito, count]) => ({
                defeito,
                ocorrencias: count,
                percentual: data.length > 0 ? ((count / data.length) * 100).toFixed(2) : '0.00'
            }))
            .sort((a, b) => b.ocorrencias - a.ocorrencias)
            .slice(0, 10);
        
        // Atualizar tabela
        const tableBody = document.querySelector('#table-defeitos tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            defectArray.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.defeito.length > 50 ? item.defeito.substring(0, 50) + '...' : item.defeito}</td>
                    <td>${item.ocorrencias}</td>
                    <td>${item.percentual}%</td>
                    <td>-</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Criar gráfico de barras horizontais
        this.renderChart('chart-defeitos', {
            type: 'bar',
            data: {
                labels: defectArray.map(item => 
                    item.defeito.length > 30 ? item.defeito.substring(0, 30) + '...' : item.defeito
                ),
                datasets: [{
                    label: 'Ocorrências',
                    data: defectArray.map(item => item.ocorrencias),
                    backgroundColor: '#FF5722',
                    borderColor: '#E64A19',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Defeitos Mais Comuns',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#333' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#333' }
                    }
                }
            }
        });
    }
    
    renderTrends() {
        const data = this.getFilteredData();
        const periodElement = document.getElementById('trend-period');
        const period = periodElement ? parseInt(periodElement.value) : 12;
        
        // Agrupar por mês
        const monthlyData = {};
        
        data.forEach(item => {
            const monthKey = item.data_envio.toISOString().slice(0, 7); // YYYY-MM
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    total: 0,
                    returned: 0,
                    totalDays: 0
                };
            }
            
            monthlyData[monthKey].total++;
            if (item.retornou) monthlyData[monthKey].returned++;
            monthlyData[monthKey].totalDays += item.dias_assistencia;
        });
        
        // Converter para array e ordenar
        let trendArray = Object.entries(monthlyData)
            .map(([month, stats]) => ({
                month,
                totalEnvios: stats.total,
                taxaRetorno: stats.total > 0 ? ((stats.returned / stats.total) * 100).toFixed(1) : 0,
                diasMedios: stats.total > 0 ? (stats.totalDays / stats.total).toFixed(1) : 0
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
        
        // Aplicar filtro de período
        if (period !== 'all') {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - period);
            const cutoffKey = cutoffDate.toISOString().slice(0, 7);
            
            trendArray = trendArray.filter(item => item.month >= cutoffKey);
        }
        
        // Formatar labels para exibição (MM/YYYY)
        const formattedLabels = trendArray.map(item => {
            const [year, month] = item.month.split('-');
            return `${month}/${year}`;
        });
        
        // Gráfico de envios mensais
        this.renderChart('chart-tendencia-envios', {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Envios para Assistência',
                    data: trendArray.map(item => item.totalEnvios),
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FFD700',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendência de Envios Mensais',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        labels: { color: '#333', font: { size: 12 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#333' }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#333' }
                    }
                }
            }
        });
        
        // Gráfico de taxa de retorno
        this.renderChart('chart-tendencia-retorno', {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Taxa de Retorno (%)',
                    data: trendArray.map(item => parseFloat(item.taxaRetorno)),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4CAF50',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendência da Taxa de Retorno',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        labels: { color: '#333', font: { size: 12 } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            color: '#333',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#333' }
                    }
                }
            }
        });
        
        // Atualizar insights
        this.updateTrendInsights(trendArray);
    }
    
    updateTrendInsights(trendArray) {
        const insightMesPico = document.getElementById('insight-mes-pico');
        const insightTendencia = document.getElementById('insight-tendencia');
        
        if (!insightMesPico || !insightTendencia || trendArray.length === 0) {
            if (insightMesPico) insightMesPico.textContent = 'Dados insuficientes para análise';
            if (insightTendencia) insightTendencia.textContent = 'Dados insuficientes para análise';
            return;
        }
        
        // Encontrar mês com mais envios
        const mesPico = trendArray.reduce((prev, current) => 
            prev.totalEnvios > current.totalEnvios ? prev : current
        );
        
        // Formatar mês
        const [year, month] = mesPico.month.split('-');
        const mesFormatado = `${month}/${year}`;
        
        // Calcular tendência
        let tendencia = 'estável';
        if (trendArray.length >= 2) {
            const primeiro = trendArray[0].totalEnvios;
            const ultimo = trendArray[trendArray.length - 1].totalEnvios;
            const diferenca = ((ultimo - primeiro) / primeiro) * 100;
            
            if (diferenca > 10) tendencia = 'crescendo 📈';
            else if (diferenca < -10) tendencia = 'decrescendo 📉';
        }
        
        insightMesPico.textContent = `Mês com mais envios: ${mesFormatado} (${mesPico.totalEnvios} envios)`;
        insightTendencia.textContent = `Tendência atual: ${tendencia} em relação ao período anterior`;
    }
    
    updateQuickInsights(data) {
        const modeloProblematicoElement = document.getElementById('modelo-problematico');
        const fornecedorEficienteElement = document.getElementById('fornecedor-eficiente');
        const tempoMedioGeralElement = document.getElementById('tempo-medio-geral');
        const defeitoComumElement = document.getElementById('defeito-comum');
        
        if (!modeloProblematicoElement || !fornecedorEficienteElement || 
            !tempoMedioGeralElement || !defeitoComumElement) {
            return;
        }
        
        if (data.length === 0) {
            modeloProblematicoElement.textContent = 'Sem dados suficientes';
            fornecedorEficienteElement.textContent = 'Sem dados suficientes';
            tempoMedioGeralElement.textContent = 'Sem dados suficientes';
            defeitoComumElement.textContent = 'Sem dados suficientes';
            return;
        }
        
        // Modelo mais problemático
        const modelCounts = {};
        data.forEach(item => {
            modelCounts[item.modelo] = (modelCounts[item.modelo] || 0) + 1;
        });
        
        const modeloProblematico = Object.entries(modelCounts).length > 0
            ? Object.entries(modelCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : 'Nenhum';
        
        // Fornecedor mais eficiente (maior taxa de retorno)
        const supplierStats = {};
        data.forEach(item => {
            if (!supplierStats[item.fornecedor]) {
                supplierStats[item.fornecedor] = { total: 0, returned: 0 };
            }
            supplierStats[item.fornecedor].total++;
            if (item.retornou) supplierStats[item.fornecedor].returned++;
        });
        
        let fornecedorEficiente = 'N/A';
        let melhorTaxa = 0;
        
        Object.entries(supplierStats).forEach(([fornecedor, stats]) => {
            if (stats.total >= 2) { // Mínimo de 2 envios para considerar
                const taxa = (stats.returned / stats.total) * 100;
                if (taxa > melhorTaxa) {
                    melhorTaxa = taxa;
                    fornecedorEficiente = fornecedor;
                }
            }
        });
        
        // Tempo médio geral
        const tempoMedioGeral = data.length > 0 ? 
            (data.reduce((sum, item) => sum + item.dias_assistencia, 0) / data.length).toFixed(1) : 0;
        
        // Defeito mais comum
        const defectCounts = {};
        data.forEach(item => {
            const defeito = item.defeito || 'Não especificado';
            defectCounts[defeito] = (defectCounts[defeito] || 0) + 1;
        });
        
        const defeitoComum = Object.entries(defectCounts).length > 0
            ? Object.entries(defectCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : 'Nenhum';
        
        // Atualizar elementos
        modeloProblematicoElement.textContent = modeloProblematico;
        fornecedorEficienteElement.textContent = 
            fornecedorEficiente !== 'N/A' 
                ? `${fornecedorEficiente} (${melhorTaxa.toFixed(1)}% retorno)`
                : 'Dados insuficientes';
        tempoMedioGeralElement.textContent = `${tempoMedioGeral} dias`;
        defeitoComumElement.textContent = 
            defeitoComum.length > 40 ? defeitoComum.substring(0, 40) + '...' : defeitoComum;
    }
    
    renderChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas não encontrado: ${canvasId}`);
            return;
        }
        
        // Destruir gráfico existente
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        try {
            // Criar novo gráfico
            const ctx = canvas.getContext('2d');
            this.charts[canvasId] = new Chart(ctx, config);
            console.log(`✅ Gráfico ${canvasId} renderizado`);
        } catch (error) {
            console.error(`❌ Erro ao renderizar gráfico ${canvasId}:`, error);
        }
    }
    
    searchBySerialNumber(serialNumber) {
        if (!serialNumber) {
            const serieDetails = document.getElementById('serie-details');
            if (serieDetails) serieDetails.style.display = 'none';
            return;
        }
        
        console.log(`🔍 Buscando série: ${serialNumber}`);
        const historico = this.currentData.filter(item => item.numero_serie === serialNumber);
        
        if (historico.length === 0) {
            // Tentar busca parcial (case insensitive)
            const historicoParcial = this.currentData.filter(item => 
                item.numero_serie.toLowerCase().includes(serialNumber.toLowerCase())
            );
            
            if (historicoParcial.length === 0) {
                showNotification('Nenhum histórico encontrado para este número de série', 'info');
                return;
            } else {
                // Se encontrar por busca parcial, mostrar o primeiro resultado
                const primeiroResultado = historicoParcial[0];
                console.log(`⚠️ Número de série não encontrado exatamente. Usando: ${primeiroResultado.numero_serie}`);
                showNotification(`Número exato não encontrado. Mostrando resultados para: ${primeiroResultado.numero_serie}`, 'info');
                this.searchBySerialNumber(primeiroResultado.numero_serie);
                return;
            }
        }
        
        // Ordenar por data (mais recente primeiro)
        historico.sort((a, b) => b.data_envio - a.data_envio);
        
        // Calcular estatísticas
        const totalEnvios = historico.length;
        const retornados = historico.filter(item => item.retornou).length;
        const taxaRetorno = totalEnvios > 0 ? ((retornados / totalEnvios) * 100).toFixed(1) : 0;
        const tempoMedio = totalEnvios > 0 ? 
            (historico.reduce((sum, item) => sum + item.dias_assistencia, 0) / totalEnvios).toFixed(1) : 0;
        
        // Atualizar header
        const serieNumeroElement = document.getElementById('serie-numero');
        const totalEnviosElement = document.getElementById('total-envios');
        const tempoMedioElement = document.getElementById('tempo-medio');
        const taxaRetornoElement = document.getElementById('taxa-retorno-serie');
        
        if (serieNumeroElement) serieNumeroElement.textContent = serialNumber;
        if (totalEnviosElement) totalEnviosElement.textContent = `${totalEnvios} envio(s)`;
        if (tempoMedioElement) tempoMedioElement.textContent = `${tempoMedio} dias médios`;
        if (taxaRetornoElement) taxaRetornoElement.textContent = `${taxaRetorno}% de retorno`;
        
        // Atualizar timeline
        const timeline = document.querySelector('.serie-timeline');
        if (timeline) {
            timeline.innerHTML = '<h4><i class="fas fa-history"></i> Histórico de Assistências</h4>';
            
            historico.forEach((item, index) => {
                const envioDate = item.data_envio.toLocaleDateString('pt-BR');
                const retornoDate = item.retornou && item.data_retorno ? 
                    item.data_retorno.toLocaleDateString('pt-BR') : 'Pendente';
                
                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                timelineItem.innerHTML = `
                    <div class="timeline-marker ${item.retornou ? 'retornado' : 'pendente'}"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">
                            <i class="fas fa-calendar"></i>
                            Envio: ${envioDate} | Retorno: ${retornoDate}
                        </div>
                        <div class="timeline-title">
                            <strong>${item.fornecedor} - ${item.modelo}</strong><br>
                            ${item.defeito}
                        </div>
                        <div class="timeline-details">
                            <span class="badge">${item.empresa} - ${item.filial}</span>
                            <span class="badge">${item.dias_assistencia} dias</span>
                            <span class="badge">${item.retornou ? 'Retornado' : 'Em assistência'}</span>
                        </div>
                    </div>
                `;
                timeline.appendChild(timelineItem);
            });
        }
        
        // Atualizar tabela de histórico
        const tableBody = document.querySelector('#table-serie-historico tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            historico.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.data_envio.toLocaleDateString('pt-BR')}</td>
                    <td>${item.retornou && item.data_retorno ? item.data_retorno.toLocaleDateString('pt-BR') : '-'}</td>
                    <td>${item.defeito}</td>
                    <td>${item.fornecedor}</td>
                    <td>${item.dias_assistencia}</td>
                    <td>${item.retornou ? 
                        '<span class="status-retornou"><i class="fas fa-check-circle"></i> Retornado</span>' : 
                        '<span class="status-pendente"><i class="fas fa-clock"></i> Em aberto</span>'}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Mostrar detalhes
        const serieDetails = document.getElementById('serie-details');
        if (serieDetails) {
            serieDetails.style.display = 'block';
            console.log(`✅ Detalhes da série ${serialNumber} exibidos`);
        }
    }
    
    exportarModelos() {
        this.exportTable('table-modelos', 'analise_modelos.csv');
    }
    
    exportarFornecedores() {
        this.exportTable('table-fornecedores', 'analise_fornecedores.csv');
    }
    
    exportarDefeitos() {
        this.exportTable('table-defeitos', 'analise_defeitos.csv');
    }
    
    exportTable(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const rows = table.querySelectorAll('tr');
        const csv = [];
        
        rows.forEach(row => {
            const rowData = [];
            row.querySelectorAll('th, td').forEach(cell => {
                let text = cell.textContent.trim();
                text = text.replace(/<[^>]*>/g, '');
                if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                    text = `"${text.replace(/"/g, '""')}"`;
                }
                rowData.push(text);
            });
            csv.push(rowData.join(','));
        });
        
        const csvString = csv.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exportado como ${filename}`, 'success');
    }
}

// ====================== FUNÇÕES AUXILIARES =========================
async function initializeDashboard() {
    console.log('🚀 Inicializando dashboard...');
    try {
        if (!dashboardInstance) {
            dashboardInstance = new DashboardNSO();
        }
        await dashboardInstance.init();
        showNotification('Dashboard carregado com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao inicializar dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

// ====================== EVENT LISTENERS =========================
function setupEventListeners() {
    const form = document.getElementById('equipamento-form');
    if (form) form.addEventListener('submit', handleAddEquipamento);

    const formEditar = document.getElementById('form-editar');
    if (formEditar) formEditar.addEventListener('submit', handleEditEquipamento);

    const search = document.getElementById('search-serie');
    if (search) {
        search.addEventListener('input', function(e) {
            searchBySerialNumber(e.target.value);
        });
    }

    // Botão de atualizar dashboard
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            if (dashboardInstance) {
                await dashboardInstance.refreshDashboard();
            } else {
                await initializeDashboard();
            }
        });
    }

    // Botão de aplicar filtros do dashboard
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            if (dashboardInstance) {
                dashboardInstance.applyFilters();
            } else {
                showNotification('Dashboard não inicializado. Clique em "Atualizar".', 'error');
            }
        });
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('modal-editar');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                fecharModal();
            }
        });
    }
}

function setupDashboardTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remover active de todos os botões
            tabButtons.forEach(b => b.classList.remove('active'));
            // Adicionar active ao botão clicado
            this.classList.add('active');
            
            // Esconder todas as abas
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Mostrar a aba selecionada
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Executar função específica da aba se necessário
            if (tabName === 'tendencia' && dashboardInstance) {
                dashboardInstance.renderTrends();
            }
            
            // Se for aba de série, limpar busca
            if (tabName === 'serie') {
                const searchSerie = document.getElementById('search-numero-serie');
                if (searchSerie) searchSerie.value = '';
                const serieDetails = document.getElementById('serie-details');
                if (serieDetails) serieDetails.style.display = 'none';
            }
        });
    });

    // Evento para busca de número de série no dashboard
    const searchSerieInput = document.getElementById('search-numero-serie');
    const searchSerieBtn = document.getElementById('search-serie-btn');
    const clearSerieBtn = document.getElementById('clear-serie-btn');
    
    if (searchSerieBtn) {
        searchSerieBtn.addEventListener('click', function() {
            if (dashboardInstance && searchSerieInput) {
                const serieValue = searchSerieInput.value.trim();
                if (serieValue) {
                    dashboardInstance.searchBySerialNumber(serieValue);
                } else {
                    showNotification('Digite um número de série para buscar', 'info');
                }
            } else {
                showNotification('Dashboard não inicializado. Clique em "Atualizar".', 'error');
            }
        });
    }
    
    // Permitir busca ao pressionar Enter
    if (searchSerieInput) {
        searchSerieInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && dashboardInstance) {
                const serieValue = this.value.trim();
                if (serieValue) {
                    dashboardInstance.searchBySerialNumber(serieValue);
                }
            }
        });
    }
    
    // Botão para limpar busca
    if (clearSerieBtn) {
        clearSerieBtn.addEventListener('click', function() {
            if (searchSerieInput) {
                searchSerieInput.value = '';
                searchSerieInput.focus();
            }
            const serieDetails = document.getElementById('serie-details');
            if (serieDetails) {
                serieDetails.style.display = 'none';
            }
            showNotification('Busca limpa', 'info');
        });
    }

    // Evento para período de tendências
    const trendPeriod = document.getElementById('trend-period');
    if (trendPeriod) {
        trendPeriod.addEventListener('change', function() {
            if (dashboardInstance) {
                dashboardInstance.renderTrends();
            } else {
                showNotification('Dashboard não inicializado. Clique em "Atualizar".', 'error');
            }
        });
    }
}

// ====================== API HELPER =========================
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            method: options.method || "GET",
            headers: { "Content-Type": "application/json" }
        };

        if (options.body) config.body = JSON.stringify(options.body);

        console.log(`🌐 API Request: ${url}`, config.method);
        const response = await fetch(url, config);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }
        return await response.json();

    } catch (err) {
        console.error(`❌ Erro na requisição ${endpoint}:`, err);
        showNotification("Erro ao comunicar com o servidor!", "error");
        throw err;
    }
}

// ====================== STATUS API =========================
async function checkAPIStatus() {
    try {
        const status = await apiRequest("/health");
        console.log(`✅ API Online - ${status.total_equipamentos} equipamentos`);

        document.querySelector(".system-status").innerHTML = `
            <i class="fas fa-circle" style="color: #4CAF50"></i>
            Sistema Online — ${status.total_equipamentos} equipamentos
        `;

    } catch {
        console.warn('⚠️ API Offline');
        document.querySelector(".system-status").innerHTML = `
            <i class="fas fa-circle" style="color: #D32F2F"></i>
            Sistema OFFLINE - Verifique o servidor
        `;
    }
}

// ====================== LISTA DE EQUIPAMENTOS =========================
async function loadEquipamentos() {
    try {
        console.log('📋 Carregando lista de equipamentos...');
        const equipamentos = await apiRequest("/equipamentos");
        renderEquipamentosTable(equipamentos);
        console.log(`✅ Lista carregada: ${equipamentos.length} equipamentos`);
    } catch (err) {
        console.error("Erro ao carregar equipamentos:", err);
        showNotification("Erro ao carregar lista de equipamentos!", "error");
    }
}

function renderEquipamentosTable(equipamentos) {
    const tbody = document.getElementById("equipamentos-body");

    if (equipamentos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 24px; color: var(--texto-claro); margin-bottom: 10px;"></i>
                    <p style="color: var(--texto-claro);">Nenhum equipamento cadastrado</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = equipamentos.map(eq => `
        <tr>
            <td>${eq.projeto}</td>
            <td>${eq.fornecedor}</td>
            <td>${eq.modelo}</td>
            <td><strong>${eq.numero_serie}</strong></td>
            <td>${eq.defeito}</td>
            <td>${formatDate(eq.data_envio)}</td>
            <td>${eq.data_retorno ? formatDate(eq.data_retorno) : "-"}</td>
            <td>${eq.retornou ? "✔ Sim" : "⏳ Pendente"}</td>
            <td>${eq.tem_arquivo ? "📄 Sim" : "— Não"}</td>
            <td>
                <div class="dropdown">
                    <button class="btn-action dropdown-toggle" onclick="toggleDropdown(${eq.id})" title="Opções">
                        <i class="fas fa-edit"></i>
                        <i class="fas fa-caret-down" style="margin-left: 4px; font-size: 12px;"></i>
                    </button>
                    <div class="dropdown-menu" id="dropdown-${eq.id}">
                        <button type="button" class="dropdown-item" onclick="editarEquipamento(${eq.id})">
                            <i class="fas fa-edit"></i> Editar Equipamento
                        </button>
                        <button type="button" class="dropdown-item" onclick="marcarComoRetornado(${eq.id})">
                            <i class="fas fa-check-circle"></i> Marcar como Retornado
                        </button>
                        <button type="button" class="dropdown-item" onclick="marcarComArquivo(${eq.id})">
                            <i class="fas fa-file"></i> Marcar com Arquivo
                        </button>
                        <button type="button" class="dropdown-item" onclick="duplicarEquipamento(${eq.id})">
                            <i class="fas fa-copy"></i> Duplicar Equipamento
                        </button>
                        <div class="dropdown-divider"></div>
                        <button type="button" class="dropdown-item dropdown-item-danger" onclick="excluirEquipamento(${eq.id})">
                            <i class="fas fa-trash"></i> Excluir Equipamento
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join("");
}

// ====================== FUNÇÕES DE MANIPULAÇÃO DE EQUIPAMENTOS =========================
async function handleAddEquipamento(e) {
    e.preventDefault();

    const formData = {
        projeto: document.getElementById("projeto").value,
        fornecedor: document.getElementById("fornecedor").value,
        modelo: document.getElementById("modelo").value,
        numero_serie: validarNumeroSerieFrontend(document.getElementById("numero-serie").value),
        defeito: document.getElementById("defeito").value,
        empresa: document.getElementById("empresa").value.toUpperCase(),
        filial: document.getElementById("filial").value,
        data_envio: document.getElementById("data-envio").value,
        data_retorno: document.getElementById("data-retorno").value || null,
        retornou: document.getElementById("retornou").checked,
        tem_arquivo: document.getElementById("tem-arquivo").checked
    };

    try {
        console.log('➕ Cadastrando novo equipamento:', formData);
        await apiRequest("/equipamentos", { method: "POST", body: formData });

        showNotification("Equipamento cadastrado com sucesso!", "success");
        document.getElementById("equipamento-form").reset();
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('data-envio').value = today;
        
        // Recarregar lista se estiver na página de lista
        if (document.getElementById('lista').classList.contains('active')) {
            await loadEquipamentos();
        }
        
        // Atualizar dashboard se estiver ativo
        if (dashboardInstance && document.getElementById('dashboard').classList.contains('active')) {
            await dashboardInstance.refreshDashboard();
        }

    } catch (err) {
        console.error("Erro ao cadastrar equipamento:", err);
        showNotification("Erro ao cadastrar equipamento!", "error");
    }
}

// ====================== FUNÇÕES GLOBAIS =========================
function searchBySerialNumber(text) {
    const rows = document.querySelectorAll("#equipamentos-body tr");
    rows.forEach(row => {
        const serie = row.cells[3].textContent.toLowerCase();
        row.style.display = serie.includes(text.toLowerCase()) ? "" : "none";
    });
}

function toggleDropdown(id) {
    fecharTodosDropdowns();
    
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) {
        dropdown.style.display = 'block';
        dropdown.classList.add('show');
        
        const rect = dropdown.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            dropdown.style.right = '0';
            dropdown.style.left = 'auto';
        }
    }
}

function fecharTodosDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-menu');
    dropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
        dropdown.classList.remove('show');
    });
}

// ====================== FUNÇÕES DE EXPORTAÇÃO (GLOBAIS) =========================
function exportarModelos() {
    if (dashboardInstance) {
        dashboardInstance.exportarModelos();
    } else {
        showNotification('Dashboard não inicializado', 'error');
    }
}

function exportarFornecedores() {
    if (dashboardInstance) {
        dashboardInstance.exportarFornecedores();
    } else {
        showNotification('Dashboard não inicializado', 'error');
    }
}

function exportarDefeitos() {
    if (dashboardInstance) {
        dashboardInstance.exportarDefeitos();
    } else {
        showNotification('Dashboard não inicializado', 'error');
    }
}

// ====================== FUNÇÕES UTILITÁRIAS =========================
function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
}

function showNotification(msg, type = "info") {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const box = document.createElement("div");
    box.className = `notification ${type === 'success' ? 'notification-success' : type === 'error' ? 'notification-error' : ''}`;
    box.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${msg}</span>
        </div>
    `;
    document.body.appendChild(box);

    setTimeout(() => {
        box.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => box.remove(), 300);
    }, 3500);
}

function validarNumeroSerieFrontend(numero_serie) {
    if (!numero_serie || numero_serie.trim() === "") {
        return "SN NÃO INFORMADO";
    }
    
    numero_serie = numero_serie.trim().toUpperCase();
    
    if (numero_serie === "SN" || numero_serie === "S/N" || numero_serie === "N/A") {
        return "SN NÃO INFORMADO";
    }
    
    if (numero_serie.startsWith("SN") && numero_serie.length > 2) {
        return numero_serie;
    }
    
    return numero_serie;
}

// ====================== FUNÇÕES DE EDIÇÃO/EXCLUSÃO =========================
async function editarEquipamento(id) {
    try {
        const equipamento = await apiRequest(`/equipamentos/${id}`);
        
        document.getElementById('edit-id').value = equipamento.id;
        document.getElementById('edit-projeto').value = equipamento.projeto;
        document.getElementById('edit-fornecedor').value = equipamento.fornecedor;
        document.getElementById('edit-modelo').value = equipamento.modelo;
        document.getElementById('edit-numero-serie').value = equipamento.numero_serie;
        document.getElementById('edit-defeito').value = equipamento.defeito;
        document.getElementById('edit-empresa').value = equipamento.empresa;
        document.getElementById('edit-filial').value = equipamento.filial;
        document.getElementById('edit-data-envio').value = equipamento.data_envio;
        document.getElementById('edit-data-retorno').value = equipamento.data_retorno || '';
        document.getElementById('edit-retornou').checked = equipamento.retornou;
        document.getElementById('edit-tem-arquivo').checked = equipamento.tem_arquivo;
        
        abrirModal();
        fecharTodosDropdowns();
        
    } catch (err) {
        console.error("Erro ao carregar equipamento para edição:", err);
        showNotification("Erro ao carregar dados do equipamento!", "error");
    }
}

async function handleEditEquipamento(e) {
    e.preventDefault();

    const formData = {
        projeto: document.getElementById("edit-projeto").value,
        fornecedor: document.getElementById("edit-fornecedor").value,
        modelo: document.getElementById("edit-modelo").value,
        numero_serie: validarNumeroSerieFrontend(document.getElementById("edit-numero-serie").value),
        defeito: document.getElementById("edit-defeito").value,
        empresa: document.getElementById("edit-empresa").value.toUpperCase(),
        filial: document.getElementById("edit-filial").value,
        data_envio: document.getElementById("edit-data-envio").value,
        data_retorno: document.getElementById("edit-data-retorno").value || null,
        retornou: document.getElementById("edit-retornou").checked,
        tem_arquivo: document.getElementById("edit-tem-arquivo").checked
    };

    const id = document.getElementById('edit-id').value;

    try {
        await apiRequest(`/equipamentos/${id}`, { 
            method: "PUT", 
            body: formData 
        });

        showNotification("Equipamento atualizado com sucesso!", "success");
        fecharModal();
        await loadEquipamentos();
        
        if (dashboardInstance && document.getElementById('dashboard').classList.contains('active')) {
            await dashboardInstance.refreshDashboard();
        }

    } catch (err) {
        console.error("Erro ao atualizar equipamento:", err);
        showNotification("Erro ao atualizar equipamento!", "error");
    }
}

async function marcarComoRetornado(id) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        
        const dadosAtualizados = {
            retornou: true,
            data_retorno: hoje
        };

        await apiRequest(`/equipamentos/${id}`, { 
            method: "PUT", 
            body: dadosAtualizados 
        });

        showNotification("Equipamento marcado como retornado!", "success");
        await loadEquipamentos();
        fecharTodosDropdowns();

    } catch (err) {
        console.error("Erro ao marcar como retornado:", err);
        showNotification("Erro ao atualizar equipamento!", "error");
    }
}

async function marcarComArquivo(id) {
    try {
        const dadosAtualizados = {
            tem_arquivo: true
        };

        await apiRequest(`/equipamentos/${id}`, { 
            method: "PUT", 
            body: dadosAtualizados 
        });

        showNotification("Equipamento marcado com arquivo!", "success");
        await loadEquipamentos();
        fecharTodosDropdowns();

    } catch (err) {
        console.error("Erro ao marcar com arquivo:", err);
        showNotification("Erro ao atualizar equipamento!", "error");
    }
}

async function duplicarEquipamento(id) {
    try {
        const equipamento = await apiRequest(`/equipamentos/${id}`);
        
        const { id: _, created_at: __, ...dadosDuplicacao } = equipamento;
        
        dadosDuplicacao.numero_serie = `${dadosDuplicacao.numero_serie} (Cópia)`;
        dadosDuplicacao.data_envio = new Date().toISOString().split('T')[0];
        dadosDuplicacao.retornou = false;
        dadosDuplicacao.data_retorno = null;
        dadosDuplicacao.tem_arquivo = false;

        await apiRequest("/equipamentos", { 
            method: "POST", 
            body: dadosDuplicacao 
        });

        showNotification("Equipamento duplicado com sucesso!", "success");
        await loadEquipamentos();
        fecharTodosDropdowns();

    } catch (err) {
        console.error("Erro ao duplicar equipamento:", err);
        showNotification("Erro ao duplicar equipamento!", "error");
    }
}

async function excluirEquipamento(id) {
    if (confirm("Tem certeza que deseja excluir este equipamento?")) {
        try {
            await apiRequest(`/equipamentos/${id}`, { method: "DELETE" });
            showNotification("Equipamento excluído com sucesso!", "success");
            await loadEquipamentos();
            fecharTodosDropdowns();
            
            if (dashboardInstance && document.getElementById('dashboard').classList.contains('active')) {
                await dashboardInstance.refreshDashboard();
            }
        } catch (err) {
            console.error("Erro ao excluir equipamento:", err);
            showNotification("Erro ao excluir equipamento!", "error");
        }
    }
}

function abrirModal() {
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ====================== INICIALIZAÇÃO GLOBAL =========================
console.log('🚀 Sistema NSO carregado e pronto!');