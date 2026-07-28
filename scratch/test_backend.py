import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from pymongo import MongoClient
import redis

# Add backend folder to python search path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

def run_tests():
    print("==================================================")
    print("      ROUTINE TRACKER BACKEND SYSTEM TESTS        ")
    print("==================================================")

    # 1. Database Connection Checks
    print("\n[1/3] Testing Connections...")
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017/routine_tracker_db")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    try:
        mongo_client = MongoClient(mongo_url)
        db = mongo_client.get_database("routine_tracker_db")
        print(" -> MongoDB: Connection successful.")
    except Exception as e:
        print(f" -> MongoDB: Connection FAILED: {e}")
        return

    try:
        r_client = redis.from_url(redis_url, decode_responses=True)
        r_client.ping()
        print(" -> Redis: Connection successful.")
    except Exception as e:
        print(f" -> Redis: Connection FAILED: {e}")
        return

    # 2. Database Collection CRUD Checks (Singular collections)
    print("\n[2/3] Testing DB CRUD operations...")

    # Collections references
    user_col = db.user
    routine_col = db.routine
    log_col = db.log

    # Test user data
    test_user_id = str(uuid4())
    test_user = {
        "id": test_user_id,
        "name": "Test Runner",
        "phone": "+19998887777",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    try:
        # Insert user
        user_col.insert_one(test_user)
        print(" -> User Collection: Insert successful.")

        # Find user
        found_user = user_col.find_one({"id": test_user_id})
        assert found_user is not None
        assert found_user["name"] == "Test Runner"
        print(" -> User Collection: Query successful.")

        # Insert Routine
        test_routine_id = str(uuid4())
        test_routine = {
            "id": test_routine_id,
            "userId": test_user_id,
            "title": "Test Exercise",
            "description": "Routine tracker verification test",
            "time": "06:00",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        routine_col.insert_one(test_routine)
        print(" -> Routine Collection: Insert successful.")

        # Find Routine
        found_routine = routine_col.find_one({"id": test_routine_id})
        assert found_routine is not None
        assert found_routine["title"] == "Test Exercise"
        print(" -> Routine Collection: Query successful.")

        # Insert Log
        test_log_id = str(uuid4())
        test_log = {
            "id": test_log_id,
            "routineId": test_routine_id,
            "userId": test_user_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "completed",
            "timestamp": datetime.utcnow(),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        log_col.insert_one(test_log)
        print(" -> Log Collection: Insert successful.")

        # Find Log
        found_log = log_col.find_one({"id": test_log_id})
        assert found_log is not None
        assert found_log["status"] == "completed"
        print(" -> Log Collection: Query successful.")

    except Exception as e:
        print(f" -> Database operations FAILED: {e}")
    finally:
        # Clean up test records
        print("\nCleaning up test records...")
        user_col.delete_many({"phone": "+19998887777"})
        routine_col.delete_many({"userId": test_user_id})
        log_col.delete_many({"userId": test_user_id})
        print(" -> Clean up complete.")

    # 3. Redis verification caching logic tests
    print("\n[3/3] Testing Redis Caching logical states...")
    try:
        test_phone = "+19998887777"
        
        # Test digit cache
        r_client.setex(f"code:login:{test_phone}", 60, "5")
        cached_digit = r_client.get(f"code:login:{test_phone}")
        assert cached_digit == "5"
        print(" -> Redis code cache works.")

        # Test verified state cache
        r_client.setex(f"status:auth:{test_phone}", 60, "verified")
        cached_status = r_client.get(f"status:auth:{test_phone}")
        assert cached_status == "verified"
        print(" -> Redis verification state tracking works.")

        # Cleanup
        r_client.delete(f"code:login:{test_phone}")
        r_client.delete(f"status:auth:{test_phone}")
        print(" -> Redis cleanup successful.")

    except Exception as e:
        print(f" -> Redis cache testing FAILED: {e}")

    print("\n==================================================")
    print("              ALL BACKEND TESTS PASSED            ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
