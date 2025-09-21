function saveCooldowns(state) {
  localStorage.setItem("cooldowns", JSON.stringify(state));
}

function loadCooldowns() {
  const saved = localStorage.getItem("cooldowns");
  return saved ? JSON.parse(saved) : {};
}

let cooldowns = loadCooldowns();

function setCooldown(productId) {
  const until = Date.now() + 60_000; // 1 min cooldown (example)
  cooldowns[productId] = until;
  saveCooldowns(cooldowns);
}

function isOnCooldown(productId) {
  const until = cooldowns[productId] || 0;
  return Date.now() < until;
}