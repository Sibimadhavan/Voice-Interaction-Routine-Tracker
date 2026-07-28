from config.db import mongodb
from models.log import Log

class LogRepository:
    def get_collection(self):
        db = mongodb.get_db()
        # Singular naming collection
        return db.log

    def get_by_user_and_date(self, user_id: str, date_str: str):
        col = self.get_collection()
        return list(col.find({"userId": user_id, "date": date_str}))

    def get_by_user_and_date_range(self, user_id: str, start_date: str, end_date: str):
        col = self.get_collection()
        return list(col.find({
            "userId": user_id,
            "date": {"$gte": start_date, "$lte": end_date}
        }))

    def get_log(self, user_id: str, routine_id: str, date_str: str):
        col = self.get_collection()
        return col.find_one({"userId": user_id, "routineId": routine_id, "date": date_str})

    def create_or_update(self, log: Log):
        col = self.get_collection()
        doc = log.model_dump()
        col.update_one(
            {"userId": log.userId, "routineId": log.routineId, "date": log.date},
            {"$set": doc},
            upsert=True
        )
        return col.find_one({"userId": log.userId, "routineId": log.routineId, "date": log.date})

    def get_by_id(self, log_id: str):
        col = self.get_collection()
        return col.find_one({"id": log_id})

log_repository = LogRepository()
