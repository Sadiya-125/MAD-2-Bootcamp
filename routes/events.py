from flask import Blueprint, request
from sqlalchemy import or_
from extensions import db
from models import Track, Event, Slot
from utils import error, role_required
from cache_utils import cached, cache_response, events_version

events_bp = Blueprint("events", __name__, url_prefix="/api")
ANY_ROLE = ("admin", "judge", "participant")

@events_bp.get("/tracks")
@role_required(*ANY_ROLE)
def active_tracks():
    def load():
        tracks = Track.query.filter_by(status="Active").order_by(Track.name).all()
        return [{"id": t.id, "code": t.code, "name": t.name} for t in tracks]
    return cache_response(*cached("tracks:active", load))

@events_bp.get("/events")
@role_required(*ANY_ROLE)
def search_events():
    q = request.args.get("q", "").strip()
    track_id = request.args.get("track_id", type=int)
    level = request.args.get("level", "")
    mode = request.args.get("mode", "")

    def load():
        query = Event.query.filter(Event.status != "Draft")
        if q:
            query = query.filter(or_(Event.name.ilike(f"%{q}%"), Event.venue.ilike(f"%{q}%")))
        if track_id:
            query = query.filter(Event.track_id == track_id)
        if level:
            query = query.filter(Event.level == level)
        if mode:
            query = query.filter(Event.mode == mode)
        result = []
        for event in query.order_by(Event.booking_open_date.desc()).all():
            item = event.to_dict()
            item["booking_open"] = event.booking_open()
            result.append(item)
        return result

    key = f"events:v{events_version()}:{q.lower()}|{track_id}|{level}|{mode}"
    return cache_response(*cached(key, load))

@events_bp.get("/events/<int:event_id>")
@role_required(*ANY_ROLE)
def event_detail(event_id):
    def load():
        event = db.session.get(Event, event_id)
        if event is None or event.status == "Draft":
            return {}
        data = event.to_dict(detail=True)
        data["booking_open"] = event.booking_open()
        return data

    data, hit = cached(f"event:{event_id}", load)
    if not data:
        return error("Event Not Found", 404)
    return cache_response(data, hit)

@events_bp.get("/events/<int:event_id>/slots")
@role_required(*ANY_ROLE)
def event_schedule(event_id):
    def load():
        slots = Slot.query.filter(Slot.event_id == event_id, Slot.status != "Cancelled") \
            .order_by(Slot.date, Slot.start_time).all()
        return [s.to_dict() for s in slots]
    return cache_response(*cached(f"event:{event_id}:slots", load))