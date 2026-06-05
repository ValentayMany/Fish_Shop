/**
 * Role guard — load after utils.js on protected pages
 */
(function () {
  const ROLE_PAGES = {
    admin: ["dashboard.html", "stock.html", "pos.html", "supplier.html", "report.html", "users.html"],
    staff: ["pos.html"],
  };

  const ROLE_HOME = {
    admin: "dashboard.html",
    staff: "pos.html",
  };

  // ─── เช็ค login ───
  const role = localStorage.getItem("aq_role");
  const name = localStorage.getItem("aq_name");
  const label = localStorage.getItem("aq_label");

  if (!role) {
    window.location.href = "../pages/login.html";
    throw new Error("Not authenticated");
  }

  // ─── เช็คสิทธิ์หน้าปัจจุบัน ───
  const currentPage = window.location.pathname.split("/").pop();
  const allowed = ROLE_PAGES[role] || [];

  if (!allowed.includes(currentPage)) {
    window.location.href = "../pages/" + ROLE_HOME[role];
    throw new Error("Access denied");
  }

  // ─── อัปเดต user pill ใน sidebar ───
  window.addEventListener("DOMContentLoaded", function () {
    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    if (nameEl) nameEl.textContent = name || "User";
    if (roleEl) roleEl.textContent = label || role;

    // ซ่อน nav-item ที่ไม่มีสิทธิ์
    document.querySelectorAll(".nav-item[href]").forEach(function (link) {
      const page = link.getAttribute("href").split("/").pop();
      if (!allowed.includes(page) && page !== "#") {
        link.style.display = "none";
      }
    });
  });

  // ─── logout ───
  window.logout = function () {
    localStorage.removeItem("aq_role");
    localStorage.removeItem("aq_username");
    localStorage.removeItem("aq_name");
    localStorage.removeItem("aq_label");
    window.location.href = "../pages/login.html";
  };
})();
