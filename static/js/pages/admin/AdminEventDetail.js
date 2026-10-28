import { api, notify, badge } from "../../api.js";

const STATUSES = [
  "Draft",
  "Slot Creation",
  "Booking Open",
  "Closed",
  "Completed",
];

export default {
  data() {
    return {
      event: null,
      allJudges: [],
      selectedJudges: [],
      statuses: STATUSES,
      newStatus: "",
      slots: [],
      criterion: { name: "", max_marks: 10, weightage: "", description: "" },
    };
  },
  computed: {
    eventId() {
      return this.$route.params.id;
    },
    totalWeight() {
      return this.event
        ? this.event.criteria.reduce((sum, c) => sum + c.weightage, 0)
        : 0;
    },
  },
  async mounted() {
    this.allJudges = (await api("/api/admin/judges")).filter(
      (j) => j.status === "Active",
    );
    this.load();
  },
  methods: {
    badge,
    async load() {
      this.event = await api(`/api/admin/events/${this.eventId}`);
      this.newStatus = this.event.status;
      this.selectedJudges = this.event.judges.map((j) => j.id);
      this.slots = await api(`/api/admin/slots?event_id=${this.eventId}`);
    },
    async run(action, successText) {
      try {
        await action();
        notify(successText);
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    changeStatus() {
      this.run(
        () =>
          api(`/api/admin/events/${this.eventId}/status`, "PUT", {
            status: this.newStatus,
          }),
        `Status Changed to ${this.newStatus}`,
      );
    },
    saveJudges() {
      this.run(
        () =>
          api(`/api/admin/events/${this.eventId}/judges`, "PUT", {
            judge_ids: this.selectedJudges,
          }),
        "Judges Assigned",
      );
    },
    addCriterion() {
      this.run(async () => {
        await api(
          `/api/admin/events/${this.eventId}/criteria`,
          "POST",
          this.criterion,
        );
        this.criterion = {
          name: "",
          max_marks: 10,
          weightage: "",
          description: "",
        };
      }, "Criterion Added");
    },
    removeCriterion(c) {
      this.run(
        () => api(`/api/admin/criteria/${c.id}`, "DELETE"),
        "Criterion Removed",
      );
    },
    reassign(slot, judgeId) {
      this.run(
        () =>
          api(`/api/admin/slots/${slot.id}/judge`, "PUT", {
            judge_id: Number(judgeId),
          }),
        "Slot Reassigned",
      );
    },
    publish() {
      if (!confirm("Publish Results? Participants will See their Marks."))
        return;
      this.run(
        () => api(`/api/admin/events/${this.eventId}/publish`, "PUT"),
        "Results Published",
      );
    },
  },
  template: `
    <div v-if="event">
      <router-link to="/admin/events" class="small">&larr; All Events</router-link>
      <div class="d-flex flex-wrap justify-content-between align-items-center my-2">
        <div>
          <h3 class="mb-0">{{ event.name }} <span :class="badge(event.status)">{{ event.status }}</span></h3>
          <div class="text-muted small">{{ event.track_name }} · {{ event.mode }} {{ event.venue ? '@ ' + event.venue : '' }}
            · {{ event.level }} · {{ event.duration_min }} min demo · max {{ event.max_score }}</div>
        </div>
        <div class="d-flex gap-2 mt-2">
          <select v-model="newStatus" class="form-select form-select-sm">
            <option v-for="s in statuses">{{ s }}</option>
          </select>
          <button class="btn btn-sm btn-primary text-nowrap" @click="changeStatus">Update Status</button>
          <span v-if="event.results_published" class="badge bg-success align-self-center">Results Published</span>
          <button v-else class="btn btn-sm btn-success text-nowrap" @click="publish">Publish Results</button>
        </div>
      </div>

      <div class="row g-3 small mb-3">
        <div class="col-md-6"><div class="card p-2">Slot Creation: <b>{{ event.slot_open_date }} → {{ event.slot_close_date }}</b></div></div>
        <div class="col-md-6"><div class="card p-2">Booking: <b>{{ event.booking_open_date }} → {{ event.booking_close_date }}</b></div></div>
      </div>

      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card p-3 h-100">
            <h5>Assigned Judges</h5>
            <div class="form-check" v-for="j in allJudges" :key="j.id">
              <input class="form-check-input" type="checkbox" :id="'j' + j.id" :value="j.id" v-model="selectedJudges">
              <label class="form-check-label" :for="'j' + j.id">{{ j.name }}
                <span class="text-muted small">{{ j.expertise }}</span></label>
            </div>
            <p v-if="!allJudges.length" class="text-muted">Create Judges First.</p>
            <button class="btn btn-sm btn-primary mt-2" @click="saveJudges">Save assignment</button>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card p-3 h-100">
            <h5>Evaluation Rubric <span class="small text-muted">(total weightage {{ totalWeight }}% / 100%)</span></h5>
            <table class="table table-sm">
              <thead><tr><th>Criterion</th><th>Max marks</th><th>Weightage</th><th></th></tr></thead>
              <tbody>
                <tr v-for="c in event.criteria" :key="c.id">
                  <td>{{ c.name }}<div class="small text-muted">{{ c.description }}</div></td>
                  <td>{{ c.max_marks }}</td>
                  <td>{{ c.weightage }}%</td>
                  <td class="text-end"><button class="btn btn-sm btn-outline-danger" @click="removeCriterion(c)">Remove</button></td>
                </tr>
              </tbody>
            </table>
            <form class="row g-2" @submit.prevent="addCriterion">
              <div class="col-md-4"><input v-model.trim="criterion.name" class="form-control form-control-sm" placeholder="Criterion" required></div>
              <div class="col-md-2"><input v-model.number="criterion.max_marks" type="number" min="1" class="form-control form-control-sm" placeholder="Max" required></div>
              <div class="col-md-2"><input v-model.number="criterion.weightage" type="number" min="1" max="100" step="0.5" class="form-control form-control-sm" placeholder="Weight %" required></div>
              <div class="col-md-3"><input v-model.trim="criterion.description" class="form-control form-control-sm" placeholder="Description"></div>
              <div class="col-md-1"><button class="btn btn-sm btn-success w-100">Add</button></div>
            </form>
          </div>
        </div>
      </div>

      <div class="card p-3 mt-3 table-responsive">
        <h5>All Judge Slots</h5>
        <table class="table table-sm">
          <thead><tr><th>Date</th><th>Time</th><th>Booked</th><th>Status</th><th>Judge (reassign)</th></tr></thead>
          <tbody>
            <tr v-for="s in slots" :key="s.id">
              <td>{{ s.date }}</td>
              <td>{{ s.start_time }}-{{ s.end_time }}</td>
              <td>{{ s.booked_count }} / {{ s.capacity }}</td>
              <td><span :class="badge(s.status)">{{ s.status }}</span></td>
              <td>
                <select class="form-select form-select-sm" :value="s.judge_id" @change="reassign(s, $event.target.value)">
                  <option v-for="j in event.judges" :value="j.id">{{ j.name }}</option>
                </select>
              </td>
            </tr>
            <tr v-if="!slots.length"><td colspan="5" class="text-muted">No Slots Created Yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
