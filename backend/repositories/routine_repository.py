from config.db import mongodb
from models.routine import Routine

class RoutineRepository:
    def get_collection(self):
        db = mongodb.get_db()
        # Singular naming collection
        return db.routine

    def get_by_user_id(self, user_id: str):
        col = self.get_collection()
        return list(col.find({"userId": user_id}))

    def get_by_id(self, routine_id: str):
        col = self.get_collection()
        return col.find_one({"id": routine_id})

    def create(self, routine: Routine):
        col = self.get_collection()
        doc = routine.model_dump()
        col.insert_one(doc)
        return doc

    def update(self, routine_id: str, data: dict):
        col = self.get_collection()
        col.update_one({"id": routine_id}, {"$set": data})
        return col.find_one({"id": routine_id})

    def delete(self, routine_id: str):
        col = self.get_collection()
        res = col.delete_one({"id": routine_id})
        return res.deleted_count > 0

    def get_all_routines(self):
        col = self.get_collection()
        return list(col.find({}))

routine_repository = RoutineRepository()
