import { api, notify, badge } from "../../api.js";

export default {
  data() {
    return {
      bookings: [],
      events: [],
      filters: { q: "", event_id: "", status: "" },
      moving: null,
      slots: [],
      targetSlot: "",
    };
  },
  async mounted() {
    this.events = await api("/api/admin/events");
    this.load();
  },
  methods: {
    badge,
    async load() {
      const params = new URLSearchParams(this.filters).toString();
      this.bookings = await api(`/api/admin/bookings?${params}`);
    },
    async startMove(booking) {
      this.moving = booking;
      this.targetSlot = "";
      const all = await api(`/api/admin/slots?event_id=${booking.event_id}`);
      this.slots = all.filter(
        (s) => s.id !== booking.slot_id && s.status === "Available",
      );
    },
    async move() {
      try {
        await api(`/api/admin/bookings/${this.moving.id}/move`, "PUT", {
          slot_id: this.targetSlot,
        });
        notify("Booking Rescheduled");
        this.moving = null;
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <h3 class="mb-3">All bookings</h3>
    <div class="card p-3 mb-3" v-if="moving">
      <h5>Reschedule {{ moving.participant_name }} - {{ moving.project_title }}</h5>
      <p class="small text-muted">Current: {{ moving.date }} {{ moving.start_time }} with {{ moving.judge_name }}</p>
      <form class="d-flex gap-2" @submit.prevent="move">
        <select v-model="targetSlot" class="form-select" required>
          <option value="" disabled>Choose New Slot</option>
          <option v-for="s in slots" :value="s.id">
            {{ s.date }} {{ s.start_time }}-{{ s.end_time }} · {{ s.judge_name }} · {{ s.available_seats }} seats
          </option>
        </select>
        <button class="btn btn-primary text-nowrap">Move Booking</button>
        <button type="button" class="btn btn-link" @click="moving = null">Cancel</button>
      </form>
      <p v-if="!slots.length" class="small text-danger mt-2 mb-0">No Other Slot with Free Seats in this Event.</p>
    </div>

    <div class="card p-3">
      <form class="row g-2 mb-2" @submit.prevent="load">
        <div class="col-md-4"><input v-model.trim="filters.q" class="form-control" placeholder="Participant, Email or Project"></div>
        <div class="col-md-3">
          <select v-model="filters.event_id" class="form-select">
            <option value="">All events</option>
            <option v-for="e in events" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
        <div class="col-md-3">
          <select v-model="filters.status" class="form-select">
            <option value="">All statuses</option><option>Booked</option><option>Completed</option><option>Cancelled</option>
          </select>
        </div>
        <div class="col-md-2"><button class="btn btn-outline-primary w-100">Search</button></div>
      </form>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Participant</th><th>Event / project</th><th>Slot</th><th>Judge</th><th>Status</th><th>Score</th><th></th></tr></thead>
          <tbody>
            <tr v-for="b in bookings" :key="b.id">
              <td>{{ b.participant_name }}<div class="small text-muted">{{ b.participant_email }}</div></td>
              <td>{{ b.event_name }}<div class="small text-muted">{{ b.project_title }}</div></td>
              <td class="small">{{ b.date }}<br>{{ b.start_time }}-{{ b.end_time }}</td>
              <td>{{ b.judge_name }}</td>
              <td><span :class="badge(b.status)">{{ b.status }}</span></td>
              <td>{{ b.result ? b.result.total_score : "-" }}</td>
              <td class="text-end">
                <button v-if="b.status === 'Booked'" class="btn btn-sm btn-outline-primary" @click="startMove(b)">Reschedule</button>
              </td>
            </tr>
            <tr v-if="!bookings.length"><td colspan="7" class="text-muted">No Bookings Found</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
