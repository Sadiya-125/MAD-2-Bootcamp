import { api, notify, badge } from "../../api.js";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  phone: "",
  organization: "",
  expertise: "",
  designation: "",
};

export default {
  data() {
    return { judges: [], q: "", form: { ...EMPTY }, editingId: null };
  },
  mounted() {
    this.load();
  },
  methods: {
    badge,
    async load() {
      this.judges = await api(
        `/api/admin/judges?q=${encodeURIComponent(this.q)}`,
      );
    },
    edit(judge) {
      this.editingId = judge.id;
      this.form = { ...EMPTY, ...judge, password: "" };
    },
    reset() {
      this.editingId = null;
      this.form = { ...EMPTY };
    },
    async save() {
      try {
        if (this.editingId)
          await api(`/api/admin/judges/${this.editingId}`, "PUT", this.form);
        else await api("/api/admin/judges", "POST", this.form);
        notify("Judge Saved");
        this.reset();
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    async setStatus(judge, status) {
      await api(`/api/admin/users/${judge.id}/status`, "PUT", { status });
      notify(`${judge.name} is Now ${status}`);
      this.load();
    },
  },
  template: `
    <h3 class="mb-3">Judges</h3>
    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card p-3">
          <h5>{{ editingId ? "Edit Judge" : "Add Judge" }}</h5>
          <form @submit.prevent="save">
            <input v-model.trim="form.name" class="form-control mb-2" placeholder="Name" required>
            <input v-model.trim="form.email" type="email" class="form-control mb-2" placeholder="Email"
                   :disabled="!!editingId" required>
            <input v-model="form.password" type="password" class="form-control mb-2" minlength="6"
                   :placeholder="editingId ? 'New Password (optional)' : 'Password'" :required="!editingId">
            <input v-model.trim="form.expertise" class="form-control mb-2" placeholder="Expertise e.g. AI/ML">
            <input v-model.trim="form.designation" class="form-control mb-2" placeholder="Designation">
            <input v-model.trim="form.organization" class="form-control mb-2" placeholder="Organization">
            <input v-model.trim="form.phone" class="form-control mb-2" placeholder="Phone" pattern="[0-9]{10}">
            <button class="btn btn-primary">Save</button>
            <button v-if="editingId" type="button" class="btn btn-link" @click="reset">Cancel</button>
          </form>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="card p-3">
          <form class="d-flex gap-2 mb-2" @submit.prevent="load">
            <input v-model.trim="q" class="form-control" placeholder="Search Name, Email, Expertise">
            <button class="btn btn-outline-primary">Search</button>
          </form>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>Name</th><th>Expertise</th><th>Events</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr v-for="j in judges" :key="j.id">
                  <td>{{ j.name }}<div class="small text-muted">{{ j.email }}</div></td>
                  <td>{{ j.expertise }}<div class="small text-muted">{{ j.designation }}</div></td>
                  <td>{{ j.assigned_events }}</td>
                  <td><span :class="badge(j.status)">{{ j.status }}</span></td>
                  <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-primary me-1" @click="edit(j)">Edit</button>
                    <button v-if="j.status === 'Active'" class="btn btn-sm btn-outline-secondary"
                            @click="setStatus(j, 'Inactive')">Deactivate</button>
                    <button v-else class="btn btn-sm btn-outline-success" @click="setStatus(j, 'Active')">Activate</button>
                  </td>
                </tr>
                <tr v-if="!judges.length"><td colspan="5" class="text-muted">No Judges Found</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
};
