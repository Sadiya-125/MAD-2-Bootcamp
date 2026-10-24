import { api, notify, badge } from "../../api.js";

const EMPTY = { code: "", name: "", description: "" };

export default {
  data() {
    return { tracks: [], form: { ...EMPTY }, editingId: null };
  },
  mounted() {
    this.load();
  },
  methods: {
    badge,
    async load() {
      this.tracks = await api("/api/admin/tracks");
    },
    edit(track) {
      this.editingId = track.id;
      this.form = {
        code: track.code,
        name: track.name,
        description: track.description,
      };
    },
    reset() {
      this.editingId = null;
      this.form = { ...EMPTY };
    },
    async save() {
      try {
        if (this.editingId)
          await api(`/api/admin/tracks/${this.editingId}`, "PUT", this.form);
        else await api("/api/admin/tracks", "POST", this.form);
        notify("Track Saved");
        this.reset();
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
    async toggleArchive(track) {
      const status = track.status === "Active" ? "Archived" : "Active";
      await api(`/api/admin/tracks/${track.id}`, "PUT", { status });
      this.load();
    },
    async remove(track) {
      if (!confirm(`Delete Track ${track.code}?`)) return;
      try {
        await api(`/api/admin/tracks/${track.id}`, "DELETE");
        notify("Track Deleted");
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <h3 class="mb-3">Tracks</h3>
    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card p-3">
          <h5>{{ editingId ? "Edit Track" : "New Track" }}</h5>
          <form @submit.prevent="save">
            <input v-model.trim="form.code" class="form-control mb-2" placeholder="Code e.g. AI"
                   :disabled="!!editingId" required maxlength="20">
            <input v-model.trim="form.name" class="form-control mb-2" placeholder="Name" required>
            <textarea v-model="form.description" class="form-control mb-2" placeholder="Description"></textarea>
            <button class="btn btn-primary">Save</button>
            <button v-if="editingId" type="button" class="btn btn-link" @click="reset">Cancel</button>
          </form>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="card p-3 table-responsive">
          <table class="table">
            <thead><tr><th>Code</th><th>Name</th><th>Events</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <tr v-for="t in tracks" :key="t.id">
                <td>{{ t.code }}</td>
                <td>{{ t.name }}<div class="small text-muted">{{ t.description }}</div></td>
                <td>{{ t.event_count }}</td>
                <td><span :class="badge(t.status)">{{ t.status }}</span></td>
                <td class="text-end text-nowrap">
                  <button class="btn btn-sm btn-outline-primary me-1" @click="edit(t)">Edit</button>
                  <button class="btn btn-sm btn-outline-secondary me-1" @click="toggleArchive(t)">
                    {{ t.status === "Active" ? "Archive" : "Activate" }}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="remove(t)">Delete</button>
                </td>
              </tr>
              <tr v-if="!tracks.length"><td colspan="5" class="text-muted">No Tracks Yet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
};
