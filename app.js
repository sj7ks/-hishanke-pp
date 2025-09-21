const productList = document.getElementById("product-list");

function renderProducts() {
  productList.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <h3>${p.name}</h3>
      <p>Price: $${p.price}</p>
      <p>Stock: ${p.stock}</p>
      <button class="check-btn">Check</button>
      <button class="buy-btn">Buy</button>
    `;
    productList.appendChild(card);

    const checkBtn = card.querySelector(".check-btn");
    const buyBtn = card.querySelector(".buy-btn");

    checkBtn.addEventListener("click", () => {
      alert(`Requested stock check for ${p.name}`);
      checkBtn.disabled = true;
      checkBtn.textContent = "Requested";
    });

    buyBtn.addEventListener("click", () => {
      alert(`Send $${p.price} to mom via Revolut`);
    });
  });
}

renderProducts();

// Bug report
const bugForm = document.getElementById("bug-form");
bugForm.addEventListener("submit", e => {
  e.preventDefault();
  const desc = document.getElementById("bug-description").value;
  alert(`Bug reported: ${desc}`);
  document.getElementById("bug-description").value = "";
});