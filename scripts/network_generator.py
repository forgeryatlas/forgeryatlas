import json
import networkx as nx
from pyvis.network import Network
from cdlib import algorithms as cdlib_algorithms
import os


# Historical Color Palette Mapping based on Network Types
HISTORICAL_COLORS = {
    # Default color (earth tone / sepia)
    'DEFAULT': '#d4c4a8', 
    
    # Node types (mapping based on original graphcommons IDs to new palette)
    # People
    '24432e59-40ac-4d90-a6a5-e4ddf228ae54': '#a39171',
    # 5TH NETWORK
    'a916f7c3-14b0-4630-8eac-01e78f44e659': '#6b8e23', # Olive drab
    # BOLOGNA-SARDINIA
    '88633f04-1409-44e8-93bb-dd0d8753d2fd': '#c17a7a', # Faded rose/red
    # BOLOGNA-MESSINE
    '7f887ecf-767c-4b10-936b-7125ec75dfe6': '#5c6b73', # Slate/Steel
    # 6TH NETWORK
    '3aff4e38-96d5-4ff7-a12c-9f77d6d3b95d': '#8b0000', # Dark red
    # PEOPLE IN TURIN
    '32d61128-90fb-4aa7-904a-cc38be55abb4': '#4a7b9d', # Muted blue
    # PEOPLE IN BOLOGNA
    '34def8bb-9742-4683-9d50-03497a3442c4': '#875b8a', # Faded purple
    # PLACES
    '364bd8d2-6594-4360-a02f-01ee0c9f1f89': '#8fbc8f'  # Dark sea green
}

def generate_network_html(json_path, output_path):
    print(f"Reading graph data from {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Initialize NetworkX graph
    G = nx.Graph()

    # Process nodes temporarily to build the graph edges first
    nodes_data = data.get('nodes', [])
    edges_data = data.get('edges', [])
    
    for edge in edges_data:
        source = edge['sourceId']
        target = edge['targetId']
        # Add edges (we'll style them in PyVis directly later for better RGBA control)
        # We need the graph structure first to calculate degree centrality
        G.add_edge(source, target)

    # Calculate degree centrality
    # (Number of connections / maximum possible connections)
    # We'll use just the raw degree (number of edges) to size the nodes
    degree_dict = dict(G.degree())

    # --- Leiden Community Detection ---
    # Cluster colours — pastel/earth tones to match the historical aesthetic
    CLUSTER_COLORS = [
        '#c17a7a', '#4a7b9d', '#875b8a', '#6b8e23', '#d4c4a8',
        '#5c6b73', '#8b0000', '#8fbc8f', '#e0a96d', '#6d9eeb',
        '#a67c52', '#7b9095'
    ]

    if len(G.nodes) > 0 and len(G.edges) > 0:
        leiden_result = cdlib_algorithms.leiden(G)
        # cdlib returns NodeClustering: communities.communities = list of lists of node ids
        partition = {}
        for cluster_id, comm in enumerate(leiden_result.communities):
            for node_id in comm:
                partition[node_id] = cluster_id
    else:
        partition = {}
    # ------------------------------------
    
    # Process nodes with calculations
    node_types = {nt['id']: nt for nt in data.get('nodeTypes', [])}
    
    for node in nodes_data:
        node_id = node['id']
        name = node.get('name', 'UNKNOWN')
        type_id = node.get('typeId')
        
        # 1. Color assignment — based on Leiden cluster ID
        cluster_id = partition.get(node_id, 0)
        base_color = CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)]

        color = {
            'background': base_color,
            'border': '#4a4138',  # Dark sepia border
            'highlight': {
                'background': '#e8dcc5',
                'border': '#2d2621'
            },
            'hover': {
                'background': '#e8dcc5',
                'border': '#2d2621'
            }
        }

        # 2. Node Sizing based on Degree Centrality
        node_degree = degree_dict.get(node_id, 0)
        value = (node_degree * 3) + 10

        # 3. Label vs Title (Tooltip) logic
        description = node.get('description', 'No description available.')

        # Tooltip — includes Cluster Group so users can identify communities
        title_text = f"{name}\nRole/Location: {description}\nConnections: {node_degree}\nCluster (Leiden): {cluster_id}"
        
        # Label visibility (User requested all names to be visible)
        label = name

        G.nodes[node_id]['label'] = label
        G.nodes[node_id]['title'] = title_text
        G.nodes[node_id]['color'] = color
        G.nodes[node_id]['value'] = value  # This tells PyVis to dynamically size nodes

    # Edge styling will be handled via global options, but let's add them to NX with default attributes
    for edge in edges_data:
        source = edge['sourceId']
        target = edge['targetId']
        # Semi-transparent muted grey
        G[source][target]['color'] = 'rgba(120, 120, 120, 0.4)'
        G[source][target]['value'] = 0.5 # Thickness

    print(f"Successfully loaded {len(G.nodes)} nodes and {len(G.edges)} edges into NetworkX.")

    # Convert to PyVis
    print("Converting to PyVis network...")
    net = Network(height='800px', width='100%', bgcolor='#faf8f5', font_color='#333333')
    
    net.from_nx(G)
    
    # 4. Physics and Layout & 5. Styling Options
    # Using forceAtlas2Based or tuned barnesHut to make clusters push away
    net.set_options("""
    var options = {
      "nodes": {
        "shape": "dot",
        "borderWidth": 1.5,
        "borderWidthSelected": 2.5,
        "font": {
          "size": 24,
          "color": "#3a332a",
          "face": "Georgia, serif",
          "strokeWidth": 3,
          "strokeColor": "#ffffff"
        },
        "color": {
          "highlight": {
            "border": "#2B7CE9",
            "background": "#D2E5FF"
          }
        }
      },
      "edges": {
        "color": {
          "color": "rgba(120, 120, 120, 0.4)",
          "highlight": "#c94f4f",
          "hover": "#808080"
        },
        "smooth": {
          "type": "continuous",
          "forceDirection": "none",
          "roundness": 0.3
        }
      },
      "physics": {
        "forceAtlas2Based": {
          "gravitationalConstant": -150,
          "centralGravity": 0.015,
          "springLength": 150,
          "springConstant": 0.04,
          "damping": 0.09,
          "avoidOverlap": 0.5
        },
        "minVelocity": 0.75,
        "solver": "forceAtlas2Based",
        "stabilization": {
          "enabled": true,
          "iterations": 200,
          "updateInterval": 25
        }
      },
      "interaction": {
        "hover": true,
        "hoverConnectedEdges": true,
        "selectConnectedEdges": true,
        "tooltipDelay": 150,
        "zoomView": true,
        "dragView": true
      }
    }
    """)
    
    # Optional: Once stabilization is done, completely stop physics to freeze the view
    html = net.generate_html()
    
    # Injecting the listener into the HTML to forcefully stop physics after stabilization
    js_listener = """
    var originalNodeColors = {};
    var originalEdgeColors = {};
    var originalNodeLabels = {};

    network.on("stabilizationIterationsDone", function () {
        network.setOptions( { physics: false } );
        
        // Cache original colors and labels after first render
        var allNodes = nodes.get();
        allNodes.forEach(function(node) {
            originalNodeColors[node.id] = node.color ? node.color : undefined;
            originalNodeLabels[node.id] = node.label !== undefined ? node.label : "";
        });
        
        var allEdges = edges.get();
        allEdges.forEach(function(edge) {
            originalEdgeColors[edge.id] = edge.color ? edge.color : undefined;
        });
    });

    network.on("selectNode", function (params) {
        var selectedNode = params.nodes[0];
        var connectedNodes = network.getConnectedNodes(selectedNode);
        var connectedEdges = network.getConnectedEdges(selectedNode);

        var allNodes = nodes.get();
        var allEdges = edges.get();

        var updateNodes = [];
        var updateEdges = [];

        // Dim all nodes except selected and its neighbors — hide their labels completely
        allNodes.forEach(function(node) {
            var isConnected = connectedNodes.includes(node.id) || node.id == selectedNode;
            if (isConnected) {
                updateNodes.push({
                    id: node.id,
                    color: originalNodeColors[node.id],
                    label: originalNodeLabels[node.id],
                    font: { color: "#3a332a" }
                });
            } else {
                updateNodes.push({
                    id: node.id,
                    color: "rgba(200,200,200,0.2)",
                    label: "",
                    font: { color: "rgba(0,0,0,0)" }
                });
            }
        });

        // Dim all edges except connected ones
        allEdges.forEach(function(edge) {
            var isConnectedEdge = connectedEdges.includes(edge.id);
            if (isConnectedEdge) {
                var restoredColor = originalEdgeColors[edge.id];
                updateEdges.push({ id: edge.id, color: restoredColor });
            } else {
                updateEdges.push({ id: edge.id, color: "rgba(200,200,200,0.1)" });
            }
        });

        nodes.update(updateNodes);
        edges.update(updateEdges);
    });

    network.on("deselectNode", function (params) {
        var allNodes = nodes.get();
        var allEdges = edges.get();
        
        var updateNodes = [];
        var updateEdges = [];

        allNodes.forEach(function(node) {
            updateNodes.push({
                id: node.id,
                color: originalNodeColors[node.id],
                label: originalNodeLabels[node.id],
                font: { color: "#3a332a" }
            });
        });
        allEdges.forEach(function(edge) {
            var restoredColor = originalEdgeColors[edge.id];
            updateEdges.push({ id: edge.id, color: restoredColor });
        });

        nodes.update(updateNodes);
        edges.update(updateEdges);
    });
    </script>
    """
    html = html.replace('</script>', js_listener)

    # --- Inject search box UI and its logic ---
    search_ui = """
<style>
  #search-container {
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 320px;
    font-family: Georgia, serif;
  }
  #search-input {
    width: 100%;
    padding: 9px 16px;
    border: 1.5px solid #c4b49a;
    border-radius: 24px;
    background: rgba(250, 245, 235, 0.97);
    color: #3a332a;
    font-size: 14px;
    font-family: Georgia, serif;
    outline: none;
    box-shadow: 0 2px 12px rgba(60,50,30,0.18);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  #search-input:focus {
    border-color: #8b6914;
  }
  #search-input::placeholder {
    color: #a09070;
  }
  #search-dropdown {
    width: 100%;
    background: rgba(250, 245, 235, 0.99);
    border: 1.5px solid #c4b49a;
    border-top: none;
    border-radius: 0 0 16px 16px;
    max-height: 220px;
    overflow-y: auto;
    display: none;
    box-shadow: 0 6px 18px rgba(60,50,30,0.15);
  }
  .search-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    color: #3a332a;
    border-bottom: 1px solid #e8dcc5;
    transition: background 0.15s;
  }
  .search-item:last-child { border-bottom: none; }
  .search-item:hover, .search-item.active {
    background: #e8dcc5;
  }
  .search-highlight {
    font-weight: bold;
    color: #7a4f10;
  }
</style>

<div id="search-container">
  <input id="search-input" type="text" placeholder="🔍 Search person..." autocomplete="off" />
  <div id="search-dropdown"></div>
</div>

<script>
(function() {
  // Wait for vis network to be ready
  function waitForNetwork(cb) {
    if (typeof network !== 'undefined' && typeof nodes !== 'undefined') {
      cb();
    } else {
      setTimeout(function() { waitForNetwork(cb); }, 200);
    }
  }

  waitForNetwork(function() {
    var input = document.getElementById('search-input');
    var dropdown = document.getElementById('search-dropdown');
    var activeIdx = -1;

    function getAllNodes() {
      return nodes.get().map(function(n) { return { id: n.id, label: n.label || '' }; });
    }

    function highlight(text, query) {
      if (!query) return text;
      var idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return text;
      return text.slice(0, idx) +
        '<span class="search-highlight">' + text.slice(idx, idx + query.length) + '</span>' +
        text.slice(idx + query.length);
    }

    function focusNode(nodeId) {
      // Zoom to node
      network.focus(nodeId, { animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
      network.selectNodes([nodeId]);
      // Trigger the existing selectNode behavior
      network.emit('selectNode', { nodes: [nodeId], edges: network.getConnectedEdges(nodeId) });
      // Clear search
      input.value = '';
      dropdown.style.display = 'none';
    }

    function renderDropdown(query) {
      var all = getAllNodes();
      var results = query.length === 0 ? [] : all.filter(function(n) {
        return n.label.toLowerCase().includes(query.toLowerCase());
      }).slice(0, 10);

      if (results.length === 0) {
        dropdown.style.display = 'none';
        activeIdx = -1;
        return;
      }

      dropdown.innerHTML = '';
      results.forEach(function(n, i) {
        var item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = highlight(n.label, query);
        item.addEventListener('mousedown', function(e) {
          e.preventDefault();
          focusNode(n.id);
        });
        dropdown.appendChild(item);
      });

      dropdown.style.display = 'block';
      activeIdx = -1;
      dropdown._results = results;
    }

    input.addEventListener('input', function() {
      renderDropdown(this.value.trim());
    });

    input.addEventListener('keydown', function(e) {
      var items = dropdown.querySelectorAll('.search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        items.forEach(function(el, i) { el.classList.toggle('active', i === activeIdx); });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        items.forEach(function(el, i) { el.classList.toggle('active', i === activeIdx); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && dropdown._results && dropdown._results[activeIdx]) {
          focusNode(dropdown._results[activeIdx].id);
        } else if (dropdown._results && dropdown._results.length > 0) {
          focusNode(dropdown._results[0].id);
        }
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        input.blur();
      }
    });

    input.addEventListener('blur', function() {
      setTimeout(function() { dropdown.style.display = 'none'; }, 150);
    });

    input.addEventListener('focus', function() {
      if (this.value.trim()) renderDropdown(this.value.trim());
    });
  });
})();
</script>
"""
    html = html.replace('</body>', search_ui + '</body>')

    # Save the HTML file
    print(f"Saving interactive visualization to {output_path}")
    with open(output_path, "w+", encoding="utf-8") as out:
        out.write(html)
    print("Done!")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'static', 'graphcommons.json')
    output_path = os.path.join(base_dir, 'templates', 'networkx_map.html')
    
    generate_network_html(json_path, output_path)
