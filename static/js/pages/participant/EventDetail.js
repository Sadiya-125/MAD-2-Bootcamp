import { api, notify, badge } from "../../api.js";

export default {
  data() {
    return { event: null, slots: [], selectedSlot: null, projectTitle: "" };
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
      this.event = await api(`/api/events/${this.eventId}`);
      this.slots = await api(`/api/events/${this.eventId}/slots`);
    },
    choose(slot) {
      this.selectedSlot = slot;
    },
    async book() {
      try {
        await api("/api/participant/bookings", "POST", {
          slot_id: this.selectedSlot.id,
          project_title: this.projectTitle,
        });
        notify("Slot Booked! See You at the Demo.");
        this.$router.push("/bookings");
      } catch (e) {
        notify(e.message, "danger");
        this.load();
      }
    },
  },
  template: `
    <div v-if="event">
      <router-link to="/events" class="small">&larr; All Events</router-link>
      <h3 class="mt-2">{{ event.name }} <span :class="badge(event.status)">{{ event.status }}</span></h3>
      <p class="text-muted">{{ event.track_name }} · {{ event.mode }}{{ event.venue ? ' @ ' + event.venue : '' }} ·
        {{ event.level }} · {{ event.duration_min }} Min Demo · Max Score {{ event.max_score }}</p>

      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card p-3 mb-3">
            <h6>Instructions</h6>
            <p class="small mb-0">{{ event.instructions || "-" }}</p>
          </div>
          <div class="card p-3">
            <h6>How you will be Judged</h6>
            <ul class="small mb-0">
              <li v-for="c in event.criteria" :key="c.id"><b>{{ c.name }}</b> ({{ c.weightage }}%) {{ c.description }}</li>
            </ul>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="card p-3">
            <h5>Demo slots</h5>
            <p class="small text-muted">Booking Window: {{ event.booking_open_date }} → {{ event.booking_close_date }}
              <span v-if="!event.booking_open" class="text-danger">(booking is not open)</span></p>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Date</th><th>Time</th><th>Judge</th><th>Seats left</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="s in slots" :key="s.id" :class="{ 'table-active': selectedSlot && selectedSlot.id === s.id }">
                    <td>{{ s.date }}</td>
                    <td>{{ s.start_time }}-{{ s.end_time }}</td>
                    <td>{{ s.judge_name }}</td>
                    <td>{{ s.available_seats }} / {{ s.capacity }}</td>
                    <td class="text-end">
                      <button v-if="event.booking_open && s.status === 'Available'" class="btn btn-sm btn-outline-success"
                              @click="choose(s)">Select</button>
                      <span v-else :class="badge(s.status)">{{ s.status }}</span>
                    </td>
                  </tr>
                  <tr v-if="!slots.length"><td colspan="5" class="text-muted">No Slots Yet.</td></tr>
                </tbody>
              </table>
            </div>
            <form v-if="selectedSlot" class="border-top pt-3" @submit.prevent="book">
              <p class="mb-2">Booking <b>{{ selectedSlot.date }} {{ selectedSlot.start_time }}</b> with {{ selectedSlot.judge_name }}</p>
              <div class="input-group">
                <input v-model.trim="projectTitle" class="form-control" placeholder="Your Project Title" required maxlength="150">
                <button class="btn btn-success">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
};
