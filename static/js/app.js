import { router } from "./router.js";
import NavBar from "./components/NavBar.js";
import ToastArea from "./components/ToastArea.js";

const App = {
  components: { NavBar, ToastArea },
  template: `
        <NavBar />
        <main class="container py-4">
            <router-view></router-view>
        </main>
        <ToastArea />
    `,
};

Vue.createApp(App).use(router).mount("#app");
