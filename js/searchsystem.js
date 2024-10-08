// Import elements from the DOM
var searchButton = document.getElementById("search_button");
const container = document.querySelector('.results-container');
const API_URL = "https://api.hypixel.net/skyblock/auctions";

// Fetch a specific page from the auction house API
async function fetchPage(page) {
    try {
        const response = await fetch(`${API_URL}?page=${page}`);
        const data = await response.json();

        if (!data.success) {
            console.error(`Error: ${data.cause}`);
            return null; // Stop fetching if there's an error
        }

        return data.auctions; 
    } catch (error) {
        console.error(`Failed to fetch page ${page}:`, error);
        return null;
    }
}

// Scan auction house by fetching pages until no more valid data is returned
async function scanAuctionHouse(matches, attribute1, attribute2) {
    let page = 0;
    let hasMorePages = true;
    const foundItems = []; // Array to hold found items

    // Disable the search button to prevent multiple clicks
    searchButton.disabled = true;
    searchButton.textContent = "Scanning...";

    while (hasMorePages) {
        console.log(`Fetching page ${page}...`);
        let auctions = await fetchPage(page);

        if (!auctions || auctions.length === 0) {
            hasMorePages = false; // Stop if no more auctions are found
            console.log("No more pages to fetch or an error occurred.");
        } else {
            auctions.forEach(auction => {
                let item_name = auction.item_name.toLowerCase(); // Case-insensitive comparison
                let item_lore = auction.item_lore;
                let item_price = auction.starting_bid;

                // Check if item name contains any of the match keywords
                if (matches.some(match => item_name.includes(match.toLowerCase()))) {
                    // Check if both attributes are present in the lore
                    if (item_lore.includes(attribute1) && item_lore.includes(attribute2)) {
                        foundItems.push({
                            name: item_name,
                            price: item_price,
                            uuid: auction.uuid
                        });
                    }
                }
            });

            console.log(`Done fetching page ${page}!`);
            page++; // Increment to fetch the next page
        }
    }

    // Sort the found items based on price in ascending order
    foundItems.sort((a, b) => a.price - b.price);

    // Append the sorted items to the container
    foundItems.forEach(item => {
        addResultToContainer(item.name, item.price, item.uuid);
    });

    // Re-enable the search button after the scan completes
    searchButton.disabled = false;
    searchButton.textContent = "Search";
}

// Function to append found items to the DOM
function addResultToContainer(item_name, item_price, auction_uuid) {
    const newDiv = document.createElement('div');
    newDiv.textContent = item_name;
    newDiv.classList.add('found-item');
    
    const price = document.createElement('h1');
    price.textContent = formatPrice(item_price);
    newDiv.appendChild(price);

    // Attach click event to copy UUID to clipboard when the div is clicked
    newDiv.addEventListener("click", function() {
        copyToClipboard(`/viewauction ${auction_uuid}`);
    });

    container.appendChild(newDiv);
}

// Function to copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert(`Copied to clipboard: ${text}`);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Format price to "k, m, b" format (example: 500000 -> 500k, 1666000 -> 1.66m)
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

// Attach click event to the search button
searchButton.addEventListener("click", function() {
    // Fetch the values when the search button is clicked
    var attribute1 = document.getElementById("first_attribute").value;
    var attribute2 = document.getElementById("second_attribute").value;
    var itemsFilter = document.getElementById("items_filter").value;

    // Handle comma-separated filter or single item
    let itmFltr = itemsFilter.includes(",") ? itemsFilter.split(",") : [itemsFilter];

    // Start the auction house scan with the current attributes and filters
    scanAuctionHouse(itmFltr, attribute1, attribute2);
});
