export const usersApi = {
  async search(q: string) {
    // простой вызов к backend /api/users?q=...
    const resp = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { credentials: "include" });
    if (!resp.ok) throw new Error("usersApi.search failed: " + resp.status);
    return resp.json();
  }
};
