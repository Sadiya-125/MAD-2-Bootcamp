import { auth, homeFor } from "./api.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Profile from "./pages/Profile.js";

const ALL = ["admin", "judge", "participant"];

const routes = [
  { path: "/", redirect: () => homeFor(auth.user) },
  { path: "/login", component: Login, meta: { guest: true } },
  { path: "/register", component: Register, meta: { guest: true } },
  { path: "/profile", component: Profile, meta: { roles: ALL } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.roles) {
    if (!auth.token) return "/login";
    if (!to.meta.roles.includes(auth.user.role)) return homeFor(auth.user);
  }
  if (to.meta.guest && auth.token) return homeFor(auth.user);
});
