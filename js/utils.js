/**
 * Shared frontend helpers
 */
(function (global) {
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatKip(amount) {
    return "₭" + Number(amount || 0).toLocaleString();
  }

  /** YYYY-MM-DD in local timezone (avoids UTC off-by-one) */
  function localDateInputValue(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isBlobUrl(url) {
    return typeof url === "string" && url.startsWith("blob:");
  }

  global.AppUtils = {
    escapeHtml,
    formatKip,
    localDateInputValue,
    isBlobUrl,
  };
})(window);
