// Diplomat portrait data — exposed globally for use in other scripts
// aliases: substrings from the actual API/Excel names that identify this person
const DIPLOMAT_PORTRAITS = [
    {
        name: "Count of Salmour Ruggiero Gabaleone",
        title: "Italian Politician",
        image: "static/images/diplomats/Count of Salmour Ruggiero Gabaleone.jpeg",
        photoSource: "Aristide Calani, Il Parlamento del Regno d'Italia, 1861",
        shortInfo: "(1806-1878) An Italian politician. He served as Secretary General in the Ministry of Finance and the Ministry of Foreign Affairs in the Kingdom of Sardinia-Piedmont. In 1860, he was appointed as a senator of the Kingdom and was the member of a commission on penitentiary cases.",
        aliases: ["salmour", "gabaleone", "count of salmour", "ruggiero"]
    },
    {
        name: "Mehmed Emin Ali Pasha",
        title: "Ottoman Statesman",
        image: "static/images/diplomats/Mehmed_Emin_Âli_Paşa_1856-1.3R_V01R-1.1.1_BNF_cropped_and_rotated.jpg",
        photoSource: "Mayer & Pierson, Bibliothéque Nationale de France, FOL-NF-49. V:18, 1856",
        shortInfo: "(1815-1871) An influential Ottoman statesman during the Tanzimat period. He served as the Minister of Foreign Affairs and Grand Vizier multiple times during his career. He is known for his role in the Treaty of Paris that ended the Crimean War.",
        aliases: ["ali pasha", "ali paşa", "emin ali", "mehmed emin ali", "âli paşa"]
    },
    {
        name: "Keçecizade Mehmed Fuad Pasha",
        title: "Ottoman Statesman",
        image: "static/images/diplomats/Keçecizade Mehmed Fuad Pasha.jpg",
        photoSource: "Abdullah Fréres, 1865",
        shortInfo: "(1814-1869) An influential Ottoman statesman during the Tanzimat period. He served as the Minister of Foreign Affairs and Grand Vizier multiple times during his career. During the Mount Lebanon Civil War (1858-1860), he was sent to the region to oversee the situation and preside over an international commission.",
        aliases: ["fuad pasha", "fuad paşa", "keçecizade fuad", "keçecizade", "mehmed fuad"]
    },
    {
        name: "Mahmud Nedim Pasha",
        title: "Ottoman Grand Vizier",
        image: "static/images/diplomats/Mahmud Nedim Pasha.jpeg",
        photoSource: "Abdullah Fréres",
        shortInfo: "(1818-1883) An Ottoman statesman during the Tanzimat period. He served as the Minister of Foreign Affairs, the Minister of Justice, the Minister of Navy and Grand Vizier multiple times throughout his career. Due to his close connections with Russia during the Russo-Turkish War (1877-78), he was referred to by the nickname \"Nedimoff\".",
        aliases: ["mahmud nedim", "nedim pasha", "nedim paşa", "nedim"]
    },
    {
        name: "Mehmed Esad Safvet Efendi (later Pasha)",
        title: "Ottoman Statesman",
        image: "static/images/diplomats/Mehmed Esad Safvet Pasha.jpeg",
        photoSource: "Abdullah Fréres",
        shortInfo: "(1814-1883) An Ottoman statesman who served as the Minister of Foreign Affairs, the Minister of Education and briefly served as Grand Vizier during the reign of Abdulhamid II.",
        aliases: ["safvet efendi", "safvet pasha", "safvet paşa", "mehmet esad safvet", "mehmed esad safvet", "safvet"]
    },
    {
        name: "Rüstem Mariani Bey (later Pasha)",
        title: "Ottoman Diplomat",
        image: "static/images/diplomats/Rüstem Mariani Bey (later Pasha).jpeg",
        photoSource: "Photo Bryne and Co., Richmond",
        shortInfo: "(1810-1895) An Ottoman diplomat who served as plenipotentiary in Turin, Florence and Rome, as well as ambassador to St. Petersburg and London. In 1873, he was also appointed governor of Mount Lebanon.",
        aliases: ["rüstem mariani", "rustem mariani", "rüstem bey", "rustem bey", "rüstem", "rustem"]
    },
    {
        name: "Sigmund Spitzer",
        title: "Austrian Physician",
        image: "static/images/diplomats/Sigmund Spitzer jpeg.jpeg",
        photoSource: "Collection of the Medical University of Vienna, 1853",
        shortInfo: "(1813-1895) An Austrian physician who entered Ottoman service in 1839. He became the director of the Ottoman Medical School (Mekteb-i Tıbbiye-yi Şahane) in 1847. He was also appointed Undersecretary at the Ottoman Embassy in Vienna and later served as Charge d'Affaires in Naples.",
        aliases: ["spitzer"]
    },
    {
        name: "Domenico Carutti",
        title: "Italian Historian & Diplomat",
        image: "static/images/diplomats/Domenico Carutti.jpg",
        photoSource: "Archivio storico dell'Academia delle Scienze",
        shortInfo: "(1821-1909) An Italian historian, diplomat and politician. He was the director of the Royal Library of Sardinia. He later served as Secretary General of the Ministry of Foreign Affairs of the Kingdom of Sardinia-Piedmont and held the same position after the formation of the new Italian nation.",
        aliases: ["carutti"]
    },
    {
        name: "Cardinal Pietro Gianelli",
        title: "Catholic Cardinal",
        image: "static/images/diplomats/Cardinal Pietro Gianelli.jpeg",
        photoSource: "\"The Cardinals of the Holy Roman Church\" https://cardinals.fiu.edu/bios1875.htm",
        shortInfo: "(1807-1881) An Italian prelate who was appointed as Cardinal of the Holy Roman Church in 1875.",
        aliases: ["gianelli"]
    },
    {
        name: "Bettino Ricasoli",
        title: "Italian Statesman",
        image: "static/images/diplomats/Bettino Ricasoli.jpg",
        photoSource: "Duroni & Murer, Tufts Digital Library",
        shortInfo: "(1809-1880) An Italian statesman influential in the politics of the Kingdom of Sardinia-Piedmont. He became the Prime Minister of Italy from 1866 to 67.",
        aliases: ["ricasoli"]
    },
    {
        name: "Luigi Amedeo Melegari",
        title: "Italian Politician & Diplomat",
        image: "static/images/diplomats/Luigi Amedeo Melegari.jpeg",
        photoSource: "The New York Public Library Digital Collections",
        shortInfo: "(1805-1881) An Italian politician and diplomat. He served as the Minister of Foreign Affairs of Italy.",
        aliases: ["melegari"]
    },
    {
        name: "Count of Cavour, Camillo Benso",
        title: "Italian Statesman",
        image: "static/images/diplomats/Count of Cavour Camillo Benso.jpg",
        photoSource: "Léopold Ernest-Mayer and Pierre-Louis Pierson, Musée Elysée",
        shortInfo: "(1810-1861) An influential Italian statesman and politician. He played a key role in the unification of Italy. He served as Prime Minister of the Kingdom of Sardinia and Piedmont and later became the first Prime Minister of Italy. He represented Italy in the Paris Peace Treaty and played an active role in the Kingdom's involvement in the Crimean War.",
        aliases: ["cavour", "camillo benso"]
    }
];

window.DIPLOMAT_PORTRAITS = DIPLOMAT_PORTRAITS;

/**
 * Find a diplomat's portrait data by name.
 * Checks (in order): exact match, contained-name match, alias match.
 * @param {string} name - The name string from the API / Excel data
 * @returns {Object|null}
 */
window.getDiplomatPortrait = function(name) {
    if (!name) return null;
    var lower = name.toLowerCase().trim();

    return DIPLOMAT_PORTRAITS.find(function(d) {
        var dLower = d.name.toLowerCase();

        // 1. Direct containment: one name is a substring of the other
        if (dLower.includes(lower) || lower.includes(dLower)) return true;

        // 2. Alias match: the lookup name contains one of this diplomat's aliases
        if (d.aliases) {
            return d.aliases.some(function(alias) {
                return lower.includes(alias.toLowerCase());
            });
        }

        return false;
    }) || null;
};

// Diplomat Gallery Slider functionality
class DiplomatGallery {
    constructor() {
        this.currentSlide = 0;
        this.slidesPerView = this.calculateSlidesPerView();
        this.diplomats = DIPLOMAT_PORTRAITS;
        this.init();
    }

    calculateSlidesPerView() {
        if (window.innerWidth <= 480) return 1;
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1024) return 3;
        return 4;
    }

    init() {
        this.renderGallery();
        this.setupEventListeners();
        this.updateNavigation();
        this.updateDots();
    }

    renderGallery() {
        const gallery = document.getElementById('diplomat-gallery');
        const dotsContainer = document.getElementById('gallery-dots');
        
        if (!gallery) return;

        // Clear existing content
        gallery.innerHTML = '';
        dotsContainer.innerHTML = '';

        // Create slides
        this.diplomats.forEach((diplomat, index) => {
            const slide = document.createElement('div');
            slide.className = 'diplomat-slide';
            slide.innerHTML = `
                <img src="${diplomat.image}" alt="${diplomat.name}" class="diplomat-image" onerror="this.src='static/images/placeholder.jpg'">
                <div class="diplomat-info">
                    <div class="diplomat-name">${diplomat.name}</div>
                    <div class="diplomat-title">${diplomat.title}</div>
                    <div class="diplomat-click-hint" style="font-size: 11px; color: #8B4513; margin-top: 5px; font-style: italic;">More about→</div>
                </div>
            `;
            
            // Add click event to show detailed info
            slide.addEventListener('click', () => this.showDiplomatDetails(diplomat));
            gallery.appendChild(slide);

            // Create dot
            const dot = document.createElement('div');
            dot.className = 'gallery-dot';
            dot.addEventListener('click', () => this.goToSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    showDiplomatDetails(diplomat) {
        // Create or update a modal/detail box
        let detailBox = document.getElementById('diplomat-detail-box');
        if (!detailBox) {
            detailBox = document.createElement('div');
            detailBox.id = 'diplomat-detail-box';
            detailBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #333;
                border-radius: 10px;
                padding: 20px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(detailBox);
        }

        detailBox.innerHTML = `
            <div style="text-align: right;">
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="text-align: center; margin-bottom: 15px;">
                <img src="${diplomat.image}" alt="${diplomat.name}" style="max-width: 200px; max-height: 200px; border-radius: 5px;" onerror="this.src='static/images/placeholder.jpg'">
            </div>
            <h3 style="margin: 10px 0; color: #333;">${diplomat.name}</h3>
            <p style="margin: 5px 0; color: #666; font-style: italic;">${diplomat.title}</p>
            <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                <p style="margin: 0; line-height: 1.5;">${diplomat.shortInfo}</p>
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                <small style="color: #888;">
                    <strong>Photo Source:</strong> ${diplomat.photoSource}
                </small>
            </div>
        `;

        // Add click outside to close
        detailBox.addEventListener('click', (e) => {
            if (e.target === detailBox) {
                detailBox.remove();
            }
        });
    }

    setupEventListeners() {
        const prevBtn = document.getElementById('gallery-prev');
        const nextBtn = document.getElementById('gallery-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.slidesPerView = this.calculateSlidesPerView();
            this.updateNavigation();
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateGallery();
        }
    }

    nextSlide() {
        const maxSlide = Math.max(0, this.diplomats.length - this.slidesPerView);
        if (this.currentSlide < maxSlide) {
            this.currentSlide++;
            this.updateGallery();
        }
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateGallery();
    }

    updateGallery() {
        const gallery = document.getElementById('diplomat-gallery');
        if (!gallery) return;

        const slideWidth = 250 + 20; // slide width + gap
        const translateX = -this.currentSlide * slideWidth;
        gallery.style.transform = `translateX(${translateX}px)`;

        this.updateNavigation();
        this.updateDots();
    }

    updateNavigation() {
        const prevBtn = document.getElementById('gallery-prev');
        const nextBtn = document.getElementById('gallery-next');

        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
            prevBtn.style.opacity = this.currentSlide === 0 ? '0.5' : '1';
        }

        if (nextBtn) {
            const maxSlide = Math.max(0, this.diplomats.length - this.slidesPerView);
            nextBtn.disabled = this.currentSlide >= maxSlide;
            nextBtn.style.opacity = this.currentSlide >= maxSlide ? '0.5' : '1';
        }
    }

    updateDots() {
        const dots = document.querySelectorAll('.gallery-dot');
        dots.forEach((dot, index) => {
            if (index >= this.currentSlide && index < this.currentSlide + this.slidesPerView) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// Initialize the gallery when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DiplomatGallery();
}); 