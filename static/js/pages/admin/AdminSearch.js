import { api, notify, badge } from "../../api.js";

export default {
  data() {
    return { q: "", results: null };
  },
  methods: {
    badge,
    async search() {
      try {
        this.results = await api(
          `/api/admin/search?q=${encodeURIComponent(this.q)}`,
        );
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <h3 class="mb-3">Search Everything</h3>
    <form class="d-flex gap-2 mb-3" @submit.prevent="search">
      <input v-model.trim="q" class="form-control" placeholder="Name, email, event, venue or project title" minlength="2" required>
      <button class="btn btn-primary">Search</button>
    </form>
    <div class="row g-3" v-if="results">
      <div class="col-md-6">
        <div class="card p-3 h-100">
          <h6>Participants ({{ results.participants.length }})</h6>
          <div v-for="u in results.participants" :key="u.id" class="small border-bottom py-1">
            {{ u.name }} · {{ u.email }} <span :class="badge(u.status)">{{ u.status }}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card p-3 h-100">
          <h6>Judges ({{ results.judges.length }})</h6>
          <div v-for="u in results.judges" :key="u.id" class="small border-bottom py-1">
            {{ u.name }} · {{ u.expertise }} <span :class="badge(u.status)">{{ u.status }}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card p-3 h-100">
          <h6>Events ({{ results.events.length }})</h6>
          <div v-for="e in results.events" :key="e.id" class="small border-bottom py-1">
            <router-link :to="'/admin/events/' + e.id">{{ e.name }}</router-link>
            <span :class="badge(e.status)" class="ms-1">{{ e.status }}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card p-3 h-100">
          <h6>Bookings ({{ results.bookings.length }})</h6>
          <div v-for="b in results.bookings" :key="b.id" class="small border-bottom py-1">
            {{ b.participant_name }} - {{ b.project_title }} ({{ b.event_name }})
            <span :class="badge(b.status)">{{ b.status }}</span></div>
        </div>
      </div>
    </div>
  `,
};
