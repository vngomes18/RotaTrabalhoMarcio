# 🗺️ Sistema de Roteamento Urbano com Algoritmo de Dijkstra (RotaMarcio)

Uma implementação abrangente em Python para encontrar rotas ótimas em redes urbanas utilizando o algoritmo de caminho mais curto de Dijkstra, alimentado por dados do OpenStreetMap via OSMnx.

## 🌟 Funcionalidades

  - *Dados de Rede Reais*: Utiliza dados do OpenStreetMap via OSMnx para redes viárias urbanas autênticas.
  - *Algoritmo de Dijkstra*: Implementação personalizada com fila de prioridade (heapq) para desempenho ideal.
  - *Múltiplos Modos de Roteamento*: Suporte para redes de direção (carro), caminhada e ciclismo.
  - *Cálculo de Tempo de Viagem*: Roteamento opcional baseado no tempo de viagem usando cálculos do OSMnx.
  - *Interface Interativa*: Interface de linha de comando amigável para planejamento de rotas.
  - *Visualização Rica*: Visualização de rotas estáticas e animadas usando Matplotlib.
  - *Geocodificação de Endereços*: Converte endereços em nós da rede automaticamente.
  - *Desempenho Otimizado*: Manuseio eficiente de redes viárias de grande escala.

## 🛠️ Requisitos

### Bibliotecas Python

bash
pip install networkx matplotlib osmnx


### Requisitos do Sistema

  - Python 3.8 ou superior
  - Conexão com a Internet (para baixar dados OSM)
  - RAM suficiente para processamento de grandes redes

## 🚀 Início Rápido

### 1\. Modo Interativo

bash
python urban_routing_system.py


Siga as instruções para:

  - Selecionar uma cidade/área
  - Escolher o tipo de rede (drive/walk/bike - dirigir/andar/pedalar)
  - Inserir endereços de origem e destino
  - Visualizar a rota gerada

### 2\. Uso Programático

python
from urban_routing_system import UrbanRoutingSystem

# Inicializar o sistema
routing = UrbanRoutingSystem("São Paulo, Brazil", "drive")

# Encontrar rota entre endereços
start_node = routing.get_node_by_address("Praça da Sé, São Paulo")
end_node = routing.get_node_by_address("Avenida Paulista, São Paulo")

# Encontrar o caminho mais curto
path, distance = routing.dijkstra_shortest_path(start_node, end_node, "length")

# Visualizar a rota
routing.visualize_static_map(path)


### 3\. Scripts de Exemplo

bash
# Executar exemplos abrangentes
python example_usage.py

# Executar exemplos específicos (descomente no arquivo)
python example_usage.py # Apenas exemplo básico


## 📋 Exemplos de Uso

### Roteamento Básico

python
# Inicializar para uma área específica
routing = UrbanRoutingSystem("Centro, São Paulo, Brazil", "drive")

# Rota por endereço
start_node = routing.get_node_by_address("Rua Augusta, São Paulo")
end_node = routing.get_node_by_address("Rua Oscar Freire, São Paulo")

path, cost = routing.dijkstra_shortest_path(start_node, end_node, "length")
print(f"Distância: {cost:.2f} metros")


### Roteamento por Tempo de Viagem

python
# Rota por tempo de viagem (se disponível)
path, travel_time = routing.dijkstra_shortest_path(start_node, end_node, "travel_time")
print(f"Tempo de viagem: {travel_time:.2f} segundos")


### Visualização Personalizada

python
# Mapa estático com rota
routing.visualize_static_map(path, save_path="minha_rota.png")

# Visualização de rota animada
routing.visualize_animated_route(path, interval=0.5)


## 🏗️ Arquitetura

### Componentes Principais

1.  *Classe UrbanRoutingSystem*: Controlador principal do sistema
      * Carregamento e gerenciamento de rede
      * Coordenação de cálculo de rotas
      * Manuseio da interface do usuário
2.  *Algoritmo de Dijkstra*: Implementação personalizada
      * Fila de prioridade baseada em heap (heapq)
      * Reconstrução eficiente de caminhos
      * Suporte para múltiplos tipos de peso
3.  *Integração OSMnx*: Dados de rede reais
      * Download automático de rede
      * Cálculo de tempo de viagem
      * Manuseio de coordenadas geográficas
4.  *Sistema de Visualização*: Baseado em Matplotlib
      * Visualização de rota estática
      * Destaque de caminho animado
      * Exibição de estatísticas da rede

### Fluxo de Dados


Entrada do Usuário → Geocodificação de Endereço → Seleção de Nó → Algoritmo de Dijkstra → Visualização do Caminho


## 🔧 Opções de Configuração

### Tipos de Rede

  - "drive": Rede viária para veículos (padrão)
  - "walk": Rede para pedestres
  - "bike": Rede para ciclismo
  - "all": Rede combinada

### Tipos de Peso

  - "length": Distância física em metros
  - "travel_time": Tempo estimado de viagem em segundos (se disponível)

### Especificações de Área

  - Nomes de Cidades: "São Paulo, Brazil"
  - Bairros: "Jardins, São Paulo, Brazil"
  - Coordenadas: Use caixas delimitadoras (bounding boxes) diretamente com OSMnx

## 📊 Considerações de Desempenho

### Impacto do Tamanho da Rede

  - *Áreas pequenas* (bairros): \~1.000-10.000 nós, processamento rápido
  - *Áreas médias* (distritos): \~10.000-100.000 nós, processamento moderado
  - *Áreas grandes* (cidades): \~100.000+ nós, processamento mais lento

### Dicas de Otimização

1.  Use áreas menores para testes e desenvolvimento.
2.  Faça cache das redes para uso repetido.
3.  Escolha tipos de rede apropriados para o seu caso de uso.
4.  Considere tempo de viagem vs. distância (comprimento) com base nos requisitos.

## 🎯 Casos de Uso

### Planejamento Urbano

  - Analisar padrões de fluxo de tráfego
  - Avaliar a eficiência da rede viária
  - Planejar nova infraestrutura de transporte

### Logística

  - Otimizar rotas de entrega
  - Calcular tempos de viagem para gestão de frotas
  - Encontrar rotas alternativas durante o tráfego

### Navegação Pessoal

  - Planejar rotas de caminhada/ciclismo
  - Encontrar rotas de condução mais curtas
  - Explorar áreas urbanas de forma eficiente

### Pesquisa

  - Estudar a topologia de redes urbanas
  - Analisar padrões de acessibilidade
  - Modelar sistemas de transporte

## 🔍 Solução de Problemas (Troubleshooting)

### Problemas Comuns

1.  *Falha no Carregamento da Rede*

    python
    # Tente com uma área menor
    routing = UrbanRoutingSystem("Centro, São Paulo, Brazil", "drive")
    

2.  *Endereço Não Encontrado*

    python
    # Use coordenadas em vez disso
    start_node = ox.nearest_nodes(routing.graph, longitude, latitude)
    

3.  *Tempo de Viagem Não Disponível*

    python
    # Recorra ao roteamento baseado em distância (length)
    path, cost = routing.dijkstra_shortest_path(start_node, end_node, "length")
    

4.  *Problemas de Visualização*

    python
    # Verifique se o caminho existe
    if path and len(path) > 1:
        routing.visualize_static_map(path)
    

### Problemas de Desempenho

  - Reduza o tamanho da rede para um processamento mais rápido.
  - Use o tempo de viagem apenas quando necessário.
  - Considere baixar as redes previamente para uso offline.

## 📚 Recursos Avançados

### Análise de Rede Personalizada

python
# Obter estatísticas da rede
stats = routing.get_network_stats()
print(f"Densidade da rede: {nx.density(routing.graph):.4f}")

# Verificar conectividade
print(f"Fortemente conectado: {nx.is_strongly_connected(routing.graph)}")


### Processamento de Rotas em Lote

python
# Processar múltiplas rotas
routes = [
    (start1, end1),
    (start2, end2),
    (start3, end3)
]

for start, end in routes:
    path, cost = routing.dijkstra_shortest_path(start, end, "length")
    print(f"Custo da rota: {cost:.2f}")


### Visualização Personalizada

python
# Criar plots personalizados
fig, ax = plt.subplots(figsize=(15, 15))
ox.plot_graph(routing.graph, ax=ax, node_size=0, edge_color='lightgray')

# Adicionar elementos personalizados...
plt.show()


## 🤝 Contribuindo

### Configuração de Desenvolvimento

1.  Faça um fork do repositório
2.  Instale as dependências de desenvolvimento
3.  Crie branches de funcionalidade (feature branches)
4.  Adicione testes para novos recursos
5.  Envie pull requests

### Estilo de Código

  - Siga as diretrizes PEP 8
  - Use type hints (dicas de tipo) sempre que possível
  - Adicione docstrings às funções
  - Inclua exemplos de uso

## 📄 Licença

Este projeto é open source e está disponível sob a Licença MIT.

## 🙏 Agradecimentos

  - *OSMnx*: Por fornecer excelente integração com o OpenStreetMap
  - *NetworkX*: Pela estrutura de dados de grafos e algoritmos
  - *OpenStreetMap*: Pelos dados geográficos abrangentes
  - *Matplotlib*: Pelas capacidades de visualização

## 📞 Suporte

Para problemas, dúvidas ou contribuições:

1.  Verifique a seção de solução de problemas
2.  Revise os scripts de exemplo
3.  Abra uma issue no repositório
4.  Consulte a documentação do OSMnx e NetworkX

-----

*Boas Rotas\!* 🗺️🚗🚶‍♂️🚴‍♂️
\#RotaMarcio

#   R o t a T r a b a l h o M a r c i o  
 