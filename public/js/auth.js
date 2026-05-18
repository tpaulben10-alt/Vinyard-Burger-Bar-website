(function () {
  const TOKEN_KEY = "vbb_token";
  const USER_KEY = "vbb_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function decodeToken(token) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch (_error) {
      return null;
    }
  }

  function isExpired(token) {
    const payload = decodeToken(token);
    return !payload?.exp || payload.exp * 1000 < Date.now();
  }

  async function api(path, options = {}) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  function requireAuth(role) {
    const token = getToken();
    const user = getUser();

    if (!token || isExpired(token) || !user) {
      clearSession();
      location.href = "/index.html";
      return null;
    }

    if (role && user.role !== role) {
      location.href = user.role === "admin" ? "/admin/dashboard.html" : "/customer/dashboard.html";
      return null;
    }

    return user;
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (_error) {
      // Clearing the local session matters most when the network is unavailable.
    }

    if (window.vbbSocket) {
      window.vbbSocket.emit("user:offline", { user_id: getUser()?.id });
      window.vbbSocket.disconnect();
    }

    clearSession();
    location.href = "/index.html";
  }

  function setupLogoutButtons() {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", logout);
    });
  }

  function showMessage(element, text, isError = false) {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("error", isError);
  }

  window.VBB = {
    api,
    getToken,
    getUser,
    setSession,
    clearSession,
    requireAuth,
    logout,
    setupLogoutButtons,
    showMessage,
    statusLabels: {
      pending: "Pending",
      confirmed: "Confirmed",
      preparing: "Preparing",
      ready: "Ready",
      delivered: "Delivered",
      cancelled: "Cancelled"
    }
  };
})();
