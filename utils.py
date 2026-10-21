from datetime import datetime 
from functools import wraps
import re
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from extensions import db
from models import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def error(message, code=400):
    return jsonify({"message": message}), code

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def decorated(*args, **kwargs): #tracks/track_id=3
            verify_jwt_in_request()
            if get_jwt().get("role") not in roles:
                return error("You Do Not have Permission to Access this Resource.", 403)
            user = db.session.get(User, int(get_jwt_identity()))
            if user is None or user.status != "Active":
                return error("Your Account is Not Active.", 403)
            return fn(*args, **kwargs)
        return decorated
    return wrapper

def current_user():
    return db.session.get(User, int(get_jwt_identity()))

def missing_fields(data, fields):
    return [f for f in fields if data.get(f) in (None, "")]

def valid_email(email):
    return bool(email and EMAIL_RE.match(email))

def parse_date(value): # 2026-10-21
    return datetime.strptime(value, "%Y-%m-%d").date()

def parse_time(value): # 14:30
    return datetime.strptime(value, "%H:%M").time()