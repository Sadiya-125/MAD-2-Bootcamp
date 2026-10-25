import { api, notify } from "../../api.js";

export default {
  data() {
    return { booking: null, marks: {}, remarks: "" };
  },
  computed: {
    total() {
      if (!this.booking) return 0;
      const percent = this.booking.criteria.reduce((sum, c) => {
        const m = Number(this.marks[c.id]) || 0;
        return sum + (m / c.max_marks) * c.weightage;
      }, 0);
      return ((percent / 100) * this.booking.max_score).toFixed(2);
    },
  },
  async mounted() {
    this.booking = await api(
      `/api/judge/bookings/${this.$route.params.bookingId}`,
    );
    const old = this.booking.result;
    this.booking.criteria.forEach((c) => {
      const prev = old && old.scores.find((s) => s.criterion_id === c.id);
      this.marks[c.id] = prev ? prev.marks : "";
    });
    this.remarks = old ? old.remarks : "";
  },
  methods: {
    async submit() {
      const scores = this.booking.criteria.map((c) => ({
        criterion_id: c.id,
        marks: this.marks[c.id],
      }));
      try {
        await api(`/api/judge/bookings/${this.booking.id}/evaluate`, "POST", {
          scores,
          remarks: this.remarks,
        });
        notify("Evaluation Submitted");
        this.$router.push(`/judge/events/${this.booking.event_id}`);
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <div class="row justify-content-center" v-if="booking">
      <div class="col-lg-7">
        <router-link :to="'/judge/events/' + booking.event_id" class="small">&larr; Back to Slots</router-link>
        <div class="card p-4 mt-2">
          <h4 class="mb-1">Evaluate: {{ booking.project_title }}</h4>
          <p class="text-muted small">{{ booking.participant_name }} · {{ booking.event_name }} ·
            {{ booking.date }} {{ booking.start_time }}</p>
          <div v-if="booking.results_published" class="alert alert-warning py-2">Results are Published - Marks are Locked.</div>
          <form @submit.prevent="submit">
            <div class="mb-3" v-for="c in booking.criteria" :key="c.id">
              <label class="form-label">{{ c.name }}
                <span class="text-muted small">(out of {{ c.max_marks }}, weight {{ c.weightage }}%)</span></label>
              <input v-model.number="marks[c.id]" type="number" min="0" :max="c.max_marks" step="0.5"
                     class="form-control" required>
              <div class="form-text">{{ c.description }}</div>
            </div>
            <label class="form-label">Remarks / Feedback</label>
            <textarea v-model="remarks" class="form-control mb-3" rows="3"></textarea>
            <div class="d-flex justify-content-between align-items-center">
              <span>Total: <b>{{ total }}</b> / {{ booking.max_score }}</span>
              <button class="btn btn-success" :disabled="booking.results_published">Submit Evaluation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
};
