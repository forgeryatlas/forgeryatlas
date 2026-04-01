import pandas as pd
import folium
from folium import plugins
import plotly.graph_objects as go
import os

# -------------------------------------------------------------------
# 1. READ AND CLEAN DATA
# -------------------------------------------------------------------
file_path = 'Counterfeit Currency Mobility.xlsx'

# Load from Excel and fill NaN values with empty strings
batches = pd.read_excel(file_path, sheet_name='Counterfeit_Batches').fillna('')
movements = pd.read_excel(file_path, sheet_name='Counterfeit_Movement').fillna('')
seizures = pd.read_excel(file_path, sheet_name='Counterfeit_Seizures').fillna('')

# Strip trailing spaces for consistent grouping
movements['from place'] = movements['from place'].astype(str).str.strip()
movements['to place'] = movements['to place'].astype(str).str.strip()
batches['production place'] = batches['production place'].astype(str).str.strip()
seizures['place'] = seizures['place'].astype(str).str.strip()

# Define coordinates for historical locations
coords = {
    'Istanbul_Production': [41.0082, 28.9784], # Historical Peninsula (Production)
    'Istanbul_Arrival': [41.0222, 28.9750],    # Galata/Karaköy Port (Arrival)
    'Turin': [45.0703, 7.6869],
    'Bologna': [44.4949, 11.3426],
    'Istanbul, Scutari': [41.0270, 29.0150],
    'Istanbul, Feriköy': [41.0500, 28.9833]
}

# -------------------------------------------------------------------
# 2. ENRICHED FOLIUM MOBILITY MAP (With Actors & Notes)
# -------------------------------------------------------------------
# Bezier Curve Helper Function
def create_bezier_curve(p1, p2, offset=0.2):
    """Creates a quadratic Bezier curve between p1 and p2 with a given offset."""
    import numpy as np
    
    p1 = np.array(p1)
    p2 = np.array(p2)
    
    # Calculate midpoint
    mid = (p1 + p2) / 2
    
    # Calculate perpendicular vector
    res = p2 - p1
    perp = np.array([-res[1], res[0]])
    perp_norm = perp / np.linalg.norm(perp)
    
    # Control point
    dist = np.linalg.norm(res)
    ctrl = mid + perp_norm * dist * offset
    
    # Generate points along the curve
    t = np.linspace(0, 1, 30)
    curve_points = []
    for val in t:
        point = (1 - val)**2 * p1 + 2 * (1 - val) * val * ctrl + val**2 * p2
        curve_points.append(point.tolist())
    
    return curve_points

# Initialize map
m = folium.Map(location=[43.0, 18.0], zoom_start=5, tiles=None)

# Add OSM tiles
folium.TileLayer(
    tiles='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className='historical-map-tiles',
    control=False
).add_to(m)

# Inject CSS
historical_css = """
<style>
    .historical-map-tiles {
        filter: sepia(30%) saturate(70%) brightness(95%) contrast(90%);
    }
    .popup-container {
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        line-height: 1.4;
        max-height: 350px;
        width: 280px;
        overflow-y: auto;
        padding-right: 10px;
        overflow-wrap: break-word;
        white-space: normal;
    }
    /* Custom Archival Scrollbar */
    .popup-container::-webkit-scrollbar {
        width: 6px;
    }
    .popup-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    .popup-container::-webkit-scrollbar-thumb {
        background: #E3C263;
        border-radius: 10px;
    }
    .popup-container::-webkit-scrollbar-thumb:hover {
        background: #8B0000;
    }
    .popup-divider {
        border: 0;
        border-top: 1px solid #ddd;
        margin: 8px 0;
    }
</style>
"""
m.get_root().header.add_child(folium.Element(historical_css))
# Add Production Locations
for place, group in batches.groupby('production place'):
    loc = str(place).strip()
    coord_key = 'Istanbul_Production' if loc == 'Istanbul' else loc
    is_ist = loc.startswith('Istanbul')
    if coord_key in coords:
        all_html = []
        for _, row in group.iterrows():
            entry_html = f"""
            <div>
                <b style="color: #27ae60;">Producer(s):</b> {row['person_id']}<br>
                <b>Location:</b> {loc} ({row['production year']})<br>
                <b>Currency:</b> {row['denomination']} {row['currency type']}<br>
                <b>Amount:</b> {row['estimated quantity in total']}<br>
                <i>Notes: {row['notes']}</i>
            </div>
            """
            all_html.append(entry_html)
        popup_content = f'<div class="popup-container">' + '<hr class="popup-divider">'.join(all_html) + '</div>'
        
        folium.Marker(
            coords[coord_key], 
            popup=folium.Popup(popup_content, max_width=350), 
            icon=folium.DivIcon(
                html='<div class="ist-div-wrapper ist-prod"><div class="awesome-marker-icon-green awesome-marker"><i class="fa fa-industry icon-white"></i></div></div>',
                icon_anchor=(0,0),
                popup_anchor=(0, -40)
            ) if is_ist else folium.Icon(color='green', icon='industry', prefix='fa')
        ).add_to(m)

# Add Seizure Locations
for place, group in seizures.groupby('place'):
    loc = str(place).strip()
    coord_key = 'Istanbul_Arrival' if loc == 'Istanbul' else loc
    is_ist = loc.startswith('Istanbul')
    if coord_key in coords:
        all_html = []
        for _, row in group.iterrows():
            entry_html = f"""
            <div>
                <b style="color: #e74c3c;">Seized by:</b> {row['authority']}<br>
                <b>Location:</b> {loc}<br>
                <b>Date:</b> {row['Month']} {row['year']}<br>
                <b>Amount Seized:</b> {row['quantity seized']}<br>
                <i>Notes: {row['notes']}</i>
            </div>
            """
            all_html.append(entry_html)
        popup_content = f'<div class="popup-container">' + '<hr class="popup-divider">'.join(all_html) + '</div>'
        
        folium.Marker(
            coords[coord_key], 
            popup=folium.Popup(popup_content, max_width=350), 
            icon=folium.DivIcon(
                html='<div class="ist-div-wrapper ist-seiz"><div class="awesome-marker-icon-red awesome-marker"><i class="fa fa-ban icon-white"></i></div></div>',
                icon_anchor=(0,0),
                popup_anchor=(0, -40)
            ) if is_ist else folium.Icon(color='red', icon='ban', prefix='fa')
        ).add_to(m)

# Add specific arrival port symbol
arrival_port_html = """
<div class="popup-container">
    <b style='color:#2980b9;'>Arrival Port</b><br>
    <b>Location:</b> Istanbul (Galata Port)<br>
    <hr class="popup-divider">
    <i>Note: Smuggled counterfeit currency arrival point via sea route.</i>
</div>
"""
folium.Marker(
    coords['Istanbul_Arrival'],
    popup=folium.Popup(arrival_port_html, max_width=300),
    icon=folium.DivIcon(
        html='<div class="ist-div-wrapper ist-arr"><div class="awesome-marker-icon-blue awesome-marker"><i class="fa fa-anchor icon-white"></i></div></div>',
        icon_anchor=(0,0),
        popup_anchor=(0, -40)
    )
).add_to(m)

# -------------------------------------------------------------------
# 4. MOVEMENT ROUTES WITH CURVED PATHS & DYNAMIC COLORS
# -------------------------------------------------------------------
route_colors = [
    '#8B0000', # Dark Red
    '#00008B', # Dark Blue
    '#006400', # Dark Green
    '#8B008B', # Dark Magenta
    '#FF8C00', # Dark Orange
    '#4B0082', # Indigo
    '#2F4F4F'  # Dark Slate Gray
]

route_index = 0
# Group movements to identify unique routes
unique_routes = movements.groupby(['from place', 'to place'])

for (start_p, end_p), group in unique_routes:
    start_loc = str(start_p).strip()
    end_loc = str(end_p).strip()
    s_key = 'Istanbul_Arrival' if start_loc == 'Istanbul' else start_loc
    e_key = 'Istanbul_Arrival' if end_loc == 'Istanbul' else end_loc
    
    if s_key in coords and e_key in coords:
        color = route_colors[route_index % len(route_colors)]
        # Use route index to vary curvature and avoid overlap
        curvature = 0.15 + (route_index * 0.08)
        
        path_points = create_bezier_curve(coords[s_key], coords[e_key], offset=curvature)
        
        tooltip_content = f"""
        <div class="popup-container" style="padding: 5px;">
            <b style="color: {color}; font-size: 14px;">Route: {start_loc} &#8594; {end_loc}</b><br><br>
        """
        all_entries = []
        for _, row in group.iterrows():
            entry_html = f"""
            <div>
                <b>Carried by:</b> {row['source person']}<br>
                <b>Date:</b> {row['month']} {row['year']}<br>
                <b>Amount:</b> {row['quantity moved']}<br>
                <i>Notes: {row['notes']}</i>
            </div>
            """
            all_entries.append(entry_html)
        tooltip_content += '<hr class="popup-divider">'.join(all_entries) + '</div>'
        
        plugins.AntPath(
            locations=path_points, 
            dash_array=[10, 20], 
            delay=1500,
            color=color,
            pulse_color='#E3C263',
            weight=4, 
            opacity=0.8, 
            tooltip=tooltip_content
        ).add_to(m)
        
        route_index += 1
# Safely inject CSS and script for markers (NO ROTATION/TRANSFORMS on the main pin to prevent Leaflet clipping/flying bugs)
historical_css_markers = """
<style>
    @keyframes pulse-shadow {
        0% { filter: drop-shadow(0 0 2px rgba(227, 194, 99, 0.4)); }
        50% { filter: drop-shadow(0 0 10px rgba(227, 194, 99, 0.8)); }
        100% { filter: drop-shadow(0 0 2px rgba(227, 194, 99, 0.4)); }
    }
    
    /* DivIcon wrapper styles */
    .ist-div-wrapper {
        position: absolute;
        width: 35px;
        height: 46px;
        left: -17px;
        top: -46px;   
        transform-origin: bottom center;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    /* Fanned out rotations */
    .ist-div-wrapper.fanned.ist-prod { transform: rotate(-35deg); }
    .ist-div-wrapper.fanned.ist-seiz { transform: rotate(35deg); }
    .ist-div-wrapper.fanned.ist-arr  { transform: rotate(0deg); }
    
    /* Ensure the internal awesome-marker aligns properly within our wrapper */
    .ist-div-wrapper .awesome-marker {
        margin: 0 !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        cursor: pointer;
        animation: pulse-shadow 2.5s infinite ease-in-out !important;
    }

    /* Target the inner icon for scale hover to avoid moving the base */
    .ist-div-wrapper .awesome-marker i {
        transition: transform 0.2s ease !important;
    }
    .ist-div-wrapper:hover .awesome-marker i {
        transform: scale(1.4) !important;
    }
    .ist-div-wrapper:hover .awesome-marker {
        z-index: 5000 !important;
        filter: brightness(1.2) drop-shadow(0 0 12px rgba(255, 215, 0, 1)) !important;
    }

    /* Regular Leaflet marker interaction (for non-Istanbul pins) */
    .leaflet-marker-icon.awesome-marker:not(.awesome-marker-icon-green):not(.awesome-marker-icon-red):not(.awesome-marker-icon-blue) {
        animation: pulse-shadow 2.5s infinite ease-in-out !important;
    }
</style>
<script>
    function applyIstanbulFan() {
        var map = null;
        for (let key in window) {
            if (key.startsWith('map_') && window[key].flyTo) {
                map = window[key];
                break;
            }
        }
        if (!map) return;
        
        const currentZoom = map.getZoom();
        const shouldFan = currentZoom < 14;

        // Find all our custom DivIcon wrappers and toggle the 'fanned' class
        const wrappers = document.querySelectorAll('.ist-div-wrapper');
        wrappers.forEach(w => {
            if (shouldFan) {
                w.classList.add('fanned');
            } else {
                w.classList.remove('fanned');
            }
        });
        
        // Setup strict zoom-on-click for Istanbul
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && layer._icon) {
                const wrapper = layer._icon.querySelector('.ist-div-wrapper');
                if (wrapper) {
                    if (!layer._customZoomAttached) {
                        layer.on('click', function(e) {
                            map.flyTo(e.target.getLatLng(), 13, {animate: true, duration: 1.5});
                            // Ensure popup still opens
                            if (layer.getPopup && layer.getPopup() && !layer.isPopupOpen()) {
                                layer.openPopup();
                            }
                        });
                        layer._customZoomAttached = true;
                    }
                } else if (layer._icon.classList.contains('awesome-marker')) {
                    // Make non-Istanbul markers pulse too
                     layer._icon.classList.add('non-ist-pulse');
                }
            }
        });
    }

    setTimeout(() => {
        var map = null;
        for (let key in window) {
            if (key.startsWith('map_') && window[key].flyTo) { map = window[key]; break; }
        }
        if (map) {
            map.on('zoomend', applyIstanbulFan);
            applyIstanbulFan();
            setTimeout(applyIstanbulFan, 500); // run once more to catch late markers
            setInterval(applyIstanbulFan, 2000); // keep dynamic markers in check
        }
    }, 800);
</script>
"""

m.get_root().html.add_child(folium.Element(historical_css_markers))

m.save('1_folium_mobility_map.html')
print("Generated 1_folium_mobility_map.html with curved paths.")


# -------------------------------------------------------------------
# 3. ACTOR-BASED SANKEY DIAGRAM (Financial Flow)
# -------------------------------------------------------------------
import plotly.graph_objects as go

# -------------------------------------------------------------------
# 3. ACTOR-BASED SANKEY DIAGRAM (Financial Flow)
# -------------------------------------------------------------------
links = []

# Link 1: Person -> Production Place
for _, row in batches.iterrows():
    if row['person_id']:
        links.append({
            'source': row['person_id'],
            'target': str(row['production place']).strip(),
            'value': row['estimated quantity in total'],
            'type': 'Actor → Production place'
        })

# Link 2: Production Place -> Destination (Movements)
for _, row in movements.iterrows():
    links.append({
        'source': str(row['from place']).strip(),
        'target': str(row['to place']).strip(),
        'value': row['quantity moved'],
        'type': 'Place → Place'
    })

# Link 3: Destination -> Seizing Authority (Seizures)
for _, row in seizures.iterrows():
    links.append({
        'source': str(row['place']).strip(),
        'target': f"Seized by: {row['authority']}",
        'value': row['quantity seized'],
        'type': 'Place → Authority'
    })

# Process nodes and indices for Plotly
all_nodes = list(set([item['source'] for item in links] + [item['target'] for item in links]))
node_indices = {name: i for i, name in enumerate(all_nodes)}

source_indices = [node_indices[item['source']] for item in links]
target_indices = [node_indices[item['target']] for item in links]
values = [item['value'] for item in links]

# -------------------------------------------------------------------
# STYLING
# -------------------------------------------------------------------
def node_color(name):
    if str(name).startswith("Seized by:"):
        return "rgba(214, 76, 76, 0.9)"      # soft red
    elif name in batches['person_id'].dropna().astype(str).tolist():
        return "rgba(78, 121, 167, 0.9)"     # blue
    else:
        return "rgba(242, 142, 44, 0.9)"     # orange

def link_color(source, target):
    if str(target).startswith("Seized by:"):
        return "rgba(160, 160, 160, 0.35)"   # grey for seizure flow
    elif source in batches['person_id'].dropna().astype(str).tolist():
        return "rgba(78, 121, 167, 0.28)"    # blue translucent
    else:
        return "rgba(242, 142, 44, 0.25)"    # orange translucent

node_colors = [node_color(node) for node in all_nodes]
link_colors = [link_color(item['source'], item['target']) for item in links]
link_types = [item['type'] for item in links]

# Create and save Sankey figure
fig = go.Figure(data=[go.Sankey(
    arrangement="snap",
    node=dict(
        pad=18,
        thickness=18,
        line=dict(color="rgba(60,60,60,0.6)", width=0.6),
        label=all_nodes,
        color=node_colors,
        hovertemplate="<b>%{label}</b><extra></extra>"
    ),
    link=dict(
        source=source_indices,
        target=target_indices,
        value=values,
        color=link_colors,
        customdata=link_types,
        hovertemplate=(
            "<b>%{source.label}</b> → <b>%{target.label}</b><br>"
            "Quantity: %{value}<br>"
            "Flow type: %{customdata}<extra></extra>"
        )
    )
)])

fig.update_layout(
    title=dict(
        text="Counterfeit Network Flow: Actors, Locations, and Authorities",
        x=0.5,
        xanchor="center",
        font=dict(size=24, family="Arial", color="#22324a")
    ),
    font=dict(
        family="Arial",
        size=13,
        color="#2f3b52"
    ),
    paper_bgcolor="#fbfbfd",
    plot_bgcolor="#fbfbfd",
    margin=dict(l=20, r=20, t=70, b=20),
)

fig.write_html('2_plotly_sankey_actor_flow.html')
print("Generated 2_plotly_sankey_actor_flow.html")
