import { api, badge } from "../../api.js";

export default {
  data() {
    return { stats: {}, events: [] };
  },
  async mounted() {
    const data = await api("/api/judge/dashboard");
    this.stats = data.stats;
    this.events = data.events;
  },
  methods: { badge },
  template: `
    <h3 class="mb-3">Judge Dashboard</h3>
    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Assigned Events</div><div class="value">{{ stats.assigned_events }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">My Slots</div><div class="value">{{ stats.slots }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Booked Students</div><div class="value">{{ stats.booked_students }}</div></div></div>
      <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="label">Pending Evaluations</div><div class="value text-danger">{{ stats.pending_evaluations }}</div></div></div>
    </div>
    <div class="card p-3 table-responsive">
      <h5>My Assigned Events</h5>
      <table class="table">
        <thead><tr><th>Event</th><th>Slot Creation Window</th><th>My Slots</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in events" :key="e.id">
            <td>{{ e.name }}<div class="small text-muted">{{ e.track_name }} · {{ e.mode }}</div></td>
            <td class="small">{{ e.slot_open_date }} → {{ e.slot_close_date }}
              <span v-if="e.can_create_slots" class="badge bg-success ms-1">open now</span></td>
            <td>{{ e.my_slots }}</td>
            <td><span :class="badge(e.status)">{{ e.status }}</span></td>
            <td class="text-end"><router-link :to="'/judge/events/' + e.id" class="btn btn-sm btn-primary">Manage</router-link></td>
          </tr>
          <tr v-if="!events.length"><td colspan="5" class="text-muted">No Events Assigned Yet</td></tr>
        </tbody>
      </table>
    </div>
  `,
};
