import { api, notify, badge } from "../../api.js";

const STATUSES = [
  "Draft",
  "Slot Creation",
  "Booking Open",
  "Closed",
  "Completed",
];

function emptyForm() {
  return {
    track_id: "",
    name: "",
    mode: "Online",
    venue: "",
    level: "Beginner",
    duration_min: 15,
    max_score: 100,
    instructions: "",
    slot_open_date: "",
    slot_close_date: "",
    booking_open_date: "",
    booking_close_date: "",
  };
}

export default {
  data() {
    return {
      events: [],
      tracks: [],
      statuses: STATUSES,
      filters: { q: "", status: "" },
      form: emptyForm(),
      editingId: null,
      showForm: false,
    };
  },
  async mounted() {
    this.tracks = (await api("/api/admin/tracks")).filter(
      (t) => t.status === "Active",
    );
    this.load();
  },
  methods: {
    badge,
    async load() {
      const params = new URLSearchParams(this.filters).toString();
      this.events = await api(`/api/admin/events?${params}`);
    },
    openCreate() {
      this.form = emptyForm();
      this.editingId = null;
      this.showForm = true;
    },
    openEdit(event) {
      const form = emptyForm();
      Object.keys(form).forEach((key) => (form[key] = event[key] ?? ""));
      this.form = form;
      this.editingId = event.id;
      this.showForm = true;
    },
    async save() {
      try {
        if (this.editingId)
          await api(`/api/admin/events/${this.editingId}`, "PUT", this.form);
        else await api("/api/admin/events", "POST", this.form);
        notify("Event Saved");
        this.showForm = false;
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    async remove(event) {
      if (!confirm(`Delete ${event.name}?`)) return;
      try {
        await api(`/api/admin/events/${event.id}`, "DELETE");
        notify("Event Deleted");
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Demo Events</h3>
      <button class="btn btn-primary" @click="openCreate">+ New event</button>
    </div>

    <div class="card p-3 mb-3" v-if="showForm">
      <h5>{{ editingId ? "Edit Event" : "New Event" }}</h5>
      <form @submit.prevent="save" class="row g-2">
        <div class="col-md-4">
          <label class="form-label">Track</label>
          <select v-model="form.track_id" class="form-select" required>
            <option value="" disabled>Select Track</option>
            <option v-for="t in tracks" :value="t.id">{{ t.code }} - {{ t.name }}</option>
          </select>
        </div>
        <div class="col-md-8">
          <label class="form-label">Event Name</label>
          <input v-model.trim="form.name" class="form-control" required>
        </div>
        <div class="col-md-3">
          <label class="form-label">Mode</label>
          <select v-model="form.mode" class="form-select"><option>Online</option><option>Offline</option></select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Venue</label>
          <input v-model.trim="form.venue" class="form-control" :required="form.mode === 'Offline'">
        </div>
        <div class="col-md-2">
          <label class="form-label">Level</label>
          <select v-model="form.level" class="form-select">
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Demo (min)</label>
          <input v-model.number="form.duration_min" type="number" min="1" class="form-control" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Max Score</label>
          <input v-model.number="form.max_score" type="number" min="1" class="form-control" required>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label">Slot Creation Opens</label>
          <input v-model="form.slot_open_date" type="date" class="form-control" required>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label">Slot Creation Closes</label>
          <input v-model="form.slot_close_date" type="date" class="form-control" :min="form.slot_open_date" required>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label">Booking Opens</label>
          <input v-model="form.booking_open_date" type="date" class="form-control" :min="form.slot_close_date" required>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label">Booking Closes</label>
          <input v-model="form.booking_close_date" type="date" class="form-control" :min="form.booking_open_date" required>
        </div>
        <div class="col-12">
          <label class="form-label">Instructions for Participants</label>
          <textarea v-model="form.instructions" class="form-control" rows="2"></textarea>
        </div>
        <div class="col-12">
          <button class="btn btn-success">Save</button>
          <button type="button" class="btn btn-link" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </div>

    <div class="card p-3">
      <form class="row g-2 mb-2" @submit.prevent="load">
        <div class="col-md-6"><input v-model.trim="filters.q" class="form-control" placeholder="Search name or venue"></div>
        <div class="col-md-4">
          <select v-model="filters.status" class="form-select">
            <option value="">All Statuses</option>
            <option v-for="s in statuses">{{ s }}</option>
          </select>
        </div>
        <div class="col-md-2"><button class="btn btn-outline-primary w-100">Search</button></div>
      </form>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Event</th><th>Track</th><th>Booking Window</th><th>Judges</th><th>Slots</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td><router-link :to="'/admin/events/' + e.id">{{ e.name }}</router-link>
                <div class="small text-muted">{{ e.mode }} · {{ e.level }}</div></td>
              <td>{{ e.track_name }}</td>
              <td class="small">{{ e.booking_open_date }} → {{ e.booking_close_date }}</td>
              <td>{{ e.judge_count }}</td>
              <td>{{ e.slot_count }}</td>
              <td><span :class="badge(e.status)">{{ e.status }}</span></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(e)">Edit</button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(e)">Delete</button>
              </td>
            </tr>
            <tr v-if="!events.length"><td colspan="7" class="text-muted">No Events Found</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
