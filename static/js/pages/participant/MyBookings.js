import { api, notify, badge } from "../../api.js";
import ResultView from "../../components/ResultView.js";

export default {
  components: { ResultView },
  data() {
    return { bookings: [], openId: null };
  },
  mounted() {
    this.load();
  },
  methods: {
    badge,
    async load() {
      this.bookings = await api("/api/participant/bookings");
    },
    async cancel(booking) {
      if (!confirm(`Cancel Your Booking for ${booking.event_name}?`)) return;
      try {
        await api(`/api/participant/bookings/${booking.id}/cancel`, "PUT");
        notify("Booking Cancelled", "warning");
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    toggle(id) {
      this.openId = this.openId === id ? null : id;
    },
  },
  template: `
    <h3 class="mb-3">My Bookings & History</h3>
    <div class="card p-3 table-responsive">
      <table class="table">
        <thead><tr><th>Event</th><th>Project</th><th>Slot</th><th>Judge</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <template v-for="b in bookings" :key="b.id">
            <tr>
              <td>{{ b.event_name }}<div class="small text-muted">{{ b.track_name }}</div></td>
              <td>{{ b.project_title }}</td>
              <td class="small">{{ b.date }}<br>{{ b.start_time }}-{{ b.end_time }}</td>
              <td>{{ b.judge_name }}</td>
              <td><span :class="badge(b.status)">{{ b.status }}</span></td>
              <td class="text-end text-nowrap">
                <button v-if="b.result" class="btn btn-sm btn-outline-primary me-1" @click="toggle(b.id)">Result</button>
                <span v-else-if="b.status === 'Completed'" class="small text-muted me-1">Result Pending</span>
                <button v-if="b.status === 'Booked'" class="btn btn-sm btn-outline-danger" @click="cancel(b)">Cancel</button>
              </td>
            </tr>
            <tr v-if="openId === b.id">
              <td colspan="6" class="bg-light"><ResultView :result="b.result" /></td>
            </tr>
          </template>
          <tr v-if="!bookings.length"><td colspan="6" class="text-muted">You have not Booked Anything yet.</td></tr>
        </tbody>
      </table>
    </div>
  `,
};
