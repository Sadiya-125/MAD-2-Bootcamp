import { api, badge } from "../../api.js";

export default {
  data() {
    return {
      events: [],
      tracks: [],
      filters: { q: "", track_id: "", level: "", mode: "" },
    };
  },
  async mounted() {
    this.tracks = await api("/api/tracks");
    this.search();
  },
  methods: {
    badge,
    async search() {
      const params = new URLSearchParams(this.filters).toString();
      this.events = await api(`/api/events?${params}`);
    },
  },
  template: `
    <h3 class="mb-3">Browse Events</h3>
    <form class="card p-3 mb-3" @submit.prevent="search"><div class="row g-2">
      <div class="col-md-4"><input v-model.trim="filters.q" class="form-control" placeholder="Search by Name or Venue"></div>
      <div class="col-md-3">
        <select v-model="filters.track_id" class="form-select">
          <option value="">All Tracks</option>
          <option v-for="t in tracks" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div class="col-md-2">
        <select v-model="filters.level" class="form-select">
          <option value="">Any Level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
      </div>
      <div class="col-md-2">
        <select v-model="filters.mode" class="form-select">
          <option value="">Any Mode</option><option>Online</option><option>Offline</option>
        </select>
      </div>
      <div class="col-md-1"><button class="btn btn-primary w-100">Go</button></div>
    </div></form>

    <div class="row g-3">
      <div class="col-md-6 col-lg-4" v-for="e in events" :key="e.id">
        <div class="card p-3 h-100">
          <div class="d-flex justify-content-between">
            <span class="small text-muted">{{ e.track_name }}</span>
            <span :class="badge(e.status)">{{ e.status }}</span>
          </div>
          <h5 class="mt-2">{{ e.name }}</h5>
          <p class="small text-muted mb-2">{{ e.mode }}{{ e.venue ? ' @ ' + e.venue : '' }} · {{ e.level }} · {{ e.duration_min }} min</p>
          <p class="small mb-3">Booking: {{ e.booking_open_date }} → {{ e.booking_close_date }}</p>
          <router-link :to="'/events/' + e.id" class="btn btn-sm mt-auto"
                       :class="e.booking_open ? 'btn-success' : 'btn-outline-secondary'">
            {{ e.booking_open ? "View Slots & Book" : "View Details" }}</router-link>
        </div>
      </div>
      <p v-if="!events.length" class="text-muted">No Events Match Your Search.</p>
    </div>
  `,
};
