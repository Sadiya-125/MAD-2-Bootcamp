# DemoDay Portal

Hackathon demo & judging portal built for the MAD-2 bootcamp.
Admin runs tracks and demo events, judges open time slots and score teams with a rubric,
participants book a slot, get reminders and see their results.

**Stack:** Flask (API) · Flask-SQLAlchemy + SQLite · Flask-JWT-Extended · VueJS 3 (CDN) + Vue Router ·
Bootstrap 5 · Chart.js · Redis (Flask-Caching) · Celery + Redis (background & scheduled jobs)

## 1. Install

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

You also need **Redis** (Linux/macOS: `redis-server`; Windows: run it inside WSL)
and **MailHog** to catch emails locally (web inbox at http://localhost:8025).

## 2. Run (4 terminals, venv active in each)

| Terminal          | Command                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| 1 – Redis         | `redis-server`                                                         |
| 2 – Flask         | `python app.py` → http://127.0.0.1:5000                                |
| 3 – Celery worker | `celery -A app.celery_app worker -l info` (Windows: add `--pool=solo`) |
| 4 – Celery beat   | `celery -A app.celery_app beat -l info`                                |

Plus MailHog (`mailhog`) for mail. For a quick demo of the scheduled jobs set
`FAST_SCHEDULE=1` before starting beat (both jobs then run every minute), or use the
"Send reminders now" / "Mail monthly report now" buttons on the admin dashboard.

Optional demo data: `python seed_demo.py` (wipes the DB first).

## 3. Logins

| Role                    | Email               | Password |
| ----------------------- | ------------------- | -------- |
| Admin (created by code) | admin@demoday.local | admin123 |
| Judge (seed data)       | kavya@demoday.local | judge123 |
| Participant (seed data) | asha@student.local  | pass123  |

## 4. Project structure

```
demoday/
├── app.py            # app factory, blueprints, admin seeding, celery_app
├── config.py         # all settings
├── extensions.py     # db, jwt, cache objects
├── models.py         # 9 tables + event_judges association
├── utils.py          # role_required decorator, validators
├── cache_utils.py    # Redis cache-aside helpers
├── celery_app.py     # Celery factory + beat schedule
├── tasks.py          # CSV export, result mails, daily reminders, monthly report
├── mailer.py         # SMTP + Google Chat webhook
├── seed_demo.py      # optional demo data
├── routes/           # auth, admin, judge, participant, events (REST APIs)
├── templates/        # index.html (Vue entry) + mail/*.html
└── static/           # css + Vue components/pages
```

## 5. API overview

| Area               | Endpoints                                                                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | `POST /api/auth/register` · `POST /api/auth/login` · `GET/PUT /api/auth/me`                                                                                                                                                                     |
| Admin              | `/api/admin/stats` · `/charts` · `/tracks` · `/events` (+ `/status`, `/judges`, `/criteria`, `/publish`) · `/criteria/<id>` · `/judges` · `/users` (+ `/status`) · `/slots` (+ `/judge`) · `/bookings` (+ `/move`) · `/search` · `/jobs/<name>` |
| Judge              | `/api/judge/dashboard` · `/events/<id>` · `/events/<id>/slots` · `/slots/<id>` (+ `/complete`) · `/bookings/<id>` (+ `/evaluate`)                                                                                                               |
| Catalogue (cached) | `/api/tracks` · `/api/events` · `/api/events/<id>` · `/api/events/<id>/slots`                                                                                                                                                                   |
| Participant        | `/api/participant/dashboard` · `/bookings` (+ `/cancel`) · `/export` · `/export/<task_id>` · `/export/download/<file>`                                                                                                                          |
