from flask import Blueprint, request, jsonify
from extensions import db
from models import Track
from utils import error, missing_fields, role_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

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
    return jsonify(track.to_dict())

@admin_bp.delete("/tracks/<int:track_id>")
@role_required("admin")
def delete_track(track_id):
    track = db.get_or_404(Track, track_id)
    if track.events:
        return error(f"Cannot Delete Track '{track.code}' as it has Associated Events. Archive the Track Instead.")
    db.session.delete(track)
    db.session.commit()
    return jsonify({"message": f"Track '{track.code}' Deleted."})