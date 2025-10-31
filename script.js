// Elemen DOM
const container = document.querySelector("main");
const searchInput = document.getElementById("searchInput");
const genreButtons = document.querySelectorAll(".genre-btn");
const yearToggle = document.getElementById("yearToggle");
const yearDropdown = document.getElementById("yearDropdown");
const yearBtnContainer = yearDropdown?.querySelector(".p-2");

// State global
let allAnimeData = [];
let currentGenre = "all";
let currentYear = "all";

// Load data dari anime.json
async function loadAnime() {
  try {
    const res = await fetch("anime.json");
    const data = await res.json();
    allAnimeData = data;
    renderAnimeCards(data);
    setupEventListeners();
    generateYearFilter();
  } catch (err) {
    console.error("Gagal memuat data anime:", err);
    container.innerHTML = `<p class="text-center text-red-400 col-span-full">Gagal memuat data anime.</p>`;
  }
}

// Render kartu anime
function renderAnimeCards(animes) {
  container.innerHTML = "";
  if (animes.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-400 col-span-full">Tidak ada anime yang ditemukan.</p>`;
    return;
  }
  
  animes.forEach(anime => {
    const card = document.createElement("div");
    card.className = "anime-card bg-gray-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 fade-in";
    
    // Coba parse tanggal jika tersedia
    let tanggalTayang = null;
    let tanggalValid = false;
    let tampilanWaktu = "";
    let hasCountdown = false;
    
    if (anime.tanggal && anime.jam) {
      tanggalTayang = new Date(`${anime.tanggal}T${anime.jam}:00`);
      if (!isNaN(tanggalTayang.getTime())) {
        tanggalValid = true;
        hasCountdown = true;
        tampilanWaktu = `${anime.hari}, ${formatTanggal(tanggalTayang)} • ${anime.jam} WIB`;
      }
    }
    
    // Jika tidak valid atau tidak ada, tampilkan info musim/bulan
    if (!tanggalValid) {
      tampilanWaktu = anime.bulan_tahun || anime.musim || "Waktu tayang belum pasti";
    }
    
    // Bangun HTML kartu
    card.innerHTML = `
      <div class="h-40 bg-gradient-to-r from-purple-700 to-indigo-800 flex items-center justify-center overflow-hidden">
        <img src="${anime.gambar || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${anime.judul}" class="w-full h-full object-cover">
      </div>
      <div class="p-4">
        <h3 class="font-semibold text-lg">${anime.judul}</h3>
        <p class="text-gray-400 text-sm mt-1">${tampilanWaktu}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          ${anime.genre ? anime.genre.map(g => `<span class="px-2 py-0.5 text-xs bg-gray-700/50 rounded">${g}</span>`).join('') : ''}
        </div>
        <div class="mt-2 text-xs text-gray-300">
          🎞️ Studio: <span class="font-medium">${anime.studio || "Tidak diketahui"}</span>
        </div>
        <div class="mt-3 text-xs text-cyan-300 flex flex-col gap-1">
          <span>📅 ${anime.musim || "Musim tidak diketahui"}</span>
          ${hasCountdown ? `<span class="countdown text-sm text-pink-400 font-medium" data-date="${anime.tanggal}T${anime.jam}:00">Hitung mundur...</span>` : ""}
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Jalankan countdown hanya untuk yang punya tanggal valid
  startCountdowns();
}

// Format tanggal ke bahasa Indonesia
function formatTanggal(date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Countdown timer
function startCountdowns() {
  const countdowns = document.querySelectorAll(".countdown");
  setInterval(() => {
    countdowns.forEach(cd => {
      const dateStr = cd.getAttribute("data-date");
      const target = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance <= 0) {
        cd.textContent = "🎬 Sudah tayang!";
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      cd.textContent = `${days}h ${hours}j ${minutes}m ${seconds}d lagi`;
    });
  }, 1000);
}

// Filter utama: pencarian + genre + tahun
function filterAnime() {
  const query = searchInput?.value.toLowerCase().trim() || "";
  
  const filtered = allAnimeData.filter(anime => {
    // Filter tahun
    let tahunMatch = true;
    if (currentYear !== "all") {
      if (anime.tanggal) {
        const tahun = new Date(`${anime.tanggal}T00:00:00`).getFullYear().toString();
        tahunMatch = tahun === currentYear;
      } else if (anime.musim) {
        // Ambil tahun dari "Winter 2026" → "2026"
        const tahunDariMusim = anime.musim.match(/\d{4}/)?.[0];
        tahunMatch = tahunDariMusim === currentYear;
      } else {
        tahunMatch = false;
      }
    }
    
    // Filter genre
    const genreMatch = currentGenre === "all" ||
      (anime.genre && anime.genre.some(g => g.toLowerCase() === currentGenre));
    
    // Filter judul
    const judulMatch = anime.judul.toLowerCase().includes(query);
    
    return tahunMatch && genreMatch && judulMatch;
  });
  
  renderAnimeCards(filtered);
}

// Generate daftar tahun unik dari data
function generateYearFilter() {
  if (!yearBtnContainer) return;
  
  const years = new Set();
  
  allAnimeData.forEach(anime => {
    if (anime.tanggal) {
      const y = new Date(`${anime.tanggal}T00:00:00`).getFullYear();
      years.add(y.toString());
    } else if (anime.musim) {
      const y = anime.musim.match(/\d{4}/)?.[0];
      if (y) years.add(y);
    }
  });
  
  const sortedYears = Array.from(years).sort((a, b) => b - a); // 2027, 2026, 2025...
  
  // Tambahkan "Semua Tahun"
  yearBtnContainer.innerHTML = `<button class="year-btn block w-full text-left px-3 py-2 rounded hover:bg-cyan-600/30 text-sm" data-year="all">Semua Tahun</button>`;
  
  sortedYears.forEach(year => {
    const btn = document.createElement("button");
    btn.className = "year-btn block w-full text-left px-3 py-2 rounded hover:bg-cyan-600/30 text-sm";
    btn.dataset.year = year;
    btn.textContent = year;
    yearBtnContainer.appendChild(btn);
  });
  
  // Pasang event listener untuk tombol tahun
  document.querySelectorAll(".year-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentYear = btn.dataset.year;
      document.querySelectorAll(".year-btn").forEach(b => b.classList.remove("bg-cyan-500"));
      btn.classList.add("bg-cyan-500");
      yearDropdown.classList.add("hidden");
      filterAnime();
    });
  });
}

// Setup event listener
function setupEventListeners() {
  // Pencarian
  if (searchInput) {
    searchInput.addEventListener("input", filterAnime);
  }
  
  // Filter genre
  genreButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      genreButtons.forEach(b => b.classList.remove("bg-cyan-500", "bg-red-500", "bg-pink-500", "bg-purple-500", "bg-yellow-500"));
      currentGenre = btn.dataset.genre;
      if (currentGenre === "all") btn.classList.add("bg-cyan-500");
      else if (currentGenre === "action") btn.classList.add("bg-red-500");
      else if (currentGenre === "romance") btn.classList.add("bg-pink-500");
      else if (currentGenre === "fantasy") btn.classList.add("bg-purple-500");
      else if (currentGenre === "comedy") btn.classList.add("bg-yellow-500");
      filterAnime();
    });
  });
  
  // Toggle dropdown tahun
  if (yearToggle && yearDropdown) {
    yearToggle.addEventListener("click", () => {
      yearDropdown.classList.toggle("hidden");
    });
    
    // Tutup saat klik di luar
    document.addEventListener("click", (e) => {
      if (!yearToggle.contains(e.target) && !yearDropdown.contains(e.target)) {
        yearDropdown.classList.add("hidden");
      }
    });
  }
}

// Jalankan
loadAnime();
