from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from models import User
from extensions import db
from utils import current_user, missing_fields, error, role_required, valid_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    missing = missing_fields(data, ["name", "email", "password"])
    if missing:
        return error(f"Missing Fields: {', '.join(missing)}")
    email = data["email"].strip().lower()
    if not valid_email(email):
        return error("Invalid Email Address.")
    if len(data["password"]) < 6:
        return error("Password Must be at Least 6 Characters Long.")
    if User.query.filter_by(email=email).first():
        return error("Email Already Registered.", 409)

    user = User(name=data["name"].strip(), email=email, role="participant", phone=data.get("phone"), organization=data.get("organization")) 

    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User Registered Successfully.", "user": user.to_dict()}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(data.get("password", "")):
        return error("Invalid Email or Password.", 401)
    if user.status != "Active":
        return error(f"Your Account is {user.status}. Contact the Admin.", 403)

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role, "name": user.name})
    return jsonify({"token": token, "user": user.to_dict()})

@auth_bp.get("/me")
@role_required("admin", "participant", "judge")
def me():
    return jsonify(current_user().to_dict())

@auth_bp.put("/me")
@role_required("admin", "participant", "judge")
def update_me():
    user = current_user()
    data = request.get_json(silent=True) or {}
    if "name" in data:
        if not data["name"].strip():
            return error("Name Cannot be Empty.")
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = data["phone"]
    if "organization" in data:
        user.organization = data["organization"]
    if data.get("password"):
        if len(data["password"]) < 6:
            return error("Password Must be at Least 6 Characters Long.")
        user.set_password(data["password"])
    db.session.commit()
    return jsonify({"message": "Profile Updated Successfully.", "user": user.to_dict()})