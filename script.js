//GLOBAL CONST
//[RESTRIC ON GOOGLE SHEET ONLY] const API_KEY  = "AIzaSyAX_nY47s2tjCGcl52XVKVt5l6XiA-KxoM";
//const API_KEY = "AIzaSyAOm1jjqhBvtNmCfQqcJnjno-Mfs9C5XbE";
const PRODUCTION_API_KEY = "AIzaSyAOm1jjqhBvtNmCfQqcJnjno-Mfs9C5XbE";
const LOCAL_API_KEY = "AIzaSyDGwYmrEITj0DIJC96CWwTZIE3oSrBz31o";
const smallImageFolderID = "1JHx2201-uia7EDT2jSD78T94zJuLVxnJ";

const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_KEY = isLocal ? LOCAL_API_KEY : PRODUCTION_API_KEY;

document.addEventListener("DOMContentLoaded", async () => {  // ✅ added async
    const SHEET_ID = "1P0M7DRAKj5dkGWMWVByMlT78znfj9Fuulc2rTtMsvU8";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const json = await response.json();
        const rows = json.values;

        //Call imageNamingMap --> map filename into imageId
        const productSmallImage = await getDriveImages(smallImageFolderID);

        if (!rows || rows.length === 0) {
            document.getElementById("product-grid").innerHTML =
                `<p style="color: red;">No product data found in the sheet.</p>`;
            return;
        }

        // ✅ Map rows into objects using first row as column headers
        const headers = rows[0];
        const products = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] ?? '';
            });
            return obj;
        });

        const grouped = groupProducts(products);
        renderProducts(grouped, productSmallImage);

    } catch (error) {
        console.error("Error fetching sheet data:", error);
        document.getElementById("product-grid").innerHTML =
            `<p style="color: red;">
                Failed to load product data.<br>
                <small style="color: #6e6a67;">${error.message}</small>
            </p>`;
    }

    attachQRCodeSharing();
});

/**
 * 2. Group flat product rows by group → item
 */
function groupProducts(products) {
    const grouped = {};
    products.forEach(row => {
        const group = (row.group || 'Other').trim();
        const item = (row.item || '').trim();
        if (!grouped[group]) grouped[group] = {};
        if (!grouped[group][item]) grouped[group][item] = [];
        grouped[group][item].push(row);
    });
    return grouped;
}

/**
 * 3. Render grouped products into the DOM
 */
function renderProducts(grouped, imageMap) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    Object.entries(grouped).forEach(([groupName, items]) => {
        const section = document.createElement('section');
        section.className = 'product-group';

        const title = document.createElement('h2');
        title.className = 'product-group-title';
        title.textContent = groupName;
        section.appendChild(title);

        const cardsRow = document.createElement('div');
        cardsRow.className = 'product-cards-row';
        section.appendChild(cardsRow);
        grid.appendChild(section);

        Object.entries(items).forEach(([itemName, variants], index) => {
            setTimeout(() => {
                const card = renderCard(itemName, variants, imageMap);
                cardsRow.appendChild(card);
            }, index * 120);
        });
    });
}

/**
 * 4. Build a single horizontal product card
 */
function renderCard(itemName, variants, imageMap) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const first = variants[0];

    // ── Card Top (image + info side by side) ─────────
    const cardTop = document.createElement('div');
    cardTop.className = 'card-top';

    // Left: image panel
    const imagePanel = document.createElement('div');
    imagePanel.className = 'card-image-panel';

    const img = document.createElement('img');
    img.className = 'card-main-image';
    img.alt = itemName;
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.decoding = 'async';

    const firstId = imageMap[(first.picture_directory || '').trim()];
    img.src = firstId
        ? `https://drive.google.com/thumbnail?id=${firstId}&sz=w400`
        : 'https://via.placeholder.com/200x200?text=No+Image';
    img.onerror = function () {
        this.src = 'https://via.placeholder.com/200x200?text=No+Image';
    };
    imagePanel.appendChild(img);
    cardTop.appendChild(imagePanel);

    // Right: info panel
    const info = document.createElement('div');
    info.className = 'card-info-panel';

    // Badge (e.g. "BESTSELLER") — optional
    if (first.badge && first.badge.trim()) {
        const badge = document.createElement('span');
        badge.className = 'card-badge';
        badge.textContent = first.badge.trim().toUpperCase();
        info.appendChild(badge);
    }

    // Item name
    const nameEl = document.createElement('h3');
    nameEl.className = 'card-item-name';
    nameEl.textContent = itemName;
    info.appendChild(nameEl);

    // Description
    if (first.description && first.description.trim()) {
        const descEl = document.createElement('p');
        descEl.className = 'card-description';
        descEl.innerHTML = first.description
            .replace(/\\n/g, '<br>')
            .replace(/\n/g, '<br>');
        info.appendChild(descEl);
    }

    // Dimension with icon
    if (first.dimension && first.dimension.trim()) {
        const dimEl = document.createElement('p');
        dimEl.className = 'card-meta';
        dimEl.innerHTML = `<span class="meta-label">Dimension</span> ${first.dimension}`;
        info.appendChild(dimEl);
    }

    // Weight
    if (first.weight && first.weight.trim()) {
        const wEl = document.createElement('p');
        wEl.className = 'card-meta';
        wEl.innerHTML = `<span class="meta-label">Weight</span> ${first.weight}`;
        info.appendChild(wEl);
    }

    // Variant selector — hidden when only 1 variant
    if (variants.length > 1) {
        const vLabel = document.createElement('p');
        vLabel.className = 'variant-section-label';
        vLabel.textContent = 'Variants';
        info.appendChild(vLabel);

        const selector = document.createElement('div');
        selector.className = 'variant-selector';

        variants.forEach((v, i) => {
            const chip = document.createElement('div');
            chip.className = 'variant-chip' + (i === 0 ? ' selected' : '');

            const chipImg = document.createElement('img');
            chipImg.alt = (v.variant || `Variant ${i + 1}`).trim();
            chipImg.referrerPolicy = 'no-referrer';
            chipImg.loading = 'lazy';

            const fid = imageMap[(v.picture_directory || '').trim()];
            chipImg.src = fid
                ? `https://drive.google.com/thumbnail?id=${fid}&sz=w100`
                : 'https://via.placeholder.com/48x48?text=?';
            chip.appendChild(chipImg);

            const chipLabel = document.createElement('span');
            chipLabel.className = 'chip-label';
            chipLabel.textContent = (v.variant || `Variant ${i + 1}`).trim();
            chip.appendChild(chipLabel);

            chip.addEventListener('click', () => {
                selector.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                img.src = fid
                    ? `https://drive.google.com/thumbnail?id=${fid}&sz=w400`
                    : 'https://via.placeholder.com/200x200?text=No+Image';
            });

            selector.appendChild(chip);
        });

        info.appendChild(selector);
    }

    cardTop.appendChild(info);
    card.appendChild(cardTop);

    // ── Card Bottom (price + BUY NOW) ─────────────────
    const cardBottom = document.createElement('div');
    cardBottom.className = 'card-bottom';

    const priceEl = document.createElement('span');
    priceEl.className = 'card-price';
    priceEl.textContent = (first.price || '').trim();
    cardBottom.appendChild(priceEl);

    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    buyBtn.innerHTML = 'BUY NOW';
    // TODO: implement shop action
    cardBottom.appendChild(buyBtn);

    card.appendChild(cardBottom);
    return card;
}

/**
 * 3. Attach click event to QR codes to share them as PNG
 */
function attachQRCodeSharing() {
    // ✅ matches assets/qr_link.png used in both desktop and mobile footer
    const qrCodes = document.querySelectorAll('img[src*="qr_link.png"]');

    qrCodes.forEach(qr => {
        qr.style.cursor = 'pointer';
        qr.title = "Click to share QR Code";

        qr.addEventListener('click', async () => {
            try {
                if (navigator.share && navigator.canShare) {
                    const response = await fetch(qr.src);
                    const blob = await response.blob();
                    const file = new File([blob], 'rui-candle-qr.png', { type: 'image/png' });

                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: 'Rui Artisan Candle',
                            text: 'Scan this QR or https://rui-candle.github.io! to visit our website',
                            files: [file]
                        });
                        return;
                    }
                }

                // Fallback: direct download
                const a = document.createElement('a');
                a.href = qr.src;
                a.download = 'rui-candle-qr.png';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (err) {
                console.error("Error sharing QR code:", err);
                alert("Something went wrong while trying to share the QR code.");
            }
        });
    });
}

/**
 * 4. Fetch drive folder to map the file name to image id
 */
async function getDriveImages(folderId) {

    const query = encodeURIComponent(
        `'${folderId}' in parents and trashed=false`
    );
    const url =
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    // ✅ Surface any Drive API errors clearly in the console
    if (!response.ok || data.error) {
        console.error("Drive API error:", JSON.stringify(data.error ?? data, null, 2));
        console.error(`Drive API status: ${response.status} — using key: ${API_KEY.slice(0, 12)}...`);
        return {};
    }

    if (!data.files || data.files.length === 0) {
        console.warn("Drive API returned no files for folder:", folderId);
        return {};
    }

    const map = {};
    data.files.forEach(file => {
        map[file.name] = file.id;
    });

    console.log(`Drive API: loaded ${data.files.length} image(s).`);
    return map;
}