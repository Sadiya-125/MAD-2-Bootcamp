import { toasts } from "../api.js";

export default {
  data() {
    return { toasts };
  },
  template: `
        <div class="toast-area">
            <div v-for="t in toasts.items" :key="t.id" class="alert shadow-sm mb-2" :class="'alert-' + t.type">
                {{ t.text }}
            </div>
        </div>
    `,
};
