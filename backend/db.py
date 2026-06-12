"""MongoDB client and base document helpers."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = _client[os.environ['DB_NAME']]


async def init_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.email_verifications.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.tickets.create_index("user_id")
    await db.servers.create_index("user_id")
    await db.invoices.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
