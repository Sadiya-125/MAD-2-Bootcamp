from extensions import cache
from flask import jsonify

TTL = 300

def cached(key, producer, timeout=TTL):
    value = cache.get(key)
    if value is not None:
        return value, True
    value = producer()
    cache.set(key, value, timeout=timeout)
    return value, False

def cache_response(data, hit):
    response = jsonify(data)
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response

def events_version():
    return cache.get("events_version") or 1

def clear_event_cache(event_id = None):
    cache.set("events_version", events_version() + 1, timeout=0)
    cache.delete("tracks:active")
    if event_id:
        cache.delete_many(f"event:{event_id}", f"event:{event_id}:slots")