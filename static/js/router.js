import { auth, homeFor } from "./api.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Profile from "./pages/Profile.js";
import AdminDashboard from "./pages/admin/AdminDashboard.js";
import AdminTracks from "./pages/admin/AdminTracks.js";
import AdminEvents from "./pages/admin/AdminEvents.js";
import AdminEventDetail from "./pages/admin/AdminEventDetail.js";
import AdminJudges from "./pages/admin/AdminJudges.js";
import AdminUsers from "./pages/admin/AdminUsers.js";
import JudgeDashboard from "./pages/judge/JudgeDashboard.js";
import JudgeEvaluate from "./pages/judge/JudgeEvaluate.js";
import JudgeEvent from "./pages/judge/JudgeEvent.js";
import ParticipantDashboard from "./pages/participant/ParticipantDashboard.js";
import EventBrowse from "./pages/participant/EventBrowse.js";
import EventDetail from "./pages/participant/EventDetail.js";
import MyBookings from "./pages/participant/MyBookings.js";

const ALL = ["admin", "judge", "participant"];
const ADMIN = ["admin"];
const JUDGE = ["judge"];
const PARTICIPANT = ["participant"];

const routes = [
  { path: "/", redirect: () => homeFor(auth.user) },
  { path: "/login", component: Login, meta: { guest: true } },
  { path: "/register", component: Register, meta: { guest: true } },
  { path: "/profile", component: Profile, meta: { roles: ALL } },

  { path: "/admin", component: AdminDashboard, meta: { roles: ADMIN } },
  { path: "/admin/tracks", component: AdminTracks, meta: { roles: ADMIN } },
  { path: "/admin/events", component: AdminEvents, meta: { roles: ADMIN } },
  {
    path: "/admin/events/:id",
    component: AdminEventDetail,
    meta: { roles: ADMIN },
  },
  { path: "/admin/judges", component: AdminJudges, meta: { roles: ADMIN } },
  { path: "/admin/users", component: AdminUsers, meta: { roles: ADMIN } },

  { path: "/judge", component: JudgeDashboard, meta: { roles: JUDGE } },
  {
    path: "/judge/events/:id",
    component: JudgeEvent,
    meta: { roles: JUDGE },
  },
  {
    path: "/judge/evaluate/:bookingId",
    component: JudgeEvaluate,
    meta: { roles: JUDGE },
  },

  {
    path: "/dashboard",
    component: ParticipantDashboard,
    meta: { roles: PARTICIPANT },
  },
  {
    path: "/events",
    component: EventBrowse,
    meta: { roles: PARTICIPANT },
  },
  {
    path: "/events/:id",
    component: EventDetail,
    meta: { roles: PARTICIPANT },
  },
  {
    path: "/bookings",
    component: MyBookings,
    meta: { roles: PARTICIPANT },
  },

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
