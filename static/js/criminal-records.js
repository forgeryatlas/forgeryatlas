// Criminal Records Table - Flask API'den suçluları çekip tabloya yerleştiren script
document.addEventListener('DOMContentLoaded', function() {
  console.log("Criminal records script loaded");

  // Criminals tablosunun body kısmını seç
  const tableBody = document.getElementById('criminals-table-body');

  if (!tableBody) {
    console.error("Table body with ID 'criminals-table-body' not found.");
    return;
  }

  // Yükleniyor mesajı göster
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading criminal records...</td></tr>';

  // API'den verileri çek
  console.log("Fetching criminals from API...");
  fetch('data/criminals.json')
    .then(response => response.json())
    .then(criminals => {
      console.log(`Found ${criminals.length} criminal records`);

      // Yükleniyor mesajını temizle
      tableBody.innerHTML = '';

      if (criminals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No criminal records found</td></tr>';
        return;
      }

      // Her suçlu için bir tablo satırı oluştur
      criminals.forEach((criminal) => {
        // Yeni bir tablo satırı oluştur
        const row = document.createElement('tr');

        // Tarih formatını düzenle
        let birthDate = 'Unknown';
        if (criminal.birthdate) {
            const date = criminal.birthdate;
            if (date.year) {
                birthDate = `${date.year}`;
                if (date.month) birthDate += `-${date.month}`;
                if (date.day) birthDate += `-${date.day}`;
            }
        }

        // Satır içeriğini oluştur
        row.innerHTML = `
          <td>${criminal.name || 'Unknown'}</td>
          <td>${birthDate}</td>
          <td>${criminal.birthplace || 'Unknown'}</td>
          <td>${criminal.nationality || 'Unknown'}</td>
          <td>${criminal.occupation || 'Unknown'}</td>
          <td>${criminal.placeOfArrest || 'Unknown'}</td>
        `;

        // Satırı tabloya ekle
        tableBody.appendChild(row);
      });

      console.log("Criminal records table populated successfully");
    })
    .catch(error => {
      console.error("Error fetching criminals:", error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading criminal records: ${error.message}</td></tr>`;
    });
});
