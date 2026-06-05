let receiveCart = [];
let receiveHistory = [];
let existingProducts = [];

window.addEventListener("DOMContentLoaded", () => {
  loadReceiveHistory();
  loadExistingProducts();
  document.getElementById("btn-submit-all").addEventListener("click", submitReceiveBill);
});

async function loadExistingProducts() {
  try {
    const data = await AquaAPI.get("/api/products.php");
    existingProducts = data.products || [];
  } catch (e) {
    console.error("Failed to load existing products:", e);
  }
}

async function loadReceiveHistory() {
  try {
    const data = await AquaAPI.get("/api/receives.php");
    receiveHistory = data.history || [];
    renderHistory();
  } catch (e) {
    console.error(e);
  }
}

function openModal() {
  document.getElementById("modal-receive-date").value = AppUtils.localDateInputValue();
  document.getElementById("modal").style.display = "flex";
}

function updateModalUnit() {
  const category = document.getElementById("modal-category").value;
  document.getElementById("modal-unit-label").innerText =
    category === "fish" ? "ຈໍານວນ (ໂຕ)" : "ຈໍານວນ (ຊອງ/ກະປຸກ)";
}

function calculateLiveProfit() {
  const cost = parseFloat(document.getElementById("modal-product-price").value) || 0;
  const sale = parseFloat(document.getElementById("modal-product-sale-price").value) || 0;
  const profitText = document.getElementById("profit-text");
  const profitPanel = document.getElementById("profit-panel");
  if (cost <= 0 || sale <= 0) {
    profitText.innerText = "₭0 (0%)";
    profitText.style.color = "#10b981";
    return;
  }
  const profitAmount = sale - cost;
  const profitMargin = (profitAmount / sale) * 100;
  if (profitAmount >= 0) {
    profitText.innerText = `+₭${profitAmount.toLocaleString()} (${profitMargin.toFixed(1)}%)`;
    profitText.style.color = "#10b981";
    profitPanel.style.background = "rgba(16, 185, 129, 0.06)";
    profitPanel.style.borderColor = "rgba(16, 185, 129, 0.15)";
  } else {
    profitText.innerText = `₭${profitAmount.toLocaleString()} (${profitMargin.toFixed(1)}%) ຕໍ່າກວ່າທຶນ!`;
    profitText.style.color = "#ef4444";
    profitPanel.style.background = "rgba(239, 68, 68, 0.06)";
    profitPanel.style.borderColor = "rgba(239, 68, 68, 0.15)";
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modal-supplier").value = "";
  document.getElementById("modal-product-name").value = "";
  document.getElementById("modal-product-detail").value = "";
  document.getElementById("modal-product-price").value = "0";
  document.getElementById("modal-product-sale-price").value = "0";
  document.getElementById("modal-product-qty").value = "1";
  document.getElementById("modal-file-input").value = "";
  
  // Reset source
  document.getElementById("modal-product-source").value = "new";
  toggleProductSource();
}

function toggleProductSource() {
  const source = document.getElementById("modal-product-source").value;
  const existingGroup = document.getElementById("existing-product-group");
  const nameInput = document.getElementById("modal-product-name");
  const detailInput = document.getElementById("modal-product-detail");
  const categorySelect = document.getElementById("modal-category");
  const fileInput = document.getElementById("modal-file-input");

  if (source === "existing") {
    existingGroup.style.display = "block";
    nameInput.readOnly = true;
    detailInput.readOnly = true;
    categorySelect.disabled = true;
    fileInput.disabled = true;
    populateProductDropdown();
  } else {
    existingGroup.style.display = "none";
    nameInput.readOnly = false;
    detailInput.readOnly = false;
    categorySelect.disabled = false;
    fileInput.disabled = false;
    
    // Clear fields
    nameInput.value = "";
    detailInput.value = "";
    document.getElementById("modal-product-price").value = "0";
    document.getElementById("modal-product-sale-price").value = "0";
    document.getElementById("modal-product-qty").value = "1";
    document.getElementById("modal-product-select").value = "";
    updateModalUnit();
    calculateLiveProfit();
  }
}

function populateProductDropdown() {
  const select = document.getElementById("modal-product-select");
  select.innerHTML = '<option value="">-- ກະລຸນາເລືອກສິນຄ້າ --</option>';
  
  existingProducts.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    const catLabel = p.category === "fish" ? "ປາ" : "ອາຫານ";
    option.textContent = `[${catLabel}] ${p.name} (${p.detail || "-"})`;
    select.appendChild(option);
  });
}

function selectExistingProduct() {
  const select = document.getElementById("modal-product-select");
  const productId = parseInt(select.value, 10);
  if (!productId) return;

  const product = existingProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("modal-product-name").value = product.name;
  document.getElementById("modal-product-detail").value = product.detail || "";
  document.getElementById("modal-category").value = product.category;
  document.getElementById("modal-product-price").value = product.cost || 0;
  document.getElementById("modal-product-sale-price").value = product.price || 0;
  
  updateModalUnit();
  calculateLiveProfit();
}

function handleAddItem() {
  const name = document.getElementById("modal-product-name").value.trim();
  const detail = document.getElementById("modal-product-detail").value.trim();
  const price = parseFloat(document.getElementById("modal-product-price").value) || 0;
  const salePrice = parseFloat(document.getElementById("modal-product-sale-price").value) || 0;
  const qty = parseInt(document.getElementById("modal-product-qty").value, 10) || 0;
  const category = document.getElementById("modal-category").value;
  let supplier = document.getElementById("modal-supplier").value.trim();
  if (!supplier) supplier = "ຊັບພາຍເອີ້ທົ່ວໄປ";
  const receiveDate = document.getElementById("modal-receive-date").value;

  if (!name) {
    alert("ກະລຸນາປ້ອນຊື່ສິນຄ້າ");
    return;
  }
  if (qty <= 0) {
    alert("ລະບຸຈໍານວນສິນຄ້າທີ່ຖືກຕ້ອງ");
    return;
  }
  if (salePrice <= 0) {
    alert("ກະລຸນາລະບຸລາຄາຂາຍຈໍາໜ່າຍ");
    return;
  }
  if (!receiveDate) {
    alert("ກະລຸນາລະບຸວັນທີ່ຮັບເຂົ້າ");
    return;
  }

  const fileInput = document.getElementById("modal-file-input");
  const source = document.getElementById("modal-product-source").value;

  /* For existing products — use image from DB immediately */
  if (source === "existing") {
    const select = document.getElementById("modal-product-select");
    const productId = parseInt(select.value, 10);
    const product = existingProducts.find((p) => p.id === productId);
    const image_url = product?.image_url || "";
    const imgHtml =
      product?.imgHtml ||
      (category === "fish"
        ? '<span class="thumb-fallback">ປາ</span>'
        : '<span class="thumb-fallback">ອາ</span>');

    receiveCart.push({
      id: Date.now(),
      name, detail, price, salePrice, qty, category,
      imgHtml, supplier, receiveDate, image_url,
    });
    renderCart();
    closeModal();
    return;
  }

  /* For new products — upload image first if provided */
  const defaultImgHtml =
    category === "fish"
      ? '<span class="thumb-fallback">ປາ</span>'
      : '<span class="thumb-fallback">ອາ</span>';

  const doAddItem = (image_url, imgHtml) => {
    receiveCart.push({
      id: Date.now(),
      name, detail, price, salePrice, qty, category,
      imgHtml, supplier, receiveDate, image_url,
    });
    renderCart();
    closeModal();
  };

  if (fileInput.files?.[0]) {
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);
    fetch("/api/upload.php", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "success") throw new Error(data.message || "ອັບໂຫຼດຮູບບໍ່ສຳເລັດ");
        const imgHtml = `<img src="${data.image_url}" class="item-thumb" alt="">`;
        doAddItem(data.image_url, imgHtml);
      })
      .catch((err) => {
        alert("ອັບໂຫຼດຮູບລົ້ມເຫລວ: " + err.message);
      });
  } else {
    doAddItem("", defaultImgHtml);
  }
}

function renderCart() {
  const tbody = document.getElementById("cart-table-body");
  if (receiveCart.length === 0) {
    tbody.innerHTML = `<tr id="cart-empty-row"><td colspan="4" style="text-align: center; color: var(--muted); padding: 40px 10px;">ຍັງບໍ່ມີລາຍການສິນຄ້າທີ່ຖືກເພີ່ມໃນບິນນີ້</td></tr>`;
    document.getElementById("badge-count").innerText = "0 ລາຍການ";
    document.getElementById("summary-types").innerText = "0 ຊະນິດ";
    document.getElementById("summary-pieces").innerText = "0 ອັນ";
    document.getElementById("summary-total").innerText = "₭0";
    return;
  }

  tbody.innerHTML = "";
  let totalPieces = 0;
  let grandTotal = 0;

  receiveCart.forEach((item) => {
    const itemTotalPrice = item.price * item.qty;
    totalPieces += item.qty;
    grandTotal += itemTotalPrice;
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
    tr.innerHTML = `
      <td style="padding: 10px 12px;">
        <div class="cell-flex cell-flex--sm">
          <div class="item-thumb-container item-thumb-container--sm">${item.imgHtml}</div>
          <div>
            <div class="fish-name" style="font-size:13px;">${AppUtils.escapeHtml(item.name)}</div>
            <div class="fish-species">${AppUtils.escapeHtml(item.detail || "-")} | ຂາຍ: ${AppUtils.formatKip(item.salePrice)}</div>
            <div class="fish-species" style="color:rgba(255,255,255,0.3);">${AppUtils.escapeHtml(item.supplier)} · ${AppUtils.escapeHtml(item.receiveDate)}</div>
          </div>
        </div>
      </td>
      <td style="padding: 10px 12px; text-align: center; font-family: var(--mono);">${item.qty}</td>
      <td style="padding: 10px 12px; text-align: right; font-family: var(--mono); color: var(--accent3);">${AppUtils.formatKip(itemTotalPrice)}</td>
      <td style="padding: 10px 4px; text-align: center;">
        <button type="button" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;" onclick="removeItem(${item.id})">×</button>
      </td>`;
    tbody.appendChild(tr);
  });

  document.getElementById("badge-count").innerText = `${receiveCart.length} ລາຍການ`;
  document.getElementById("summary-types").innerText = `${receiveCart.length} ຊະນິດ`;
  document.getElementById("summary-pieces").innerText = `${totalPieces} ອັນ`;
  document.getElementById("summary-total").innerText = AppUtils.formatKip(grandTotal);
}

function removeItem(id) {
  receiveCart = receiveCart.filter((item) => item.id !== id);
  renderCart();
}

function renderHistory() {
  const tbody = document.getElementById("history-table-body");
  if (receiveHistory.length === 0) {
    tbody.innerHTML = `<tr id="history-empty-row"><td colspan="4" style="text-align: center; color: var(--muted); padding: 30px;">ຍັງບໍ່ມີປະຫວັດການບັນທຶກຮັບສິນຄ້າ</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  receiveHistory.forEach((record) => {
    const itemsSummary = record.items.map((i) => `${i.name} (${i.qty})`).join(", ");
    const suppliers = [...new Set(record.items.map((i) => i.supplier))].join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="hist-date">${AppUtils.escapeHtml(record.date)}</td>
      <td class="hist-supplier"><span class="badge-supplier">${AppUtils.escapeHtml(suppliers)}</span><br><small class="hist-note">${AppUtils.escapeHtml(record.note)}</small></td>
      <td class="hist-items" title="${AppUtils.escapeHtml(itemsSummary)}">${AppUtils.escapeHtml(itemsSummary)}</td>
      <td class="hist-total">${AppUtils.formatKip(record.total)}</td>`;
    tbody.appendChild(tr);
  });
}

async function submitReceiveBill() {
  if (receiveCart.length === 0) {
    alert("ກະລຸນາເພີ່ມສິນຄ້າກ່ອນບັນທຶກ");
    return;
  }
  const billDate = receiveCart[0].receiveDate || AppUtils.localDateInputValue();
  const note = document.getElementById("receive-note").value.trim();

  try {
    await AquaAPI.post("/api/receives.php", {
      note,
      receive_date: billDate,
      items: receiveCart.map((item) => ({
        name: item.name,
        detail: item.detail,
        category: item.category,
        price: item.price,
        salePrice: item.salePrice,
        qty: item.qty,
        supplier: item.supplier,
        image_url: AppUtils.isBlobUrl(item.image_url) ? "" : item.image_url || "",
      })),
    });
    alert("🎉 ບັນທຶກການຮັບເຂົ້າ ແລະອັບເດດສະຕອັກສຳເລັດ!");
    receiveCart = [];
    document.getElementById("receive-note").value = "";
    renderCart();
    await loadReceiveHistory();
    await loadExistingProducts();
  } catch (e) {
    alert(e.message || "ບັນທຶກບໍ່ສຳເລັດ");
  }
}

function exportHistoryPDF() {
  if (receiveHistory.length === 0) {
    alert("ຍັງບໍ່ມີປະຫວັດການຮັບສິນຄ້າໃຫ້ Export");
    return;
  }
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  document.getElementById("print-date").innerText = `${d}/${m}/${now.getFullYear()}`;
  window.print();
}

function handleLogout() {
  if (confirm("ຕ້ອງການອອກຈາກລະບົບຫຼືບໍ່?")) logout();
}
