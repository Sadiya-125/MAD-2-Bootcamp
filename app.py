from flask import Flask, render_template
from config import Config
from extensions import db, jwt, cache
from models import User
from celery_app import celery_init_app
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.judge import judge_bp
from routes.events import events_bp
from routes.participant import participant_bp

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
    cache.init_app(app)
    celery_init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(judge_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(participant_bp)

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
    @app.route('/<path:path>')
    def index(path=''):
        # Let the Vue router handle client-side routes (history mode)
        return render_template("index.html")

    return app

app = create_app()
celery_app = app.extensions["celery"] # celery -A app.celery_app worker -l info

if __name__ == '__main__':
    app.run(debug=True)