import { api, notify, badge } from "../../api.js";

function emptySlot() {
  return {
    date: "",
    start_time: "",
    end_time: "",
    capacity: 1,
    meeting_link: "",
  };
}

export default {
  data() {
    return { event: null, form: emptySlot(), editingId: null };
  },
  computed: {
    eventId() {
      return this.$route.params.id;
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    badge,
    async load() {
      this.event = await api(`/api/judge/events/${this.eventId}`);
    },
    edit(slot) {
      this.editingId = slot.id;
      this.form = {
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity: slot.capacity,
        meeting_link: slot.meeting_link || "",
      };
    },
    reset() {
      this.editingId = null;
      this.form = emptySlot();
    },
    async save() {
      try {
        if (this.editingId)
          await api(`/api/judge/slots/${this.editingId}`, "PUT", this.form);
        else
          await api(
            `/api/judge/events/${this.eventId}/slots`,
            "POST",
            this.form,
          );
        notify("Slot Saved");
        this.reset();
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    async remove(slot) {
      if (!confirm("Remove this Slot?")) return;
      try {
        await api(`/api/judge/slots/${slot.id}`, "DELETE");
        notify("Slot Removed");
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    async complete(slot) {
      try {
        await api(`/api/judge/slots/${slot.id}/complete`, "PUT");
        notify("Slot Marked as Completed");
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <div v-if="event">
      <router-link to="/judge" class="small">&larr; Dashboard</router-link>
      <h3 class="mt-2">{{ event.name }} <span :class="badge(event.status)">{{ event.status }}</span></h3>
      <p class="text-muted small">{{ event.track_name }} · {{ event.mode }} · {{ event.duration_min }} Min / Demo ·
        booking {{ event.booking_open_date }} → {{ event.booking_close_date }}</p>

      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card p-3 mb-3">
            <h5>{{ editingId ? "Edit Slot" : "Create Slot" }}</h5>
            <p v-if="!event.can_create_slots && !editingId" class="text-muted small mb-0">
              Slot Creation is Closed ({{ event.slot_open_date }} → {{ event.slot_close_date }}, Status Must be "Slot Creation").
            </p>
            <form v-else @submit.prevent="save">
              <label class="form-label small">Demo Date</label>
              <input v-model="form.date" type="date" class="form-control mb-2" :min="event.booking_open_date" required>
              <div class="row g-2 mb-2">
                <div class="col"><label class="form-label small">Start</label>
                  <input v-model="form.start_time" type="time" class="form-control" required></div>
                <div class="col"><label class="form-label small">End</label>
                  <input v-model="form.end_time" type="time" class="form-control" required></div>
              </div>
              <label class="form-label small">Capacity (teams)</label>
              <input v-model.number="form.capacity" type="number" min="1" max="50" class="form-control mb-2" required>
              <input v-model.trim="form.meeting_link" type="url" class="form-control mb-2"
                     placeholder="Meeting link" :required="event.mode === 'Online'">
              <button class="btn btn-primary">Save Slot</button>
              <button v-if="editingId" type="button" class="btn btn-link" @click="reset">Cancel</button>
            </form>
          </div>
          <div class="card p-3">
            <h6>Rubric</h6>
            <ul class="small mb-0">
              <li v-for="c in event.criteria" :key="c.id">{{ c.name }} - {{ c.max_marks }} marks ({{ c.weightage }}%)</li>
            </ul>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card p-3 mb-3" v-for="s in event.slots" :key="s.id">
            <div class="d-flex flex-wrap justify-content-between align-items-center">
              <div>
                <b>{{ s.date }}</b> {{ s.start_time }}-{{ s.end_time }}
                <span :class="badge(s.status)" class="ms-1">{{ s.status }}</span>
                <div class="small text-muted">{{ s.booked_count }} / {{ s.capacity }} Booked</div>
              </div>
              <div class="text-nowrap">
                <template v-if="event.status === 'Slot Creation' && s.booked_count === 0">
                  <button class="btn btn-sm btn-outline-primary me-1" @click="edit(s)">Edit</button>
                  <button class="btn btn-sm btn-outline-danger me-1" @click="remove(s)">Remove</button>
                </template>
                <button v-if="s.status !== 'Completed' && s.bookings.length" class="btn btn-sm btn-outline-dark"
                        @click="complete(s)">Mark Completed</button>
              </div>
            </div>
            <table class="table table-sm mt-2 mb-0" v-if="s.bookings.length">
              <thead><tr><th>Participant</th><th>Project</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="b in s.bookings" :key="b.id">
                  <td>{{ b.participant_name }}<div class="small text-muted">{{ b.participant_email }}</div></td>
                  <td>{{ b.project_title }}</td>
                  <td><span :class="badge(b.status)">{{ b.status }}</span></td>
                  <td class="text-end">
                    <router-link :to="'/judge/evaluate/' + b.id" class="btn btn-sm btn-success">
                      {{ b.evaluated ? "View / Edit Marks" : "Evaluate" }}</router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!event.slots.length" class="text-muted">You have Not Created any Slots for this Event.</p>
        </div>
      </div>
    </div>
  `,
};
