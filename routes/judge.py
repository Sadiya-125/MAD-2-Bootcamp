from datetime import date, datetime
from flask import Blueprint, jsonify, request
from extensions import db
from models import Booking, CriterionScore, Evaluation, Event, Slot
from utils import current_user, error, missing_fields, parse_date, parse_time, role_required

judge_bp = Blueprint("judge", __name__, url_prefix="/api/judge")

def minutes(t):
    return t.hour * 60 + t.minute

def get_assigned_event(event_id, judge):
    event = db.session.get(Event, event_id)
    if event is None or judge not in event.judges:
        return None
    return event

def get_own_slot(slot_id, judge):
    slot =db.session.get(Slot, slot_id)
    if slot is None or slot.judge_id != judge.id:
        return None
    return slot

@judge_bp.get("/dashboard")
@role_required("judge")
def dashboard():
    judge = current_user()
    my_slots = Slot.query.filter_by(judge_id = judge.id).all()
    slot_ids = [s.id for s in my_slots]
    booked = Booking.query.filter(Booking.slot_id.in_(slot_ids), Booking.status != "Cancelled").count()
    pending  = Booking.query.filter(Booking.slot_id.in_(slot_ids), Booking.status == "Booked").count()

    events = []
    for event in judge.assigned_events:
        item = event.to_dict()
        item["my_slots"] = len([s for s in my_slots if s.event_id == event.id])
        item["can_create_slots"] = event.slot_creation_open()
        events.append(item)

    return jsonify({
        "stats": {"assigned_events": len(events), "slots": len(my_slots), "booked_students": booked, "pending_evaluations": pending}, "events": events
    })

@judge_bp.get("/events/<int:event_id>")
@role_required("judge")
def event_detail(event_id):
    judge = current_user()
    event = get_assigned_event(event_id, judge)
    if event is None:
        return error("You are Not Assigned to this Event")
    data = event.to_dict(detail=True)
    data["can_create_slots"] = event.slot_creation_open()
    data["slots"] = []
    for slot in Slot.query.filter_by(event_id=event.id, judge_id=judge.id).order_by(Slot.date, Slot.start_time):
        item = slot.to_dict()
        item["bookings"] = [b.to_dict() for b in slot.bookings if b.status != "Cancelled"]
        data["slots"].append(item)
    return jsonify(data)

def fill_slot(slot, data, event, judge):
    missing = missing_fields(data, ["date", "start_time", "end_time", "capacity"])
    if missing:
        return f"Missing Fields: {', '.join(missing)}"
    try:
        slot.date = parse_date(data["date"])
        slot.start_time = parse_time(data["start_time"])
        slot.end_time = parse_time(data["end_time"])
        slot.capacity = int(data["capacity"])
    except (TypeError, ValueError):
        return "Use YYYY-MM-DD for Date, HH:MM for Times and a Number for Capacity"
    slot.meeting_link = data.get("meeting_link")
 
    if slot.date < event.booking_open_date:
        return f"Demo Date Must be on or after Booking Opens ({event.booking_open_date})"
    if slot.start_time >= slot.end_time:
        return "End Time Must be after Start Time"
    if minutes(slot.end_time) - minutes(slot.start_time) < event.duration_min:
        return f"Slot Must be Atleast {event.duration_min} Minutes Long"
    if not 1 <= slot.capacity <= 50:
        return "Capacity Must be Between 1 and 50"
    if event.mode == "Online" and not slot.meeting_link:
        return "Meeting Link is Required for an Online Event"
 
    others = Slot.query.filter(Slot.judge_id == judge.id, Slot.date == slot.date,
                               Slot.status != "Cancelled", Slot.id != (slot.id or 0)).all()
    for other in others:
        if slot.start_time < other.end_time and other.start_time < slot.end_time:
            return f"Overlaps with your Slot {other.start_time:%H:%M}-{other.end_time:%H:%M}"
    return None
 
@judge_bp.post("/events/<int:event_id>/slots")
@role_required("judge")
def create_slot(event_id):
    judge = current_user()
    event = get_assigned_event(event_id, judge)
    if event is None:
        return error("You are Not Assigned to this Event", 403)
    if not event.slot_creation_open():
        return error("Slot Creation is Not Open for this Event")
    slot = Slot(event_id=event.id, judge_id=judge.id)
    message = fill_slot(slot, request.get_json(silent=True) or {}, event, judge)
    if message:
        return error(message)
    db.session.add(slot)
    db.session.commit()
    return jsonify(slot.to_dict()), 201
 
def slot_editable(slot):
    if slot.event.status != "Slot Creation":
        return "Slots can be Changed only During the Slot Creation Period"
    if slot.booked_count > 0:
        return "This Slot Already has Bookings"
    return None

@judge_bp.put("/slots/<int:slot_id>")
@role_required("judge")
def update_slot(slot_id):
    judge = current_user()
    slot = get_own_slot(slot_id, judge)
    if slot is None:
        return error("Slot Not Found", 404)
    message = slot_editable(slot) or fill_slot(slot, request.get_json(silent=True) or {}, slot.event, judge)
    if message:
        db.session.rollback()
        return error(message)
    db.session.commit()
    return jsonify(slot.to_dict())
 
@judge_bp.delete("/slots/<int:slot_id>")
@role_required("judge")
def delete_slot(slot_id):
    slot = get_own_slot(slot_id, current_user())
    if slot is None:
        return error("Slot Not Found", 404)
    message = slot_editable(slot)
    if message:
        return error(message)
    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot Removed"})
 
@judge_bp.put("/slots/<int:slot_id>/complete")
@role_required("judge")
def complete_slot(slot_id):
    slot = get_own_slot(slot_id, current_user())
    if slot is None:
        return error("Slot Not Found", 404)
    pending = [b for b in slot.bookings if b.status == "Booked"]
    if pending:
        return error(f"{len(pending)} Demo(s) in this Slot are Not Evaluated Yet")
    slot.status = "Completed"
    db.session.commit()
    return jsonify(slot.to_dict())
 
def get_own_booking(booking_id, judge):
    booking = db.session.get(Booking, booking_id)
    if booking is None or booking.slot.judge_id != judge.id:
        return None
    return booking
 
@judge_bp.get("/bookings/<int:booking_id>")
@role_required("judge")
def booking_detail(booking_id):
    booking = get_own_booking(booking_id, current_user())
    if booking is None:
        return error("Booking Not Found", 404)
    data = booking.to_dict(include_result=True)
    data["criteria"] = [c.to_dict() for c in booking.event.criteria]
    data["max_score"] = booking.event.max_score
    data["results_published"] = booking.event.results_published
    return jsonify(data)
 
@judge_bp.post("/bookings/<int:booking_id>/evaluate")
@role_required("judge")
def evaluate(booking_id):
    judge = current_user()
    booking = get_own_booking(booking_id, judge)
    if booking is None:
        return error("Booking Not Found", 404)
    if booking.status == "Cancelled":
        return error("This Booking was Cancelled")
    if booking.event.results_published:
        return error("Results are Already Published; Evaluation is Locked")
    if booking.slot.date > date.today():
        return error("You can Evaluate Only on or After the Demo Date")
 
    data = request.get_json(silent=True) or {}
    try:
        given = {int(s["criterion_id"]): s.get("marks") for s in data.get("scores", [])}
    except (TypeError, ValueError, KeyError):
        return error("Scores Must be a List of {criterion_id, marks}")
    criteria = booking.event.criteria
    if not criteria:
        return error("This Event has No Rubric Yet")
 
    scores, percentage = [], 0
    for criterion in criteria:
        try:
            marks = float(given.get(criterion.id))
        except (TypeError, ValueError):
            return error(f"Marks Missing for '{criterion.name}'")
        if not 0 <= marks <= criterion.max_marks:
            return error(f"'{criterion.name}' Marks Must be Between 0 and {criterion.max_marks}")
        scores.append(CriterionScore(criterion_id=criterion.id, marks=marks))
        percentage += marks / criterion.max_marks * criterion.weightage
 
    evaluation = booking.evaluation or Evaluation(booking=booking, participant_id=booking.participant_id)
    evaluation.judge_id = judge.id
    evaluation.scores = scores
    evaluation.total_score = round(percentage / 100 * booking.event.max_score, 2)
    evaluation.remarks = data.get("remarks", "")
    evaluation.evaluated_at = datetime.now()
    booking.status = "Completed"
    db.session.add(evaluation)
    db.session.commit()
    return jsonify({"message": "Evaluation Saved", "evaluation": evaluation.to_dict()})