function handleLogout() {
  logout();
}

async function loadDashboard() {
  try {
    const data = await AquaAPI.get("/api/dashboard.php");
    const payload = data.data || {};
    renderTodayStats(payload.today || {});
    renderWeeklyChart(payload.weekly_chart || []);
    renderTopProducts(payload.top_products || []);
    renderLowStock(payload.low_stock || [], payload.low_stock_count || 0);
  } catch (e) {
    console.error(e);
    alert(e.message || "ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ");
  }
}

function renderTodayStats(today) {
  document.getElementById("stat-today-sales").textContent = AppUtils.formatKip(
    today.sales_total || 0
  );
  document.getElementById("stat-today-bills").innerHTML =
    (today.bill_count || 0) + '<span class="stat-unit">ບິນ</span>';
}

function renderWeeklyChart(chart) {
  const container = document.getElementById("weekly-chart");
  container.innerHTML = "";

  if (!chart.length) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--muted);font-size:12px;padding:40px 0;width:100%;">ຍັງບໍ່ມີຂໍ້ມູນ</div>';
    return;
  }

  const maxSales = chart.reduce(function (max, day) {
    return day.sales > max ? day.sales : max;
  }, 0);
  const scale = maxSales > 0 ? maxSales : 1;

  chart.forEach(function (day) {
    const heightPct = Math.max(5, Math.min(100, (day.sales / scale) * 100));
    const barGroup = document.createElement("div");
    barGroup.className = "bar-group";
    barGroup.innerHTML =
      '<div class="bar" style="height:' +
      heightPct +
      '%;background:linear-gradient(to top, #2563eb, #06b6d4);" title="' +
      AppUtils.escapeHtml(day.label) +
      ": " +
      AppUtils.formatKip(day.sales) +
      '"></div>' +
      '<div class="bar-label">' +
      AppUtils.escapeHtml(day.label) +
      "</div>";
    container.appendChild(barGroup);
  });
}

function renderTopProducts(products) {
  const container = document.getElementById("top-products-list");
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px 0;">ຍັງບໍ່ມີຂໍ້ມູນການຂາຍ 7 ວັນລ່າສຸດ</div>';
    return;
  }

  products.forEach(function (p) {
    const item = document.createElement("div");
    item.className = "top-item";
    item.innerHTML =
      '<span class="top-rank">' +
      p.rank +
      "</span>" +
      '<span class="top-name">' +
      AppUtils.escapeHtml(p.name) +
      "</span>" +
      '<div class="top-bar-wrap"><div class="top-bar-fill" style="width:' +
      p.width_pct +
      '%"></div></div>' +
      '<span class="top-qty">' +
      p.qty +
      " ໂຕ</span>";
    container.appendChild(item);
  });
}

function renderLowStock(items, count) {
  document.getElementById("stat-low-stock").innerHTML =
    count + '<span class="stat-unit">ລາຍການ</span>';

  const container = document.getElementById("low-stock-list");
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML =
      '<div class="low-stock-empty">✅ ສະຕອັກທຸກລາຍການພໍເພຍ!</div>';
    return;
  }

  items.forEach(function (item) {
    const catLabel = item.category === "fish" ? "ປາ" : "ອາຫານ";
    const el = document.createElement("div");
    el.className = "low-stock-item";
    el.innerHTML =
      "<div>" +
      '<div class="low-stock-name">' +
      AppUtils.escapeHtml(item.name) +
      "</div>" +
      '<div class="low-stock-cat">' +
      catLabel +
      "</div>" +
      "</div>" +
      '<div class="low-stock-qty">' +
      item.qty +
      "</div>";
    container.appendChild(el);
  });
}

document.addEventListener("DOMContentLoaded", loadDashboard);
