import { api, notify } from "../api.js";

export default {
  data() {
    return {
      form: {
        name: "",
        email: "",
        password: "",
        confirm: "",
        phone: "",
        organization: "",
      },
      error: "",
    };
  },
  methods: {
    async submit() {
      this.error = "";
      if (this.form.password !== this.form.confirm) {
        this.error = "Passwords Don't Match.";
        return;
      }
      try {
        await api("/api/auth/register", "POST", this.form);
        notify("User Registered Successfully. Please Login.");
        this.$router.push("/login");
      } catch (e) {
        this.error = e.message;
      }
    },
  },
  template: `
    <div class="auth-box card p-4">
        <h3 class="mb-3">Participant Registration</h3>
        <div v-if="error" class="alert alert-danger py-2">
            {{ error }}
        </div>
        <form @submit.prevent="submit">
            <input v-model.trim="form.name" type="text" class="form-control mb-2" placeholder="Full Name" required>
            <input v-model.trim="form.email" type="email" class="form-control mb-2" placeholder="Email Address" required>
            <input v-model.trim="form.password" type="password" class="form-control mb-2" placeholder="Password (Min 6 Chars)" required>
            <input v-model.trim="form.confirm" type="password" class="form-control mb-2" placeholder="Confirm Password" required>
            <input v-model.trim="form.phone" type="text" class="form-control mb-2" placeholder="Phone Number" pattern="[0-9]{10}" title="Enter a 10 Digit Phone Number">
            <input v-model.trim="form.organization" type="text" class="form-control mb-3" placeholder="College / Company">
            
            <button type="submit" class="btn btn-primary w-100">
                Register
            </button>
        </form>
        <p class="mt-3 mb-0 small text-center">
            Already Registered? <router-link to="/login">Login</router-link>
        </p>
    </div>
  `,
};
