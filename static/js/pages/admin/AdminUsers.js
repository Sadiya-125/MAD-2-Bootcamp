import { api, notify, badge } from "../../api.js";

export default {
  data() {
    return { users: [], filters: { q: "", status: "" } };
  },
  mounted() {
    this.load();
  },
  methods: {
    badge,
    async load() {
      const params = new URLSearchParams({
        role: "participant",
        ...this.filters,
      }).toString();
      this.users = await api(`/api/admin/users?${params}`);
    },
    async setStatus(user, status) {
      try {
        await api(`/api/admin/users/${user.id}/status`, "PUT", { status });
        notify(`${user.name} is Now ${status}`);
        this.load();
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <h3 class="mb-3">Participants</h3>
    <div class="card p-3">
      <form class="row g-2 mb-2" @submit.prevent="load">
        <div class="col-md-6"><input v-model.trim="filters.q" class="form-control" placeholder="Search Name, Email, College"></div>
        <div class="col-md-4">
          <select v-model="filters.status" class="form-select">
            <option value="">All Statuses</option>
            <option>Active</option><option>Inactive</option><option>Blacklisted</option>
          </select>
        </div>
        <div class="col-md-2"><button class="btn btn-outline-primary w-100">Search</button></div>
      </form>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Name</th><th>College / Company</th><th>Phone</th><th>Status</th><th>Change status</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}<div class="small text-muted">{{ u.email }}</div></td>
              <td>{{ u.organization }}</td>
              <td>{{ u.phone }}</td>
              <td><span :class="badge(u.status)">{{ u.status }}</span></td>
              <td>
                <select class="form-select form-select-sm" :value="u.status"
                        @change="setStatus(u, $event.target.value)">
                  <option>Active</option><option>Inactive</option><option>Blacklisted</option>
                </select>
              </td>
            </tr>
            <tr v-if="!users.length"><td colspan="5" class="text-muted">No Participants Found</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};
