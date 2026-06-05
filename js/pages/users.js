let users = [];
const currentUsername = localStorage.getItem("aq_username") || "";

function handleLogout() {
  logout();
}

function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = "form-msg " + type;
  el.classList.remove("hidden");
}

function hideMsg(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.add("hidden");
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  try {
    const data = await AquaAPI.get("/api/users.php");
    users = data.users || [];
    renderUsers();
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:24px;">' +
      AppUtils.escapeHtml(e.message) +
      "</td></tr>";
  }
}

function renderUsers() {
  const tbody = document.getElementById("users-table-body");
  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">ຍັງບໍ່ມີຜູ້ໃຊ້</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(function (u) {
      const isSelf = u.username === currentUsername;
      const roleClass = u.role === "admin" ? "admin" : "staff";
      return (
        "<tr>" +
        "<td><span style=\"font-family:var(--mono)\">" +
        AppUtils.escapeHtml(u.username) +
        (isSelf ? ' <span style="color:var(--muted);font-size:11px">(ທ່ານ)</span>' : "") +
        "</span></td>" +
        "<td>" +
        AppUtils.escapeHtml(u.display_name) +
        "</td>" +
        '<td><span class="role-badge ' +
        roleClass +
        '">' +
        AppUtils.escapeHtml(u.role_label) +
        "</span></td>" +
        "<td style=\"font-size:12px;color:var(--muted)\">" +
        formatDate(u.created_at) +
        "</td>" +
        "<td style=\"white-space:nowrap\">" +
        '<button class="btn-icon" title="ແກ້ໄຂ" onclick="openEditModal(' +
        u.id +
        ')">···</button>' +
        (isSelf
          ? ""
          : '<button class="btn-icon danger" title="ລຶບ" onclick="deleteUser(' +
            u.id +
            ')">×</button>') +
        "</td></tr>"
      );
    })
    .join("");
}

function openCreateModal() {
  document.getElementById("user-edit-id").value = "";
  document.getElementById("user-modal-title").textContent = "+ ເພີ່ມຜູ້ໃຊ້ໃໝ່";
  document.getElementById("username-group").style.display = "";
  document.getElementById("user-username").value = "";
  document.getElementById("user-username").disabled = false;
  document.getElementById("user-display-name").value = "";
  document.getElementById("user-role").value = "staff";
  document.getElementById("user-password").value = "";
  document.getElementById("user-password-label").textContent = "ລະຫັດຜ່ານ";
  document.getElementById("user-password-hint").textContent = "ຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ";
  hideMsg("user-modal-msg");
  document.getElementById("user-modal").style.display = "flex";
}

function openEditModal(id) {
  const user = users.find(function (u) {
    return u.id === id;
  });
  if (!user) return;

  document.getElementById("user-edit-id").value = user.id;
  document.getElementById("user-modal-title").textContent = "ແກ້ໄຂຜູ້ໃຊ້";
  document.getElementById("username-group").style.display = "";
  document.getElementById("user-username").value = user.username;
  document.getElementById("user-username").disabled = true;
  document.getElementById("user-display-name").value = user.display_name;
  document.getElementById("user-role").value = user.role;
  document.getElementById("user-password").value = "";
  document.getElementById("user-password-label").textContent = "ລະຫັດຜ່ານໃໝ່ (ຖ້າຕ້ອງການປ່ຽນ)";
  document.getElementById("user-password-hint").textContent =
    "ປ່ອຍວ່າງໄວ້ຖ້າບໍ່ຕ້ອງການປ່ຽນ";
  hideMsg("user-modal-msg");
  document.getElementById("user-modal").style.display = "flex";
}

function closeUserModal() {
  document.getElementById("user-modal").style.display = "none";
}

async function saveUser() {
  const editId = document.getElementById("user-edit-id").value;
  const displayName = document.getElementById("user-display-name").value.trim();
  const role = document.getElementById("user-role").value;
  const password = document.getElementById("user-password").value;

  hideMsg("user-modal-msg");

  if (!displayName) {
    showMsg("user-modal-msg", "ກະລຸນາປ້ອນຊື່ສະແດງ", "error");
    return;
  }

  try {
    if (editId) {
      const body = { id: parseInt(editId, 10), display_name: displayName, role: role };
      if (password) body.new_password = password;
      await AquaAPI.put("/api/users.php", body);
    } else {
      const username = document.getElementById("user-username").value.trim();
      if (!username) {
        showMsg("user-modal-msg", "ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້", "error");
        return;
      }
      if (!password) {
        showMsg("user-modal-msg", "ກະລຸນາປ້ອນລະຫັດຜ່ານ", "error");
        return;
      }
      await AquaAPI.post("/api/users.php", {
        username: username,
        password: password,
        display_name: displayName,
        role: role,
      });
    }
    closeUserModal();
    await loadUsers();
  } catch (e) {
    showMsg("user-modal-msg", e.message, "error");
  }
}

async function deleteUser(id) {
  const user = users.find(function (u) {
    return u.id === id;
  });
  if (!user) return;
  if (!confirm('ລຶບຜູ້ໃຊ້ "' + user.username + '" ບໍ?')) return;
  try {
    await AquaAPI.delete("/api/users.php?id=" + id);
    await loadUsers();
  } catch (e) {
    alert(e.message);
  }
}

async function changeMyPassword() {
  hideMsg("pwd-msg");

  const current = document.getElementById("pwd-current").value;
  const newPwd = document.getElementById("pwd-new").value;
  const confirm = document.getElementById("pwd-confirm").value;

  if (!current || !newPwd) {
    showMsg("pwd-msg", "ກະລຸນາປ້ອນລະຫັດຜ່ານໃຫ້ຄົບ", "error");
    return;
  }
  if (newPwd !== confirm) {
    showMsg("pwd-msg", "ລະຫັດຜ່ານໃໝ່ບໍ່ກົງກັນ", "error");
    return;
  }

  try {
    await AquaAPI.post("/api/users.php", {
      action: "change_password",
      current_password: current,
      new_password: newPwd,
    });
    document.getElementById("pwd-current").value = "";
    document.getElementById("pwd-new").value = "";
    document.getElementById("pwd-confirm").value = "";
    showMsg("pwd-msg", "ປ່ຽນລະຫັດຜ່ານສຳເລັດ!", "success");
  } catch (e) {
    showMsg("pwd-msg", e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("pwd-username").value = currentUsername;
  loadUsers();
});
