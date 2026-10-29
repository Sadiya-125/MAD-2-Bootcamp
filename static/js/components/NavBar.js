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
    return { auth, open: false };
  },
  watch: {
    $route() {
      this.open = false;
    },
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
    <nav class="navbar">
      <div class="container app-nav-inner">
        <router-link class="navbar-brand" to="/">DemoDay</router-link>
        <button class="nav-toggle" type="button" aria-label="Toggle navigation"
                :aria-expanded="String(open)" aria-controls="nav" @click="open = !open"></button>
        <div class="nav-panel" :class="{ open }" id="nav">
          <ul class="navbar-nav">
            <li class="nav-item" v-for="link in links" :key="link.to">
              <router-link class="nav-link" :to="link.to">{{ link.label }}</router-link>
            </li>
          </ul>
          <div v-if="auth.user" class="user-box">
            <router-link to="/profile" class="text-light text-decoration-none small">
              {{ auth.user.name }} <span class="badge bg-secondary">{{ auth.user.role }}</span>
            </router-link>
            <button class="btn btn-outline-light btn-sm" @click="logout">Logout</button>
          </div>
          <div v-else class="user-box">
            <router-link to="/login" class="btn btn-outline-light btn-sm">Login</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm">Register</router-link>
          </div>
        </div>
      </div>
    </nav>
  `,
};
