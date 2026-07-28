from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    mongodb_url: str = Field(default="mongodb://localhost:27017/routine_tracker", validation_alias="MONGODB_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", validation_alias="REDIS_URL")
    
    twilio_account_sid: str = Field(default="", validation_alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = Field(default="", validation_alias="TWILIO_AUTH_TOKEN")
    twilio_phone_number: str = Field(default="", validation_alias="TWILIO_PHONE_NUMBER")
    
    # Timezone for scheduling routine checks
    timezone: str = Field(default="Asia/Kolkata", validation_alias="TIMEZONE")
    
    # The public URL of the application, used to expose Twilio webhooks
    public_url: str = Field(default="http://localhost:3000", validation_alias="PUBLIC_URL")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
