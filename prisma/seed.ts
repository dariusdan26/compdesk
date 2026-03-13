import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcryptjs from 'bcryptjs'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {
  // Create default admin user
  const adminPassword = await bcryptjs.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Admin',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
    },
  })

  // Create a staff user for testing
  const staffPassword = await bcryptjs.hash('staff123', 12)
  await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      name: 'Staff Member',
      username: 'staff',
      password: staffPassword,
      role: 'staff',
    },
  })

  console.log('Database seeded successfully')
  console.log('Admin login: admin / admin123')
  console.log('Staff login: staff / staff123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
