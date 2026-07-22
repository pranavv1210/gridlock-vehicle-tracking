"""
Road Network Graph for Geospatial Vehicle Tracking
Defines camera nodes and their connections (edges) with distances
"""

# Bangalore Road Network Graph
# Each node is a camera location with connections to adjacent cameras

ROAD_NETWORK = {
    # Hub - MG Road (Central point)
    "hub_mgroad": {
        "name": "MG Road Junction",
        "lat": 12.9758,
        "lng": 77.6063,
        "type": "hub",
        "connections": [
            {"to": "node_1_indiranagar", "distance_km": 3.2, "road_name": "MG Road -> Indiranagar"},
            {"to": "node_2_koramangala", "distance_km": 5.8, "road_name": "MG Road -> Koramangala"},
            {"to": "node_3_silkboard", "distance_km": 8.5, "road_name": "MG Road -> Silk Board"},
            {"to": "cam_f_ulsoor", "distance_km": 2.5, "road_name": "MG Road -> Ulsoor"},
            {"to": "cam_e_btm", "distance_km": 4.2, "road_name": "MG Road -> BTM"},
        ]
    },
    
    # Node 1 - Indiranagar
    "node_1_indiranagar": {
        "name": "Indiranagar 100ft Road",
        "lat": 12.9719,
        "lng": 77.6412,
        "type": "checkpoint",
        "connections": [
            {"to": "hub_mgroad", "distance_km": 3.2, "road_name": "Indiranagar -> MG Road"},
            {"to": "node_2_koramangala", "distance_km": 4.5, "road_name": "Indiranagar -> Koramangala"},
            {"to": "cam_a_airport", "distance_km": 12.0, "road_name": "Indiranagar -> Airport Road"},
            {"to": "cam_b_whitefield", "distance_km": 10.5, "road_name": "Indiranagar -> Whitefield"},
        ]
    },
    
    # Node 2 - Koramangala
    "node_2_koramangala": {
        "name": "Koramangala 80ft Road",
        "lat": 12.9352,
        "lng": 77.6245,
        "type": "checkpoint",
        "connections": [
            {"to": "hub_mgroad", "distance_km": 5.8, "road_name": "Koramangala -> MG Road"},
            {"to": "node_1_indiranagar", "distance_km": 4.5, "road_name": "Koramangala -> Indiranagar"},
            {"to": "node_3_silkboard", "distance_km": 3.0, "road_name": "Koramangala -> Silk Board"},
            {"to": "cam_c_hsr", "distance_km": 2.5, "road_name": "Koramangala -> HSR Layout"},
        ]
    },
    
    # Node 3 - Silk Board
    "node_3_silkboard": {
        "name": "Silk Board Junction",
        "lat": 12.9180,
        "lng": 77.6220,
        "type": "exit",
        "connections": [
            {"to": "hub_mgroad", "distance_km": 8.5, "road_name": "Silk Board -> MG Road"},
            {"to": "node_2_koramangala", "distance_km": 3.0, "road_name": "Silk Board -> Koramangala"},
            {"to": "cam_d_electronic_city", "distance_km": 15.0, "road_name": "Silk Board -> Electronic City"},
            {"to": "cam_e_btm", "distance_km": 2.8, "road_name": "Silk Board -> BTM Layout"},
        ]
    },
    
    # Extended Cameras (from your image)
    "cam_a_airport": {
        "name": "Airport Road Camera",
        "lat": 13.0200,
        "lng": 77.6600,
        "type": "checkpoint",
        "connections": [
            {"to": "node_1_indiranagar", "distance_km": 12.0, "road_name": "Airport -> Indiranagar"},
        ]
    },
    
    "cam_b_whitefield": {
        "name": "Whitefield Junction",
        "lat": 12.9698,
        "lng": 77.7500,
        "type": "checkpoint",
        "connections": [
            {"to": "node_1_indiranagar", "distance_km": 10.5, "road_name": "Whitefield -> Indiranagar"},
        ]
    },
    
    "cam_c_hsr": {
        "name": "HSR Layout Sector 1",
        "lat": 12.9116,
        "lng": 77.6380,
        "type": "checkpoint",
        "connections": [
            {"to": "node_2_koramangala", "distance_km": 2.5, "road_name": "HSR -> Koramangala"},
            {"to": "cam_d_electronic_city", "distance_km": 12.0, "road_name": "HSR -> Electronic City"},
        ]
    },
    
    "cam_d_electronic_city": {
        "name": "Electronic City Toll",
        "lat": 12.8400,
        "lng": 77.6600,
        "type": "exit",
        "connections": [
            {"to": "node_3_silkboard", "distance_km": 15.0, "road_name": "E-City -> Silk Board"},
            {"to": "cam_c_hsr", "distance_km": 12.0, "road_name": "E-City -> HSR"},
        ]
    },
    
    "cam_e_btm": {
        "name": "BTM Layout 2nd Stage",
        "lat": 12.9165,
        "lng": 77.6101,
        "type": "checkpoint",
        "connections": [
            {"to": "node_3_silkboard", "distance_km": 2.8, "road_name": "BTM -> Silk Board"},
            {"to": "node_2_koramangala", "distance_km": 3.5, "road_name": "BTM -> Koramangala"},
            {"to": "hub_mgroad", "distance_km": 4.2, "road_name": "BTM -> MG Road"},
        ]
    },
    
    # Additional cameras from map (based on red circles in image)
    "cam_f_ulsoor": {
        "name": "Ulsoor Lake Road",
        "lat": 12.9850,
        "lng": 77.6150,
        "type": "checkpoint",
        "connections": [
            {"to": "hub_mgroad", "distance_km": 2.5, "road_name": "Ulsoor -> MG Road"},
            {"to": "node_1_indiranagar", "distance_km": 3.0, "road_name": "Ulsoor -> Indiranagar"},
        ]
    },
    
    "cam_g_marathahalli": {
        "name": "Marathahalli Bridge",
        "lat": 12.9591,
        "lng": 77.7015,
        "type": "checkpoint",
        "connections": [
            {"to": "cam_b_whitefield", "distance_km": 4.5, "road_name": "Marathahalli -> Whitefield"},
            {"to": "node_1_indiranagar", "distance_km": 6.5, "road_name": "Marathahalli -> Indiranagar"},
        ]
    },
    
    "cam_h_bannerghatta": {
        "name": "Bannerghatta Road",
        "lat": 12.8850,
        "lng": 77.5950,
        "type": "checkpoint",
        "connections": [
            {"to": "cam_e_btm", "distance_km": 3.8, "road_name": "Bannerghatta -> BTM"},
            {"to": "cam_d_electronic_city", "distance_km": 8.0, "road_name": "Bannerghatta -> E-City"},
        ]
    },
    
    "cam_i_jp_nagar": {
        "name": "JP Nagar 4th Phase",
        "lat": 12.9050,
        "lng": 77.5850,
        "type": "checkpoint",
        "connections": [
            {"to": "node_2_koramangala", "distance_km": 4.2, "road_name": "JP Nagar -> Koramangala"},
            {"to": "cam_h_bannerghatta", "distance_km": 2.5, "road_name": "JP Nagar -> Bannerghatta"},
        ]
    },
    
    "cam_j_yeshwanthpur": {
        "name": "Yeshwanthpur Junction",
        "lat": 13.0280,
        "lng": 77.5390,
        "type": "checkpoint",
        "connections": [
            {"to": "hub_mgroad", "distance_km": 7.5, "road_name": "Yeshwanthpur -> MG Road"},
            {"to": "cam_a_airport", "distance_km": 8.5, "road_name": "Yeshwanthpur -> Airport"},
        ]
    },
    
    "cam_k_hebbal": {
        "name": "Hebbal Flyover",
        "lat": 13.0358,
        "lng": 77.5970,
        "type": "checkpoint",
        "connections": [
            {"to": "cam_a_airport", "distance_km": 5.0, "road_name": "Hebbal -> Airport"},
            {"to": "cam_j_yeshwanthpur", "distance_km": 6.2, "road_name": "Hebbal -> Yeshwanthpur"},
        ]
    },
    
    "cam_l_kr_puram": {
        "name": "KR Puram Railway Station",
        "lat": 13.0050,
        "lng": 77.6950,
        "type": "checkpoint",
        "connections": [
            {"to": "cam_b_whitefield", "distance_km": 5.5, "road_name": "KR Puram -> Whitefield"},
            {"to": "cam_a_airport", "distance_km": 8.0, "road_name": "KR Puram -> Airport"},
        ]
    },
}

# Traffic multipliers for ETA calculation
TRAFFIC_MULTIPLIERS = {
    "city_center": 1.8,  # Heavy traffic (MG Road, Koramangala)
    "urban": 1.4,        # Moderate traffic (Indiranagar, BTM)
    "highway": 1.1,      # Light traffic (Airport Road, Electronic City)
    "peak_hour": 2.2,    # Rush hour multiplier
}

# Average speed assumptions (km/h)
AVERAGE_SPEEDS = {
    "city_center": 20,
    "urban": 30,
    "highway": 50,
}

def get_connected_cameras(camera_id):
    """Get all cameras connected to the given camera"""
    if camera_id not in ROAD_NETWORK:
        return []
    return ROAD_NETWORK[camera_id]["connections"]

def get_camera_info(camera_id):
    """Get camera metadata"""
    return ROAD_NETWORK.get(camera_id, None)

def calculate_eta(distance_km, road_type="urban"):
    """Calculate ETA in minutes"""
    speed = AVERAGE_SPEEDS.get(road_type, 30)
    traffic = TRAFFIC_MULTIPLIERS.get(road_type, 1.4)
    
    time_hours = distance_km / speed
    time_minutes = time_hours * 60 * traffic
    
    return round(time_minutes, 1)

def get_all_camera_ids():
    """Get list of all camera IDs"""
    return list(ROAD_NETWORK.keys())
