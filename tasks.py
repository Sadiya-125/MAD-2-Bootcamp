from collections import Counter
import csv
import os
from datetime import date, datetime, timedelta
from celery import shared_task
from flask import current_app, render_template
from extensions import db
from models import Evaluation, Slot, User, Event, Booking
from mailer import send_email, send_gchat

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

@shared_task
def daily_reminders():
    today = date.today()
    bookings = Booking.query.join(Slot, Booking.slot_id == Slot.id).filter(
        Booking.status == "Booked", Slot.date.in_([today, today + timedelta(days=1)])).all()
 
    for booking in bookings:
        html = render_template("mail/reminder.html", booking=booking, event=booking.event,
                               slot=booking.slot, today=today)
        send_email(booking.participant.email, f"Reminder: {booking.event.name} Demo", html)
 
    if bookings:
        lines = [f"- {b.participant.name}: {b.event.name} on {b.slot.date} at {b.slot.start_time:%H:%M} "
                 f"with {b.slot.judge.name}" for b in bookings]
        send_gchat("DemoDay Reminders for Today & Tomorrow:\n" + "\n".join(lines))
    return f"{len(bookings)} Reminders Sent"
 
def month_range(period):
    first_this_month = date.today().replace(day=1)
    if period == "current":
        return first_this_month, date.today()
    last_month_end = first_this_month - timedelta(days=1)
    return last_month_end.replace(day=1), last_month_end
 
@shared_task
def monthly_report(period="previous"):
    start, end = month_range(period)
    evaluations = Evaluation.query.filter(
        Evaluation.evaluated_at >= datetime.combine(start, datetime.min.time()),
        Evaluation.evaluated_at < datetime.combine(end + timedelta(days=1), datetime.min.time())).all()
    month_bookings = Booking.query.join(Slot, Booking.slot_id == Slot.id).filter(Slot.date >= start, Slot.date <= end).all()
 
    per_event = {}
    for b in month_bookings:
        row = per_event.setdefault(b.event.name, {"booked": 0, "evaluated": 0, "scores": []})
        if b.status != "Cancelled":
            row["booked"] += 1
        if b.evaluation:
            row["evaluated"] += 1
            row["scores"].append(b.evaluation.total_score)
    for row in per_event.values():
        row["avg"] = round(sum(row["scores"]) / len(row["scores"]), 1) if row["scores"] else "-"
 
    judge_counts = Counter(e.judge.name for e in evaluations)
    stats = {
        "events_conducted": len({b.event_id for b in month_bookings if b.status == "Completed"}),
        "students_evaluated": len(evaluations),
        "completed_bookings": len([b for b in month_bookings if b.status == "Completed"]),
        "pending_evaluations": Booking.query.join(Slot, Booking.slot_id == Slot.id)
        .filter(Booking.status == "Booked", Slot.date < date.today()).count(),
    }
    html = render_template("mail/monthly_report.html", start=start, end=end, stats=stats,
                           per_event=per_event, top_judges=judge_counts.most_common(5))
    admin = User.query.filter_by(role="admin").first()
    send_email(admin.email, f"DemoDay Monthly Report: {start:%B %Y}", html)
    return stats