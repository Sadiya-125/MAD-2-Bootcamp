import { auth } from "../api.js";

const LINKS = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/tracks", label: "Tracks" },
    { to: "/admin/events", label: "Events" },
    { to: "/admin/judges", label: "Judges" },
    { to: "/admin/users", label: "Participants" },
    { to: "/admin/bookings", label: "Bookings" },
    { to: "/admin/search", label: "Search" },
  ],
  judge: [
    {
      to: "/judge",
      label: "Dashboard",
    },
  ],
  participant: [
    {
      to: "/dashboard",
      label: "Dashboard",
    },
    {
      to: "/events",
      label: "Browse Events",
    },
    {
      to: "/bookings",
      label: "My Bookings",
    },
  ],
};

export default {
  data() {
    return { auth };
  },
  computed: {
    links() {
      return this.auth.user ? LINKS[this.auth.user.role] : [];
    },
  },
  methods: {
    logout() {
      this.auth.logout();
      this.$router.push("/login");
    },
  },
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container">
        <router-link class="navbar-brand" to="/">DemoDay</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="nav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item" v-for="link in links" :key="link.to">
              <router-link class="nav-link" :to="link.to">{{ link.label }}</router-link>
            </li>
          </ul>
          <div v-if="auth.user" class="d-flex align-items-center gap-2">
            <router-link to="/profile" class="text-light text-decoration-none small">
              {{ auth.user.name }} <span class="badge bg-secondary">{{ auth.user.role }}</span>
            </router-link>
            <button class="btn btn-outline-light btn-sm" @click="logout">Logout</button>
          </div>
          <div v-else class="d-flex gap-2">
            <router-link to="/login" class="btn btn-outline-light btn-sm">Login</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm">Register</router-link>
          </div>
        </div>
      </div>
    </nav>
  `,
};
