// Import elements from the DOM
var searchButton = document.getElementById("search_button");
const container = document.querySelector('.results-container');
const API_URL = "https://api.hypixel.net/skyblock/auctions";
let auctionCache = new Map();
let lastScan = -1;

// Fetch multiple pages simultaneously and cache them
async function fetchAuctionPages(startPage, endPage) {
    let fetchPromises = [];
    
    for (let i = startPage; i <= endPage; i++) {
        if (!auctionCache.has(i)) {
            fetchPromises.push(fetchPage(i));

        }
    }

    await Promise.all(fetchPromises);
    return fetchPromises.length; // Return number of pages fetched
}

// Fetch a single page
async function fetchPage(page) {
    try {
        const response = await fetch(`${API_URL}?page=${page}`);
        const data = await response.json();

        if (!data.success) {
            console.error(`Error: ${data.cause}`);
            return null; // Stop fetching if there's an error
        }

        auctionCache.set(page, data.auctions); // Cache data
        console.log(`Fetched page ${page}!`);
        return data.auctions;
    } catch (error) {
        console.error(`Failed to fetch page ${page}:`, error);
        return null;
    }
}

// Scan and cache auction house in parallel, then search
async function scanAuctionHouse(matches, attribute1, attribute2) {
    container.innerHTML = ""; // Clear previous results
    let foundItems = [];

    searchButton.disabled = true;
    searchButton.textContent = "Scanning...";

    if (auctionCache.size === 0 || Date.now() - lastScan > 10000) {
        // Cache multiple pages (fetch them in parallel)
        let totalPages = await getTotalPages(); // Assume you have a function to get total pages
        let pagesToFetchAtOnce = 5; // Adjust to control how many pages to fetch concurrently
        for (let i = 0; i < totalPages; i += pagesToFetchAtOnce) {
            await fetchAuctionPages(i, Math.min(i + pagesToFetchAtOnce - 1, totalPages - 1));
        }
        lastScan = Date.now(); // Update scan timestamp
    }

    // Search through cached auctions
    auctionCache.forEach((auctions, page) => {
        auctions.forEach(auction => {
            let item_name = auction.item_name.toLowerCase();
            let item_lore = auction.item_lore;
            let item_price = auction.starting_bid;

            if (matches.some(match => item_name.includes(match.toLowerCase())) && 
                item_lore.includes(attribute1) && item_lore.includes(attribute2)) {
                foundItems.push({
                    name: item_name,
                    price: item_price,
                    uuid: auction.uuid
                });
            }
        });
    });

    // Sort and display results
    foundItems.sort((a, b) => a.price - b.price);
    foundItems.forEach(item => addResultToContainer(item.name, item.price, item.uuid));

    searchButton.disabled = false;
    searchButton.textContent = "Search";
}

// Function to append found items to the DOM (batching updates)
function addResultToContainer(item_name, item_price, auction_uuid) {
    const newDiv = document.createElement('div');
    newDiv.textContent = item_name;
    newDiv.classList.add('found-item');
    
    const price = document.createElement('h1');
    price.textContent = formatPrice(item_price);
    newDiv.appendChild(price);

    newDiv.addEventListener("click", function() {
        copyToClipboard(`/viewauction ${auction_uuid}`);
    });

    container.appendChild(newDiv);
}

// Helper function to get total number of pages from the auction API
async function getTotalPages() {
    try {
        const response = await fetch(`${API_URL}?page=0`);
        const data = await response.json();
        return data.totalPages || 0;
    } catch (error) {
        console.error("Failed to get total pages:", error);
        return 0;
    }
}

// Attach click event to the search button
searchButton.addEventListener("click", function() {
    lastScan = Date.now();
    let attribute1 = document.getElementById("first_attribute").value;
    let attribute2 = document.getElementById("second_attribute").value;
    let itemsFilter = document.getElementById("items_filter").value;
    let itmFltr = itemsFilter.includes(",") ? itemsFilter.split(",") : [itemsFilter];

    scanAuctionHouse(itmFltr, attribute1, attribute2);
});

function formatPrice(price) {
    if (price >= 1000000000) {
        return (price / 1000000000).toFixed(2) + "b";
    } else if (price >= 1000000) {
        return (price / 1000000).toFixed(2) + "m";
    } else if (price >= 1000) {
        return (price / 1000).toFixed(2) + "k";
    } else {
        return price;
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}