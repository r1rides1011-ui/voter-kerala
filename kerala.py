from pymongo import MongoClient
import requests
from requests.adapters import HTTPAdapter, Retry

# ---------------------------------------------------------
#  🔥 FAST HTTP SESSION (keeps connection alive)
# ---------------------------------------------------------
session = requests.Session()
retries = Retry(total=5, backoff_factor=0.2)
session.mount("https://", HTTPAdapter(max_retries=retries))


# ---------------------------------------------------------
#  🔥 MONGODB CONNECTION
# ---------------------------------------------------------
MONGO_URI = "mongodb+srv://despicablehaythamkenway:egEI0lJZVEZ3Kgz3@cluster0.ateoqxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "kerala_voters_db"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

print("✔ Connected to MongoDB!")


# ---------------------------------------------------------
#  🔥 DISTRICT MASTER LIST (OFFICIAL)
# ---------------------------------------------------------
districts = [
    {"district_objid": 1,  "district_code": "01", "district_name": "KASARGOD"},
    {"district_objid": 2,  "district_code": "02", "district_name": "KANNUR"},
    {"district_objid": 3,  "district_code": "03", "district_name": "WAYANAD"},
    {"district_objid": 4,  "district_code": "04", "district_name": "KOZHIKODE"},
    {"district_objid": 5,  "district_code": "05", "district_name": "MALAPPURAM"},
    {"district_objid": 6,  "district_code": "06", "district_name": "PALAKKAD"},
    {"district_objid": 7,  "district_code": "07", "district_name": "THRISSUR"},
    {"district_objid": 8,  "district_code": "08", "district_name": "ERNAKULAM"},
    {"district_objid": 9,  "district_code": "09", "district_name": "IDUKKI"},
    {"district_objid": 10, "district_code": "10", "district_name": "KOTTAYAM"},
    {"district_objid": 11, "district_code": "11", "district_name": "ALAPPUZHA"},
    {"district_objid": 12, "district_code": "12", "district_name": "PATHANAMTHITTA"},
    {"district_objid": 13, "district_code": "13", "district_name": "KOLLAM"},
    {"district_objid": 14, "district_code": "14", "district_name": "THIRUVANANTHAPURAM"},
]

# Clean existing
db.districts.delete_many({})
db.local_bodies.delete_many({})
db.districts.insert_many(districts)

print("✔ Districts seeded!")


# ---------------------------------------------------------
#  🔥 SEC API ENDPOINT
# ---------------------------------------------------------
SEC_LB_URL = "https://sec.kerala.gov.in/public/getalllbcmp/byd"


# ---------------------------------------------------------
#  🔥 LOCAL BODY CLEAN FUNCTION
# ---------------------------------------------------------
def clean_local_body(item, district_code):
    """
    Example:
        text: "G07002-Kottuvally"
        value: "abcXYZ..."
    """

    text = item["text"].strip()

    # FIX: split only once, preserve remaining hyphens
    code, name = text.split("-", 1)

    code = code.strip()
    name = name.strip()

    # Determine LB type
    if code.startswith("G"):
        lb_type = "GP"
    elif code.startswith("M"):
        lb_type = "MUN"
    elif code.startswith("C"):
        lb_type = "CORP"
    else:
        lb_type = "UNKNOWN"

    return {
        "_id": code,
        "lb_code": code,
        "lb_name": name,
        "lb_type": lb_type,
        "district_code": district_code,    # ✔ FIX: Use actual district code, not sliced code
        "sec_object_id": item["value"],
        "full_name": text
    }


# ---------------------------------------------------------
#  🔥 SEED ALL LOCAL BODIES (FAST)
# ---------------------------------------------------------
def seed_lbs():
    print("🚀 Starting local body seeding ...\n")

    for d in districts:
        district_objid = d["district_objid"]
        district_code = d["district_code"]

        print(f"➡️  Fetching LBs for District {district_code} ({d['district_name']}) ...")

        res = session.post(
            SEC_LB_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=f"objid={district_objid}"
        )

        json_data = res.json()
        ops1 = json_data.get("ops1", [])

        cleaned = [clean_local_body(lb, district_code) for lb in ops1]

        db.local_bodies.insert_many(cleaned)

        print(f"   ✔ Inserted {len(cleaned)} LBs for district {district_code}\n")

    print("🎉 ALL LOCAL BODIES SEEDED SUCCESSFULLY!")


# ---------------------------------------------------------
#  🚀 START SEEDING
# ---------------------------------------------------------
seed_lbs()
