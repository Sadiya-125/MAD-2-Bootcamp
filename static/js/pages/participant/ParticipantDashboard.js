import { api, auth } from "../../api.js";
import ResultView from "../../components/ResultView.js";

export default {
  components: { ResultView },
  data() {
    return { auth, stats: {}, upcoming: [], results: [], openEvents: [] };
  },
  async mounted() {
    const data = await api("/api/participant/dashboard");
    this.stats = data.stats;
    this.upcoming = data.upcoming;
    this.results = data.results;
    this.openEvents = data.open_events;
  },
  template: `
    <h3 class="mb-3">Hi {{ auth.user.name }} 👋</h3>
    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Open for Booking</div><div class="value">{{ stats.open_events }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Upcoming Demos</div><div class="value">{{ stats.upcoming }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Completed</div><div class="value">{{ stats.completed }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Results Out</div><div class="value">{{ stats.results }}</div></div></div>
    </div>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card p-3 mb-3">
          <h5>Upcoming Demos</h5>
          <div v-for="b in upcoming" :key="b.id" class="border-bottom py-2">
            <b>{{ b.event_name }}</b> — {{ b.project_title }}
            <div class="small text-muted">{{ b.date }} · {{ b.start_time }}-{{ b.end_time }} · Judge: {{ b.judge_name }}</div>
            <a v-if="b.meeting_link" :href="b.meeting_link" target="_blank" class="small">Join link</a>
          </div>
          <p v-if="!upcoming.length" class="text-muted mb-0">No Upcoming Demos.</p>
        </div>
        <div class="card p-3">
          <h5>Published results</h5>
          <div v-for="b in results" :key="b.id" class="border-bottom py-2">
            <div class="mb-1"><b>{{ b.event_name }}</b> — {{ b.project_title }}</div>
            <ResultView :result="b.result" />
          </div>
          <p v-if="!results.length" class="text-muted mb-0">No Results Published Yet.</p>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card p-3">
          <h5>Open for Booking Now</h5>
          <div v-for="e in openEvents" :key="e.id" class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>{{ e.name }}
              <div class="small text-muted">{{ e.track_name }} · {{ e.seats_left }} Seats Left · Closes {{ e.booking_close_date }}</div></div>
            <span v-if="e.already_booked" class="badge bg-primary">Booked</span>
            <router-link v-else :to="'/events/' + e.id" class="btn btn-sm btn-success">Book</router-link>
          </div>
          <p v-if="!openEvents.length" class="text-muted mb-0">Nothing Open Right Now.</p>
        </div>
      </div>
    </div>
  `,
};
