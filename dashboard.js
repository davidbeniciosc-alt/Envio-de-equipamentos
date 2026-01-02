// dashboard.js - Funcionalidades de Dashboard e Análises
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
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.updateFilters();
        this.renderDashboard();
    }
    
    setupEventListeners() {
        // Navegação para a aba dashboard
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.dataset.target === 'dashboard') {
                    this.refreshDashboard();
                }
            });
        });
        
        // Botão de atualização
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.refreshDashboard();
        });
        
        // Filtros
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        // Busca por número de série
        document.getElementById('search-numero-serie')?.addEventListener('change', (e) => {
            this.searchBySerialNumber(e.target.value);
        });
        
        // Abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Período de tendências
        document.getElementById('trend-period')?.addEventListener('change', () => {
            this.renderTrends();
        });
    }
    
    async loadData() {
        try {
            const response = await fetch('http://localhost:8000/api/equipamentos');
            if (!response.ok) throw new Error('Erro ao carregar dados');
            
            this.currentData = await response.json();
            
            // Converter datas
            this.currentData.forEach(item => {
                item.data_envio = new Date(item.data_envio);
                if (item.data_retorno) {
                    item.data_retorno = new Date(item.data_retorno);
                }
                
                // Calcular dias em assistência
                const fim = item.data_retorno || new Date();
                item.dias_assistencia = Math.ceil((fim - item.data_envio) / (1000 * 60 * 60 * 24));
                
                // Extrair mês e ano
                item.mes_envio = item.data_envio.toISOString().slice(0, 7);
                item.ano = item.data_envio.getFullYear();
                item.mes = item.data_envio.getMonth() + 1;
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showNotification('Erro ao carregar dados do dashboard', 'error');
            return false;
        }
    }
    
    updateFilters() {
        // Preencher filtros de empresa
        const empresas = [...new Set(this.currentData.map(item => item.empresa))].sort();
        const empresaSelect = document.getElementById('filter-empresa');
        empresaSelect.innerHTML = '<option value="todas">Todas</option>';
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa;
            option.textContent = empresa;
            empresaSelect.appendChild(option);
        });
        
        // Preencher filtros de fornecedor
        const fornecedores = [...new Set(this.currentData.map(item => item.fornecedor))].sort();
        const fornecedorSelect = document.getElementById('filter-fornecedor');
        fornecedorSelect.innerHTML = '<option value="todos">Todos</option>';
        fornecedores.forEach(fornecedor => {
            const option = document.createElement('option');
            option.value = fornecedor;
            option.textContent = fornecedor;
            fornecedorSelect.appendChild(option);
        });
        
        // Preencher busca por número de série
        const series = [...new Set(this.currentData.map(item => item.numero_serie))].sort();
        const serieSelect = document.getElementById('search-numero-serie');
        serieSelect.innerHTML = '<option value="">Selecione um número de série...</option>';
        series.forEach(serie => {
            const option = document.createElement('option');
            option.value = serie;
            option.textContent = serie;
            serieSelect.appendChild(option);
        });
        
        // Configurar datas padrão
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);
        
        document.getElementById('filter-data-inicio').value = seisMesesAtras.toISOString().split('T')[0];
        document.getElementById('filter-data-fim').value = hoje.toISOString().split('T')[0];
    }
    
    applyFilters() {
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
    }
    
    getFilteredData() {
        let filtered = [...this.currentData];
        
        // Aplicar filtros
        if (this.filters.dataInicio) {
            filtered = filtered.filter(item => item.data_envio >= this.filters.dataInicio);
        }
        
        if (this.filters.dataFim) {
            filtered = filtered.filter(item => item.data_envio <= this.filters.dataFim);
        }
        
        if (this.filters.empresa !== 'todas') {
            filtered = filtered.filter(item => item.empresa === this.filters.empresa);
        }
        
        if (this.filters.fornecedor !== 'todos') {
            filtered = filtered.filter(item => item.fornecedor === this.filters.fornecedor);
        }
        
        return filtered;
    }
    
    async refreshDashboard() {
        showNotification('Atualizando dados do dashboard...', 'info');
        await this.loadData();
        this.renderDashboard();
        showNotification('Dashboard atualizado com sucesso!', 'success');
    }
    
    renderDashboard() {
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
    }
    
    updateMetrics(data) {
        const total = data.length;
        const retornados = data.filter(item => item.retornou).length;
        const emAssistencia = total - retornados;
        const taxaRetorno = total > 0 ? (retornados / total * 100).toFixed(1) : 0;
        const tempoMedio = data.length > 0 ? 
            (data.reduce((sum, item) => sum + item.dias_assistencia, 0) / data.length).toFixed(0) : 0;
        
        document.getElementById('total-equipamentos').textContent = total;
        document.getElementById('equipamentos-retornados').textContent = retornados;
        document.getElementById('em-assistencia').textContent = emAssistencia;
        document.getElementById('taxa-retorno').textContent = `${taxaRetorno}%`;
        
        // Atualizar tooltips
        document.querySelectorAll('.metric-card')[3].title = `Tempo médio: ${tempoMedio} dias`;
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
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Modelos com Mais Envios'
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
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Fornecedor'
                    },
                    legend: {
                        position: 'right'
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
                percentual: ((count / data.length) * 100).toFixed(2)
            }))
            .sort((a, b) => b.ocorrencias - a.ocorrencias)
            .slice(0, 10);
        
        // Atualizar tabela
        const tableBody = document.querySelector('#table-defeitos tbody');
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
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Defeitos Mais Comuns'
                    }
                }
            }
        });
    }
    
    searchBySerialNumber(serialNumber) {
        if (!serialNumber) {
            document.getElementById('serie-details').style.display = 'none';
            return;
        }
        
        const historico = this.currentData.filter(item => item.numero_serie === serialNumber);
        
        if (historico.length === 0) {
            showNotification('Nenhum histórico encontrado para este número de série', 'info');
            return;
        }
        
        // Ordenar por data
        historico.sort((a, b) => b.data_envio - a.data_envio);
        
        // Calcular estatísticas
        const totalEnvios = historico.length;
        const retornados = historico.filter(item => item.retornou).length;
        const taxaRetorno = totalEnvios > 0 ? ((retornados / totalEnvios) * 100).toFixed(1) : 0;
        const tempoMedio = totalEnvios > 0 ? 
            (historico.reduce((sum, item) => sum + item.dias_assistencia, 0) / totalEnvios).toFixed(1) : 0;
        
        // Atualizar header
        document.getElementById('serie-numero').textContent = serialNumber;
        document.getElementById('total-envios').textContent = `${totalEnvios} envios`;
        document.getElementById('tempo-medio').textContent = `${tempoMedio} dias médios`;
        document.getElementById('taxa-retorno-serie').textContent = `${taxaRetorno}% retorno`;
        
        // Atualizar timeline
        const timeline = document.querySelector('.serie-timeline');
        timeline.innerHTML = '<h4>Linha do Tempo de Assistências</h4>';
        
        historico.forEach((item, index) => {
            const envioDate = item.data_envio.toLocaleDateString('pt-BR');
            const retornoDate = item.retornou && item.data_retorno ? 
                item.data_retorno.toLocaleDateString('pt-BR') : 'Em aberto';
            
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-marker ${item.retornou ? 'retornado' : 'pendente'}"></div>
                <div class="timeline-content">
                    <div class="timeline-date">${envioDate} → ${retornoDate}</div>
                    <div class="timeline-title">${item.defeito}</div>
                    <div class="timeline-details">
                        <span class="badge">${item.fornecedor}</span>
                        <span class="badge">${item.dias_assistencia} dias</span>
                    </div>
                </div>
            `;
            timeline.appendChild(timelineItem);
        });
        
        // Atualizar tabela de histórico
        const tableBody = document.querySelector('#table-serie-historico tbody');
        tableBody.innerHTML = '';
        
        historico.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.data_envio.toLocaleDateString('pt-BR')}</td>
                <td>${item.retornou && item.data_retorno ? item.data_retorno.toLocaleDateString('pt-BR') : '-'}</td>
                <td>${item.defeito}</td>
                <td>${item.fornecedor}</td>
                <td>${item.dias_assistencia}</td>
                <td>${item.retornou ? '<span class="status-retornou">Retornado</span>' : 
                    '<span class="status-pendente">Em aberto</span>'}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Mostrar detalhes
        document.getElementById('serie-details').style.display = 'block';
    }
    
    renderTrends() {
        const data = this.getFilteredData();
        const period = parseInt(document.getElementById('trend-period').value);
        
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
        
        // Gráfico de envios mensais
        this.renderChart('chart-tendencia-envios', {
            type: 'line',
            data: {
                labels: trendArray.map(item => item.month),
                datasets: [{
                    label: 'Envios para Assistência',
                    data: trendArray.map(item => item.totalEnvios),
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendência de Envios Mensais'
                    }
                }
            }
        });
        
        // Gráfico de taxa de retorno
        this.renderChart('chart-tendencia-retorno', {
            type: 'line',
            data: {
                labels: trendArray.map(item => item.month),
                datasets: [{
                    label: 'Taxa de Retorno (%)',
                    data: trendArray.map(item => parseFloat(item.taxaRetorno)),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendência da Taxa de Retorno'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        
        // Atualizar insights
        this.updateTrendInsights(trendArray);
    }
    
    updateTrendInsights(trendArray) {
        if (trendArray.length === 0) return;
        
        // Encontrar mês com mais envios
        const mesPico = trendArray.reduce((prev, current) => 
            prev.totalEnvios > current.totalEnvios ? prev : current
        );
        
        // Calcular tendência
        let tendencia = 'estável';
        if (trendArray.length >= 2) {
            const primeiro = trendArray[0].totalEnvios;
            const ultimo = trendArray[trendArray.length - 1].totalEnvios;
            const diferenca = ((ultimo - primeiro) / primeiro) * 100;
            
            if (diferenca > 10) tendencia = 'crescendo';
            else if (diferenca < -10) tendencia = 'decrescendo';
        }
        
        document.getElementById('insight-mes-pico').textContent = 
            `Mês com mais envios: ${mesPico.month} (${mesPico.totalEnvios} envios)`;
        
        document.getElementById('insight-tendencia').textContent = 
            `Tendência atual: ${tendencia} em relação ao período anterior`;
    }
    
    updateQuickInsights(data) {
        if (data.length === 0) {
            document.getElementById('modelo-problematico').textContent = 'Sem dados';
            document.getElementById('fornecedor-eficiente').textContent = 'Sem dados';
            document.getElementById('tempo-medio-geral').textContent = 'Sem dados';
            document.getElementById('defeito-comum').textContent = 'Sem dados';
            return;
        }
        
        // Modelo mais problemático
        const modelCounts = {};
        data.forEach(item => {
            modelCounts[item.modelo] = (modelCounts[item.modelo] || 0) + 1;
        });
        
        const modeloProblematico = Object.entries(modelCounts)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        
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
            if (stats.total >= 5) { // Mínimo de 5 envios para considerar
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
        
        const defeitoComum = Object.entries(defectCounts)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        
        // Atualizar elementos
        document.getElementById('modelo-problematico').textContent = modeloProblematico;
        document.getElementById('fornecedor-eficiente').textContent = 
            `${fornecedorEficiente} (${melhorTaxa.toFixed(1)}% retorno)`;
        document.getElementById('tempo-medio-geral').textContent = `${tempoMedioGeral} dias`;
        document.getElementById('defeito-comum').textContent = 
            defeitoComum.length > 40 ? defeitoComum.substring(0, 40) + '...' : defeitoComum;
    }
    
    renderChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Destruir gráfico existente
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Criar novo gráfico
        const ctx = canvas.getContext('2d');
        this.charts[canvasId] = new Chart(ctx, config);
    }
    
    switchTab(tabName) {
        // Atualizar botões da aba
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Atualizar conteúdo da aba
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });
        
        // Renderizar conteúdo específico da aba se necessário
        if (tabName === 'tendencia') {
            this.renderTrends();
        }
    }
    
    exportarModelos() {
        const table = document.getElementById('table-modelos');
        this.exportTableToCSV(table, 'analise_modelos.csv');
    }
    
    exportarFornecedores() {
        const table = document.getElementById('table-fornecedores');
        this.exportTableToCSV(table, 'analise_fornecedores.csv');
    }
    
    exportarDefeitos() {
        const table = document.getElementById('table-defeitos');
        this.exportTableToCSV(table, 'analise_defeitos.csv');
    }
    
    exportTableToCSV(table, filename) {
        const rows = table.querySelectorAll('tr');
        const csv = [];
        
        rows.forEach(row => {
            const rowData = [];
            row.querySelectorAll('th, td').forEach(cell => {
                let text = cell.textContent.trim();
                // Remover tags HTML se houver
                text = text.replace(/<[^>]*>/g, '');
                // Adicionar aspas se necessário
                if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                    text = `"${text.replace(/"/g, '""')}"`;
                }
                rowData.push(text);
            });
            csv.push(rowData.join(','));
        });
        
        const csvString = csv.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exportado como ${filename}`, 'success');
    }
}

// Inicializar dashboard quando a página carregar
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar dashboard quando a aba for ativa
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.dataset.target === 'dashboard' && !dashboard) {
                dashboard = new DashboardNSO();
            }
        });
    });
    
    // Inicializar imediatamente se já estiver na aba dashboard
    if (document.getElementById('dashboard').classList.contains('active')) {
        dashboard = new DashboardNSO();
    }
});