const productList = document.getElementById("product-list");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

// Load cooldowns from localStorage
function saveCooldowns(state) {
  localStorage.setItem("cooldowns", JSON.stringify(state));
}
function loadCooldowns() {
  const saved = localStorage.getItem("cooldowns");
  return saved ? JSON.parse(saved) : {};
}
let cooldowns = loadCooldowns();

// Cooldown helpers
function setCooldown(productId, minutes = 10) {
  const until = Date.now() + minutes * 60_000;
  cooldowns[productId] = until;
  saveCooldowns(cooldowns);
}
function isOnCooldown(productId) {
  const until = cooldowns[productId] || 0;
  return Date.now() < until;
}

// Render products
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

      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <h3 class="font-semibold text-lg">${p.name}</h3>
        <p>Price: $${p.price}</p>
        <p>Stock: ${p.stock}</p>
        <button class="check-btn">Check</button>
        <button class="buy-btn">Buy</button>
      `;

      productList.appendChild(card);

      const checkBtn = card.querySelector(".check-btn");
      const buyBtn = card.querySelector(".buy-btn");

      // Restore cooldown state
      if (isOnCooldown(p.id)) {
        checkBtn.disabled = true;
        checkBtn.textContent = "Requested (cooldown)";
      }

      // Check button
      checkBtn.addEventListener("click", () => {
        if (isOnCooldown(p.id)) return;
        alert(`Requested stock check for ${p.name}`);
        setCooldown(p.id, 10);
        checkBtn.disabled = true;
        checkBtn.textContent = "Requested (cooldown)";
        p.lastChecked = Date.now();
      });

      // Buy button
      buyBtn.addEventListener("click", () => {
        if (!p.lastChecked || Date.now() - p.lastChecked > 7 * 24 * 60 * 60 * 1000) {
          alert(`Price not updated recently. Please request a check first.`);
          return;
        }
        alert(`Send $${p.price} to mom via Revolut`);
      });
    });
}

// Search/filter
searchInput.addEventListener("input", renderProducts);
filterSelect.addEventListener("change", renderProducts);

renderProducts();

// Bug reporting
const bugForm = document.getElementById("bug-form");
bugForm.addEventListener("submit", e => {
  e.preventDefault();
  const desc = document.getElementById("bug-description").value;
  alert(`Bug reported: ${desc}`);
  document.getElementById("bug-description").value = "";
});
function updateTotals() {
  const totalsDiv = document.getElementById("totals");
  totalsDiv.innerHTML = "";

  let totalCost = 0;
  let totalItems = 0;

  products.forEach(p => {
    const input = document.querySelector(`#product-${p.id} .quantity-input`);
    if (input) {
      const qty = parseInt(input.value) || 0;
      if (qty > 0) {
        totalCost += qty * parseFloat(p.price);
        totalItems += qty;
      }
    }
  });

  totalsDiv.innerHTML = `
    <p>Total items: ${totalItems}</p>
    <p>Total cost: $${totalCost.toFixed(2)}</p>
  `;
}

// Add event listener to each quantity input
function attachQuantityListeners() {
  products.forEach(p => {
    const input = document.querySelector(`#product-${p.id} .quantity-input`);
    if (input) {
      input.addEventListener("input", updateTotals);
    }
  });
}
const card = document.createElement("div");
card.className = "product-card";
card.id = `product-${p.id}`; // unique ID

card.innerHTML = `
  <img src="${p.image}" alt="${p.name}">
  <h3 class="font-semibold text-lg">${p.name}</h3>
  <p>Price: $${p.price}</p>
  <p>Stock: ${p.stock}</p>
  <p>Quantity: <input type="number" min="0" value="0" class="quantity-input w-16 border rounded p-1"></p>
  <button class="check-btn">Check</button>
  <button class="buy-btn">Buy</button>
`;