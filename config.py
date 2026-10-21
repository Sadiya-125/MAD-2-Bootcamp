from datetime import timedelta
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', '56HiLZxY6Sl4NgBp8wT0FhiJ36vD1i1TWWzx-N3vEGM')

    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, 'demoday.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'eylHRnQ3QVtLXo19Pqo82wLsSO9UZX9wVFn-L5_R2aM')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    ADMIN_NAME = "Super Admin"
    ADMIN_EMAIL = "admin@demoday.local"
    ADMIN_PASSWORD = "admin123"