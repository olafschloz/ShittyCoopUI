// Remove or comment out noisy console logs
console.log("[CONTENT] content.js executed");

const COOP_PRODUCT_DATA_KEY = 'coopProductData';

// --- Helper function to safely get text content ---
function getText(element) {
  return element ? element.textContent.trim() : null;
}

function getInnerText(element) {
  return element ? element.innerText.trim() : null;
}


// --- Coop.ch Specific Data Extraction ---

function isCoopProductPage() {
  const hostnameCheck = window.location.hostname.includes('coop.ch');
  const pathnameCheck = window.location.pathname.includes('/p/');
  // console.log(`[CONTENT] isCoopProductPage: hostname ok? ${hostnameCheck}, pathname ok? ${pathnameCheck}, current URL: ${window.location.href}`);
  return hostnameCheck && pathnameCheck;
}

const PRODUCT_SELECTORS = {
  name: 'h1[data-testauto="producttitle"]', // Updated selector
  // name_tile: 'p.productTile-details__name-value', // Can be removed if the above is reliable
  price: 'p[data-testauto="productprice"]', // Updated selector
  // price_alt: 'span.price__value--current', // Remove older price selectors
  // price_tile: 'p.productTile__price-value-lead-price', // Remove older price selectors
  allergens: 'div[data-testauto="productingredients"]',
  weight_volume: 'span.productBasicInfo__quantity-text',
  // For nutrition, we'll use a helper function as it's more complex
  // weight_volume_alt: 'span.productDetail__quantity', // Kept as a potential fallback if needed later
  // Add more selectors as needed, e.g., for a specific "Bio" badge
  // bio_badge: '.some-bio-badge-class', 
};

function extractNutritionValue(nutrientLabelRegex) {
  try {
    const listItems = document.querySelectorAll('li[data-testauto="nutrition-row"].list--dotted-item');
    for (const item of listItems) {
      const labelEl = item.querySelector('.list--dotted-item__label-text');
      if (labelEl && getText(labelEl).match(nutrientLabelRegex)) {
        const valueEl = item.querySelector('span[data-nutritioninformation-list-item-value=""]');
        return getText(valueEl);
      }
    }
  } catch (e) {
    console.warn('[CONTENT] Error extracting nutrition value for:', nutrientLabelRegex, e);
  }
  return null;
}

function extractAndStoreCoopProductData() {
  if (!isCoopProductPage()) {
    return null;
  }
  // console.log('[CONTENT] Attempting to extract data from Coop product page');

  const productData = {};
  const url = window.location.href;

  productData.name = getText(document.querySelector(PRODUCT_SELECTORS.name));
  productData.price = getText(document.querySelector(PRODUCT_SELECTORS.price));
  
  // Organic check (simple version based on name)
  if (productData.name && productData.name.toLowerCase().includes('bio')) {
    productData.organic = true;
  } else {
    // Potentially check for a bio badge if selector is provided
    // const bioBadge = document.querySelector(PRODUCT_SELECTORS.bio_badge);
    // productData.organic = !!bioBadge;
    productData.organic = false; 
  }

  const allergensEl = document.querySelector(PRODUCT_SELECTORS.allergens);
  if (allergensEl) {
    // Attempt to get cleaner text, focusing on "Allergiker-Infos" if possible
    const allergyInfoParagraph = Array.from(allergensEl.querySelectorAll('p')).find(p => p.textContent.includes('Allergiker-Infos:'));
    productData.allergens = allergyInfoParagraph ? getText(allergyInfoParagraph) : getInnerText(allergensEl);
  } else {
    productData.allergens = null;
  }
  
  productData.calories = extractNutritionValue(/kcal/i);
  productData.weight_volume = getText(document.querySelector(PRODUCT_SELECTORS.weight_volume));
  productData.protein = extractNutritionValue(/eiweiss|protein/i);
  productData.fat = extractNutritionValue(/fett|fat/i);
  productData.carbs = extractNutritionValue(/kohlenhydrate|carbohydrate/i);
  productData.lastUpdated = new Date().toISOString();
  productData.url = url;

  // Filter out null values for cleaner storage, unless explicitly desired
  const cleanedData = Object.fromEntries(Object.entries(productData).filter(([_, v]) => v !== null && v !== undefined));

  if (Object.keys(cleanedData).length > 2) { // Ensure we got more than just URL and timestamp
    // console.log('[CONTENT] Extracted data:', cleanedData);
    try {
      const allCoopData = JSON.parse(localStorage.getItem(COOP_PRODUCT_DATA_KEY) || '{}');
      allCoopData[url] = cleanedData;
      localStorage.setItem(COOP_PRODUCT_DATA_KEY, JSON.stringify(allCoopData));
      // console.log('[CONTENT] Product data stored in localStorage for URL:', url);
      return cleanedData;
    } catch (e) {
      console.error('[CONTENT] Error saving to localStorage:', e);
    }
  } else {
    // console.warn('[CONTENT] Did not extract enough data to store for URL:', url, cleanedData);
  }
  return null;
}

// --- Programmatic Coop.ch Interaction ---
function searchCoopSite(searchTerm) {
  const encodedSearchTerm = encodeURIComponent(searchTerm);
  const searchUrl = `https://www.coop.ch/de/search/?text=${encodedSearchTerm}`;
  console.log(`[CONTENT] Requesting background fetch for: ${searchTerm} (URL: ${searchUrl})`);
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "fetchCoopSearch", url: searchUrl },
      (response) => {
        if (response && response.success) {
          resolve(response.html);
        } else {
          console.error("[CONTENT] Background fetch failed:", response && response.error);
          reject(response && response.error);
        }
      }
    );
  });
}

// Example of how to test (you can call this from browser console on a coop.ch page after reloading extension):
// window.testSearch = async () => { 
//   const html = await searchCoopSite('bio milch'); 
//   if (html) { console.log("Search test successful, see logged HTML."); } 
// };


// Call extraction when sidebar is opened on a product page, or on first load
if (isCoopProductPage()) {
    // Optionally, extract immediately on load if sidebar might not be opened
    // setTimeout(extractAndStoreCoopProductData, 1000); // Delay to ensure page is loaded
}


if (!window.hasAISidebarListener) {
  // console.log("[CONTENT] Adding message listener");
  chrome.runtime.onMessage.addListener((request) => {
    // console.log("[CONTENT] Message received:", request);
    if (request.action === "toggleSidebar") {
      // console.log("[CONTENT] toggleSidebar action received. Checking if it's a Coop product page...");
      if (isCoopProductPage()) {
        // console.log("[CONTENT] It IS a Coop product page. Calling extractAndStoreCoopProductData().");
        extractAndStoreCoopProductData();
      } else {
        // console.log("[CONTENT] It is NOT a Coop product page. Skipping data extraction.");
      }
      toggleSidebar();
    }
  });
  window.hasAISidebarListener = true;
} else {
  // console.log("[CONTENT] Message listener already exists");
}

function toggleSidebar() {
  // console.log("[CONTENT] toggleSidebar() called");
  let sidebar = document.getElementById('ai-shopping-sidebar');
  if (sidebar) {
    // console.log("[CONTENT] Sidebar exists, removing it.");
    sidebar.remove();
  } else {
    // console.log("[CONTENT] Sidebar does not exist, creating it.");
    sidebar = document.createElement('div');
    sidebar.id = 'ai-shopping-sidebar';
    sidebar.style.position = 'fixed';
    sidebar.style.top = '0';
    sidebar.style.right = '0';
    sidebar.style.width = '400px';
    sidebar.style.height = '100vh';
    sidebar.style.background = '#fff';
    sidebar.style.borderLeft = '1px solid #ccc';
    sidebar.style.zIndex = '999999';
    sidebar.style.boxShadow = '-2px 0 8px rgba(0,0,0,0.1)';
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.fontFamily = 'Arial, sans-serif';

    // console.log("[CONTENT] Sidebar element created:", sidebar);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.alignSelf = 'flex-end';
    closeBtn.style.margin = '8px';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => sidebar.remove();
    sidebar.appendChild(closeBtn);

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.style.flex = '1';
    chatContainer.style.overflowY = 'auto';
    chatContainer.style.border = '1px solid #ccc';
    chatContainer.style.margin = '10px';
    chatContainer.style.padding = '10px';
    sidebar.appendChild(chatContainer);

    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.gap = '10px';
    inputContainer.style.margin = '10px';

    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.placeholder = 'Type your message...';
    userInput.style.flexGrow = '1';
    userInput.style.padding = '8px';
    userInput.style.border = '1px solid #ccc';
    userInput.style.borderRadius = '4px';

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.padding = '8px 16px';
    sendButton.style.backgroundColor = '#4CAF50';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';

    inputContainer.appendChild(userInput);
    inputContainer.appendChild(sendButton);
    sidebar.appendChild(inputContainer);

    const testButton = document.createElement('button');
    testButton.textContent = 'Add Test Items to Cart';
    testButton.style.margin = '10px';
    testButton.style.padding = '8px 16px';
    testButton.style.backgroundColor = '#2196F3';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    testButton.onclick = addTestItemsToCart;
    sidebar.appendChild(testButton);

    let geminiApiKey = localStorage.getItem('geminiApiKey') || '';

    function addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.textContent = text;
      messageDiv.style.margin = '5px 0';
      messageDiv.style.padding = '8px';
      messageDiv.style.borderRadius = '5px';
      messageDiv.style.background = sender === 'user' ? '#e3f2fd' : '#f5f5f5';
      messageDiv.style.alignSelf = sender === 'user' ? 'flex-end' : 'flex-start';
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    sendButton.onclick = handleUserInput;
    userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleUserInput();
    });

    function handleUserInput() {
      const message = userInput.value.trim();
      if (!geminiApiKey) {
        addMessage('Please set your Gemini API key first.', 'bot');
        return;
      }
      if (message) {
        addMessage(message, 'user');
        userInput.value = '';
        addMessage('Thinking...', 'bot');

        let promptPrefix = "";
        if (isCoopProductPage()) {
            const currentProductUrl = window.location.href;
            const allCoopData = JSON.parse(localStorage.getItem(COOP_PRODUCT_DATA_KEY) || '{}');
            const currentProductInfo = allCoopData[currentProductUrl];

            if (currentProductInfo) {
                promptPrefix = "Current product data from page:\n";
                promptPrefix += "| Key             | Value                                   |\n";
                promptPrefix += "|-----------------|-----------------------------------------|\n";
                for (const [key, value] of Object.entries(currentProductInfo)) {
                    if (key !== 'url' && key !== 'lastUpdated') { // Don't show URL/timestamp in table
                         promptPrefix += `| ${key.padEnd(15)} | ${String(value).padEnd(39)} |\n`;
                    }
                }
                promptPrefix += "\n";
            }
        }
        
        const fullPrompt = promptPrefix + message;
        console.log("[CONTENT] Sending to Gemini API with prompt:", fullPrompt);

        fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=' + geminiApiKey, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contents: [{parts: [{text: fullPrompt}]}]
          })
        })
        .then(res => res.json())
        .then(data => {
          chatContainer.lastChild.remove(); // Remove "Thinking..."
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            addMessage(data.candidates[0].content.parts.map(p => p.text).join(' '), 'bot');
          } else {
            addMessage('Sorry, I could not get a response from Gemini.', 'bot');
            console.error("[CONTENT] Gemini API response error. Data:", data);
            if(data.error) {
                 addMessage(`API Error: ${data.error.message} (Code: ${data.error.code})`, 'bot');
            }
          }
        })
        .catch(err => {
          chatContainer.lastChild.remove(); // Remove "Thinking..."
          addMessage('Error: ' + err.message, 'bot');
          console.error("[CONTENT] Fetch error for Gemini API:", err);
        });
      }
    }

    addMessage("Hello! I'm your AI Shopping Assistant. How can I help you today?", 'bot');
    
    // This function was in your original code, ensure it's defined or remove button
    function addTestItemsToCart() {
      const addButtons = document.querySelectorAll('.icon-cart'); // Generic selector
      let added = 0;
      for (let btn of addButtons) {
        if (added >= 3) break; 
        btn.click();
        added++;
      }
      alert(added > 0 ? `Added ${added} items to cart!` : 'No add-to-cart buttons found for test.');
    }


    const apiKeyButton = document.createElement('button');
    apiKeyButton.textContent = 'Set Gemini API Key';
    apiKeyButton.style.margin = '10px';
    apiKeyButton.style.padding = '8px 16px';
    apiKeyButton.style.backgroundColor = '#FF9800';
    apiKeyButton.style.color = 'white';
    apiKeyButton.style.border = 'none';
    apiKeyButton.style.borderRadius = '4px';
    apiKeyButton.style.cursor = 'pointer';
    apiKeyButton.onclick = function() {
      const key = prompt('Enter your Gemini API key:', geminiApiKey || '');
      if (key) {
        geminiApiKey = key;
        localStorage.setItem('geminiApiKey', key);
        alert('Gemini API key saved!');
      }
    };
    sidebar.appendChild(apiKeyButton);

    document.body.appendChild(sidebar);
    // console.log("[CONTENT] Sidebar appended to body.");
  }
}

// --- Automatic Test Call (for debugging programmatic search) ---
if (window.location.hostname.includes('coop.ch')) {
  // console.log('[CONTENT] Automatically calling searchCoopSite("bio milch") for testing.');
  searchCoopSite('bio milch').then(html => {
    if (html) {
      // console.log('[CONTENT] First 5000 chars of fetched HTML:', html.substring(0, 5000));
      parseCoopSearchResults(html);
    } else {
      // console.warn('[CONTENT] No HTML returned from searchCoopSite for parsing.');
    }
  });
}
// --- End of Automatic Test Call ---

// --- Parse Coop.ch Search Results ---
function parseCoopSearchResults(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const productDivs = doc.querySelectorAll('div[data-producttile-wrapper]');
  const products = [];

  productDivs.forEach(div => {
    const link = div.querySelector('a.productTile');
    if (!link) return;
    let url = link.getAttribute('href');
    if (url && url.startsWith('/')) url = 'https://www.coop.ch' + url;
    const nameEl = link.querySelector('p.productTile-details__name-value');
    const priceEl = link.querySelector('p.productTile__price-value-lead-price');
    const weightEl = link.querySelector('span.productTile__quantity-text');
    const name = nameEl ? nameEl.textContent.trim() : null;
    const price = priceEl ? priceEl.textContent.trim() : null;
    const weight_volume = weightEl ? weightEl.textContent.trim() : null;
    if (name && url) {
      products.push({ name, url, price, weight_volume });
    }
  });

  // console.log('[CONTENT] Parsed Coop search results:', products);
  return products;
}

// --- Parse Coop.ch productTile JSON (from searchresultJson endpoint) ---
/**
 * Extracts product info from Coop's productTile JSON structure.
 * @param {object} productTileJson - The JSON object from Coop's searchresultJson endpoint (elements array).
 * @returns {Array} Array of product objects with key fields.
 */
function parseCoopProductTileJson(productTileJson) {
  if (!productTileJson || !Array.isArray(productTileJson.elements)) return [];
  return productTileJson.elements
    .filter(el => el.elementType === ".producttile.ProductTileSupermarketElement")
    .map(el => ({
      id: el.id,
      name: el.title,
      brand: el.brand,
      price: el.price,
      currency: el.currency,
      priceContext: el.priceContext, // e.g. "1.90/100g"
      priceContextPrice: el.priceContextPrice,
      priceContextAmount: el.priceContextAmount,
      quantity: el.quantity,
      ratingValue: el.ratingValue,
      ratingAmount: el.ratingAmount,
      image: el.image && el.image.src ? (el.image.src.startsWith('http') ? el.image.src : 'https://www.coop.ch' + el.image.src) : null,
      url: el.href ? (el.href.startsWith('http') ? el.href : 'https://www.coop.ch' + el.href) : null,
      fastCheckout: el.fastCheckout,
      variableAmount: el.variableAmount,
      categories: el.udoCat,
    }));
}

// Example usage (uncomment to test in console):
// const products = parseCoopProductTileJson(YOUR_JSON_OBJECT_HERE);
// console.log('[CONTENT] Products:', products);

// Make the function available in the global scope for testing
window.parseCoopProductTileJson = parseCoopProductTileJson;
console.log('CONTENT SCRIPT END REACHED');