from config.db import mongodb
from models.user import User

class UserRepository:
    def get_collection(self):
        db = mongodb.get_db()
        # Singular naming collection
        return db.user

    def get_by_phone(self, phone: str):
        col = self.get_collection()
        return col.find_one({"phone": phone})

    def get_by_id(self, user_id: str):
        col = self.get_collection()
        return col.find_one({"id": user_id})

    def create(self, user: User):
        col = self.get_collection()
        doc = user.model_dump()
        # Ensure dates are compatible if needed, standard Pydantic dumps datetime objects properly
        col.insert_one(doc)
        return doc

    def update(self, user_id: str, data: dict):
        col = self.get_collection()
        col.update_one({"id": user_id}, {"$set": data})
        return col.find_one({"id": user_id})

user_repository = UserRepository()
