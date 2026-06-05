/**
 * WillowShop API client — PHP + MySQL backend
 */
(function (global) {
  const API_BASE =
    global.localStorage.getItem("aq_api_base") ||
    (global.location.protocol === "file:"
      ? "http://localhost:8080"
      : global.location.origin);

  async function api(path, options) {
    const opts = options || {};
    const url = API_BASE + path;
    const headers = Object.assign(
      { Accept: "application/json" },
      opts.headers || {}
    );
    const role = global.localStorage.getItem("aq_role");
    const username = global.localStorage.getItem("aq_username");
    if (role) headers["X-User-Role"] = role;
    if (username) headers["X-User-Name"] = username;
    if (opts.body && !(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    const data = await res.json().catch(() => ({}));

    if (data.status === "error") {
      throw new Error(data.message || "Request failed");
    }
    if (!res.ok) {
      throw new Error(data.message || `API error ${res.status}`);
    }
    return data;
  }

  global.AquaAPI = {
    base: API_BASE,
    get: (path) => api(path, { method: "GET" }),
    post: (path, body) => api(path, { method: "POST", body }),
    put: (path, body) => api(path, { method: "PUT", body }),
    delete: (path) => api(path, { method: "DELETE" }),
  };
})(window);
