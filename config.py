import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', '56HiLZxY6Sl4NgBp8wT0FhiJ36vD1i1TWWzx-N3vEGM')

    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, 'demoday.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    ADMIN_NAME = "Super Admin"
    ADMIN_EMAIL = "admin@demoday.local"
    ADMIN_PASSWORD = "admin123"