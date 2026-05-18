const routes = [...document.querySelectorAll("[data-route]")];
const screens = [...document.querySelectorAll("[data-screen]")];
const menuGrid = document.querySelector("#menuGrid");
const cartSidebar = document.querySelector("#cartSidebar");
const scrim = document.querySelector("#scrim");
const cartItemsEl = document.querySelector("#cartItems");
const cartSubtotalEl = document.querySelector("#cartSubtotal");
const cartCountEl = document.querySelector("#cartCount");

const adminLinks = [
  ["admin-dashboard", "Dashboard"],
  ["admin-orders", "Orders"],
  ["admin-accounts", "Registered Accounts"],
  ["admin-online", "Online Customers"]
];

const menuItems = [
  {
    category: "Burgers",
    name: "Vinyard Signature",
    description: "Dry-aged beef, smoked cheddar, onion jam, house amber sauce.",
    price: 14.75,
    best: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Burgers",
    name: "Truffle Stack",
    description: "Double patty, truffle aioli, mushrooms, crisp shallots.",
    price: 16.5,
    image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Burgers",
    name: "Smokehouse Double",
    description: "Charred beef, bacon, smoked gouda, pickled chilies.",
    price: 17.25,
    best: true,
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Burgers",
    name: "Garden Flame",
    description: "Grilled vegetable patty, pepper relish, herb cream.",
    price: 13.25,
    image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Sides",
    name: "Truffle Fries",
    description: "Crisp fries, parmesan, parsley, roasted garlic dip.",
    price: 7.75,
    best: true,
    image: "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Sides",
    name: "House Chips",
    description: "Kettle chips with smoked salt and malt vinegar cream.",
    price: 5.5,
    image: "https://images.unsplash.com/photo-1606755456206-b25206cde27e?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Drinks",
    name: "Ginger Lime Fizz",
    description: "Fresh lime, ginger syrup, sparkling water, mint.",
    price: 5.25,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Drinks",
    name: "Amber Iced Tea",
    description: "Black tea, citrus, honey, and a rosemary finish.",
    price: 4.75,
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Combos",
    name: "Bold Lunch Combo",
    description: "Signature burger, house chips, and amber iced tea.",
    price: 19.95,
    best: true,
    image: "https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=900&q=85"
  },
  {
    category: "Combos",
    name: "Smokehouse Feast",
    description: "Smokehouse Double, truffle fries, and ginger lime fizz.",
    price: 24.5,
    image: "https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=900&q=85"
  }
];

let activeCategory = "Burgers";
const cart = new Map();

function routeTo(name) {
  const target = name || location.hash.replace("#", "") || "login";
  screens.forEach(screen => screen.classList.toggle("is-active", screen.dataset.screen === target));
  routes.forEach(route => route.classList.toggle("is-active", route.dataset.route === target));
  document.querySelectorAll(".admin-nav a").forEach(link => {
    link.classList.toggle("is-active", link.dataset.route === target);
  });
  closeCart();
}

function renderAdminSidebars() {
  document.querySelectorAll(".admin-sidebar").forEach(sidebar => {
    sidebar.innerHTML = `
      <a class="wordmark" href="#admin-dashboard" data-route="admin-dashboard">
        <span class="wordmark-mark">V</span><span>Vinyard Burger Bar</span>
      </a>
      <nav class="admin-nav">
        ${adminLinks.map(([route, label]) => `<a href="#${route}" data-route="${route}">${label}</a>`).join("")}
      </nav>
    `;
  });
}

function renderMenu() {
  const items = menuItems.filter(item => item.category === activeCategory);
  menuGrid.innerHTML = items.map(item => `
    <article class="menu-card">
      ${item.best ? `<span class="best-badge">Best Seller</span>` : ""}
      <img src="${item.image}" alt="${item.name}">
      <div class="menu-card-body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <span class="price">$${item.price.toFixed(2)}</span>
        <button class="primary-btn add-cart" type="button" data-name="${item.name}">Add to Cart</button>
      </div>
    </article>
  `).join("");
}

function renderCart() {
  const entries = [...cart.values()];
  const subtotal = entries.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = entries.reduce((sum, item) => sum + item.qty, 0);
  cartItemsEl.innerHTML = entries.length
    ? entries.map(item => `<div class="cart-line"><span>${item.name} × ${item.qty}</span><strong>$${(item.price * item.qty).toFixed(2)}</strong></div>`).join("")
    : `<p class="muted">Your cart is ready for something bold.</p>`;
  cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  cartCountEl.textContent = count;
}

function addToCart(name) {
  const item = menuItems.find(menuItem => menuItem.name === name);
  const existing = cart.get(name) || { ...item, qty: 0 };
  existing.qty += 1;
  cart.set(name, existing);
  renderCart();
}

function openCart() {
  cartSidebar.classList.add("is-open");
  scrim.classList.add("is-open");
}

function closeCart() {
  cartSidebar?.classList.remove("is-open");
  scrim?.classList.remove("is-open");
}

function renderSteppers() {
  const labels = ["Pending", "Confirmed", "Preparing", "Ready", "Delivered"];
  document.querySelectorAll(".stepper").forEach(stepper => {
    const current = Number(stepper.dataset.step);
    stepper.innerHTML = labels.map((label, index) => {
      const state = index < current ? "done" : index === current ? "done active" : "";
      return `<span class="step ${state}">${label}</span>`;
    }).join("");
  });
}

function updateStatus(row, value) {
  const badge = row.querySelector(".status");
  badge.className = `status ${value.toLowerCase()}`;
  badge.textContent = value === "Delivered" ? "✓ Delivered" : value;
  row.classList.remove("changed");
  void row.offsetWidth;
  row.classList.add("changed");
}

function filterOnlineCustomers() {
  const query = document.querySelector("#onlineSearch").value.toLowerCase();
  const cards = [...document.querySelectorAll("#onlineList article")];
  let visible = 0;
  cards.forEach(card => {
    const match = card.dataset.search.includes(query);
    card.style.display = match ? "" : "none";
    if (match) visible += 1;
  });
  document.querySelector("#onlineEmpty").style.display = visible ? "none" : "block";
}

function filterAccounts() {
  const query = document.querySelector("#accountSearch").value.toLowerCase();
  const role = document.querySelector("#roleFilter").value;
  document.querySelectorAll("#accountsTable tbody tr").forEach(row => {
    const matchesText = row.dataset.search.includes(query);
    const matchesRole = role === "All Roles" || row.dataset.role === role;
    row.style.display = matchesText && matchesRole ? "" : "none";
  });
}

renderAdminSidebars();
renderMenu();
renderCart();
renderSteppers();
routeTo();

window.addEventListener("hashchange", () => routeTo());
document.addEventListener("click", event => {
  const route = event.target.closest("[data-route]");
  if (route) routeTo(route.dataset.route);

  const tab = event.target.closest(".tab");
  if (tab) {
    activeCategory = tab.dataset.category;
    document.querySelectorAll(".tab").forEach(button => button.classList.toggle("is-active", button === tab));
    renderMenu();
  }

  const addButton = event.target.closest(".add-cart");
  if (addButton) addToCart(addButton.dataset.name);

  if (event.target.closest(".cart-trigger")) openCart();
  if (event.target.closest(".close-btn") || event.target === scrim) closeCart();

  const orderRow = event.target.closest("#ordersTable tbody tr");
  if (orderRow && !event.target.matches("select")) {
    document.querySelector("#detailTitle").textContent = orderRow.dataset.order;
    document.querySelector("#detailsPanel").classList.add("is-open");
  }
  if (event.target.closest(".close-details")) document.querySelector("#detailsPanel").classList.remove("is-open");
});

document.addEventListener("change", event => {
  if (event.target.matches("#ordersTable select")) updateStatus(event.target.closest("tr"), event.target.value);
  if (event.target.matches("#roleFilter")) filterAccounts();
});

document.querySelector("#onlineSearch").addEventListener("input", filterOnlineCustomers);
document.querySelector("#accountSearch").addEventListener("input", filterAccounts);
document.querySelector("#passwordInput").addEventListener("input", event => {
  const width = Math.min(100, Math.max(18, event.target.value.length * 10));
  document.querySelector(".strength-fill").style.width = `${width}%`;
});
