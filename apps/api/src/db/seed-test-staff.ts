import 'dotenv/config'

import { eq, sql } from 'drizzle-orm'

import { hashPassword } from '../auth/password.js'
import { database, databasePool } from './client.js'
import {
  payoutAccounts,
  profiles,
  restaurantMembers,
  restaurants,
  riderProfiles,
  salesAgentProfiles,
  serviceAreas,
  userRoles,
  users,
} from './schema.js'

const TEST_PASSWORD = 'Password123!'

async function main() {
  const serviceArea = await ensureFashinaServiceArea()
  const rider = await ensureStaffUser({
    email: 'rider.fashina@mando.test',
    fullName: 'Fashina Test Rider',
    phone: '08000000011',
    role: 'rider',
  })
  const salesAgent = await ensureStaffUser({
    email: 'agent.fashina@mando.test',
    fullName: 'Fashina Test Sales Agent',
    phone: '08000000022',
    role: 'sales_agent',
  })
  const restaurantUser = await ensureStaffUser({
    email: 'restaurant.fashina@mando.test',
    fullName: 'Mama Chef Manager',
    phone: '08000000033',
    role: 'restaurant',
  })
  const restaurant = await ensureTestRestaurant(serviceArea.id)

  await database
    .insert(riderProfiles)
    .values({
      userId: rider.id,
      riderCode: 'RIDER-FASHINA-001',
      serviceAreaId: serviceArea.id,
      availabilityStatus: 'available',
    })
    .onConflictDoUpdate({
      target: riderProfiles.userId,
      set: {
        serviceAreaId: serviceArea.id,
        availabilityStatus: 'available',
        updatedAt: new Date(),
      },
    })

  await database
    .insert(salesAgentProfiles)
    .values({
      userId: salesAgent.id,
      agentCode: 'AGENT-FASHINA-001',
      referralCode: 'FASHINA001',
      status: 'active',
      tier: 'standard',
      commissionRateBps: 1000,
    })
    .onConflictDoUpdate({
      target: salesAgentProfiles.userId,
      set: {
        status: 'active',
        tier: 'standard',
        commissionRateBps: 1000,
        updatedAt: new Date(),
      },
    })

  await ensurePayoutAccount(rider.id, 'Fashina Test Rider', '0011')
  await ensurePayoutAccount(salesAgent.id, 'Fashina Test Sales Agent', '0022')
  await ensureRestaurantMembership(restaurant.id, restaurantUser.id)
  await ensureRestaurantPayoutAccount(restaurant.id, 'Mama Chef Cafe', '0033')

  console.log('Seeded test staff:')
  console.log(`- Rider: rider.fashina@mando.test / ${TEST_PASSWORD}`)
  console.log('- Rider code: RIDER-FASHINA-001')
  console.log(`- Sales agent: agent.fashina@mando.test / ${TEST_PASSWORD}`)
  console.log('- Sales agent referral code: FASHINA001')
  console.log(`- Restaurant: restaurant.fashina@mando.test / ${TEST_PASSWORD}`)
}

async function ensureFashinaServiceArea() {
  const [existingArea] = await database
    .select({
      id: serviceAreas.id,
      name: serviceAreas.name,
    })
    .from(serviceAreas)
    .where(sql`lower(${serviceAreas.name}) = 'fashina'`)
    .limit(1)

  if (existingArea) return existingArea

  const [createdArea] = await database
    .insert(serviceAreas)
    .values({
      name: 'Fashina',
      city: 'Ile-Ife',
      state: 'Osun',
      isActive: true,
    })
    .returning({
      id: serviceAreas.id,
      name: serviceAreas.name,
    })

  if (!createdArea) throw new Error('Unable to create Fashina service area.')
  return createdArea
}

async function ensureStaffUser(input: {
  email: string
  fullName: string
  phone: string
  role: 'rider' | 'sales_agent' | 'restaurant'
}) {
  const [existingUser] = await database
    .select({
      id: users.id,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${input.email}`)
    .limit(1)

  if (existingUser) {
    await database
      .update(users)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))

    await database
      .update(profiles)
      .set({
        fullName: input.fullName,
        phone: input.phone,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, existingUser.id))

    await database
      .insert(userRoles)
      .values({
        userId: existingUser.id,
        role: input.role,
      })
      .onConflictDoNothing()

    return existingUser
  }

  const [createdUser] = await database
    .insert(users)
    .values({
      email: input.email,
      passwordHash: await hashPassword(TEST_PASSWORD),
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .returning({
      id: users.id,
    })

  if (!createdUser) throw new Error(`Unable to create ${input.role}.`)

  await database.insert(profiles).values({
    userId: createdUser.id,
    fullName: input.fullName,
    phone: input.phone,
  })

  await database.insert(userRoles).values({
    userId: createdUser.id,
    role: input.role,
  })

  return createdUser
}

async function ensurePayoutAccount(
  userId: string,
  accountName: string,
  accountNumberLast4: string,
) {
  const [existingAccount] = await database
    .select({
      id: payoutAccounts.id,
    })
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, userId))
    .limit(1)

  if (existingAccount) return

  await database.insert(payoutAccounts).values({
    userId,
    bankCode: '000013',
    accountName,
    accountNumberEncrypted: `test-account-${accountNumberLast4}`,
    accountNumberLast4,
    isVerified: true,
  })
}

async function ensureTestRestaurant(serviceAreaId: string) {
  const [existingRestaurant] = await database
    .select({
      id: restaurants.id,
    })
    .from(restaurants)
    .where(eq(restaurants.slug, 'mama-chef-cafe'))
    .limit(1)

  if (existingRestaurant) {
    await database
      .update(restaurants)
      .set({
        serviceAreaId,
        status: 'active',
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, existingRestaurant.id))

    return existingRestaurant
  }

  const [createdRestaurant] = await database
    .insert(restaurants)
    .values({
      slug: 'mama-chef-cafe',
      name: 'Mama Chef Cafe',
      description: 'Local African dishes',
      phone: '08000000033',
      serviceAreaId,
      streetAddress: 'Fashina Road, Ile-Ife',
      minimumOrderAmount: 2500,
      preparationMinMinutes: 20,
      preparationMaxMinutes: 35,
      imageUrl: '/restaurant-dummy.png',
      status: 'active',
      isVerified: true,
      onboardedAt: new Date(),
    })
    .returning({
      id: restaurants.id,
    })

  if (!createdRestaurant) throw new Error('Unable to create test restaurant.')
  return createdRestaurant
}

async function ensureRestaurantMembership(restaurantId: string, userId: string) {
  await database
    .insert(restaurantMembers)
    .values({
      restaurantId,
      userId,
      membershipRole: 'owner',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: [restaurantMembers.restaurantId, restaurantMembers.userId],
      set: {
        membershipRole: 'owner',
        status: 'active',
        updatedAt: new Date(),
      },
    })
}

async function ensureRestaurantPayoutAccount(
  restaurantId: string,
  accountName: string,
  accountNumberLast4: string,
) {
  const [existingAccount] = await database
    .select({
      id: payoutAccounts.id,
    })
    .from(payoutAccounts)
    .where(eq(payoutAccounts.restaurantId, restaurantId))
    .limit(1)

  if (existingAccount) return

  await database.insert(payoutAccounts).values({
    restaurantId,
    bankCode: '000013',
    accountName,
    accountNumberEncrypted: `test-restaurant-account-${accountNumberLast4}`,
    accountNumberLast4,
    isVerified: true,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await databasePool.end()
  })
