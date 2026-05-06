document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch and Parse the CSV file
    Papa.parse("item_data.csv", {
        download: true,
        header: true,         // Treat first row as header keys
        skipEmptyLines: true, // Ignore blank lines
        complete: function(results) {
            const data = results.data;
            renderProducts(data);
        },
        error: function(err) {
            console.error("Error fetching or parsing CSV:", err);
            document.getElementById("product-grid").innerHTML = 
                `<p style="color: red;">Failed to load product data. Ensure item_data.csv exists and you are running a local web server.</p>`;
        }
    });
});

/**
 * 2. Render the product cards into the DOM
 */
function renderProducts(products) {
    const grid = document.getElementById("product-grid");
    
    products.forEach(item => {
        // Create the card container
        const card = document.createElement("div");
        card.className = "polaroid-card";

        // Create the image element
        const img = document.createElement("img");
        img.className = "product-image";
        img.src = item.picture_directory;
        img.alt = item.item_name;
        
        // Add error handling for images
        img.onerror = function() {
            this.src = "https://via.placeholder.com/150x150?text=Image+Not+Found";
        };

        // Create the info container
        const info = document.createElement("div");
        info.className = "product-info";

        // Create the item name element
        const name = document.createElement("h3");
        name.className = "item-name";
        name.textContent = item.item_name;

        // Create the description element
        const desc = document.createElement("p");
        desc.className = "item-description";
        
        // Handle literal '\n' strings and actual newlines, and allow HTML like <br>
        let descText = item.description || "";
        descText = descText.replace(/\\n/g, "<br>").replace(/\n/g, "<br>");
        desc.innerHTML = descText;

        // Assemble the card
        info.appendChild(name);
        info.appendChild(desc);
        card.appendChild(img);
        card.appendChild(info);

        // Add to grid
        grid.appendChild(card);
    });
}
