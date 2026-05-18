const adminUser = VBB.requireAuth("admin");
VBB.setupLogoutButtons();

document.querySelectorAll("[data-user-name]").forEach((node) => {
  node.textContent = adminUser?.name || "Admin";
});

const page = document.body.dataset.adminPage;
const statusOptions = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];
const socket = VBBSocket.initSocket();

function money(value) {
  return `₱${Number(value).toFixed(2)}`;
}

function statusBadge(status) {
  return `<span class="status ${status}">${VBB.statusLabels[status] || status}</span>`;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-open");
  window.setTimeout(() => toast.classList.remove("is-open"), 3600);
}

function renderAdminNav(active) {
  const nav = document.querySelector("#adminNav");
  if (!nav) return;
  const links = [
    ["/admin/dashboard.html", "Dashboard", "dashboard"],
    ["/admin/orders.html", "Orders", "orders"],
    ["/admin/menu.html", "Menu & Stock", "menu"],
    ["/admin/accounts.html", "Registered Accounts", "accounts"],
    ["/admin/online-users.html", "Online Customers", "online"]
  ];
  nav.innerHTML = links
    .map(([href, label, key]) => `<a class="${active === key ? "is-active" : ""}" href="${href}">${label}</a>`)
    .join("");
}

async function loadDashboard() {
  const [statsData, ordersData] = await Promise.all([VBB.api("/api/admin/stats"), VBB.api("/api/admin/orders")]);
  const stats = statsData.stats;
  document.querySelector("#totalOrdersToday").textContent = stats.totalOrdersToday;
  document.querySelector("#pendingOrders").textContent = stats.pendingOrders;
  document.querySelector("#onlineCustomers").textContent = stats.onlineCustomers;
  document.querySelector("#registeredUsers").textContent = stats.registeredUsers;

  const recent = ordersData.orders.slice(0, 5);
  document.querySelector("#recentOrders").innerHTML = recent.length
    ? recent
        .map(
          (order) => `
        <tr>
          <td>#VBB-${order.id}</td>
          <td>${order.customer_name}</td>
          <td>${order.items.length} items</td>
          <td>${money(order.total_amount)}</td>
          <td>${statusBadge(order.status)}</td>
          <td><a class="mini-btn" href="/admin/orders.html">Manage</a></td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="6">No orders yet.</td></tr>`;
}

async function loadOrders(status = "all") {
  const url = status === "all" ? "/api/admin/orders" : `/api/admin/orders?status=${encodeURIComponent(status)}`;
  const data = await VBB.api(url);
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML = data.orders.length
    ? data.orders
        .map(
          (order) => `
      <tr data-order-id="${order.id}" data-status-row="${order.status}">
        <td>#VBB-${order.id}</td>
        <td>${order.customer_name}<br><span class="muted">${order.customer_email}</span></td>
        <td>${order.items.map((item) => `${item.name} x ${item.quantity}`).join("<br>")}</td>
        <td>${money(order.total_amount)}</td>
        <td>${new Date(order.created_at).toLocaleString()}</td>
        <td>
          <div data-status>${statusBadge(order.status)}</div>
          <select data-status-select="${order.id}">
            ${statusOptions.map((option) => `<option value="${option}" ${option === order.status ? "selected" : ""}>${VBB.statusLabels[option]}</option>`).join("")}
          </select>
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="6">No orders match this filter.</td></tr>`;
}

async function updateOrderStatus(orderId, status) {
  await VBB.api(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  const row = document.querySelector(`[data-order-id="${orderId}"]`);
  row.querySelector("[data-status]").innerHTML = statusBadge(status);
  row.dataset.statusRow = status;
}

async function loadAccounts() {
  const data = await VBB.api("/api/admin/users");
  const tbody = document.querySelector("#accountsTable tbody");
  tbody.innerHTML = data.users
    .map(
      (user) => `
    <tr data-role="${user.role}" data-search="${`${user.name} ${user.email}`.toLowerCase()}">
      <td>${user.id}</td>
      <td><span class="avatar">${user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="role ${user.role}">${user.role}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>${user.last_seen ? new Date(user.last_seen).toLocaleString() : "Never"}</td>
    </tr>`
    )
    .join("");
  filterAccounts();
}

function filterAccounts() {
  const query = (document.querySelector("#accountSearch")?.value || "").toLowerCase();
  const role = document.querySelector("#roleFilter")?.value || "all";
  document.querySelectorAll("#accountsTable tbody tr").forEach((row) => {
    const matchesText = row.dataset.search.includes(query);
    const matchesRole = role === "all" || row.dataset.role === role;
    row.style.display = matchesText && matchesRole ? "" : "none";
  });
}

function renderOnlineUsers(users) {
  const list = document.querySelector("#onlineList");
  if (!list) return;
  list.innerHTML = users.length
    ? users
        .map(
          (user) => `
      <article class="card" data-search="${`${user.name} ${user.email}`.toLowerCase()}">
        <h3><span class="online-dot"></span>${user.name}</h3>
        <p class="muted">${user.email}</p>
        <span class="muted">Last active: ${user.last_seen ? new Date(user.last_seen).toLocaleString() : "Now"}</span>
      </article>`
        )
        .join("")
    : `<p class="muted">No customers are currently online.</p>`;
  filterOnlineUsers();
}

async function loadOnlineUsers() {
  const data = await VBB.api("/api/admin/users/online");
  renderOnlineUsers(data.users);
}

function filterOnlineUsers() {
  const query = (document.querySelector("#onlineSearch")?.value || "").toLowerCase();
  document.querySelectorAll("#onlineList article").forEach((card) => {
    card.style.display = card.dataset.search.includes(query) ? "" : "none";
  });
}

document.addEventListener("click", (event) => {
  const filter = event.target.closest("[data-order-filter]");
  if (filter) {
    document.querySelectorAll("[data-order-filter]").forEach((button) => button.classList.toggle("is-active", button === filter));
    loadOrders(filter.dataset.orderFilter).catch((error) => showToast(error.message));
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-status-select]")) {
    updateOrderStatus(event.target.dataset.statusSelect, event.target.value).catch((error) => showToast(error.message));
  }
  if (event.target.matches("#roleFilter")) filterAccounts();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#accountSearch")) filterAccounts();
  if (event.target.matches("#onlineSearch")) filterOnlineUsers();
});

socket?.on("order:new", (payload) => {
  showToast(`New order received: #VBB-${payload.order_id}`);
  if (page === "dashboard") loadDashboard().catch((error) => showToast(error.message));
  if (page === "orders") loadOrders().catch((error) => showToast(error.message));
});

socket?.on("admin:online_users", (users) => {
  if (page === "online") renderOnlineUsers(users);
  if (page === "dashboard") {
    document.querySelector("#onlineCustomers").textContent = users.length;
  }
});

renderAdminNav(page);

if (page === "dashboard") loadDashboard().catch((error) => showToast(error.message));
if (page === "orders") loadOrders().catch((error) => showToast(error.message));
if (page === "accounts") loadAccounts().catch((error) => showToast(error.message));
if (page === "online") loadOnlineUsers().catch((error) => showToast(error.message));

async function loadMenuManager() {
  const data = await VBB.api("/api/menu/admin/all");
  const tbody = document.querySelector("#menuTable tbody");
  if (!tbody) return;
  tbody.innerHTML = data.items
    .map(
      (item) => `
    <tr data-menu-id="${item.id}">
      <td><input data-field="name" value="${item.name}"></td>
      <td><input data-field="category" value="${item.category}"></td>
      <td><input data-field="price" type="number" min="0" step="0.01" value="${Number(item.price)}"></td>
      <td>
        <span class="${Number(item.stock) < 5 ? "low-stock-text" : ""}">${Number(item.stock) < 5 ? "⚠️ " : ""}${item.stock}</span>
        <div class="stock-actions">
          <button class="mini-btn" type="button" data-stock-delta="-1">-</button>
          <button class="mini-btn" type="button" data-stock-delta="1">+</button>
        </div>
      </td>
      <td><textarea data-field="description">${item.description || ""}</textarea></td>
      <td><input data-field="image_url" value="${item.image_url || ""}"></td>
      <td>
        <button class="mini-btn" type="button" data-save-menu>Save</button>
        <button class="mini-btn danger" type="button" data-delete-menu>Delete</button>
      </td>
    </tr>`
    )
    .join("");
}

async function saveMenuRow(row) {
  const id = row.dataset.menuId;
  const payload = {};
  row.querySelectorAll("[data-field]").forEach((field) => {
    payload[field.dataset.field] = field.value;
  });
  payload.stock = row.querySelector("td:nth-child(4) span").textContent.replace("⚠️", "").trim();
  await VBB.api(`/api/menu/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  await loadMenuManager();
  showToast("Menu item saved.");
}

async function addMenuItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  await VBB.api("/api/menu", { method: "POST", body: JSON.stringify(payload) });
  form.reset();
  await loadMenuManager();
  showToast("Menu item added.");
}

document.addEventListener("click", (event) => {
  const row = event.target.closest("[data-menu-id]");
  if (event.target.matches("[data-save-menu]")) {
    saveMenuRow(row).catch((error) => showToast(error.message));
  }
  if (event.target.matches("[data-delete-menu]")) {
    VBB.api(`/api/menu/${row.dataset.menuId}`, { method: "DELETE" })
      .then(loadMenuManager)
      .then(() => showToast("Menu item removed."))
      .catch((error) => showToast(error.message));
  }
  if (event.target.matches("[data-stock-delta]")) {
    VBB.api(`/api/menu/${row.dataset.menuId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ delta: Number(event.target.dataset.stockDelta) })
    })
      .then(loadMenuManager)
      .catch((error) => showToast(error.message));
  }
});

document.querySelector("#menuForm")?.addEventListener("submit", (event) => {
  addMenuItem(event).catch((error) => showToast(error.message));
});

if (page === "menu") loadMenuManager().catch((error) => showToast(error.message));
