from flask import Flask
from config import Config
from extensions import db
from models import User

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