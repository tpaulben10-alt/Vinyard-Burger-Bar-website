const user = VBB.requireAuth("customer");
VBB.setupLogoutButtons();

const state = {
  menu: [],
  category: "burger",
  cart: new Map()
};

const categoryLabels = {
  burger: "Burgers",
  sides: "Sides",
  drinks: "Drinks",
  combos: "Combos"
};

const menuGrid = document.querySelector("#menuGrid");
const cartSidebar = document.querySelector("#cartSidebar");
const scrim = document.querySelector("#scrim");
const cartItems = document.querySelector("#cartItems");
const cartSubtotal = document.querySelector("#cartSubtotal");
const cartCount = document.querySelector("#cartCount");
const orderMessage = document.querySelector("#orderMessage");

document.querySelectorAll("[data-user-name]").forEach((node) => {
  node.textContent = user?.name || "Customer";
});

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function renderMenu() {
  const items = state.menu.filter((item) => item.category === state.category);

  menuGrid.innerHTML = items.length
    ? items
        .map(
          (item) => `
          <article class="menu-card card">
            <img src="${item.image_url || "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85"}" alt="${item.name}">
            <div class="menu-card-body">
              <h3>${item.name}</h3>
              <p>${item.description || ""}</p>
              <span class="price">${money(item.price)}</span>
              <button class="primary-btn" type="button" data-add="${item.id}">Add to Cart</button>
            </div>
          </article>`
        )
        .join("")
    : `<p class="muted">No ${categoryLabels[state.category]} are available right now.</p>`;
}

function renderCart() {
  const entries = [...state.cart.values()];
  const subtotal = entries.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const count = entries.reduce((sum, item) => sum + item.quantity, 0);

  cartItems.innerHTML = entries.length
    ? entries
        .map(
          (item) => `
        <div class="cart-line">
          <div>
            <strong>${item.name}</strong>
            <p class="muted">${money(item.price)} each</p>
          </div>
          <div class="qty-controls">
            <button type="button" data-decrease="${item.id}" aria-label="Decrease ${item.name}">-</button>
            <strong>${item.quantity}</strong>
            <button type="button" data-increase="${item.id}" aria-label="Increase ${item.name}">+</button>
          </div>
        </div>`
        )
        .join("")
    : `<p class="muted">Your cart is ready for something bold.</p>`;

  cartSubtotal.textContent = money(subtotal);
  cartCount.textContent = count;
}

function addToCart(id) {
  const item = state.menu.find((menuItem) => menuItem.id === Number(id));
  if (!item) return;

  const existing = state.cart.get(item.id) || { ...item, quantity: 0 };
  existing.quantity += 1;
  state.cart.set(item.id, existing);
  renderCart();
}

async function loadMenu() {
  try {
    const data = await VBB.api("/api/menu");
    state.menu = data.items;
    renderMenu();
  } catch (error) {
    menuGrid.innerHTML = `<p class="message error">${error.message}</p>`;
  }
}

async function placeOrder() {
  const items = [...state.cart.values()].map((item) => ({
    menu_item_id: item.id,
    quantity: item.quantity
  }));

  if (!items.length) {
    VBB.showMessage(orderMessage, "Add at least one item first.", true);
    return;
  }

  try {
    const notes = document.querySelector("#orderNotes")?.value || "";
    const data = await VBB.api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items, notes })
    });
    state.cart.clear();
    renderCart();
    VBB.showMessage(orderMessage, `Order #${data.order_id} placed. Track it live on the orders page.`);
  } catch (error) {
    VBB.showMessage(orderMessage, error.message, true);
  }
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) addToCart(addButton.dataset.add);

  const increase = event.target.closest("[data-increase]");
  if (increase) addToCart(increase.dataset.increase);

  const decrease = event.target.closest("[data-decrease]");
  if (decrease) {
    const id = Number(decrease.dataset.decrease);
    const item = state.cart.get(id);
    if (item) {
      item.quantity -= 1;
      if (item.quantity <= 0) state.cart.delete(id);
      renderCart();
    }
  }

  const tab = event.target.closest("[data-category]");
  if (tab) {
    state.category = tab.dataset.category;
    document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("is-active", button === tab));
    renderMenu();
  }

  if (event.target.closest("[data-cart-open]")) {
    cartSidebar.classList.add("is-open");
    scrim.classList.add("is-open");
  }

  if (event.target.closest("[data-cart-close]") || event.target === scrim) {
    cartSidebar.classList.remove("is-open");
    scrim.classList.remove("is-open");
  }

  if (event.target.closest("[data-place-order]")) placeOrder();
});

VBBSocket.initSocket();
renderCart();
loadMenu();
