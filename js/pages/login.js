const ROLE_HOME = { admin: "dashboard.html", staff: "pos.html" };

function loginPageUrl(page) {
  return new URL(page, window.location.href).href;
}

async function doLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("errMsg");
  errEl.style.display = "none";
  errEl.textContent = "ຊື່ຜູ້ໃຊ້ຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ";

  try {
    const data = await AquaAPI.post("/api/auth.php", { username, password });
    if (data.status === "success" && data.user) {
      localStorage.setItem("aq_role", data.user.role);
      localStorage.setItem("aq_username", data.user.username || username);
      localStorage.setItem("aq_name", data.user.name);
      localStorage.setItem("aq_label", data.user.roleLabel);
      window.location.href = loginPageUrl(
        ROLE_HOME[data.user.role] || "pos.html"
      );
      return;
    }
    errEl.style.display = "block";
  } catch (e) {
    console.error(e);
    errEl.textContent = "ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ສຳເລັດ — ກວດ PHP/MySQL";
    errEl.style.display = "block";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
