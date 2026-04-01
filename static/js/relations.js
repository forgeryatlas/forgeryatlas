// beyoğlu-relations.js
(function(){
    let map, allMarkers = [];
    let criminalsByNetwork = {}; // Ağlara göre suçluları sakla
  
    // 1️⃣ Init fonksiyonu
    function init(containerId, tabsId) {
      map = L.map(containerId).setView([41.0370, 28.9866], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
  
      // Network modal'ını kapat
      document.querySelector('.network-close').addEventListener('click', function() {
        document.getElementById('network-modal').style.display = 'none';
      });
      
      // Modal dışına tıklandığında kapat
      window.addEventListener('click', function(event) {
        const modal = document.getElementById('network-modal');
        if (event.target == modal) {
          modal.style.display = 'none';
        }
      });
      
      fetchCriminalMarkers()
        .then(() => setupTabs(tabsId))
        .catch(console.error);
    }
  
    // 2️⃣ Firestore'dan çek ve marker oluştur
    function fetchCriminalMarkers() {
      // Ağlara göre suçluları sıfırla
      for (let i = 1; i <= 6; i++) {
        criminalsByNetwork[`network_${i}`] = [];
      }
      
      return db.collection('criminals').get().then(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          if (!data.coordinates) return;
          
          const m = L.circleMarker(
            [data.coordinates.lat, data.coordinates.lng], {
              radius: 6,
              color: getColor(data.network),
              fillColor: getColor(data.network),
              fillOpacity: 0.8,
              weight: 1
          });
          
          m.relation = data.network;
          m.originalRadius = 6;
          m.criminalData = data;
          m.criminalId = doc.id;
          
          // Popup içeriğini zenginleştir
          const name = data.name || doc.id;
          const location = data.location ? `<br/>Location: ${data.location}` : '';
          m.bindPopup(`<strong>${name}</strong><br/>Network: ${data.network}${location}`);
          
          // Çift tıklama olayını ekle
          m.on('dblclick', function() {
            showNetworkDescription(data.network);
          });
          
          // Ağa göre suçluyu sakla
          if (data.network && data.network.startsWith('network_')) {
            criminalsByNetwork[data.network].push({
              id: doc.id,
              name: data.name || doc.id,
              location: data.location
            });
          }
          
          allMarkers.push(m);
          m.addTo(map);
        });
      });
    }
    
    // Ağ açıklamasını göster
    function showNetworkDescription(network) {
      if (!network || !network.startsWith('network_')) return;
      
      // Modal başlığını ve açıklamasını ayarla
      document.getElementById('network-modal-title').textContent = getNetworkTitle(network);
      document.getElementById('network-modal-description').textContent = getNetworkDescription(network);
      
      // Ağdaki suçluları listele
      const criminalList = document.getElementById('network-criminal-list');
      criminalList.innerHTML = '';
      
      const criminals = criminalsByNetwork[network] || [];
      criminals.forEach(criminal => {
        const li = document.createElement('li');
        li.className = 'criminal-item';
        li.textContent = criminal.name;
        criminalList.appendChild(li);
      });
      
      // Modal'ı göster
      document.getElementById('network-modal').style.display = 'block';
    }
  
    // 3️⃣ Tab'larla marker'ları filtrele
    function setupTabs(tabsId) {
      document.querySelectorAll(`#${tabsId} .nav-link`).forEach(tab => {
        tab.addEventListener('click', e => {
          e.preventDefault();
          // active class
          document.querySelectorAll(`#${tabsId} .nav-link`)
            .forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
  
          const sel = tab.dataset.network; // all veya network_X
          allMarkers.forEach(m => {
            const match = (sel === 'all' || m.relation === sel);
            if (match) {
              m.setStyle({ radius: m.originalRadius*2, weight: 2, color: getColor(m.relation), fillColor: getColor(m.relation) });
              if (!map.hasLayer(m)) m.addTo(map);
            } else {
              m.setStyle({ radius: m.originalRadius, weight: 1, color: '#ccc', fillColor: '#ccc' });
              if (map.hasLayer(m)) map.removeLayer(m);
            }
          });
        });
      });
    }
  
    // 4️⃣ Network'e göre sabit renk atama
    function getColor(network) {
      const colors = {
        network_1: '#e74c3c',
        network_2: '#3498db',
        network_3: '#2ecc71',
        network_4: '#f1c40f',
        network_5: '#9b59b6',
        network_6: '#e67e22',
        all:       '#999'
      };
      return colors[network] || '#333';
    }
  
    // 5️⃣ Dışarıya aç
    window.BeyogluRelationsMap = { init };
  })();
