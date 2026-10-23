import { api, auth, notify } from "../api.js";

export default {
  data() {
    return {
      form: {
        name: "",
        phone: "",
        organization: "",
        password: "",
      },
      user: null,
    };
  },
  async mounted() {
    this.user = await api("/api/auth/me");
    this.form.name = this.user.name;
    this.form.phone = this.user.phone;
    this.form.organization = this.user.organization;
  },
  methods: {
    async save() {
      try {
        const data = await api("/api/auth/me", "PUT", this.form);
        auth.setUser(data.user);
        this.form.password = "";
        notify("Profile Updated Successfully.");
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <div class="row justify-content-center">
        <div class="col-md-6">
            <div class="card p-4" v-if="user">
                <h4>My Profile</h4>
                <p class="text-muted mb-3">{{user.email}} . <span class="text-capitalize">{{user.role}}</span></p>
                <form @submit.prevent="save">
                    <label for="name" class="form-label">Full Name</label>
                    <input v-model.trim="form.name" type="text" class="form-control mb-2" required>
                    <label for="phone" class="form-label">Phone Number</label>
                    <input v-model.trim="form.phone" type="text" class="form-control mb-2" pattern="[0-9]{10}">
                    <label for="organization" class="form-label">College / Company</label>
                    <input v-model.trim="form.organization" type="text" class="form-control mb-3">

                    <label for="password" class="form-label">New Password (Leave Blank to Keep)</label>
                    <input v-model.trim="form.password" type="password" class="form-control mb-2" minlength="6">
                    
                    <button type="submit" class="btn btn-primary">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    </div>
  `,
};
