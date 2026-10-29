import os

from celery import Celery, Task
from celery.schedules import crontab

def celery_init_app(app):
    class FlaskTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery = Celery(app.name, task_cls = FlaskTask)
    celery.config_from_object(app.config["CELERY"])
    celery.set_default()

    celery.conf.beat_schedule = {
        "daily-demo-reminders": {
            "task": "tasks.daily_reminders",
            "schedule": crontab(minute=0, hour=8),
        },
        "monthly-admin-report": {
            "task": "tasks.monthly_report",
            "schedule": crontab(minute=0, hour=7, day_of_month=1),
        },
    }
    if os.environ.get("FAST_SCHEDULE"):
        for job in celery.conf.beat_schedule.values():
            job["schedule"] = crontab()
        # Test mode: report on the running month so the mail has real data
        celery.conf.beat_schedule["monthly-admin-report"]["args"] = ("current",)

    app.extensions["celery"] = celery
    return celery