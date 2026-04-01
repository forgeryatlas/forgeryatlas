// Standalone script to load criminal records from API
// This script fetches data from the Flask API endpoint

// Global state for criminal records
let allCriminals = [];
let currentSort = { column: "unknownCount", direction: "asc" };
let searchQuery = "";

// Sayfa yüklendiğinde çalış
document.addEventListener("DOMContentLoaded", function () {
  console.log("Criminal records standalone script loaded");

  const tableBody = document.getElementById("criminals-table-body");
  const searchInput = document.getElementById("criminal-search");
  const sortableHeaders = document.querySelectorAll("th.sortable");

  if (!tableBody) {
    console.error("Table body with ID 'criminals-table-body' not found");
    return;
  }

  // Yükleniyor mesajı göster
  tableBody.innerHTML =
    '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading criminal records...</td></tr>';

  // Criminals API'den verileri çek
  fetch("/data/criminals.json")
    .then((response) => response.json())
    .then((criminals) => {
      console.log(`Found ${criminals.length} criminal records`);

      // Process and store data globally
      allCriminals = criminals.map((data) => {
        let birthDate = "Unknown";
        if (data.birthdate) {
          if (typeof data.birthdate === "string") birthDate = data.birthdate;
          else if (typeof data.birthdate === "number")
            birthDate = data.birthdate.toString();
        }

        const name = data.name || data.id.replace("criminal_", "");
        const birthplace = data.birthplace || "Unknown";
        const nationality = data.nation || data.nationality || "Unknown";
        const occupation = data.prof || data.occupation || "Unknown";
        const placeOfArrest =
          data.placeOfArrest || data.placeofprof || "Unknown";

        let unknownCount = 0;
        if (birthDate === "Unknown") unknownCount++;
        if (birthplace === "Unknown") unknownCount++;
        if (nationality === "Unknown") unknownCount++;
        if (occupation === "Unknown") unknownCount++;
        if (placeOfArrest === "Unknown") unknownCount++;

        return {
          id: data.id,
          name,
          birthDate,
          birthplace,
          nationality,
          occupation,
          placeOfArrest,
          unknownCount,
        };
      });

      renderTable();
    })
    .catch((error) => {
      console.error("Error getting documents: ", error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading criminal records: ${error.message}</td></tr>`;
    });

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderTable();
    });
  }

  // Sorting functionality
  sortableHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-sort");
      const direction =
        currentSort.column === column && currentSort.direction === "asc"
          ? "desc"
          : "asc";

      currentSort = { column, direction };

      // Update sort icons
      sortableHeaders.forEach((h) => {
        const icon = h.querySelector(".sort-icon i");
        if (h === header) {
          icon.className =
            direction === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
          h.classList.add("active-sort");
        } else {
          icon.className = "fas fa-sort";
          h.classList.remove("active-sort");
        }
      });

      renderTable();
    });
  });
});

function renderTable() {
  const tableBody = document.getElementById("criminals-table-body");
  if (!tableBody) return;

  // Filter
  let filtered = allCriminals.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery) ||
      c.nationality.toLowerCase().includes(searchQuery) ||
      c.occupation.toLowerCase().includes(searchQuery) ||
      c.birthplace.toLowerCase().includes(searchQuery) ||
      c.placeOfArrest.toLowerCase().includes(searchQuery),
  );

  // Sort
  filtered.sort((a, b) => {
    const valA = a[currentSort.column];
    const valB = b[currentSort.column];

    if (valA === "Unknown") return 1;
    if (valB === "Unknown") return -1;

    let comparison = 0;
    if (valA < valB) comparison = -1;
    if (valA > valB) comparison = 1;

    return currentSort.direction === "asc" ? comparison : -comparison;
  });

  // Special case: Default sort by unknownCount if specifically requested or as fallback
  if (currentSort.column === "unknownCount") {
    filtered.sort((a, b) => a.unknownCount - b.unknownCount);
  }

  // Render
  tableBody.innerHTML = "";
  if (filtered.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 20px;">No matching records found</td></tr>';
    return;
  }

  filtered.forEach((criminal) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${criminal.name}</td>
      <td>${criminal.birthDate}</td>
      <td>${criminal.birthplace}</td>
      <td>${criminal.nationality}</td>
      <td>${criminal.occupation}</td>
      <td>${criminal.placeOfArrest}</td>
    `;
    tableBody.appendChild(row);
  });
}
