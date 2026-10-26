const { reactive } = Vue;

export const auth = reactive({
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),

  login(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  setUser(user) {
    this.user = user;
    localStorage.setItem("user", JSON.stringify(user));
  },
});

const HOME = { admin: "/admin", judge: "/judge", participant: "/dashboard" };

export function homeFor(user) {
  return user ? HOME[user.role] : "/login";
}

export const toasts = reactive({ items: [] });

export function notify(text, type = "success") {
  const id = Date.now() + Math.random();
  toasts.items.push({ id, text, type });
  setTimeout(
    () => (toasts.items = toasts.items.filter((t) => t.id != id)),
    3500,
  );
}

export async function api(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if ((response.status === 401 || response.status === 422) && auth.token) {
    auth.logout();
    window.location.href = "/login";
  }

  if (!response.ok) {
    throw new Error(
      (data && (data.message || data.msg)) ||
        `Request Failed (${response.status})`,
    );
  }
  return data;
}

const BADGE = {
  Draft: "secondary",
  "Slot Creation": "secondary",
  "Booking Open": "success",
  Closed: "warning",
  Completed: "dark",
  Available: "success",
  Full: "warning",
  Cancelled: "danger",
  Booked: "primary",
  Archived: "secondary",
  Active: "success",
  Inactive: "secondary",
  Blacklisted: "danger",
};

export function badge(status) {
  return "badge bg-" + (BADGE[status] || "secondary");
}
