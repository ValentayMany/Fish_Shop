let cart = {};
let payMethod = "cash";
let salesHistory = [];
let stock = {};
let currentTab = "fish";
let products = [];
let lastBillNumber = "";

async function initPos() {
  try {
    const data = await AquaAPI.get("/api/products.php");
    products = data.products || [];
    renderProductGrid();
    const hist = await AquaAPI.get("/api/sales.php");
    salesHistory = (hist.sales || []).map((h) => ({
      items: h.items,
      time: h.time,
      total: h.total,
      method: h.method,
    }));
    renderHistory();
  } catch (e) {
    console.error(e);
    document.getElementById("item-list").innerHTML =
      '<div style="grid-column:1/-1;text-align:center;color:var(--danger);padding:40px;">ໂຫຼດສິນຄ້າບໍ່ສຳເລັດ</div>';
  }
}

function renderProductGrid() {
  const list = document.getElementById("item-list");
  if (!products.length) {
    list.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px;">ບໍ່ມີສິນຄ້າໃນສະຕອັກ</div>';
    return;
  }
  list.innerHTML = products
    .map((p) => {
      const type = p.category;
      const unit = type === "fish" ? "ໂຕ" : "ຊອງ";
      const name = AppUtils.escapeHtml(p.name);
      const detail = AppUtils.escapeHtml(p.detail || "");
      const img = p.image_url
        ? `<img src="${AppUtils.escapeHtml(p.image_url)}" alt="${name}">`
        : `<div class="item-img-placeholder">${type === "fish" ? "ປາ" : "ອາ"}</div>`;
      const low = p.qty <= 3 && p.qty > 0 ? " item-stock-low" : "";
      const hidden = type === "food" ? " hidden" : "";
      return `<div class="item-row${hidden}" data-type="${type}" onclick="addToCart(this)"
        data-id="${p.id}" data-price="${p.price}" data-stock="${p.qty}">
        <div class="item-img-box">${img}</div>
        <div class="item-details">
          <div class="item-name">${name}</div>
          <div class="item-sub">${detail}</div>
          <div class="item-meta">
            <div class="item-price">${AppUtils.formatKip(p.price)}</div>
            <div class="item-stock-info${low}">ເຫຼືອ ${p.qty} ${unit}</div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  stock = {};
  document.querySelectorAll(".item-row[data-id]").forEach((row) => {
    stock[row.dataset.id + "-" + row.dataset.type] = parseInt(row.dataset.stock, 10);
  });
  filterItems();
}

function renderStockUI() {
  document.querySelectorAll(".item-row[data-id]").forEach((row) => {
    const key = row.dataset.id + "-" + row.dataset.type;
    const currentStock = stock[key] ?? 0;
    const infoEl = row.querySelector(".item-stock-info");
    const unit = row.dataset.type === "fish" ? "ໂຕ" : "ຊອງ";
    if (infoEl) {
      infoEl.textContent = `ເຫຼືອ ${currentStock} ${unit}`;
      infoEl.className =
        currentStock <= 3 && currentStock > 0
          ? "item-stock-info item-stock-low"
          : "item-stock-info";
    }
    if (currentStock <= 0) {
      row.classList.add("out-of-stock");
      if (infoEl) infoEl.textContent = "ສິນຄ້າໝົດ";
    } else {
      row.classList.remove("out-of-stock");
    }
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById("tab-fish").classList.toggle("active", tab === "fish");
  document.getElementById("tab-food").classList.toggle("active", tab === "food");
  filterItems();
}

function addToCart(row) {
  if (row.classList.contains("out-of-stock")) return;
  const key = row.dataset.id + "-" + row.dataset.type;
  const maxStock = stock[key];
  const cur = cart[key] ? cart[key].qty : 0;
  if (cur >= maxStock) {
    showToast("ສິນຄ້າໃນສະຕອັກບໍ່ພໍຂາຍແລ້ວ");
    return;
  }
  if (!cart[key]) {
    const nameEl = row.querySelector(".item-name");
    cart[key] = {
      id: row.dataset.id,
      name: nameEl ? nameEl.textContent.trim() : row.dataset.name,
      type: row.dataset.type,
      price: parseFloat(row.dataset.price, 10),
      qty: 0,
    };
  }
  cart[key].qty++;
  renderCart();
}

function changeQty(key, delta) {
  if (!cart[key]) return;
  const maxStock = stock[key];
  cart[key].qty += delta;
  if (cart[key].qty > maxStock) {
    cart[key].qty = maxStock;
    showToast("ສິນຄ້າໃນສະຕອົກບໍ່ພົຂາຍແລ້ວ");
  }
  if (cart[key].qty <= 0) delete cart[key];
  renderCart();
}

function clearCart() {
  cart = {};
  document.getElementById("discount-input").value = "0";
  document.getElementById("cash-input").value = "";
  document.getElementById("cash-change").value = "";
  document.getElementById("cash-change").className = "cash-change";
  renderCart();
}

function renderCart() {
  const keys = Object.keys(cart);
  const countEl = document.getElementById("cart-count");
  const itemsEl = document.getElementById("cart-items");
  const netEl = document.getElementById("net-amount");
  const checkoutBtn = document.getElementById("checkout-btn");
  countEl.textContent = keys.length + " ລາຍການ";

  if (keys.length === 0) {
    itemsEl.innerHTML =
      '<div class="cart-empty">ຍັງບໍ່ມີສິນຄ້າ<br>ກົດເລືອກຈາກດ້ານຊ້າຍ</div>';
    netEl.textContent = "₭0";
    checkoutBtn.disabled = true;
    document.getElementById("cash-input").value = "";
    document.getElementById("cash-change").value = "";
    return;
  }

  let total = 0;
  let html = "";
  keys.forEach((key) => {
    const i = cart[key];
    const sub = i.price * i.qty;
    total += sub;
    const tag =
      i.type === "fish"
        ? '<span class="cart-item-type type-fish">ປາ</span>'
        : '<span class="cart-item-type type-food">ອາຫານປາ</span>';
    const safeKey = AppUtils.escapeHtml(key);
    const safeName = AppUtils.escapeHtml(i.name);
    html += `<div class="cart-item">
      <div class="cart-item-name">${safeName} ${tag}</div>
      <div class="qty-ctrl">
        <button type="button" class="qty-btn" onclick="changeQty('${safeKey}',-1)">−</button>
        <span class="qty-num">${i.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty('${safeKey}',1)">+</button>
      </div>
      <div class="cart-item-sub">${AppUtils.formatKip(sub)}</div>
    </div>`;
  });
  itemsEl.innerHTML = html;

  // Calculate discount
  const discountVal = parseFloat(document.getElementById("discount-input").value) || 0;
  const discountType = document.getElementById("discount-type").value;
  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = (total * discountVal) / 100;
  } else {
    discountAmount = discountVal;
  }
  discountAmount = Math.max(0, Math.min(total, discountAmount));
  const netTotal = Math.max(0, total - discountAmount);

  netEl.textContent = AppUtils.formatKip(netTotal);
  checkoutBtn.disabled = false;
  calcChange();
}

function getSubtotal() {
  return Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);
}

function getDiscountAmount() {
  const total = getSubtotal();
  const discountVal = parseFloat(document.getElementById("discount-input").value) || 0;
  const discountType = document.getElementById("discount-type").value;
  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = (total * discountVal) / 100;
  } else {
    discountAmount = discountVal;
  }
  return Math.max(0, Math.min(total, discountAmount));
}

function getTotal() {
  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  return Math.max(0, subtotal - discount);
}

function selectPayMethod(method) {
  payMethod = method;
  document.getElementById("pay-cash").classList.toggle("selected", method === "cash");
  document.getElementById("pay-transfer").classList.toggle("selected", method === "transfer");
  document.getElementById("cash-section").style.display = method === "cash" ? "grid" : "none";
  calcChange();
}

function calcChange() {
  if (payMethod !== "cash") return;
  const received = parseFloat(document.getElementById("cash-input").value) || 0;
  const total = getTotal();
  const change = received - total;
  const changeEl = document.getElementById("cash-change");
  if (received === 0) {
    changeEl.value = "";
    changeEl.className = "cash-change";
    return;
  }
  changeEl.value = change >= 0 ? change.toLocaleString() : "ບໍ່ພໍ";
  changeEl.className = "cash-change " + (change >= 0 ? "change-pos" : "change-neg");
}

async function checkout() {
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();
  if (subtotal === 0) return;

  let received = total;
  if (payMethod === "cash") {
    received = parseFloat(document.getElementById("cash-input").value) || 0;
    if (received < total) {
      showToast("ຮັບເງິນມາບໍ່ພໍ");
      return;
    }
  }

  const receiptLines = Object.values(cart).map((i) => ({
    id: i.id,
    name: i.name,
    qty: i.qty,
    price: i.price,
  }));

  const payload = {
    payment_method: payMethod,
    received_amount: received,
    discount_amount: discountAmount,
    items: receiptLines.map((i) => ({
      product_id: parseInt(i.id, 10),
      qty: i.qty,
    })),
  };

  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = true;

  try {
    const res = await AquaAPI.post("/api/sales.php", payload);
    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
    lastBillNumber = res.bill_number;

    const itemsSummary = receiptLines.map((i) => i.name + " ×" + i.qty).join(", ");
    salesHistory.unshift({
      items: itemsSummary,
      time: timeStr,
      total: res.total,
      method: payMethod,
    });

    generateReceipt(
      dateStr,
      timeStr,
      subtotal,
      discountAmount,
      res.total,
      res.received,
      res.change,
      res.bill_number,
      receiptLines
    );

    const data = await AquaAPI.get("/api/products.php");
    products = data.products || [];
    renderProductGrid();
    showToast("ຊໍາລະເງິນສໍາເລັດ");
    clearCart();
    renderHistory();
  } catch (e) {
    showToast(e.message || "ຊໍາລະບໍ່ສຳເລັດ");
    checkoutBtn.disabled = false;
  }
}

function generateReceipt(date, time, subtotal, discount, total, received, changeAmt, billIdParam, lines) {
  const viewArea = document.getElementById("view-receipt-area");
  const printArea = document.getElementById("print-receipt-area");
  const change = changeAmt !== undefined ? changeAmt : received - total;
  const billId =
    billIdParam ||
    lastBillNumber ||
    "INV-" + Math.floor(Math.random() * 90000 + 10000);
  const cartLines = lines || Object.values(cart);

  let itemsHtml = "";
  cartLines.forEach((i) => {
    const name = AppUtils.escapeHtml(i.name);
    itemsHtml += `<div class="receipt-item-row"><span>${name} x${i.qty}</span><span>${AppUtils.formatKip(i.price * i.qty)}</span></div>`;
  });

  const discountHtml = discount > 0
    ? `<div class="receipt-row" style="color:#ef4444"><span>ສ່ວນຫຼຸດ:</span><span>-${AppUtils.formatKip(discount)}</span></div>`
    : "";

  const receiptContent = `
    <div class="receipt-header">
      <div class="receipt-shop-name">WillowShop</div>
      <div>ລະບົບຈັດການຮ້ານປາຄົບວົງຈອນ</div>
    </div>
    <div class="receipt-line"></div>
    <div class="receipt-row"><span>ເລກທີ່ບິນ:</span> <span>${AppUtils.escapeHtml(billId)}</span></div>
    <div class="receipt-row"><span>ວັນທີ່:</span> <span>${AppUtils.escapeHtml(date)}</span></div>
    <div class="receipt-row"><span>ເວລາ:</span> <span>${AppUtils.escapeHtml(time)} ນ.</span></div>
    <div class="receipt-line"></div>
    <div class="receipt-items-list">${itemsHtml}</div>
    <div class="receipt-line"></div>
    <div class="receipt-row"><span>ຍອດລວມ:</span><span>${AppUtils.formatKip(subtotal)}</span></div>
    ${discountHtml}
    <div class="receipt-row receipt-total-row"><span>ຍອດສຸດທິ:</span><span>${AppUtils.formatKip(total)}</span></div>
    <div class="receipt-line"></div>
    <div class="receipt-row"><span>ຊໍາລະດ້ວຍ:</span><span>${payMethod === "cash" ? "ເງິນສົດ" : "ໂອນເງິນ"}</span></div>
    <div class="receipt-row"><span>ຮັບເງິນມາ:</span><span>${AppUtils.formatKip(received)}</span></div>
    <div class="receipt-row"><span>...ເງິນທອນ:</span><span>${AppUtils.formatKip(change >= 0 ? change : 0)}</span></div>
    <div class="receipt-line"></div>
    <div class="receipt-header" style="margin-top:10px;font-size:11px;">ຂອບໃຈທີ່ໃຊ້ບໍລິການ / Thank You</div>`;
  viewArea.innerHTML = receiptContent;
  printArea.innerHTML = receiptContent;
  document.getElementById("receiptModal").classList.add("active");
}

function printReceipt() {
  window.print();
}
function closeReceiptModal() {
  document.getElementById("receiptModal").classList.remove("active");
}

function renderHistory() {
  const el = document.getElementById("history-list");
  document.getElementById("history-count").textContent = salesHistory.length + " ບິນ";
  if (salesHistory.length === 0) {
    el.innerHTML = '<div class="history-empty">ຍັງບໍ່ມີການຂາຍມື້ນີ້</div>';
    return;
  }
  el.innerHTML = salesHistory
    .map(
      (h) => `
    <div class="history-item">
      <div class="history-name">${AppUtils.escapeHtml(h.items)}</div>
      <div class="history-time">${AppUtils.escapeHtml(h.time)}</div>
      <div class="history-amount">${AppUtils.formatKip(h.total)}</div>
    </div>`
    )
    .join("");
}

function filterItems() {
  const q = document.getElementById("searchBox").value.toLowerCase();
  document.querySelectorAll(".item-row[data-id]").forEach((row) => {
    const name = row.querySelector(".item-name").textContent.toLowerCase();
    const matchesSearch = !q || name.includes(q);
    const matchesTab = row.dataset.type === currentTab;
    row.classList.toggle("hidden", !(matchesTab && matchesSearch));
  });
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function handleLogout() {
  if (confirm("ຕ້ອງການອອກຈາກລະບົບຫຼືບໍ່?")) logout();
}

window.addEventListener("DOMContentLoaded", initPos);
