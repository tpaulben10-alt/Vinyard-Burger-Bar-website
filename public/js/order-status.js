const user = VBB.requireAuth("customer");
VBB.setupLogoutButtons();
document.querySelectorAll("[data-user-name]").forEach((node) => {
  node.textContent = user?.name || "Customer";
});

const ordersList = document.querySelector("#ordersList");
const steps = ["pending", "confirmed", "preparing", "ready", "delivered"];

function money(value) {
  return `₱${Number(value).toFixed(2)}`;
}

function statusBadge(status) {
  return `<span class="status ${status}">${VBB.statusLabels[status] || status}</span>`;
}

function stepper(status) {
  const current = status === "cancelled" ? -1 : steps.indexOf(status);
  return `
    <div class="stepper">
      ${steps
        .map((step, index) => {
          const className = index < current ? "done" : index === current ? "done active" : "";
          return `<span class="step ${className}">${VBB.statusLabels[step]}</span>`;
        })
        .join("")}
    </div>`;
}

function renderOrders(orders) {
  ordersList.innerHTML = orders.length
    ? orders
        .map(
          (order) => `
        <article class="order-card card" data-order-id="${order.id}">
          <div class="order-top">
            <div>
              <h3>#VBB-${order.id}</h3>
              <p class="muted">${order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</p>
            </div>
            <div data-status>${statusBadge(order.status)}</div>
          </div>
          ${stepper(order.status)}
          <dl class="order-meta">
            <div><dt>Total</dt><dd>${money(order.total_amount)}</dd></div>
            <div><dt>Placed</dt><dd>${new Date(order.created_at).toLocaleString()}</dd></div>
          </dl>
        </article>`
        )
        .join("")
    : `<p class="muted">No orders yet. The grill is waiting.</p>`;
}

async function loadOrders() {
  try {
    const data = await VBB.api("/api/orders/my");
    renderOrders(data.orders);
  } catch (error) {
    ordersList.innerHTML = `<p class="message error">${error.message}</p>`;
  }
}

const socket = VBBSocket.initSocket();
socket?.on("order:status_update", (payload) => {
  const card = document.querySelector(`[data-order-id="${payload.order_id}"]`);
  if (!card) {
    loadOrders();
    return;
  }
  card.querySelector("[data-status]").innerHTML = statusBadge(payload.status);
  card.querySelector(".stepper").outerHTML = stepper(payload.status);
});

loadOrders();
