let stockItems = [];

window.addEventListener("DOMContentLoaded", loadStock);

async function loadStock() {
  try {
    const data = await AquaAPI.get("/api/products.php");
    stockItems = data.products || [];
    renderStock();
  } catch (e) {
    console.error(e);
    alert("ໂຫຼດສະຕອັກບໍ່ສຳເລັດ — ກວດການເຊື່ອມຕໍ່ API ແລະ MySQL");
  }
}

function switchTab(tab) {
  document.getElementById("list-fish").classList.toggle("hidden", tab !== "fish");
  document.getElementById("list-food").classList.toggle("hidden", tab !== "food");
  document.getElementById("tab-fish").classList.toggle("active", tab === "fish");
  document.getElementById("tab-food").classList.toggle("active", tab === "food");
}

function updateEditUnitLabel() {
  const category = document.getElementById("edit-item-category").value;
  document.getElementById("edit-item-unit-label").innerText =
    category === "fish" ? "ຈໍານວນໃນຄັງ (ໂຕ)" : "ຈໍານວນໃນຄັງ (ຊອງ/ກະປຸກ)";
}

function renderStock() {
  const fishBody = document.getElementById("table-fish-body");
  const foodBody = document.getElementById("table-food-body");
  const alertContainer = document.getElementById("alert-list-container");
  const searchFishKey = document.getElementById("search-fish").value.toLowerCase();
  const searchFoodKey = document.getElementById("search-food").value.toLowerCase();

  fishBody.innerHTML = "";
  foodBody.innerHTML = "";
  alertContainer.innerHTML = "";

  let fishTypes = 0,
    fishTotalQty = 0;
  let foodTypes = 0,
    foodTotalQty = 0;
  let lowStockCount = 0;
  let totalCostValue = 0;

  stockItems.forEach((item) => {
    totalCostValue += item.cost * item.qty;
    const isLow = item.qty < 10;
    if (isLow) lowStockCount++;

    const statusBadge = isLow
      ? `<span class="badge badge-low"><span class="dot dot-red"></span>ໃກ້ໝົດ</span>`
      : `<span class="badge badge-ok"><span class="dot dot-green"></span>ປົກກະຕິ</span>`;

    const unit = item.category === "fish" ? "ໂຕ" : "ຊອງ/ກະປຸກ";
    const name = AppUtils.escapeHtml(item.name);
    const detail = AppUtils.escapeHtml(item.detail || "-");

    if (isLow) {
      alertContainer.innerHTML += `
        <div class="alert-item">
          <span>${name}</span>
          <span class="alert-stock">ເຫຼືອ ${item.qty} ${unit}</span>
        </div>`;
    }

    const trHtml = `
      <tr>
        <td>
          <div class="cell-flex">
            <div class="item-thumb-container">${item.imgHtml || '<span class="thumb-fallback">—</span>'}</div>
            <div>
              <div class="fish-name">${name}</div>
              <div class="fish-species">${detail}</div>
            </div>
          </div>
        </td>
        <td class="price-val">${AppUtils.formatKip(item.price)}</td>
        <td>${item.qty} ${unit}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-btns">
            <button class="icon-btn" type="button" onclick="openEditModal(${item.id})" title="ແກ້ໄຂ">···</button>
            <button class="icon-btn del" type="button" onclick="deleteItem(${item.id})" title="ລຶບ">×</button>
          </div>
        </td>
      </tr>`;

    if (item.category === "fish") {
      fishTypes++;
      fishTotalQty += item.qty;
      if (
        item.name.toLowerCase().includes(searchFishKey) ||
        (item.detail && item.detail.toLowerCase().includes(searchFishKey))
      ) {
        fishBody.innerHTML += trHtml;
      }
    } else {
      foodTypes++;
      foodTotalQty += item.qty;
      if (
        item.name.toLowerCase().includes(searchFoodKey) ||
        (item.detail && item.detail.toLowerCase().includes(searchFoodKey))
      ) {
        foodBody.innerHTML += trHtml;
      }
    }
  });

  if (!alertContainer.innerHTML) {
    alertContainer.innerHTML =
      '<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px 0;">ບໍ່ມີສິນຄ້າໃກ້ໝົດສະຕອັກ</div>';
  }

  document.getElementById("stat-fish-count").innerHTML =
    `${fishTypes}<span class="stat-unit">ຊະນິດ</span>`;
  document.getElementById("stat-fish-total").innerText =
    `ສະຕອັກລວມ ${fishTotalQty} ໂຕ`;
  document.getElementById("stat-food-count").innerHTML =
    `${foodTypes}<span class="stat-unit">ລາຍການ</span>`;
  document.getElementById("stat-food-total").innerText =
    `ສະຕອັກລວມ ${foodTotalQty} ອັນ`;
  document.getElementById("stat-low-count").innerHTML =
    `${lowStockCount}<span class="stat-unit">ລາຍການ</span>`;
  document.getElementById("stat-total-value").innerText =
    AppUtils.formatKip(totalCostValue);
}

async function deleteItem(id) {
  const targetItem = stockItems.find((item) => item.id === id);
  if (!targetItem) return;
  if (
    !confirm(
      `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການ "${targetItem.name}" ອອກຈາກຄັງສິນຄ້າຖາວອນ?`
    )
  ) {
    return;
  }

  try {
    await AquaAPI.delete("/api/products.php?id=" + id);
    stockItems = stockItems.filter((item) => item.id !== id);
    renderStock();
  } catch (e) {
    alert(e.message || "ລົບບໍ່ສຳເລັດ");
  }
}

function openEditModal(id) {
  const item = stockItems.find((item) => item.id === id);
  if (!item) return;

  document.getElementById("edit-item-id").value = item.id;
  document.getElementById("edit-modal-title").innerText =
    `ແກ້ໄຂຂໍ້ມູນ: ${item.name}`;
  document.getElementById("edit-item-category").value = item.category;
  document.getElementById("edit-item-name").value = item.name;
  document.getElementById("edit-item-detail").value = item.detail || "";
  document.getElementById("edit-item-cost").value = item.cost || 0;
  document.getElementById("edit-item-price").value = item.price;
  document.getElementById("edit-item-qty").value = item.qty;
  document.getElementById("edit-item-file").value = "";

  updateEditUnitLabel();
  document.getElementById("edit-modal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("edit-modal").style.display = "none";
}

async function saveEditedItem() {
  const id = parseInt(document.getElementById("edit-item-id").value, 10);
  const newCategory = document.getElementById("edit-item-category").value;
  const newName = document.getElementById("edit-item-name").value.trim();
  const newDetail = document.getElementById("edit-item-detail").value.trim();
  const newCost = parseFloat(document.getElementById("edit-item-cost").value) || 0;
  const newPrice = parseFloat(document.getElementById("edit-item-price").value) || 0;
  const newQty = parseInt(document.getElementById("edit-item-qty").value, 10) || 0;
  const fileInput = document.getElementById("edit-item-file");
  const existing = stockItems.find((item) => item.id === id);
  let image_url = existing?.image_url || "";

  if (!newName) {
    alert("ກະລຸນາປ້ອນຊື່ສິນຄ້າ");
    return;
  }
  if (newCost < 0 || newPrice < 0 || newQty < 0) {
    alert("ກະລຸນາປ້ອນຂໍ້ມູນຕົວເລກທີ່ຫຼາຍກວ່າຫຼືເທົ່າກັບ 0");
    return;
  }

  if (fileInput.files?.[0]) {
    try {
      const formData = new FormData();
      formData.append("image", fileInput.files[0]);
      const res = await fetch("/api/upload.php", {
        method: "POST",
        body: formData,
      });
      const uploadData = await res.json();
      if (!res.ok || uploadData.status !== "success") {
        throw new Error(uploadData.message || "ອັບໂຫຼດຮູບບໍ່ສຳເລັດ");
      }
      image_url = uploadData.image_url;
    } catch (uploadErr) {
      alert("ອັບໂຫຼດຮູບລົ້ມເຫລວ: " + uploadErr.message);
      return;
    }
  }
  if (AppUtils.isBlobUrl(image_url)) {
    image_url = "";
  }

  try {
    const data = await AquaAPI.put("/api/products.php", {
      id,
      name: newName,
      detail: newDetail,
      category: newCategory,
      cost: newCost,
      price: newPrice,
      qty: newQty,
      image_url,
    });
    const idx = stockItems.findIndex((item) => item.id === id);
    if (idx !== -1 && data.product) stockItems[idx] = data.product;
    closeEditModal();
    renderStock();
  } catch (e) {
    alert(e.message || "ບັນທຶກບໍ່ສຳເລັດ");
  }
}

function handleLogout() {
  if (confirm("ຕ້ອງການອອກຈາກລະບົບຫຼືບໍ່?")) logout();
}
