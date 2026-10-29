import { api, notify } from "../../api.js";

export default {
  data() {
    return { stats: {} };
  },
  async mounted() {
    this.stats = await api("/api/admin/stats");
    this.drawCharts(await api("/api/admin/charts"));
  },
  beforeUnmount() {
    (this.chartObjects || []).forEach((chart) => chart.destroy());
  },
  computed: {
    cards() {
      const s = this.stats;
      return [
        { label: "Tracks", value: s.tracks, to: "/admin/tracks" },
        { label: "Events", value: s.events, to: "/admin/events" },
        { label: "Participants", value: s.participants, to: "/admin/users" },
        { label: "Judges", value: s.judges, to: "/admin/judges" },
        { label: "Slots", value: s.slots, to: "/admin/events" },
        { label: "Bookings", value: s.bookings, to: "/admin/bookings" },
        { label: "Evaluations", value: s.evaluations, to: "/admin/events" },
      ];
    },
  },
  methods: {
    drawCharts(data) {
      if (!this.$refs.eventsChart) return;
      this.chartObjects = [
        new Chart(this.$refs.eventsChart, {
          type: "bar",
          data: {
            labels: data.bookings_per_event.labels,
            datasets: [
              {
                label: "Bookings",
                data: data.bookings_per_event.values,
                backgroundColor: "#0d6efd",
              },
            ],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        }),
        new Chart(this.$refs.judgeChart, {
          type: "bar",
          data: {
            labels: data.judge_workload.labels,
            datasets: [
              {
                label: "Slots",
                data: data.judge_workload.slots,
                backgroundColor: "#6c757d",
              },
              {
                label: "Evaluations",
                data: data.judge_workload.evaluations,
                backgroundColor: "#198754",
              },
            ],
          },
          options: {
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        }),
        new Chart(this.$refs.trendChart, {
          type: "line",
          data: {
            labels: data.booking_trend.labels,
            datasets: [
              {
                label: "Bookings Per Day",
                data: data.booking_trend.values,
                borderColor: "#0d6efd",
                tension: 0.3,
                fill: false,
              },
            ],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        }),
      ];
    },
    async runJob(name) {
      try {
        const data = await api(`/api/admin/jobs/${name}`, "POST");
        notify(data.message, "info");
      } catch (e) {
        notify(e.message, "danger");
      }
    },
  },
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
      <h3 class="mb-0">Admin Dashboard</h3>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-dark" @click="runJob('reminders')">Send Reminders Now</button>
        <button class="btn btn-sm btn-outline-dark" @click="runJob('monthly-report')">Mail Monthly Report Now</button>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-6 col-md-3" v-for="c in cards" :key="c.label">
        <router-link :to="c.to" class="text-decoration-none text-dark">
          <div class="card stat-card p-3">
            <div class="label">{{ c.label }}</div>
            <div class="value">{{ c.value ?? "-" }}</div>
          </div>
        </router-link>
      </div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-lg-6"><div class="card p-3"><h6>Bookings Per Event</h6><canvas ref="eventsChart" height="200"></canvas></div></div>
      <div class="col-lg-6"><div class="card p-3"><h6>Judge Workload</h6><canvas ref="judgeChart" height="200"></canvas></div></div>
      <div class="col-12"><div class="card p-3"><h6>Booking Trend (Last 14 Days)</h6><canvas ref="trendChart" height="90"></canvas></div></div>
    </div>
  `,
};
