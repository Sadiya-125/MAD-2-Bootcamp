import { api } from "../../api.js";

export default {
  data() {
    return { stats: {} };
  },
  async mounted() {
    this.stats = await api("/api/admin/stats");
  },
  computed: {
    cards() {
      const s = this.stats;
      return [
        { label: "Tracks", value: s.tracks, to: "/admin/tracks" },
        { label: "Events", value: s.events, to: "/admin/events" },
        { label: "Participants", value: s.participants, to: "/admin/users" },
        { label: "Judges", value: s.judges, to: "/admin/judges" },
        { label: "Slots", value: s.slots, to: "/admin/events" },
        { label: "Bookings", value: s.bookings, to: "/admin/events" },
        { label: "Evaluations", value: s.evaluations, to: "/admin/events" },
      ];
    },
  },
  template: `
    <h3 class="mb-3">Admin Dashboard</h3>
    <div class="row g-3">
      <div class="col-6 col-md-3" v-for="c in cards" :key="c.label">
        <router-link :to="c.to" class="text-decoration-none text-dark">
          <div class="card stat-card p-3">
            <div class="label">{{ c.label }}</div>
            <div class="value">{{ c.value ?? "-" }}</div>
          </div>
        </router-link>
      </div>
    </div>
  `,
};
