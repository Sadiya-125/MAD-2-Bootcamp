from flask import Blueprint, request, jsonify
from sqlalchemy import or_, update
from extensions import db
from models import Criterion, Event, JudgeProfile, Track, User, Slot, Booking, Evaluation, EVENT_MODES, EVENT_STATUSES, EVENT_LEVELS, USER_STATUSES
from utils import error, missing_fields, parse_date, role_required, valid_email
from cache_utils import clear_event_cache

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.get("/stats")
@role_required("admin")
def stats():
    return jsonify({
        "tracks": Track.query.count(),
        "events": Event.query.count(),
        "participants": User.query.filter_by(role="participant").count(),
        "judges": User.query.filter_by(role="judge").count(),
        "slots": Slot.query.filter(Slot.status != "Cancelled").count(),
        "bookings": Booking.query.filter(Booking.status != "Cancelled").count(),
        "evaluations": Evaluation.query.count()
    })

@admin_bp.get("/tracks") 
# @admin_bp.route("/tracks", methods=["GET"])  # Alternative Way to Define Route
@role_required("admin")
def list_tracks():
    tracks = Track.query.order_by(Track.code).all()
    return jsonify([t.to_dict() for t in tracks])

@admin_bp.post("/tracks")
# @admin_bp.route("/tracks", methods=["POST"])  # Alternative Way to Define Route
@role_required("admin")
def create_track():
    data = request.get_json(silent=True) or {}
    missing=missing_fields(data, ["code", "name"])
    if missing:
        return error(f"Missing Fields: {', '.join(missing)}")

    code = data["code"].strip().upper()
    if Track.query.filter_by(code=code).first():
        return error(f"Track with Code '{code}' Already Exists.", 409)
    track = Track(code=code, name=data["name"].strip(), description=data.get("description"))
    db.session.add(track)
    db.session.commit()
    clear_event_cache()
    return jsonify(track.to_dict()), 201

@admin_bp.put("/tracks/<int:track_id>")
@role_required("admin")
def update_track(track_id):
    track = db.get_or_404(Track, track_id)
    data = request.get_json(silent=True) or {}

    if data.get("name"):
        track.name = data["name"].strip()
    if data.get("description"):
        track.description = data["description"]
    if data.get("status"):
        if data["status"] not in ("Active", "Inactive"):
            return error("Invalid Status. Must be 'Active' or 'Inactive'.")
        track.status = data["status"]
    db.session.commit()
    clear_event_cache()
    return jsonify(track.to_dict())

@admin_bp.delete("/tracks/<int:track_id>")
@role_required("admin")
def delete_track(track_id):
    track = db.get_or_404(Track, track_id)
    if track.events:
        return error(f"Cannot Delete Track '{track.code}' as it has Associated Events. Archive the Track Instead.")
    db.session.delete(track)
    db.session.commit()
    clear_event_cache()
    return jsonify({"message": f"Track '{track.code}' Deleted."})

DATE_FIELDS = ["slot_open_date", "slot_close_date", "booking_open_date", "booking_close_date"]

def fill_event(event, data):
    if event.id is None:
        missing = missing_fields(data, ["track_id", "name"] + DATE_FIELDS)
        if missing:
            return f"Missing Fields: {', '.join(missing)}"

    if "track_id" in data:
        try:
            track = db.session.get(Track, int(data["track_id"]))
        except (TypeError, ValueError):
            track = None
        if track is None or track.status != "Active":
            return "Invalid Track ID or Track is Inactive."
        event.track_id = track.id

    if "name" in data:
        if not data["name"].strip():
            return "Event Name Cannot be Empty."
        event.name = data["name"].strip()

    for field, allowed in (("mode", EVENT_MODES), ("level", EVENT_LEVELS)):
        if field in data:
            if data[field] not in allowed:
                return f"{field} Must be One of: {', '.join(allowed)}"
            setattr(event, field, data[field])

    for field in ("duration_min", "max_score"):
        if field in data:
            try:
                value = int(data[field])
            except (TypeError, ValueError):
                return f"{field} Must be an Integer."

            if value <= 0:
                return f"{field} Must be Greater than Zero."
            setattr(event, field, value)

    for field in ("venue", "instructions"):
        if field in data:
            setattr(event, field, data[field])

    for field in DATE_FIELDS:
        if field in data:
            try:
                setattr(event, field, parse_date(data[field]))
            except (TypeError, ValueError):
                return f"{field} Must be a Valid Date in YYYY-MM-DD Format."

    if not (event.slot_open_date <= event.slot_close_date <= event.booking_open_date <= event.booking_close_date):
        return "Date Fields Must Follow: slot_open <= slot_close < booking_open <= booking_close"

    if event.mode == "Offline" and not event.venue:
        return "Venue is Required for Offline Events."

    return None  # No Errors

@admin_bp.get("/events")
@role_required("admin")
def list_events():
    query = Event.query
    
    q = request.args.get("q", "").strip()   # localhost:5000/api/admin/events?q=Hackathon
    if q:
        query = query.filter(or_(Event.name.ilike(f"%{q}%"), Event.venue.ilike(f"%{q}%")))
    if request.args.get("status"):    #localhost:5000/api/admin/events?status=Active
        query = query.filter(Event.status==request.args["status"])
    if request.args.get("track_id", type=int):    #localhost:5000/api/admin/events?track_id=1
        query = query.filter(Event.track_id==request.args.get("track_id", type=int))

    events = query.order_by(Event.booking_open_date.desc()).all()
    return jsonify([e.to_dict() for e in events])

@admin_bp.post("/events")
@role_required("admin")
def create_event():
    data = request.get_json(silent=True) or {}
    event = Event()
    message = fill_event(event, data)
    if message:
        return error(message)

    db.session.add(event)
    db.session.commit()
    clear_event_cache()
    return jsonify(event.to_dict(detail=True)), 201

@admin_bp.get("/events/<int:event_id>")
@role_required("admin")
def get_event(event_id):
    return jsonify(db.get_or_404(Event, event_id).to_dict(detail=True))

@admin_bp.put("/events/<int:event_id>")
@role_required("admin")
def update_event(event_id):
    event = db.get_or_404(Event, event_id)
    message = fill_event(event, request.get_json(silent=True) or {})

    if message:
        db.session.rollback()
        return error(message)

    db.session.commit()
    clear_event_cache(event.id)
    return jsonify(event.to_dict(detail=True))

@admin_bp.delete("/events/<int:event_id>")
@role_required("admin")
def delete_event(event_id):
    event = db.get_or_404(Event, event_id)
    if Booking.query.filter_by(event_id=event.id).count():
        return error("Event Already has Bookings. Close it Instead of Deleting.")
    db.session.delete(event)
    db.session.commit()
    clear_event_cache(event_id)
    return jsonify({"message": "Event Deleted"})

@admin_bp.put("/events/<int:event_id>/status")
@role_required("admin")
def change_event_status(event_id):
    event = db.get_or_404(Event, event_id)
    new_status = (request.get_json(silent=True) or {}).get("status")

    if new_status not in EVENT_STATUSES:
        return error(f"Status Must be One of: {', '.join(EVENT_STATUSES)}")
    if new_status == "Slot Creation" and not event.judges:
        return error("Assign At Least One Judge before Opening Slot Creation.")
    if new_status == "Booking Open":
        if not [s for s in event.slots if s.status != "Cancelled"]:
            return error("Judges have Not Created any Slots Yet")
        if round(sum(c.weightage for c in event.criteria), 2) != 100:
            return error("Rubric Weightage Must Add Up to 100, Before Booking Opens")

    event.status = new_status
    db.session.commit()
    clear_event_cache(event.id)
    return jsonify(event.to_dict(detail=True))

@admin_bp.put("/events/<int:event_id>/judges")
@role_required("admin")
def assign_judges(event_id):
    event = db.get_or_404(Event, event_id)
    judge_ids = (request.get_json(silent=True) or {}).get("judge_ids", [])

    judges = User.query.filter(User.id.in_(judge_ids), User.role=="judge", User.status=="Active").all()

    if len(judges) != len(set(judge_ids)):
        return error("Some Judges are Invalid or Inactive.")
    
    for judge in event.judges:
        if judge not in judges and Slot.query.filter_by(event_id=event.id, judge_id=judge.id).count():
            return error(f"{judge.name} Already has Slots in this Event")

    event.judges = judges
    db.session.commit()
    clear_event_cache(event.id)
    return jsonify(event.to_dict(detail=True))

def rubric_locked(event):
    return db.session.query(Evaluation).join(Booking, Evaluation.booking_id == Booking.id).filter(Booking.event_id == event.id).count() > 0

def fill_criterion(criterion, data, event):
    if "name" in data:
        if not str(data["name"]).strip():
            return "Criterion Name is Required"
        criterion.name = data["name"].strip()

    try:
        if "max_marks" in data:
            criterion.max_marks = int(data["marks"])
        if "weightage" in data:
            criterion.weightage = float(data["weightage"])
    except (TypeError, ValueError):
        return "max_marks and weightage Must be Numbers"

    if "description" in data:
        criterion.description = data["description"]

    if not criterion.name or not criterion.max_marks or criterion.max_marks <= 0:
        return "Criterion Needs a Name and max_marks > 0"
    if not criterion.weightage or criterion.weightage <= 0:
        return "Weightage Must be Greater than 0"

    others = sum(c.weightage for c in event.criteria if c is not criterion)
    if others + criterion.weightage > 100:
        return f"Total Weightage would be {others + criterion.weightage}%, It Cannot Exceed 100%"
    
    return None

@admin_bp.post("/events/<int:event_id>/criteria")
@role_required("admin")
def add_criterion(event_id):
    event = db.get_or_404(Event, event_id)
    if rubric_locked(event):
        return error("Rubric is Locked Because Evaluations Already Exist")
    criterion = Criterion(event_id=event.id)
    message = fill_criterion(criterion, request.get_json(silent=True) or {}, event)
    if message:
        return error(message)
    db.session.add(criterion)
    db.session.commit()
    clear_event_cache(event.id)
    return jsonify(criterion.to_dict()), 201
 
@admin_bp.put("/criteria/<int:criterion_id>")
@role_required("admin")
def update_criterion(criterion_id):
    criterion = db.get_or_404(Criterion, criterion_id)
    if rubric_locked(criterion.event):
        return error("Rubric is Locked Because Evaluations Already Exist")
    message = fill_criterion(criterion, request.get_json(silent=True) or {}, criterion.event)
    if message:
        db.session.rollback()
        return error(message)
    db.session.commit()
    clear_event_cache(criterion.event_id)
    return jsonify(criterion.to_dict())
 
@admin_bp.delete("/criteria/<int:criterion_id>")
@role_required("admin")
def delete_criterion(criterion_id):
    criterion = db.get_or_404(Criterion, criterion_id)
    if rubric_locked(criterion.event):
        return error("Rubric is Locked Because Evaluations Already Exist")
    event_id = criterion.event_id
    db.session.delete(criterion)
    db.session.commit()
    clear_event_cache(event_id)
    return jsonify({"message": "Criterion Deleted"})

@admin_bp.get("/judges")
@role_required("admin")
def list_judges():
    query = User.query.filter_by(role="judge")
    q = request.args.get("q", "").strip()    #localhost:5000/api/admin/judges?q="Sadiya"
    if q:
        query = query.outerjoin(JudgeProfile).filter(or_(
            User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"),
            JudgeProfile.expertise.ilike(f"%{q}%")))
    result = []
    for judge in query.order_by(User.name).all():
        item = judge.to_dict()
        item["assigned_events"] = len(judge.assigned_events)
        result.append(item)
    return jsonify(result)
 
@admin_bp.post("/judges")
@role_required("admin")
def create_judge():
    data = request.get_json(silent=True) or {}
    missing = missing_fields(data, ["name", "email", "password"])
    if missing:
        return error(f"Missing Fields: {', '.join(missing)}")
    
    email = data["email"].strip().lower()
    if not valid_email(email):
        return error("Invalid Email Address")
    if User.query.filter_by(email=email).first():
        return error("Email is Already in Use", 409)
    if len(data["password"]) < 6:
        return error("Password Must be At Least 6 Characters")
    
    judge = User(name=data["name"].strip(), email=email, role="judge",
                 phone=data.get("phone"), organization=data.get("organization"))
    judge.set_password(data["password"])
    judge.judge_profile = JudgeProfile(expertise=data.get("expertise"),
                                       designation=data.get("designation"))
    db.session.add(judge)
    db.session.commit()
    return jsonify(judge.to_dict()), 201
 
@admin_bp.put("/judges/<int:judge_id>")
@role_required("admin")
def update_judge(judge_id):
    judge = db.get_or_404(User, judge_id)
    if judge.role != "judge":
        return error("User is Not a Judge")
    data = request.get_json(silent=True) or {}
    for field in ("name", "phone", "organization"):
        if field in data:
            setattr(judge, field, data[field])
    if judge.judge_profile is None:
        judge.judge_profile = JudgeProfile()
    for field in ("expertise", "designation"):
        if field in data:
            setattr(judge.judge_profile, field, data[field])
    if data.get("password"):
        judge.set_password(data["password"])
    db.session.commit()
    return jsonify(judge.to_dict())

@admin_bp.get("/users")
@role_required("admin")
def list_users():
    query = User.query.filter(User.role != "admin")
    if request.args.get("role"):
        query = query.filter(User.role == request.args["role"])
    if request.args.get("status"):
        query = query.filter(User.status == request.args["status"])
    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"),
                                 User.organization.ilike(f"%{q}%")))
    return jsonify([u.to_dict() for u in query.order_by(User.created_at.desc()).all()])

@admin_bp.put("/users/<int:user_id>/status")
@role_required("admin")
def change_user_status(user_id):
    user = db.get_or_404(User, user_id)
    if user.role == "admin":
        return error("The Admin Account Cannot be Changed")
    new_status = (request.get_json(silent=True) or {}).get("status")
    if new_status not in USER_STATUSES:
        return error(f"Status Must be One of: {', '.join(USER_STATUSES)}")
    user.status = new_status
    db.session.commit()
    return jsonify(user.to_dict())

@admin_bp.get("/slots")
@role_required("admin")
def list_slots():
    query = Slot.query
    if request.args.get("event_id", type=int):
        query = query.filter(Slot.event_id == request.args.get("event_id", type=int))
    slots = query.order_by(Slot.date, Slot.start_time).all()
    return jsonify([s.to_dict() for s in slots])
 
@admin_bp.put("/slots/<int:slot_id>/judge")
@role_required("admin")
def reassign_judge(slot_id):
    slot = db.get_or_404(Slot, slot_id)
    judge = db.session.get(User, (request.get_json(silent=True) or {}).get("judge_id") or 0)
    if judge is None or judge.role != "judge" or judge.status != "Active":
        return error("Choose an Active Judge")
    if judge not in slot.event.judges:
        return error(f"{judge.name} is Not Assigned to this Event")
    clash = Slot.query.filter(Slot.judge_id == judge.id, Slot.date == slot.date, Slot.id != slot.id,
                              Slot.status != "Cancelled", Slot.start_time < slot.end_time,
                              Slot.end_time > slot.start_time).first()
    if clash:
        return error(f"{judge.name} Already has a Slot at that Time")
    slot.judge_id = judge.id
    db.session.commit()
    clear_event_cache(slot.event_id)
    return jsonify(slot.to_dict())

@admin_bp.get("/bookings")
@role_required("admin")
def list_bookings():
    query = Booking.query.join(User, Booking.participant_id == User.id)
    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(or_(User.name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%"),
                                 Booking.project_title.ilike(f"%{q}%")))
    if request.args.get("event_id", type=int):
        query = query.filter(Booking.event_id == request.args.get("event_id", type=int))
    if request.args.get("status"):
        query = query.filter(Booking.status == request.args["status"])
    bookings = query.order_by(Booking.booked_at.desc()).all()
    return jsonify([b.to_dict(include_result=True) for b in bookings])
 
@admin_bp.put("/bookings/<int:booking_id>/move")
@role_required("admin")
def move_booking(booking_id):
    booking = db.get_or_404(Booking, booking_id)
    target = db.session.get(Slot, (request.get_json(silent=True) or {}).get("slot_id") or 0)
    if booking.status != "Booked":
        return error("Only Active (Booked) Bookings can be Rescheduled")
    if target is None or target.event_id != booking.event_id or target.id == booking.slot_id:
        return error("Choose a Different Slot of the Same Event")
    if target.status in ("Cancelled", "Completed"):
        return error(f"Target Slot is {target.status}")
 
    seat = db.session.execute(update(Slot)
                              .where(Slot.id == target.id, Slot.booked_count < Slot.capacity)
                              .values(booked_count=Slot.booked_count + 1))
    if seat.rowcount == 0:
        db.session.rollback()
        return error("Target Slot is Full", 409)
    db.session.refresh(target)
    if target.booked_count >= target.capacity:
        target.status = "Full"
 
    old = booking.slot
    old.booked_count -= 1
    if old.status == "Full":
        old.status = "Available"
    booking.slot_id = target.id
    db.session.commit()
    clear_event_cache(booking.event_id)
    return jsonify({"message": "Booking Rescheduled", "booking": booking.to_dict()})
 
@admin_bp.put("/events/<int:event_id>/publish")
@role_required("admin")
def publish_results(event_id):
    event = db.get_or_404(Event, event_id)
    pending = Booking.query.filter_by(event_id=event.id, status="Booked").count()
    if pending:
        return error(f"{pending} Booking(s) are Still Waiting for Evaluation")
    if not Booking.query.filter_by(event_id=event.id, status="Completed").count():
        return error("Nothing to Publish Yet")
    event.results_published = True
    db.session.commit()
    clear_event_cache(event.id)
    return jsonify({"message": "Results Published", "event": event.to_dict()})
 
@admin_bp.get("/search")
@role_required("admin")
def global_search():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return error("Type At Least 2 Characters")
    like = f"%{q}%"
    people = User.query.filter(User.role != "admin",
                               or_(User.name.ilike(like), User.email.ilike(like))).limit(20).all()
    events = Event.query.filter(or_(Event.name.ilike(like), Event.venue.ilike(like))).limit(10).all()
    bookings = Booking.query.join(User, Booking.participant_id == User.id) \
        .filter(or_(Booking.project_title.ilike(like), User.name.ilike(like))).limit(10).all()
    return jsonify({
        "participants": [u.to_dict() for u in people if u.role == "participant"],
        "judges": [u.to_dict() for u in people if u.role == "judge"],
        "events": [e.to_dict() for e in events],
        "bookings": [b.to_dict() for b in bookings],
    })