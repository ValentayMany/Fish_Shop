let currentRange = "today";
let lastReportData = null;

window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const priorDate = new Date();
  priorDate.setDate(today.getDate() - 30);

  document.getElementById("filter-start-date").value =
    AppUtils.localDateInputValue(priorDate);
  document.getElementById("filter-end-date").value =
    AppUtils.localDateInputValue(today);

  document
    .getElementById("filter-start-date")
    .addEventListener("change", handleCustomDateChange);
  document
    .getElementById("filter-end-date")
    .addEventListener("change", handleCustomDateChange);

  fetchReportData();
});

function handleCustomDateChange() {
  currentRange = "custom";
  document.querySelectorAll(".tab-bar .tab").forEach((t) => t.classList.remove("active"));
  fetchReportData();
}

function switchTab(el, rangeType) {
  document.querySelectorAll(".tab-bar .tab").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  currentRange = rangeType;
  fetchReportData();
}

async function fetchReportData() {
  let url = `/api/reports.php?range=${encodeURIComponent(currentRange)}`;
  if (currentRange === "custom") {
    const start = document.getElementById("filter-start-date").value;
    const end = document.getElementById("filter-end-date").value;
    url += `&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
  }

  try {
    const data = await AquaAPI.get(url);
    const payload = data.data || {};
    lastReportData = payload;
    renderStats(payload.stats || {});
    renderChart(payload.chart || []);
    renderTopProducts(payload.top_products || [], "top-fish-list", "qty");
    renderTopProducts(payload.worst_products || [], "worst-fish-list", "qty");
    renderLowStock(payload.low_stock || []);
    renderSupplierReport(payload.supplier_report || []);
    renderHistoryTable(
      payload.history_table || [],
      payload.history_summary || { sales: 0, cost: 0, profit: 0 }
    );
  } catch (err) {
    console.error(err);
    alert(err.message || "ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ກັບເຊີບເວີ");
  }
}

function renderStats(stats) {
  document.getElementById("stat-sales-total").innerText = AppUtils.formatKip(stats.sales_total);
  document.getElementById("stat-profit-total").innerText = AppUtils.formatKip(stats.profit_total);

  const margin =
    stats.sales_total > 0
      ? ((stats.profit_total / stats.sales_total) * 100).toFixed(1)
      : "0.0";
  document.getElementById("stat-profit-margin").innerText = `ມາຈິ້ນ ${margin}%`;

  document.getElementById("stat-items-sold").innerHTML =
    `${stats.items_sold}<span class="stat-unit">ໂຕ</span>`;
  document.getElementById("stat-items-sold-badge").innerText =
    ` ${stats.transactions} ຄັ້ງ`;

  document.getElementById("stat-monthly-sales").innerText = AppUtils.formatKip(stats.monthly_sales);
  document.getElementById("stat-best-seller-name").innerText =
    stats.best_seller_name || "—";
  document.getElementById("stat-best-seller-qty").innerText =
    `${stats.best_seller_qty} ໂຕ / ເດືອນ`;
}

function renderChart(chart) {
  const container = document.getElementById("chart-bars");
  container.innerHTML = "";

  if (!chart.length) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--muted);font-size:12px;padding:40px 0;width:100%;">ຍັງບໍ່ມີຂໍ້ມູນ</div>';
    return;
  }

  const maxSales = chart.reduce((max, day) => (day.sales > max ? day.sales : max), 0);
  const scale = maxSales > 0 ? maxSales : 1;

  chart.forEach((day) => {
    const heightPct = Math.max(5, Math.min(100, (day.sales / scale) * 100));
    const barGroup = document.createElement("div");
    barGroup.className = "bar-group";
    barGroup.innerHTML = `
      <div class="bar" style="height:${heightPct}%;background:linear-gradient(to top, #2563eb, #06b6d4);" title="${AppUtils.escapeHtml(day.label)}: ${AppUtils.formatKip(day.sales)}"></div>
      <div class="bar-label">${AppUtils.escapeHtml(day.label)}</div>
    `;
    container.appendChild(barGroup);
  });
}

function renderTopProducts(products, containerId, mode) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px 0;">ຍັງບໍ່ມີຂໍ້ມູນການຂາຍ</div>';
    return;
  }

  const barColor = mode === "qty" ? "var(--warn)" : "var(--primary)";
  const valueSuffix = mode === "qty" ? " ໂຕ" : "";

  products.forEach((p) => {
    const item = document.createElement("div");
    item.className = "top-item";
    const val =
      mode === "qty"
        ? p.qty + valueSuffix
        : AppUtils.formatKip(p.profit);
    item.innerHTML = `
      <span class="top-rank">${p.rank}</span>
      <span class="top-name">${AppUtils.escapeHtml(p.name)}</span>
      <div class="top-bar-wrap">
        <div class="top-bar-fill" style="width:${p.width_pct}%;background:${barColor}"></div>
      </div>
      <span class="top-val" style="color:${barColor}">${val}</span>
    `;
    container.appendChild(item);
  });
}

function renderLowStock(items) {
  const tbody = document.getElementById("low-stock-body");
  const badge = document.getElementById("low-stock-badge");
  badge.textContent = items.length + " ລາຍການ";
  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--green);padding:20px 0;">✅ ສະຕອັກພໍເພຍທຸກລາຍການ</td></tr>';
    return;
  }

  items.forEach((row) => {
    const tr = document.createElement("tr");
    const cat = row.category === "fish" ? "ປາ" : "ອາຫານ";
    tr.innerHTML = `
      <td>${AppUtils.escapeHtml(row.name)}</td>
      <td>${cat}</td>
      <td style="color:var(--danger);font-family:var(--mono);font-weight:600">${row.qty}</td>
      <td>${AppUtils.formatKip(row.cost)}</td>
      <td>${AppUtils.formatKip(row.price)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSupplierReport(rows) {
  const tbody = document.getElementById("supplier-report-body");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px 0;">ບໍ່ມີຂໍ້ມູນການຮັບສິນຄ້າໃນຊ່ວງນີ້</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${AppUtils.escapeHtml(row.supplier)}</td>
      <td>${row.order_count} ບິນ</td>
      <td>${row.total_qty} ອັນ</td>
      <td>${AppUtils.formatKip(row.total_cost)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportExcel() {
  if (!lastReportData) {
    alert("ຍັງບໍ່ມີຂໍ້ມູນ — ກະລຸນາລໍຖ້າໂຫຼດກ່ອນ");
    return;
  }

  const range = lastReportData.date_range || {};
  const stats = lastReportData.stats || {};
  const summary = lastReportData.history_summary || {};
  const lines = [];

  lines.push("WillowShop Report");
  lines.push("Period," + (range.start || "") + " to " + (range.end || ""));
  lines.push("");
  lines.push("Summary");
  lines.push("Sales Total," + (stats.sales_total || 0));
  lines.push("Profit Total," + (stats.profit_total || 0));
  lines.push("Items Sold," + (stats.items_sold || 0));
  lines.push("Transactions," + (stats.transactions || 0));
  lines.push("");

  lines.push("Sales History");
  lines.push("Items,Time,Qty,Sales,Cost,Profit");
  (lastReportData.history_table || []).forEach((row) => {
    lines.push(
      [
        csvCell(row.items),
        csvCell(row.time),
        row.qty,
        row.sales,
        row.cost,
        row.profit,
      ].join(",")
    );
  });
  lines.push("Total,,," + summary.sales + "," + summary.cost + "," + summary.profit);
  lines.push("");

  lines.push("Low Stock");
  lines.push("Name,Category,Qty,Cost,Price");
  (lastReportData.low_stock || []).forEach((row) => {
    lines.push(
      [csvCell(row.name), row.category, row.qty, row.cost, row.price].join(",")
    );
  });
  lines.push("");

  lines.push("Supplier Report");
  lines.push("Supplier,Orders,Qty,Total Cost");
  (lastReportData.supplier_report || []).forEach((row) => {
    lines.push(
      [
        csvCell(row.supplier),
        row.order_count,
        row.total_qty,
        row.total_cost,
      ].join(",")
    );
  });

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download =
    "willowshop-report-" + (range.start || "data") + ".csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  const s = String(value == null ? "" : value).replace(/"/g, '""');
  return '"' + s + '"';
}

function renderHistoryTable(history, summary) {
  const tbody = document.querySelector("table tbody");
  const tfoot = document.querySelector("table tfoot");
  const countEl = document.getElementById("history-count-badge");

  countEl.innerText = `${history.length} ລາຍການ`;
  tbody.innerHTML = "";

  if (!history.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px 0;">ຍັງບໍ່ມີປະຫວັດການຂາຍໃນຊ່ວງເວລານີ້</td></tr>';
    tfoot.innerHTML = "";
    return;
  }

  history.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="sale-name">${AppUtils.escapeHtml(row.items)}</div></td>
      <td><div class="sale-time">${AppUtils.escapeHtml(row.time)}</div></td>
      <td>${row.qty} ອັນ</td>
      <td class="sale-amount">${AppUtils.formatKip(row.sales)}</td>
      <td>${AppUtils.formatKip(row.cost)}</td>
      <td class="profit-amount">${AppUtils.formatKip(row.profit)}</td>
    `;
    tbody.appendChild(tr);
  });

  tfoot.innerHTML = `
    <tr style="font-weight:bold;background:var(--surface2);">
      <td colspan="3" style="text-align:right;">ລວມທັງໝົດ:</td>
      <td class="sale-amount">${AppUtils.formatKip(summary.sales)}</td>
      <td>${AppUtils.formatKip(summary.cost)}</td>
      <td class="profit-amount" style="color:var(--accent3);">${AppUtils.formatKip(summary.profit)}</td>
    </tr>
  `;
}

function printReport() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  document.getElementById("printDate").innerText = `${d}/${m}/${now.getFullYear()}`;
  window.print();
}

function handleLogout() {
  if (confirm("ຕ້ອງການອອກຈາກລະບົບຫຼືບໍ່?")) logout();
}
