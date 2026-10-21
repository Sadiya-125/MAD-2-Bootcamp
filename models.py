from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

ROLES = ["admin", "judge", "participant"]
USER_STATUSES = ["Active", "Inactive", "Blacklisted"]
EVENT_STATUSES = ["Draft", "Slot Creation", "Booking Open", "Closed", "Completed"]
EVENT_MODES = ["Online", "Offline"]
EVENT_LEVELS = ["Beginner", "Intermediate", "Advanced"]
SLOT_STATUSES = ["Available", "Full", "Cancelled", "Completed"]
BOOKING_STATUSES = ["Booked", "Cancelled", "Completed"]

event_judges = db.Table(
    "event_judges",
    db.Column("event_id", db.Integer, db.ForeignKey("event.id"), primary_key=True),
    db.Column("judge_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="participant")
    phone = db.Column(db.String(20))
    organization = db.Column(db.String(120))
    status = db.Column(db.String(20), nullable=False, default="Active")
    created_at = db.Column(db.DateTime, default=datetime.now)

    judge_profile = db.relationship("JudgeProfile", backref="user", uselist=False,
                                    cascade="all, delete-orphan")

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        data = {
            "id": self.id, "name": self.name, "email": self.email, "role": self.role,
            "phone": self.phone, "organization": self.organization, "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if self.judge_profile:
            data["expertise"] = self.judge_profile.expertise
            data["designation"] = self.judge_profile.designation
        return data

class JudgeProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    expertise = db.Column(db.String(120))
    designation = db.Column(db.String(120))

class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="Active")   # Active / Archived

    events = db.relationship("Event", backref="track", lazy=True)

    def to_dict(self):
        return {"id": self.id, "code": self.code, "name": self.name,
                "description": self.description, "status": self.status,
                "event_count": len(self.events)}

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey("track.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    mode = db.Column(db.String(20), nullable=False, default="Online")          # Online / Offline
    venue = db.Column(db.String(150))
    level = db.Column(db.String(20), nullable=False, default="Beginner")
    duration_min = db.Column(db.Integer, nullable=False, default=15)
    max_score = db.Column(db.Integer, nullable=False, default=100)
    instructions = db.Column(db.Text)
    slot_open_date = db.Column(db.Date, nullable=False)
    slot_close_date = db.Column(db.Date, nullable=False)
    booking_open_date = db.Column(db.Date, nullable=False)
    booking_close_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Draft")
    results_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    judges = db.relationship("User", secondary=event_judges, backref="assigned_events")
    criteria = db.relationship("Criterion", backref="event", cascade="all, delete-orphan")
    slots = db.relationship("Slot", backref="event", cascade="all, delete-orphan")

    def slot_creation_open(self):
        today = date.today()
        return self.status == "Slot Creation" and self.slot_open_date <= today <= self.slot_close_date

    def booking_open(self):
        today = date.today()
        return self.status == "Booking Open" and self.booking_open_date <= today <= self.booking_close_date

    def to_dict(self, detail=False):
        data = {
            "id": self.id, "track_id": self.track_id,
            "track_name": self.track.name if self.track else None,
            "name": self.name, "mode": self.mode, "venue": self.venue, "level": self.level,
            "duration_min": self.duration_min, "max_score": self.max_score,
            "instructions": self.instructions,
            "slot_open_date": self.slot_open_date.isoformat(),
            "slot_close_date": self.slot_close_date.isoformat(),
            "booking_open_date": self.booking_open_date.isoformat(),
            "booking_close_date": self.booking_close_date.isoformat(),
            "status": self.status, "results_published": self.results_published,
            "judge_count": len(self.judges), "slot_count": len(self.slots),
        }
        if detail:
            data["criteria"] = [c.to_dict() for c in self.criteria]
            data["judges"] = [{"id": j.id, "name": j.name, "email": j.email} for j in self.judges]
        return data

class Criterion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)
    weightage = db.Column(db.Float, nullable=False)  # Out of 100
    description = db.Column(db.String(300))

    def to_dict(self):
        return {"id": self.id, "event_id": self.event_id, "name": self.name,
                "max_marks": self.max_marks, "weightage": self.weightage,
                "description": self.description}

class Slot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    judge_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    capacity = db.Column(db.Integer, nullable=False, default=1)
    booked_count = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="Available")
    meeting_link = db.Column(db.String(255))

    judge = db.relationship("User")
    bookings = db.relationship("Booking", backref="slot", lazy=True)

    @property
    def available_seats(self):
        return self.capacity - self.booked_count

    def to_dict(self):
        return {
            "id": self.id, "event_id": self.event_id,
            "event_name": self.event.name if self.event else None,
            "judge_id": self.judge_id, "judge_name": self.judge.name if self.judge else None,
            "date": self.date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "capacity": self.capacity, "booked_count": self.booked_count,
            "available_seats": self.available_seats, "status": self.status,
            "meeting_link": self.meeting_link,
        }

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("slot.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    project_title = db.Column(db.String(150), nullable=False)
    booked_at = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), nullable=False, default="Booked")

    participant = db.relationship("User", backref="bookings")
    event = db.relationship("Event")
    evaluation = db.relationship("Evaluation", backref="booking", uselist=False,
                                 cascade="all, delete-orphan")

    def to_dict(self, include_result=False):
        data = {
            "id": self.id, "participant_id": self.participant_id,
            "participant_name": self.participant.name,
            "participant_email": self.participant.email,
            "slot_id": self.slot_id, "event_id": self.event_id,
            "event_name": self.event.name, "track_name": self.event.track.name,
            "date": self.slot.date.isoformat(),
            "start_time": self.slot.start_time.strftime("%H:%M"),
            "end_time": self.slot.end_time.strftime("%H:%M"),
            "judge_name": self.slot.judge.name, "meeting_link": self.slot.meeting_link,
            "project_title": self.project_title,
            "booked_at": self.booked_at.isoformat() if self.booked_at else None,
            "status": self.status,
            "evaluated": self.evaluation is not None,
        }
        if include_result and self.evaluation:
            data["result"] = self.evaluation.to_dict()
        return data

class Evaluation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), unique=True, nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    judge_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    total_score = db.Column(db.Float, nullable=False, default=0)
    remarks = db.Column(db.Text)
    evaluated_at = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), nullable=False, default="Submitted")

    judge = db.relationship("User", foreign_keys=[judge_id])
    scores = db.relationship("CriterionScore", backref="evaluation", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "booking_id": self.booking_id, "judge_name": self.judge.name,
            "total_score": round(self.total_score, 2), "remarks": self.remarks,
            "evaluated_at": self.evaluated_at.isoformat() if self.evaluated_at else None,
            "status": self.status,
            "scores": [s.to_dict() for s in self.scores],
        }

class CriterionScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluation.id"), nullable=False)
    criterion_id = db.Column(db.Integer, db.ForeignKey("criterion.id"), nullable=False)
    marks = db.Column(db.Float, nullable=False)

    criterion = db.relationship("Criterion")

    def to_dict(self):
        return {"criterion_id": self.criterion_id, "criterion_name": self.criterion.name,
                "max_marks": self.criterion.max_marks, "marks": self.marks}