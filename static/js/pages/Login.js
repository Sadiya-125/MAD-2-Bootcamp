import { api, auth, homeFor } from "../api.js";

export default {
  data() {
    return { form: { email: "", password: "" }, error: "", loading: false };
  },
  methods: {
    async submit() {
      this.error = "";
      this.loading = true;
      try {
        const data = await api("/api/auth/login", "POST", this.form);
        auth.login(data.token, data.user);
        this.$router.push(homeFor(data.user));
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
  },
  template: `
    <div class="auth-box card p-4">
        <h3 class="mb-3">Login</h3>
        <div v-if="error" class="alert alert-danger py-2">
            {{ error }}
        </div>
        <form @submit.prevent="submit">
            <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control" id="email" v-model.trim="form.email" required>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" v-model="form.password">
            </div>
            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                {{ loading ? "Signing In..." : "Login" }}
            </button>
        </form>
        <p class="mt-3 mb-0 small text-center">
            New Participant? <router-link to="/register">Register</router-link>
        </p>
    </div>
  `,
};
