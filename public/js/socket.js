(function () {
  function initSocket() {
    if (!window.io || !window.VBB?.getToken()) {
      return null;
    }

    const socket = io({ auth: { token: window.VBB.getToken() } });
    const user = window.VBB.getUser();

    socket.on("connect", () => {
      socket.emit("user:online", { user_id: user?.id, role: user?.role });
      if (user?.role === "admin") {
        socket.emit("admin:join");
      }
    });

    window.addEventListener("beforeunload", () => {
      socket.emit("user:offline", { user_id: user?.id });
    });

    window.vbbSocket = socket;
    return socket;
  }

  window.VBBSocket = { initSocket };
})();
