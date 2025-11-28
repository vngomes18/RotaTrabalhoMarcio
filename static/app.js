// App de Rotas de Maricá - JavaScript

// Variáveis globais
let mapa;
let marcadorOrigem = null;
let marcadorDestino = null;
let caminhoRota = null;
let pontosReferencia = [];
let origemCoords = null;
let destinoCoords = null;
let notificacaoAtual = null;
let modoTransporte = 'driving'; // Modo padrão
let rotasCalculadas = {}; // Armazenar rotas para todos os modos
let paradas = [];
let paradasHabilitadas = false;

function formatarEndereco(s) {
    if (!s || typeof s !== 'string') return s || '';
    const semCep = s.replace(/\b\d{5}-\d{3}\b/g, '').trim();
    const partes = semCep.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const filtradas = partes.filter(p => !/Regi[aã]o/i.test(p) && !/^Brasil$/i.test(p));
    const limitadas = (filtradas.length > 0 ? filtradas : partes).slice(0, 3);
    return limitadas.join(', ');
}

// Função para mostrar notificações
function mostrarNota(mensagem, tipo = 'info') {
    // Remover notificação anterior se existir
    if (notificacaoAtual) {
        document.body.removeChild(notificacaoAtual);
    }
    
    // Criar elemento de notificação
    const nota = document.createElement('div');
    nota.className = `notificacao notificacao-${tipo}`;
    nota.innerHTML = `
        <span>${mensagem}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Estilos CSS inline para a notificação
    nota.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'info' ? '#2196F3' : tipo === 'warning' ? '#FF9800' : '#4CAF50'};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Estilo do botão de fechar
    const botaoFechar = nota.querySelector('button');
    botaoFechar.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
        font-weight: bold;
    `;
    
    document.body.appendChild(nota);
    notificacaoAtual = nota;
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (nota.parentElement) {
            nota.remove();
        }
    }, 5000);
}

// Função para inicializar o mapa
function inicializarMapa() {
    // Criar mapa centrado em Maricá
    mapa = L.map('map').setView([-22.9189, -42.8194], 14);
    
    // Adicionar camada de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);
    
    // Adicionar controle de escala
    L.control.scale().addTo(mapa);
    
    // Adicionar evento de clique no mapa
    mapa.on('click', function(e) {
        handleMapClick(e);
    });
    
    // Carregar pontos de referência
    carregarPontosReferencia();
    
    console.log("🗺️ Mapa inicializado com sucesso!");
}

// Função para lidar com cliques no mapa
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    if (!origemCoords) {
        // Definir origem
        definirOrigem(lat, lng);
    } else if (!destinoCoords) {
        // Definir destino
        definirDestino(lat, lng);
        // Calcular rota automaticamente
        calcularRotasTodosModos();
    } else {
        if (paradasHabilitadas) {
            adicionarParada(lat, lng);
            calcularRotasTodosModos();
        } else {
            // Se ambos já estão definidos, perguntar se quer redefinir
            if (confirm('Deseja redefinir os pontos e calcular uma nova rota?')) {
                limparRota();
                definirOrigem(lat, lng);
            }
        }
    }
}

// Função para definir origem
function definirOrigem(lat, lng, nomeOpt) {
    // Remover marcador anterior
    if (marcadorOrigem) {
        mapa.removeLayer(marcadorOrigem);
    }
    
    // Criar novo marcador
    marcadorOrigem = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'marker-origem',
            html: '<i class="fas fa-map-marker-alt"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }).addTo(mapa);
    
    // Adicionar popup
    marcadorOrigem.bindPopup('<b>Origem</b><br>Clique para ver opções').openPopup();
    
    // Guardar coordenadas
    origemCoords = { lat: lat, lng: lng };
    
    // Atualizar interface
    document.getElementById('origemStatus').textContent = 'Origem definida';
    
    if (nomeOpt && typeof nomeOpt === 'string') {
        origemCoords.nome = nomeOpt;
        document.getElementById('origemBusca').value = nomeOpt;
    } else {
        const input = document.getElementById('origemBusca');
        if (input && !input.value) input.value = 'Buscando endereço...';
        fetch('/api/buscar_endereco', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `${lat}, ${lng}`
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.sucesso && data.resultados.length > 0) {
                origemCoords.nome = formatarEndereco(data.resultados[0].nome);
                document.getElementById('origemBusca').value = origemCoords.nome;
            }
        })
        .catch(() => {
            document.getElementById('origemBusca').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        });
    }
    
    mostrarNota('🟢 Origem definida! Clique no destino.', 'success');
}

// Função para definir destino
function definirDestino(lat, lng, nomeOpt) {
    // Remover marcador anterior
    if (marcadorDestino) {
        mapa.removeLayer(marcadorDestino);
    }
    
    // Criar novo marcador
    marcadorDestino = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'marker-destino',
            html: '<i class="fas fa-map-marker-alt"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }).addTo(mapa);
    
    // Adicionar popup
    marcadorDestino.bindPopup('<b>Destino</b><br>Clique para ver opções').openPopup();
    
    // Guardar coordenadas
    destinoCoords = { lat: lat, lng: lng };
    
    // Atualizar interface
    document.getElementById('destinoStatus').textContent = 'Destino definido';
    
    if (nomeOpt && typeof nomeOpt === 'string') {
        destinoCoords.nome = nomeOpt;
        document.getElementById('destinoBusca').value = nomeOpt;
    } else {
        const input = document.getElementById('destinoBusca');
        if (input && !input.value) input.value = 'Buscando endereço...';
        fetch('/api/buscar_endereco', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `${lat}, ${lng}`
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.sucesso && data.resultados.length > 0) {
                destinoCoords.nome = formatarEndereco(data.resultados[0].nome);
                document.getElementById('destinoBusca').value = destinoCoords.nome;
            }
        })
        .catch(() => {
            document.getElementById('destinoBusca').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        });
    }
    
    mostrarNota('🔴 Destino definido! Calculando rotas...', 'success');
    
    // Calcular rota automaticamente
    calcularRotasTodosModos();
}

// Função para carregar pontos de referência
function carregarPontosReferencia() {
    fetch('/api/pontos_turisticos')
        .then(response => response.json())
        .then(data => {
            if (data.sucesso) {
                pontosReferencia = data.pontos;
                adicionarPontosAoMapa(data.pontos);
            }
        })
        .catch(error => console.error('Erro ao carregar pontos:', error));
}

// Função para adicionar pontos turísticos ao mapa
function adicionarPontosAoMapa(pontos) {
    pontos.forEach(ponto => {
        let iconeClasse = 'fas fa-map-marker-alt';
        let cor = '#2196F3';
        
        switch(ponto.tipo) {
            case 'praia':
                iconeClasse = 'fas fa-umbrella-beach';
                cor = '#00BCD4';
                break;
            case 'lagoa':
                iconeClasse = 'fas fa-water';
                cor = '#4CAF50';
                break;
            case 'centro':
                iconeClasse = 'fas fa-city';
                cor = '#FF9800';
                break;
        }
        
        const marker = L.marker([ponto.lat, ponto.lng], {
            icon: L.divIcon({
                className: 'ponto-turistico',
                html: `<i class="${iconeClasse}" style="color: ${cor}; font-size: 20px;"></i>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(mapa);
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h6><i class="${iconeClasse}"></i> ${ponto.nome}</h6>
                <p>${ponto.descricao}</p>
                <button class="btn btn-sm btn-primary" onclick="selecionarPonto('${ponto.nome}', ${ponto.lat}, ${ponto.lng})">
                    <i class="fas fa-location-arrow"></i> Selecionar
                </button>
            </div>
        `);
    });
}

// Função para selecionar ponto turístico
function selecionarPonto(nome, lat, lng) {
    if (!origemCoords) {
        document.getElementById('origemBusca').value = nome;
        definirOrigem(lat, lng, nome);
    } else if (!destinoCoords) {
        document.getElementById('destinoBusca').value = nome;
        definirDestino(lat, lng, nome);
    } else {
        mostrarNota('Origem e destino já definidos!', 'warning');
    }
}

// Função para calcular rotas para todos os modos de transporte
function calcularRotasTodosModos() {
    if (!origemCoords || !destinoCoords) {
        mostrarNota('⚠️ Por favor, selecione origem e destino!', 'warning');
        return;
    }
    
    document.getElementById('loadingDiv').style.display = 'block';
    
    // Limpar rotas anteriores
    rotasCalculadas = {};
    
    // Calcular rota para o modo selecionado
    calcularRotaSelecionada();
}

// Função para calcular rota para o modo selecionado
function calcularRotaSelecionada() {
    if (!origemCoords || !destinoCoords) return;
    
    fetch('/api/calcular_rota', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            origem_lat: origemCoords.lat,
            origem_lng: origemCoords.lng,
            destino_lat: destinoCoords.lat,
            destino_lng: destinoCoords.lng,
            modo: modoTransporte,
            paradas: paradas.map(p => ({ lat: p.lat, lng: p.lng }))
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loadingDiv').style.display = 'none';
        
        console.log('Dados recebidos do servidor:', data);
        console.log('Caminho:', data.caminho);
        console.log('Primeiras coordenadas:', data.caminho ? data.caminho.slice(0, 5) : 'Sem caminho');
        
        if (data.sucesso) {
            // Armazenar rota calculada
            rotasCalculadas[modoTransporte] = data;
            exibirRota(data);
            exibirComparacaoRotas();
        } else {
            mostrarNota(`❌ Erro: ${data.mensagem || 'Erro ao calcular rota'}`, 'error');
        }
    })
    .catch(error => {
        document.getElementById('loadingDiv').style.display = 'none';
        console.error('Erro ao calcular rota:', error);
        mostrarNota('❌ Erro ao calcular rota', 'error');
    });
}

// Função para exibir rota no mapa
function exibirRota(dados) {
    console.log('=== exibirRota ===');
    console.log('Formato dos dados:', typeof dados.caminho);
    console.log('Total de coordenadas:', dados.caminho ? dados.caminho.length : 0);
    console.log('Primeiras 3 coordenadas:', dados.caminho ? dados.caminho.slice(0, 3) : 'N/A');
    console.log('Últimas 3 coordenadas:', dados.caminho ? dados.caminho.slice(-3) : 'N/A');
    
    // Verificar se o mapa existe e está inicializado
    console.log('Mapa existe?', typeof mapa !== 'undefined');
    console.log('Mapa inicializado?', mapa !== null);
    
    // Limpar rota anterior
    if (caminhoRota) {
        mapa.removeLayer(caminhoRota);
    }
    
    // Criar nova rota
    console.log('Criando polyline com:', dados.caminho.length, 'coordenadas');
    console.log('Primeira coordenada:', dados.caminho[0]);
    console.log('Última coordenada:', dados.caminho[dados.caminho.length - 1]);
    
    try {
        // Criar polyline com estilo mais visível para debug
        caminhoRota = L.polyline(dados.caminho, {
            color: '#FF0000',  // Vermelho brilhante para debug
            weight: 8,  // Mais espesso para ser visível
            opacity: 1.0,  // Totalmente opaco
            smoothFactor: 1,
            dashArray: '10, 10'  // Tracejado para ser mais visível
        });
        
        console.log('✅ Polyline criado com sucesso!');
        console.log('Adicionando polyline ao mapa...');
        
        // Adicionar ao mapa separadamente para debug
        mapa.addLayer(caminhoRota);
        console.log('✅ Polyline adicionado ao mapa!');
        
        // Testar se o polyline foi realmente adicionado ao mapa
        const bounds = caminhoRota.getBounds();
        console.log('Bounds do polyline:', bounds);
        
        // Se os bounds forem válidos, ajustar o mapa
        if (bounds.isValid()) {
            console.log('Ajustando mapa para mostrar rota...');
            mapa.fitBounds(bounds.pad(0.1));
            console.log('✅ Mapa ajustado!');
        } else {
            console.warn('⚠️ Bounds inválidos!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar polyline:', error);
        return;
    }
    
    // Adicionar popup
    const origemNomePopup = formatarEndereco((origemCoords && origemCoords.nome) || document.getElementById('origemBusca').value) || `${origemCoords.lat.toFixed(5)}, ${origemCoords.lng.toFixed(5)}`;
    const destinoNomePopup = formatarEndereco((destinoCoords && destinoCoords.nome) || document.getElementById('destinoBusca').value) || `${destinoCoords.lat.toFixed(5)}, ${destinoCoords.lng.toFixed(5)}`;
    caminhoRota.bindPopup(`
        <div style="font-family: Arial, sans-serif;">
            <h6><i class="fas fa-route"></i> Rota Calculada</h6>
            <p><b>Origem:</b> ${origemNomePopup}</p>
            <p><b>Destino:</b> ${destinoNomePopup}</p>
            <p><b>Distância:</b> ${(dados.distancia / 1000).toFixed(1)} km</p>
            <p><b>Pontos:</b> ${dados.nos_count}</p>
            <p><b>Algoritmo:</b> Dijkstra</p>
        </div>
    `);
    
    // Ajustar zoom para mostrar toda a rota
    console.log('Ajustando zoom para mostrar rota...');
    console.log('Marcador origem:', marcadorOrigem ? marcadorOrigem.getLatLng() : 'null');
    console.log('Marcador destino:', marcadorDestino ? marcadorDestino.getLatLng() : 'null');
    
    const elementosGrupo = [marcadorOrigem, marcadorDestino, caminhoRota];
    paradas.forEach(p => { if (p && p.marcador) elementosGrupo.push(p.marcador); });
    const group = new L.featureGroup(elementosGrupo);
    const bounds = group.getBounds();
    console.log('Bounds do grupo:', bounds);
    
    if (bounds.isValid()) {
        mapa.fitBounds(bounds.pad(0.1));
        console.log('✅ Zoom ajustado com sucesso!');
    } else {
        console.warn('⚠️ Bounds inválidos, não ajustando zoom');
    }
    
    // Exibir informações
    exibirInformacoesRota(dados);
    
    console.log(`✅ Rota calculada: ${(dados.distancia / 1000).toFixed(1)} km, ${dados.nos_count} pontos`);
}

// Função para testar rota exemplo
function testarRotaExemplo() {
    console.log('=== Testando rota exemplo ===');
    
    // Definir coordenadas de exemplo em Maricá
    const lat1 = -22.9186;
    const lng1 = -42.8197;
    const lat2 = -22.9200;
    const lng2 = -42.8180;
    
    console.log(`Testando rota: (${lat1}, ${lng1}) -> (${lat2}, ${lng2})`);
    
    // Criar marcadores de teste
    if (marcadorOrigem) mapa.removeLayer(marcadorOrigem);
    if (marcadorDestino) mapa.removeLayer(marcadorDestino);
    
    marcadorOrigem = L.marker([lat1, lng1], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(mapa);
    
    marcadorDestino = L.marker([lat2, lng2], {
        draggable: true,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(mapa);
    
    // Definir coordenadas globais
    origemCoords = { lat: lat1, lng: lng1, nome: 'Ponto de Teste A' };
    destinoCoords = { lat: lat2, lng: lng2, nome: 'Ponto de Teste B' };
    
    // Atualizar interface
    document.getElementById('origemStatus').textContent = 'Origem definida (teste)';
    document.getElementById('destinoStatus').textContent = 'Destino definido (teste)';
    
    // Calcular rota
    calcularRotasTodosModos();
}

// Função para exibir comparação de rotas
function exibirComparacaoRotas() {
    const routeCards = document.getElementById('routeCards');
    routeCards.innerHTML = '';
    
    if (Object.keys(rotasCalculadas).length === 0) return;
    
    // Criar cards para cada modo
    const modos = ['driving', 'walking', 'cycling'];
    const titulos = {
        'driving': '🚗 Carro',
        'walking': '🚶‍♂️ Caminhada',
        'cycling': '🚴‍♂️ Bicicleta'
    };
    
    modos.forEach(modo => {
        if (rotasCalculadas[modo]) {
            const rota = rotasCalculadas[modo];
            const distanciaKm = (rota.distancia / 1000).toFixed(1);
            const tempoEstimado = calcularTempoEstimado(distanciaKm, modo);
            
            const card = document.createElement('div');
            card.className = `route-card ${modoTransporte === modo ? 'active' : ''}`;
            card.innerHTML = `
                <div class="route-card-header">
                    <h6>${titulos[modo]}</h6>
                    <span class="route-time">${tempoEstimado}</span>
                </div>
                <div class="route-card-body">
                    <p><i class="fas fa-ruler"></i> ${distanciaKm} km</p>
                    <p><i class="fas fa-route"></i> ${rota.nos_count} pontos</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                modoTransporte = modo;
                exibirRota(rota);
                atualizarSeletorModo();
                exibirComparacaoRotas();
            });
            
            routeCards.appendChild(card);
        }
    });
}

// Função para calcular tempo estimado
function calcularTempoEstimado(distanciaKm, modo) {
    const velocidades = {
        driving: 30,    // km/h médio em cidade
        walking: 5,     // km/h médio caminhando
        cycling: 15     // km/h médio bicicleta
    };
    
    const velocidade = velocidades[modo] || 30;
    const tempoHoras = distanciaKm / velocidade;
    const tempoMinutos = Math.round(tempoHoras * 60);
    
    if (tempoMinutos < 60) {
        return `${tempoMinutos} min`;
    } else {
        const horas = Math.floor(tempoMinutos / 60);
        const minutos = tempoMinutos % 60;
        return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
    }
}

// Função para atualizar seletor de modo
function atualizarSeletorModo() {
    // Remover classe active de todos os botões
    document.querySelectorAll('.transport-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Adicionar classe active ao botão selecionado
    const botaoSelecionado = document.querySelector(`[data-mode="${modoTransporte}"]`);
    if (botaoSelecionado) {
        botaoSelecionado.closest('.transport-card').classList.add('active');
    }
}

// Função para exibir informações da rota
function exibirInformacoesRota(dados) {
    const routeInfo = document.getElementById('routeInfo');
    const routeDetails = document.getElementById('routeDetails');
    const origemNome = formatarEndereco((origemCoords && origemCoords.nome) || document.getElementById('origemBusca').value) || `${origemCoords.lat.toFixed(5)}, ${origemCoords.lng.toFixed(5)}`;
    const destinoNome = formatarEndereco((destinoCoords && destinoCoords.nome) || document.getElementById('destinoBusca').value) || `${destinoCoords.lat.toFixed(5)}, ${destinoCoords.lng.toFixed(5)}`;
    
    routeDetails.innerHTML = `
        <div class="row">
            <div class="col-6">
                <small><i class="fas fa-map-marker-alt text-success"></i> Origem</small><br>
                <strong>${origemNome}</strong>
            </div>
            <div class="col-6">
                <small><i class="fas fa-map-marker-alt text-danger"></i> Destino</small><br>
                <strong>${destinoNome}</strong>
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-6">
                <small><i class="fas fa-ruler text-info"></i> Distância</small><br>
                <strong>${(dados.distancia / 1000).toFixed(1)} km</strong>
            </div>
            <div class="col-6">
                <small><i class="fas fa-route text-primary"></i> Pontos</small><br>
                <strong>${dados.nos_count}</strong>
            </div>
        </div>
        <hr>
        <div class="text-center">
            <small class="text-muted">Algoritmo: Dijkstra</small>
        </div>
    `;
    
    routeInfo.style.display = 'block';

    obterInstrucoesTurnByTurn();
}

function osrmProfileFromModo(modo){
    if (modo === 'walking') return 'walking';
    if (modo === 'cycling') return 'cycling';
    return 'driving';
}

function obterInstrucoesTurnByTurn(){
    if (!origemCoords || !destinoCoords) return;
    const waypoints = [ [origemCoords.lat, origemCoords.lng], ...paradas.map(p=>[p.lat,p.lng]), [destinoCoords.lat, destinoCoords.lng] ];
    fetch('/api/rota_osrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: osrmProfileFromModo(modoTransporte), waypoints, include_steps: true })
    })
    .then(r=>r.json())
    .then(data=>{
        if (!data.sucesso) return;
        renderizarPassoAPasso(data.passos || []);
    })
    .catch(()=>{});
}

function renderizarPassoAPasso(passos){
    const routeDetails = document.getElementById('routeDetails');
    const containerId = 'routeSteps';
    let cont = document.getElementById(containerId);
    if (!cont){
        cont = document.createElement('div');
        cont.id = containerId;
        cont.className = 'mt-2';
        routeDetails.appendChild(document.createElement('hr'));
        routeDetails.appendChild(cont);
    }
    const icons = {
        turn_left: '<i class="fas fa-turn-left"></i>',
        turn_right: '<i class="fas fa-turn-right"></i>',
        straight: '<i class="fas fa-arrow-right"></i>',
        depart: '<i class="fas fa-play"></i>',
        arrive: '<i class="fas fa-flag-checkered"></i>'
    };
    const html = passos.slice(0, 50).map(p=>{
        let icn = icons.straight;
        if (p.tipo==='depart') icn = icons.depart;
        else if (p.tipo==='arrive') icn = icons.arrive;
        else if (p.tipo==='turn' && p.direcao==='left') icn = icons.turn_left;
        else if (p.tipo==='turn' && p.direcao==='right') icn = icons.turn_right;
        const distKm = p.distancia_m ? (p.distancia_m>=1000 ? (p.distancia_m/1000).toFixed(1)+' km' : Math.round(p.distancia_m)+' m') : '';
        return `<div class="d-flex align-items-center gap-2 py-1">
            <span style="width:22px;text-align:center;">${icn}</span>
            <span>${p.instrucao}</span>
            <span class="text-muted ms-auto small">${distKm}</span>
        </div>`;
    }).join('');
    cont.innerHTML = `<h6><i class="fas fa-directions"></i> Passo a passo</h6>${html || '<div class="text-muted">Sem instruções disponíveis</div>'}`;
}

// Função para limpar rota
function limparRota() {
    // Remover marcadores
    if (marcadorOrigem) {
        mapa.removeLayer(marcadorOrigem);
        marcadorOrigem = null;
    }
    
    if (marcadorDestino) {
        mapa.removeLayer(marcadorDestino);
        marcadorDestino = null;
    }
    
    // Remover rota
    if (caminhoRota) {
        mapa.removeLayer(caminhoRota);
        caminhoRota = null;
    }
    limparParadas();
    
    // Limpar coordenadas
    origemCoords = null;
    destinoCoords = null;
    
    // Limpar formulários
    document.getElementById('origemBusca').value = '';
    document.getElementById('destinoBusca').value = '';
    
    // Atualizar status
    document.getElementById('origemStatus').textContent = 'Não selecionada';
    document.getElementById('destinoStatus').textContent = 'Não selecionado';
    
    // Esconder informações
    document.getElementById('routeInfo').style.display = 'none';
    document.getElementById('routeCards').innerHTML = '';
    
    // Limpar rotas calculadas
    rotasCalculadas = {};
    
    mostrarNota('🗺️ Mapa limpo! Selecione um novo ponto de origem.', 'info');
}

// Função para buscar endereço
function buscarEndereco(tipo) {
    const input = document.getElementById(tipo + 'Busca');
    const query = input.value.trim();
    
    if (!query) {
        mostrarNota('⚠️ Por favor, digite um endereço!', 'warning');
        return;
    }
    
    document.getElementById('loadingDiv').style.display = 'block';
    
    fetch('/api/buscar_endereco', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loadingDiv').style.display = 'none';
        
        if (data.sucesso && data.resultados.length > 0) {
            const resultado = data.resultados[0];
            const nomeFmt = resultado.nome ? formatarEndereco(resultado.nome) : null;
            
            if (tipo === 'origem') {
                definirOrigem(resultado.lat, resultado.lng, nomeFmt);
                if (nomeFmt) {
                    document.getElementById('origemBusca').value = nomeFmt;
                    origemCoords.nome = nomeFmt;
                }
            } else {
                definirDestino(resultado.lat, resultado.lng, nomeFmt);
                if (nomeFmt) {
                    document.getElementById('destinoBusca').value = nomeFmt;
                    destinoCoords.nome = nomeFmt;
                }
            }
            
            // Centralizar mapa no resultado
            mapa.setView([resultado.lat, resultado.lng], 16);
            
        } else {
            mostrarNota('❌ Endereço não encontrado em Maricá', 'error');
        }
    })
    .catch(error => {
        document.getElementById('loadingDiv').style.display = 'none';
        console.error('Erro ao buscar endereço:', error);
        mostrarNota('❌ Erro ao buscar endereço', 'error');
    });
}

// Adicionar animação CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .marker-origem {
        background-color: #4CAF50 !important;
        border: 3px solid white !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    }
    
    .marker-destino {
        background-color: #F44336 !important;
        border: 3px solid white !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    }
    
    .ponto-turistico {
        background: white;
        border: 2px solid #2196F3;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .ponto-turistico:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    
    .route-card {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .route-card:hover {
        border-color: #2196F3;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .route-card.active {
        border-color: #2196F3;
        background-color: #f0f8ff;
    }
    
    .route-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .route-card-header h6 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
    
    .route-time {
        font-size: 12px;
        color: #666;
        font-weight: 500;
    }
    
    .route-card-body {
        font-size: 12px;
        color: #666;
    }
    
    .route-card-body p {
        margin: 2px 0;
    }
`;
document.head.appendChild(style);

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    inicializarMapa();
    
    // Event listeners para Enter nos campos de busca
    document.getElementById('origemBusca').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') buscarEndereco('origem');
    });
    
    document.getElementById('destinoBusca').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') buscarEndereco('destino');
    });

    document.querySelectorAll('.search-box').forEach(box => {
        const icon = box.querySelector('.search-icon');
        const input = box.querySelector('input');
        if (icon && input) {
            icon.style.cursor = 'pointer';
            icon.addEventListener('click', () => {
                const tipo = input.id.includes('origem') ? 'origem' : 'destino';
                buscarEndereco(tipo);
            });
        }
    });
    
    // Configurar seletor de modo de transporte
    document.querySelectorAll('.transport-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remover classe active de todas as opções
            document.querySelectorAll('.transport-option').forEach(opt => opt.classList.remove('active'));
            
            // Adicionar classe active à opção clicada
            this.classList.add('active');
            
            // Obter modo de transporte
            modoTransporte = this.getAttribute('data-mode');
            
            // Se já houver rota calculada para este modo, exibi-la
            if (rotasCalculadas[modoTransporte]) {
                exibirRota(rotasCalculadas[modoTransporte]);
                exibirComparacaoRotas();
            } else if (origemCoords && destinoCoords) {
                // Caso contrário, calcular rota
                calcularRotaSelecionada();
            }
        });
    });
    
    // Selecionar modo padrão (carro)
    document.querySelector('[data-mode="driving"]').classList.add('active');

    const chkParadas = document.getElementById('habilitarParadas');
    if (chkParadas) {
        chkParadas.addEventListener('change', function() {
            paradasHabilitadas = this.checked;
            const panel = document.getElementById('paradasPanel');
            if (panel) panel.style.display = this.checked ? 'block' : 'none';
        });
    }
});

// Função para mostrar informações do algoritmo Dijkstra
function mostrarInfoAlgoritmo() {
    const modalBody = document.getElementById('algoritmoModalBody');
    modalBody.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2">Carregando informações do algoritmo...</p>
        </div>
    `;
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('algoritmoModal'));
    modal.show();
    
    // Buscar informações do algoritmo
    fetch('/api/info_algoritmo')
        .then(response => response.json())
        .then(data => {
            if (!data.sucesso) {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <h6><i class="fas fa-exclamation-triangle"></i> Erro</h6>
                        <p>${data.mensagem || 'Não foi possível carregar as informações do algoritmo.'}</p>
                    </div>
                `;
                return;
            }
            const info = data.info;
            modalBody.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title"><i class="fas fa-cogs"></i> Algoritmo</h6>
                                <p class="mb-1"><strong>${info.algoritmo}</strong></p>
                                <p class="mb-1"><strong>Complexidade Temporal:</strong> ${info.complexidade_tempo}</p>
                                <p class="mb-1"><strong>Complexidade Espacial:</strong> ${info.complexidade_espaco}</p>
                                <p class="mb-1"><strong>Tipo de Grafo:</strong> ${info.tipo_grafo}</p>
                                <p class="mb-0"><strong>Aplicação:</strong> ${info.aplicacao}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title"><i class="fas fa-chart-bar"></i> Estatísticas</h6>
                                <p class="mb-1"><strong>Total de Nós:</strong> ${info.total_nos.toLocaleString()}</p>
                                <p class="mb-1"><strong>Total de Arestas:</strong> ${info.total_arestas.toLocaleString()}</p>
                                <p class="mb-1"><strong>Arestas Randomizadas:</strong> ${info.arestas_randomizadas.toLocaleString()}</p>
                                <p class="mb-0"><strong>Randomização Ativa:</strong> ${info.randomizacao_ativa ? '✅ Sim' : '❌ Não'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="row g-3">
                    <div class="col-md-6">
                        <h6><i class="fas fa-lightbulb"></i> Como funciona</h6>
                        <div class="card">
                            <div class="card-body">
                                <ol class="mb-0" style="padding-left:18px;">
                                    <li>Começa no ponto de origem com custo 0.</li>
                                    <li>Escolhe o próximo ponto com menor custo acumulado.</li>
                                    <li>Atualiza os custos dos vizinhos quando encontra um caminho melhor.</li>
                                    <li>Repete até alcançar o destino.</li>
                                    <li>Reconstrói o caminho final ligando origem → destino.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-project-diagram"></i> Visual do Dijkstra</h6>
                        <div id="dijkstraVisual" style="border:1px solid #e0e0e0;border-radius:8px;padding:8px;background:#fff;"></div>
                        <div class="small text-muted mt-2">Demonstração do fluxo: nó atual, relaxamento e escolha pelo heap.</div>
                    </div>
                </div>
                <hr>
                <h6><i class="fas fa-network-wired"></i> Grafo (NetworkX/matplotlib)</h6>
                <div id="grafoImgBox" class="text-center">
                    <img id="grafoVisualImg" style="max-width:100%;border:1px solid #e0e0e0;border-radius:8px" />
                </div>
                <hr>
                <h6><i class="fas fa-star"></i> Características</h6>
                <ul class="list-unstyled">
                    ${info.caracteristicas.map(c => `<li><i class="fas fa-check text-success"></i> ${c}</li>`).join('')}
                </ul>
            `;
            renderDijkstraVisual();
            carregarImagemGrafo();
        })
        .catch(error => {
            console.error('Erro ao buscar informações do algoritmo:', error);
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> Erro de Conexão</h6>
                    <p>Não foi possível conectar ao servidor para obter as informações.</p>
                </div>
            `;
        });
}

function renderDijkstraVisual() {
    const el = document.getElementById('dijkstraVisual');
    if (!el) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 400 240');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '240');
    const nodes = {
        S: { x: 60, y: 120 },
        A: { x: 160, y: 60 },
        B: { x: 160, y: 180 },
        C: { x: 280, y: 60 },
        D: { x: 280, y: 180 },
        T: { x: 360, y: 120 }
    };
    const edges = [
        ['S','A',3], ['S','B',2], ['A','C',4], ['B','D',2], ['C','T',3], ['D','T',4], ['A','B',3]
    ];
    function line(x1,y1,x2,y2,active){
        const l = document.createElementNS('http://www.w3.org/2000/svg','line');
        l.setAttribute('x1',x1); l.setAttribute('y1',y1); l.setAttribute('x2',x2); l.setAttribute('y2',y2);
        l.setAttribute('stroke', active ? '#1976D2' : '#999');
        l.setAttribute('stroke-width', active ? '4' : '2');
        l.setAttribute('stroke-linecap','round');
        return l;
    }
    function weightLabel(x,y,t){
        const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
        tx.setAttribute('x',x); tx.setAttribute('y',y); tx.setAttribute('fill','#555'); tx.setAttribute('font-size','12');
        tx.setAttribute('text-anchor','middle');
        tx.textContent = t;
        return tx;
    }
    const edgeEls = [];
    edges.forEach(([u,v,w])=>{
        const p1 = nodes[u], p2 = nodes[v];
        const l = line(p1.x, p1.y, p2.x, p2.y, false);
        svg.appendChild(l);
        edgeEls.push({ u,v,el:l });
        const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
        svg.appendChild(weightLabel(mx, my-6, w));
    });
    function node(name, active){
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        const p = nodes[name];
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx',p.x); c.setAttribute('cy',p.y); c.setAttribute('r',18);
        c.setAttribute('fill', active ? '#4CAF50' : '#fff');
        c.setAttribute('stroke', active ? '#2E7D32' : '#666');
        c.setAttribute('stroke-width','2');
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('x',p.x); t.setAttribute('y',p.y+4);
        t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','12'); t.setAttribute('fill','#333');
        t.textContent = name;
        g.appendChild(c); g.appendChild(t);
        return g;
    }
    ['S','A','B','C','D','T'].forEach(n=> svg.appendChild(node(n,false)));
    el.innerHTML = '';
    el.appendChild(svg);
    const steps = [ ['S','A'], ['A','C'], ['C','T'] ];
    let i = 0;
    function highlight(u,v){
        edgeEls.forEach(e=>{
            const active = (e.u===u && e.v===v) || (e.u===v && e.v===u);
            e.el.setAttribute('stroke', active ? '#1976D2' : '#999');
            e.el.setAttribute('stroke-width', active ? '4' : '2');
        });
    }
    function activateNode(name, active){
        const all = svg.querySelectorAll('g');
        all.forEach(g=>{
            const label = g.querySelector('text').textContent;
            if (label===name){
                const c = g.querySelector('circle');
                c.setAttribute('fill', active ? '#4CAF50' : '#fff');
                c.setAttribute('stroke', active ? '#2E7D32' : '#666');
            }
        });
    }
    activateNode('S', true);
    const interval = setInterval(()=>{
        if (i>=steps.length){ clearInterval(interval); return; }
        const [u,v] = steps[i];
        highlight(u,v);
        activateNode(v, true);
        i++;
    }, 900);
}

function carregarImagemGrafo(){
    const body = {};
    if (origemCoords && destinoCoords) {
        body.origem_lat = origemCoords.lat;
        body.origem_lng = origemCoords.lng;
        body.destino_lat = destinoCoords.lat;
        body.destino_lng = destinoCoords.lng;
    }
    if (paradas && paradas.length) {
        body.paradas = paradas.map(p => [p.lat, p.lng]);
    }
    fetch('/api/grafo_visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(r=>r.blob())
    .then(b=>{
        const url = URL.createObjectURL(b);
        const img = document.getElementById('grafoVisualImg');
        if (img) img.src = url;
    })
    .catch(()=>{});
}

function calcularRota() {
    calcularRotasTodosModos();
}

function adicionarParada(lat, lng, nome) {
    const marcador = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'marker-parada',
            html: '<i class="fas fa-map-marker-alt"></i>',
            iconSize: [26, 26],
            iconAnchor: [13, 26]
        })
    }).addTo(mapa);
    const parada = { lat, lng, nome: nome || '', marcador };
    paradas.push(parada);
    marcador.bindPopup('<b>Parada</b>');
    atualizarListaParadas();
    if (!nome) {
        fetch('/api/buscar_endereco', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${lat}, ${lng}` })
        })
        .then(r => r.json())
        .then(d => {
            if (d.sucesso && d.resultados.length > 0) {
                parada.nome = formatarEndereco(d.resultados[0].nome);
                atualizarListaParadas();
            }
        });
    }
    mostrarNota('🟣 Parada adicionada!', 'info');
}

function atualizarListaParadas() {
    const lista = document.getElementById('paradasLista');
    if (!lista) return;
    lista.innerHTML = '';
    paradas.forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${p.nome || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}</span>
                        <div class="btn-group">
                          <button class="btn btn-sm btn-outline-danger" onclick="removerParada(${idx})"><i class="fas fa-trash"></i></button>
                        </div>`;
        lista.appendChild(li);
    });
}

function removerParada(index) {
    const p = paradas[index];
    if (p && p.marcador) {
        mapa.removeLayer(p.marcador);
    }
    paradas.splice(index, 1);
    atualizarListaParadas();
}

function limparParadas() {
    paradas.forEach(p => { if (p.marcador) mapa.removeLayer(p.marcador); });
    paradas = [];
    atualizarListaParadas();
}

function buscarParada() {
    const input = document.getElementById('paradaBusca');
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
        mostrarNota('⚠️ Por favor, digite um endereço de parada!', 'warning');
        return;
    }
    document.getElementById('loadingDiv').style.display = 'block';
    fetch('/api/buscar_endereco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    })
    .then(r => r.json())
    .then(d => {
        document.getElementById('loadingDiv').style.display = 'none';
        if (d.sucesso && d.resultados.length > 0) {
            const r0 = d.resultados[0];
            adicionarParada(r0.lat, r0.lng, r0.nome);
            mapa.setView([r0.lat, r0.lng], 16);
        } else {
            mostrarNota('❌ Endereço de parada não encontrado', 'error');
        }
    })
    .catch(err => {
        document.getElementById('loadingDiv').style.display = 'none';
        mostrarNota('❌ Erro ao buscar parada', 'error');
    });
}
