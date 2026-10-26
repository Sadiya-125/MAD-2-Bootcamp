from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from models import Event, Slot, Track
from utils import error, role_required
from extensions import db

events_bp = Blueprint("events", __name__, url_prefix="/api")
ANY_ROLE = ("admin", "participant", "judge")

@events_bp.get("/tracks")
@role_required(*ANY_ROLE)
def active_tracks():
    tracks = Track.query.filter(Track.status == "Active").order_by(Track.name).all()
    return jsonify([{"id": t.id, "code": t.code, "name": t.name} for t in tracks])

@events_bp.get("/events")
@role_required(*ANY_ROLE)
def search_events():
    query = Event.query.filter(Event.status != "Draft")
    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(or_(Event.name.ilike(f"%{q}%"), Event.venue.ilike(f"%{q}%")))
    if request.args.get("track_id", type=int):
        query = query.filter(Event.track_id == request.args.get("track_id", type=int))
    if request.args.get("level"):
        query = query.filter(Event.level == request.args["level"])
    if request.args.get("mode"):
        query = query.filter(Event.mode == request.args["mode"])

    events = query.order_by(Event.booking_open_date.desc()).all()
    result = []
    for event in events:
        item = event.to_dict()
        item["booking_open"] = event.booking_open()
        result.append(item)
    return jsonify(result)

@events_bp.get("/events/<int:event_id>")
@role_required(*ANY_ROLE)
def event_detail(event_id):
    event = db.get_or_404(Event, event_id)
    if event.status == "Draft":
        return error("Event Not Found", 404)
    data = event.to_dict(detail=True)
    data["booking_open"] = event.booking_open()
    return jsonify(data)

@events_bp.get("/events/<int:event_id>/slots")
@role_required(*ANY_ROLE)
def event_schedule(event_id):
    event = db.get_or_404(Event, event_id)
    slots = Slot.query.filter(Slot.event_id == event.id, Slot.status != "Cancelled").order_by(Slot.date, Slot.start_time).all()
    return jsonify([s.to_dict() for s in slots])