from datetime import date
from flask import Blueprint, request, jsonify
from sqlalchemy import update
from extensions import db
from models import Event, Slot, Booking
from utils import error, role_required, current_user
from cache_utils import clear_event_cache

participant_bp = Blueprint("participant", __name__, url_prefix="/api/participant")

def booking_view(booking):
    return booking.to_dict(include_result=booking.event.results_published)

@participant_bp.get("/dashboard")
@role_required("participant")
def dashboard():
    user = current_user()
    today = date.today()
    mine = Booking.query.filter_by(participant_id=user.id).all()
    upcoming = [b for b in mine if b.status == "Booked" and b.slot.date >= today]
    results = [b for b in mine if b.evaluation and b.event.results_published]
    open_events = [e for e in Event.query.filter_by(status="Booking Open").all() if e.booking_open()]
    booked_event_ids = {b.event_id for b in mine if b.status != "Cancelled"}

    return jsonify({
        "stats": {"upcoming": len(upcoming),
                  "completed": len([b for b in mine if b.status == "Completed"]),
                  "results": len(results), "open_events": len(open_events)},
        "upcoming": [booking_view(b) for b in sorted(upcoming, key=lambda b: (b.slot.date, b.slot.start_time))],
        "results": [booking_view(b) for b in results],
        "open_events": [dict(e.to_dict(), already_booked=e.id in booked_event_ids,
                             seats_left=sum(s.available_seats for s in e.slots if s.status == "Available"))
                        for e in open_events],
    })

@participant_bp.get("/bookings")
@role_required("participant")
def my_bookings():
    bookings = Booking.query.filter_by(participant_id=current_user().id).order_by(Booking.booked_at.desc()).all()
    return jsonify([booking_view(b) for b in bookings])

@participant_bp.post("/bookings")
@role_required("participant")
def book_slot():
    user = current_user()
    data = request.get_json(silent=True) or {}
    try:
        slot = db.session.get(Slot, int(data.get("slot_id")))
    except (TypeError, ValueError):
        slot = None
    if slot is None:
        return error("Slot Not Found", 404)
    title = (data.get("project_title") or "").strip()
    if not title:
        return error("Project Title is Required")

    event = slot.event
    if not event.booking_open():
        return error("Booking is Not Open for this Event")
    if slot.date < date.today():
        return error("This Slot is in the Past")
    if slot.status != "Available":
        return error(f"Slot is {slot.status}", 409)

    existing = Booking.query.filter(Booking.participant_id == user.id, Booking.event_id == event.id,
                                    Booking.status != "Cancelled").first()
    if existing:
        return error("You Already have a Booking for this Event", 409)

    result = db.session.execute(
        update(Slot)
        .where(Slot.id == slot.id, Slot.booked_count < Slot.capacity)
        .values(booked_count=Slot.booked_count + 1)
    )
    if result.rowcount == 0:
        db.session.rollback()
        return error("Sorry, This Slot Just Became Full", 409)
    db.session.refresh(slot)
    if slot.booked_count >= slot.capacity:
        slot.status = "Full"

    booking = Booking(participant_id=user.id, slot_id=slot.id, event_id=event.id, project_title=title)
    db.session.add(booking)
    db.session.commit()
    clear_event_cache(event.id)
    return jsonify({"message": "Slot Booked Successfully", "booking": booking_view(booking)}), 201

@participant_bp.put("/bookings/<int:booking_id>/cancel")
@role_required("participant")
def cancel_booking(booking_id):
    booking = db.session.get(Booking, booking_id)
    if booking is None or booking.participant_id != current_user().id:
        return error("Booking Not Found", 404)
    if booking.status != "Booked":
        return error(f"A {booking.status.lower()} Booking Cannot be Cancelled")
    if date.today() > booking.event.booking_close_date:
        return error("The Booking Deadline has Passed, You can no Longer Cancel")

    booking.status = "Cancelled"
    slot = booking.slot
    slot.booked_count -= 1
    if slot.status == "Full":
        slot.status = "Available"
    db.session.commit()
    clear_event_cache(slot.event_id)
    return jsonify({"message": "Booking Cancelled", "booking": booking_view(booking)})
