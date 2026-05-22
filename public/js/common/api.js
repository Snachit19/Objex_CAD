const API = {
  baseUrl: "",

  async request(url, options = {}) {
    const response = await fetch(this.baseUrl + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }
};

window.API = API;