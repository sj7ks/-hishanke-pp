// DOM Elements
const productList = document.getElementById("product-list");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

// Load data from localStorage
let cooldowns = JSON.parse(localStorage.getItem("cooldowns")) || {};
let quantities = JSON.parse(localStorage.getItem("quantities")) || {};

// --- Helper Functions ---
function saveCooldowns() {
  localStorage.setItem("cooldowns", JSON.stringify(cooldowns));
}
function saveQuantities() {
  localStorage.setItem("quantities", JSON.stringify(quantities));
}

function setCooldown(productId, minutes = 10) {
  const until = Date.now() + minutes * 60_000;
  cooldowns[productId] = until;
  saveCooldowns();
}
function isOnCooldown(productId) {
  const until = cooldowns[productId] || 0;
  return Date.now() < until;
}

// --- Render Products ---
function renderProducts() {
  const searchTerm = searchInput.value.toLowerCase();
  const categoryFilter = filterSelect.value;

  productList.innerHTML = "";

  products
    .filter(p => (p.name.toLowerCase().includes(searchTerm)) &&
                 (!categoryFilter || p.category === categoryFilter))
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.id = `product-${p.id}`;

      const qtyValue = quantities[p.id] || 0;

      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <h3 class="font-semibold text-lg">${p.name}</h3>
        <p>Price: $${p.price}</p>
        <p>Stock: ${p.stock}</p>
        <p>Quantity: <input type="number" min="0" value="${qtyValue}" class="quantity-input w-16 border rounded p-1"></p>
        <button class="check-btn">Check</button>
        <button class="buy-btn">Buy</button>
      `;

      productList.appendChild(card);

      const checkBtn = card.querySelector(".check-btn");
      const buyBtn = card.querySelector(".buy-btn");
      const qtyInput = card.querySelector(".quantity-input");

      // Restore cooldown
      if (isOnCooldown(p.id)) {
        checkBtn.disabled = true;
        checkBtn.textContent = "Requested (cooldown)";
      }

      // Restore quantity
      qtyInput.value = quantities[p.id] || 0;

      // Quantity input
      qtyInput.addEventListener("input", () => {
        quantities[p.id] = parseInt(qtyInput.value) || 0;
        saveQuantities();
        updateTotals();
      });

      // Check button
      checkBtn.addEventListener("click", () => {
        if (isOnCooldown(p.id)) return;
        alert(`Requested stock check for ${p.name}`);
        setCooldown(p.id, 10);
        checkBtn.disabled = true;
        checkBtn.textContent = "Requested (cooldown)";
        p.lastChecked = Date.now();
        updateTotals();
      });

      // Buy button
      buyBtn.addEventListener("click", () => {
        if (!p.lastChecked || Date.now() - p.lastChecked > 7 * 24 * 60 * 60 * 1000) {
          alert(`Price not updated in last 7 days. Request check first.`);
          return;
        }
        const qty = parseInt(qtyInput.value) || 0;
        if (qty === 0) {
          alert("Please enter quantity before buying.");
          return;
        }
        if (qty > p.stock) {
          alert("Quantity exceeds stock available!");
          return;
        }
        alert(`Send $${(p.price * qty).toFixed(2)} to mom via Revolut.`);
        // Update stock
        p.stock -= qty;
        qtyInput.value = 0;
        quantities[p.id] = 0;
        saveQuantities();
        renderProducts();
      });
    });

  attachQuantityListeners();
  updateTotals();
}

// --- Totals ---
function updateTotals() {
  const totalsDiv = document.getElementById("totals");
  totalsDiv.innerHTML = "";

  let totalCost = 0;
  let totalItems = 0;

  products.forEach(p => {
    const qty = quantities[p.id] || 0;
    if (qty > 0) {
      totalItems += qty;
      totalCost += qty * parseFloat(p.price);
    }
  });

  totalsDiv.innerHTML = `
    <p>Total items: ${totalItems}</p>
    <p>Total cost: $${totalCost.toFixed(2)}</p>
  `;
}

// Attach quantity listeners (just in case)
function attachQuantityListeners() {
  products.forEach(p => {
    const input = document.querySelector(`#product-${p.id} .quantity-input`);
    if (input) {
      input.addEventListener("input", updateTotals);
    }
  });
}

// --- Search / Filter ---
searchInput.addEventListener("input", renderProducts);
filterSelect.addEventListener("change", renderProducts);

// --- Initial Render ---
renderProducts();

// --- Bug Reporting ---
const bugForm = document.getElementById("bug-form");
bugForm.addEventListener("submit", e => {
  e.preventDefault();
  const desc = document.getElementById("bug-description").value;
  if (!desc) return;
  alert(`Bug reported: ${desc}`);
  document.getElementById("bug-description").value = "";
});