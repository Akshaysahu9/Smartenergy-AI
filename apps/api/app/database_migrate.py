from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

METER_COLUMNS = [
    ("data_source", "VARCHAR(50) DEFAULT 'simulated'"),
    ("api_key", "VARCHAR(64)"),
    ("location", "VARCHAR(255) DEFAULT ''"),
    ("utility_provider", "VARCHAR(255) DEFAULT 'MPMKVVCL'"),
    ("prepaid_balance_inr", "FLOAT DEFAULT 238.98"),
    ("connection_status", "VARCHAR(50) DEFAULT 'connected'"),
    ("low_balance_threshold_inr", "FLOAT DEFAULT 50.0"),
    ("consumer_number", "VARCHAR(50) DEFAULT ''"),
    ("meter_serial", "VARCHAR(50) DEFAULT ''"),
]


async def ensure_meter_columns(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            result = await conn.execute(text("PRAGMA table_info(meters)"))
            existing = {row[1] for row in result.fetchall()}
            for name, col_type in METER_COLUMNS:
                if name not in existing:
                    await conn.execute(text(f"ALTER TABLE meters ADD COLUMN {name} {col_type}"))
            await conn.execute(
                text(
                    "UPDATE meters SET prepaid_balance_inr = 238.98 "
                    "WHERE prepaid_balance_inr IS NULL OR prepaid_balance_inr = 0"
                )
            )
            await conn.execute(
                text(
                    "UPDATE meters SET connection_status = 'connected' "
                    "WHERE connection_status IS NULL OR connection_status = ''"
                )
            )
            await conn.execute(
                text(
                    "UPDATE meters SET consumer_number = printf('CONS-%s', substr(hex(id), 1, 8)) "
                    "WHERE consumer_number IS NULL OR consumer_number = ''"
                )
            )
            await conn.execute(
                text(
                    "UPDATE meters SET meter_serial = printf('MTR-%s', substr(hex(id), 1, 10)) "
                    "WHERE meter_serial IS NULL OR meter_serial = ''"
                )
            )
        else:
            for name, col_type in METER_COLUMNS:
                await conn.execute(
                    text(f"ALTER TABLE meters ADD COLUMN IF NOT EXISTS {name} {col_type}")
                )
