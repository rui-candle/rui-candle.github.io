//GLOBAL CONST
//[RESTRIC ON GOOGLE SHEET ONLY] const API_KEY  = "AIzaSyAX_nY47s2tjCGcl52XVKVt5l6XiA-KxoM";
const API_KEY ="AIzaSyAOm1jjqhBvtNmCfQqcJnjno-Mfs9C5XbE";
const smallImageFolderID = "1JHx2201-uia7EDT2jSD78T94zJuLVxnJ";
    
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

        renderProducts(products, productSmallImage);

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
 * 2. Render the product cards into the DOM
 */
function renderProducts(products, productSmallImage) {
    const grid = document.getElementById("product-grid");
    
    products.forEach((item,index) => {

        setTimeout(() =>{
            const card = document.createElement("div");
        card.className = "polaroid-card";

        //get the image file id from the imageMap 
        const filename = item.picture_directory.trim();
        const fileId = productSmallImage[filename];

        if(!fileId){
            console.warn(`Image not found for ${filename}`);
        }
       
        const img = document.createElement("img");
        img.className = "product-image";

        img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
       
        img.alt = item.item_name;
       
        img.loading = "lazy";
        img.decoding = "async";
        
        img.onerror = function() {
            this.src = "https://via.placeholder.com/150x150?text=Image+Not+Found";
        };

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "product-image-wrapper";

        imageWrapper.appendChild(img);

        const info = document.createElement("div");
        info.className = "product-info";

        const name = document.createElement("h3");
        name.className = "item-name";
        name.textContent = item.item_name;

        const desc = document.createElement("p");
        desc.className = "item-description";
        
        let descText = item.description || "";
        descText = descText
            .replace(/\\n/g, "<br>")
            .replace(/\n/g, "<br>");

        desc.innerHTML = descText;

        info.appendChild(name);
        info.appendChild(desc);

        card.appendChild(imageWrapper);
        card.appendChild(info);
        
        grid.appendChild(card);

        }, index * 150);

        
    });
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
async function getDriveImages(folderId){

    const query = encodeURIComponent(
        `'${folderId}' in parents and trashed=false`
    )
    const url =
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&key=${API_KEY}`;
    
        const response = await fetch(url);
        const data = await response.json();
        
        

        const map = {};

        data.files.forEach(file => {
            map[file.name] = file.id;
        })

        return map;
}