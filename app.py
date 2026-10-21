from flask import Flask
from config import Config
from extensions import db, jwt
from models import User
from routes.auth import auth_bp
from routes.admin import admin_bp

def create_admin():
    if User.query.filter_by(role='admin').first() is None:
        admin = User(
            name=Config.ADMIN_NAME,
            email=Config.ADMIN_EMAIL,
            role='admin'
        )
        admin.set_password(Config.ADMIN_PASSWORD)

        db.session.add(admin)
        db.session.commit()
        print(f"Admin Created: {Config.ADMIN_EMAIL} with Password: {Config.ADMIN_PASSWORD}")
        
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    @app.errorhandler(404)
    def not_found(e):
        return {"message": "Resource Not Found."}, 404

    @app.errorhandler(405)
    def not_allowed(e):
        return {"message": "Method Not Allowed."}, 405

    with app.app_context():
        db.create_all()
        create_admin()

    @app.route('/')
    def index():
        return {"message": "Demo Day API is Running!"}

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)