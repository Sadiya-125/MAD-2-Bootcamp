import random
from datetime import date, time, timedelta, datetime
from app import app, create_admin
from extensions import db
from models import (User, JudgeProfile, Track, Event, Criterion, Slot, Booking,
                    Evaluation, CriterionScore)

random.seed(7)
today = date.today()

def d(days):
    return today + timedelta(days=days)

def make_user(name, email, role, org, password):
    user = User(name=name, email=email, role=role, organization=org, phone="98765" + str(random.randint(10000, 99999)))
    user.set_password(password)
    db.session.add(user)
    return user

with app.app_context():
    db.drop_all()
    db.create_all()
    create_admin()

    tracks = [Track(code="AI", name="AI / ML", description="Models, agents and data products"),
              Track(code="WEB", name="Web Apps", description="Full-stack web applications"),
              Track(code="IOT", name="IoT & Hardware", description="Sensors, devices and embedded")]
    db.session.add_all(tracks)

    judges = []
    for name, email, exp in [("Dr. Kavya Rao", "kavya@demoday.local", "AI/ML"),
                             ("Arjun Mehta", "arjun@demoday.local", "Web"),
                             ("Priya Nair", "priya@demoday.local", "IoT")]:
        judge = make_user(name, email, "judge", "Industry Mentor", "judge123")
        judge.judge_profile = JudgeProfile(expertise=exp, designation="Senior Engineer")
        judges.append(judge)

    participants = [make_user(n, f"{n.split()[0].lower()}@student.local", "participant", org, "pass123")
                    for n, org in [("Asha Verma", "IIT Madras"), ("Rahul Das", "IIT Madras"),
                                   ("Sneha Iyer", "NIT Trichy"), ("Vikram Singh", "BITS Pilani"),
                                   ("Meera Joshi", "IIIT Hyderabad"), ("Karan Patel", "VIT"),
                                   ("Divya Reddy", "IIT Madras"), ("Rohan Gupta", "DTU")]]

    def make_event(track, name, mode, level, offsets, status, venue=None, published=False):
        so, sc, bo, bc = offsets
        event = Event(track=track, name=name, mode=mode, level=level, venue=venue, duration_min=15,
                      max_score=100, status=status, results_published=published,
                      instructions="Bring a 3-minute pitch and a working demo.",
                      slot_open_date=d(so), slot_close_date=d(sc), booking_open_date=d(bo), booking_close_date=d(bc))
        for cname, mx, w in [("Innovation", 10, 30), ("Technical depth", 10, 40), ("Presentation", 5, 30)]:
            event.criteria.append(Criterion(name=cname, max_marks=mx, weightage=w))
        db.session.add(event)
        return event

    past = make_event(tracks[1], "Web Apps Showcase", "Offline", "Intermediate", (-30, -25, -24, -20),
                      "Completed", venue="Hall A", published=True)
    live = make_event(tracks[0], "AI Demo Round 1", "Online", "Beginner", (-3, -1, -1, 4), "Booking Open")
    upcoming = make_event(tracks[2], "IoT Build Night", "Offline", "Advanced", (0, 3, 4, 8),
                          "Slot Creation", venue="Maker Lab")
    make_event(tracks[0], "AI Finals", "Online", "Advanced", (10, 12, 13, 15), "Draft")

    past.judges = [judges[1], judges[0]]
    live.judges = [judges[0], judges[2]]
    upcoming.judges = [judges[2]]

    def make_slot(event, judge, day, hour, capacity):
        slot = Slot(event=event, judge=judge, date=d(day), start_time=time(hour, 0),
                    end_time=time(hour + 1, 0), capacity=capacity,
                    meeting_link=None if event.mode == "Offline" else "https://meet.example.com/demo")
        db.session.add(slot)
        return slot

    past_slots = [make_slot(past, judges[1], -18, 10, 3), make_slot(past, judges[0], -18, 14, 3)]
    live_slots = [make_slot(live, judges[0], 0, 10, 2), make_slot(live, judges[0], 1, 11, 3),
                  make_slot(live, judges[2], 2, 15, 3)]
    db.session.flush()

    def book(participant, slot, title, days_ago):
        slot.booked_count += 1
        slot.status = "Full" if slot.booked_count >= slot.capacity else "Available"
        booking = Booking(participant=participant, slot=slot, event_id=slot.event.id, project_title=title,
                          booked_at=datetime.now() - timedelta(days=days_ago))
        db.session.add(booking)
        return booking

    def evaluate(booking):
        evaluation = Evaluation(booking=booking, participant_id=booking.participant.id,
                                judge_id=booking.slot.judge.id, remarks="Good work, keep iterating!",
                                evaluated_at=datetime.combine(booking.slot.date, time(18, 0)))
        percent = 0
        for criterion in booking.slot.event.criteria:
            marks = random.randint(criterion.max_marks // 2, criterion.max_marks)
            evaluation.scores.append(CriterionScore(criterion=criterion, marks=marks))
            percent += marks / criterion.max_marks * criterion.weightage
        evaluation.total_score = round(percent, 2)
        booking.status = "Completed"
        db.session.add(evaluation)

    titles = ["SmartFarm", "MediTrack", "CampusCart", "EcoRoute", "StudyBuddy", "ParkEasy", "SafeWalk", "FoodShare"]
    for i, participant in enumerate(participants[:6]):
        evaluate(book(participant, past_slots[i % 2], titles[i], 22 - i % 3))
    for slot in past_slots:
        slot.status = "Completed"

    for i, participant in enumerate(participants[:5]):
        book(participant, live_slots[i % 3], titles[(i + 3) % 8], random.randint(0, 2))

    db.session.commit()
    print("Demo Data Ready: 3 Tracks, 3 Judges, 8 Participants, 4 Events.")
    print("Try: kavya@demoday.local / judge123   asha@student.local / pass123")
