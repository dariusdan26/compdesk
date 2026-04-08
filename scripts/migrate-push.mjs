import 'dotenv/config'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const sql = [
  `CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`,
  `CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`,
]

for (const stmt of sql) {
  await client.execute(stmt)
  console.log('OK:', stmt.split('\n')[0])
}

const check = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='PushSubscription'`)
console.log('Verify:', check.rows)
