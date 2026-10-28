import csv
import os
from datetime import datetime
from celery import shared_task
from flask import current_app, render_template
from extensions import db
from models import User, Event, Booking
from mailer import send_email

@shared_task
def export_history_csv(user_id):
    user = db.session.get(User, user_id)
    bookings = Booking.query.filter_by(participant_id=user_id).order_by(Booking.booked_at).all()

    folder = current_app.config["EXPORT_DIR"]
    os.makedirs(folder, exist_ok=True)
    filename = f"history_{user_id}_{datetime.now():%Y%m%d%H%M%S}.csv"
    path = os.path.join(folder, filename)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Participant ID", "Event", "Track", "Demo Date", "Time", "Judge",
                         "Project", "Score", "Booking Status"])
        for b in bookings:
            published = b.evaluation is not None and b.event.results_published
            writer.writerow([user_id, b.event.name, b.event.track.name, b.slot.date.isoformat(),
                             f"{b.slot.start_time:%H:%M}-{b.slot.end_time:%H:%M}", b.slot.judge.name,
                             b.project_title, b.evaluation.total_score if published else "",
                             b.status])

    html = render_template("mail/export_ready.html", user=user, count=len(bookings))
    send_email(user.email, "Your DemoDay History Export is Ready", html, attachment_path=path)
    return filename

@shared_task
def notify_results(event_id):
    event = db.session.get(Event, event_id)
    sent = 0
    for booking in Booking.query.filter_by(event_id=event_id, status="Completed").all():
        html = render_template("mail/result.html", booking=booking, event=event,
                               evaluation=booking.evaluation)
        if send_email(booking.participant.email, f"Results Are Out: {event.name}", html):
            sent += 1
    return f"{sent} Result Mails Sent"