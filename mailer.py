import os
import json
from flask import current_app
import smtplib
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
import urllib.request

def send_email(to, subject, html, attachment_path=None):
    msg = MIMEMultipart()
    msg['From'] = current_app.config["MAIL_SENDER"]
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))
    if attachment_path:
        with open(attachment_path, 'rb') as f:
            part = MIMEApplication(f.read(), Name=os.path.basename(attachment_path))
        part['Content-Disposition'] = 'attachment; filename="%s"' % os.path.basename(attachment_path)
        msg.attach(part)

    try:
        with smtplib.SMTP(current_app.config["SMTP_HOST"], current_app.config["SMTP_PORT"]) as server:
            server.send_message(msg)
        return True
    except OSError as e:
        print(f"[mail] Failed to Send Email to {to}: {e} (Is MailHog Running?)")
        return False

def send_gchat(text):
    url = current_app.config["GCHAT_WEBHOOK_URL"]
    if not url:
        return False
    request = urllib.request.Request(url, data = json.dumps({"text": text}).encode(),
                                     headers={"Content-Type": "application/json; charset=UTF-8"})
    try:
        urllib.request.urlopen(request, timeout=10)
        return True
    except OSError as e:
        print(f"[gchat] Failed to Send Message: {e}")
        return False