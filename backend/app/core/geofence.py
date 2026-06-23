import math


def distanz_meter(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine-Distanz zwischen zwei Punkten in Metern."""
    erdradius_m = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * erdradius_m * math.asin(math.sqrt(a))


def innerhalb_geofence(
    lat: float, lon: float, geofence_lat: float, geofence_lon: float, radius_meter: float
) -> bool:
    return distanz_meter(lat, lon, geofence_lat, geofence_lon) <= radius_meter
