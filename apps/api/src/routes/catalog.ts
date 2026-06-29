import type { FastifyInstance } from 'fastify'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import {
  addresses,
  comboItems,
  combos,
  menuItems,
  restaurants,
  serviceAreas,
} from '../db/schema.js'

type RestaurantSummary = Awaited<ReturnType<typeof getRestaurantRows>>[number]
type ComboSummary = Awaited<ReturnType<typeof getComboRows>>[number]

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/restaurants', async (request, reply) => {
    const nearbyRequested = isNearbyCatalogRequest(request.query)
    const serviceAreaId = nearbyRequested
      ? await getCustomerServiceAreaId(request.headers.cookie)
      : null
    const restaurantRows = nearbyRequested && !serviceAreaId
      ? []
      : await getRestaurantRows(serviceAreaId)
    const restaurantIds = restaurantRows.map((restaurant) => restaurant.id)
    const comboRows = restaurantIds.length > 0
      ? await getCombosForRestaurants(restaurantIds)
      : []

    return reply.status(200).send({
      restaurants: restaurantRows.map((restaurant) =>
        serializeRestaurantSummary(restaurant, comboRows),
      ),
      filteredByServiceArea: Boolean(serviceAreaId),
      nearbyRequested,
    })
  })

  app.get('/restaurants/:restaurantId', async (request, reply) => {
    const params = request.params as { restaurantId: string }
    const [restaurant] = await getRestaurantRows(undefined, params.restaurantId)

    if (!restaurant) {
      return reply.status(404).send({
        error: 'restaurant_not_found',
        message: 'Restaurant not found.',
      })
    }

    const comboRows = await getCombosForRestaurants([restaurant.id])

    return reply.status(200).send({
      restaurant: {
        ...serializeRestaurantSummary(restaurant, comboRows),
        phone: restaurant.phone,
        streetAddress: restaurant.streetAddress,
      },
      combos: comboRows.map(serializeComboSummary),
    })
  })

  app.get('/combos', async (request, reply) => {
    const nearbyRequested = isNearbyCatalogRequest(request.query)
    const serviceAreaId = nearbyRequested
      ? await getCustomerServiceAreaId(request.headers.cookie)
      : null
    const comboRows = nearbyRequested && !serviceAreaId
      ? []
      : await getComboRows(serviceAreaId)

    return reply.status(200).send({
      combos: comboRows.map(serializeComboSummary),
      filteredByServiceArea: Boolean(serviceAreaId),
      nearbyRequested,
    })
  })

  app.get('/combos/:comboId', async (request, reply) => {
    const params = request.params as { comboId: string }
    const [combo] = await getComboRows(undefined, params.comboId)

    if (!combo) {
      return reply.status(404).send({
        error: 'combo_not_found',
        message: 'Combo not found.',
      })
    }

    const items = await database
      .select({
        menuItemId: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        priceAmount: menuItems.priceAmount,
        imageUrl: menuItems.imageUrl,
        quantity: comboItems.quantity,
        isOptional: comboItems.isOptional,
      })
      .from(comboItems)
      .innerJoin(menuItems, eq(comboItems.menuItemId, menuItems.id))
      .where(eq(comboItems.comboId, combo.id))
      .orderBy(asc(menuItems.name))

    return reply.status(200).send({
      combo: {
        ...serializeComboSummary(combo),
        description: combo.description,
        items,
      },
    })
  })
}

function isNearbyCatalogRequest(query: unknown) {
  const nearby = (query as { nearby?: string | boolean | number } | undefined)
    ?.nearby

  return nearby === true || nearby === 'true' || nearby === '1' || nearby === 1
}

async function getCustomerServiceAreaId(cookieHeader: string | undefined) {
  const sessionContext = await getCurrentSessionContext(cookieHeader)

  if (!sessionContext) return null

  const [defaultAddress] = await database
    .select({
      serviceAreaId: addresses.serviceAreaId,
    })
    .from(addresses)
    .where(
      and(
        eq(addresses.userId, sessionContext.userId),
        eq(addresses.isDefault, true),
      ),
    )
    .limit(1)

  return defaultAddress?.serviceAreaId ?? null
}

function getRestaurantRows(serviceAreaId?: string | null, restaurantId?: string) {
  const conditions = [
    eq(restaurants.status, 'active' as const),
  ]

  if (serviceAreaId) {
    conditions.push(eq(restaurants.serviceAreaId, serviceAreaId))
  }

  if (restaurantId) {
    conditions.push(
      sql`(${restaurants.id}::text = ${restaurantId} or ${restaurants.slug} = ${restaurantId})`,
    )
  }

  return database
    .select({
      id: restaurants.id,
      slug: restaurants.slug,
      name: restaurants.name,
      description: restaurants.description,
      phone: restaurants.phone,
      streetAddress: restaurants.streetAddress,
      minimumOrderAmount: restaurants.minimumOrderAmount,
      preparationMinMinutes: restaurants.preparationMinMinutes,
      preparationMaxMinutes: restaurants.preparationMaxMinutes,
      imageUrl: restaurants.imageUrl,
      isVerified: restaurants.isVerified,
      serviceArea: {
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
      },
    })
    .from(restaurants)
    .innerJoin(serviceAreas, eq(restaurants.serviceAreaId, serviceAreas.id))
    .where(and(...conditions))
    .orderBy(asc(restaurants.name))
}

function getCombosForRestaurants(restaurantIds: string[]) {
  return database
    .select({
      id: combos.id,
      slug: combos.slug,
      name: combos.name,
      description: combos.description,
      priceAmount: combos.priceAmount,
      imageUrl: combos.imageUrl,
      isFeatured: combos.isFeatured,
      restaurantId: combos.restaurantId,
      restaurantName: restaurants.name,
      restaurantSlug: restaurants.slug,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .where(
      and(
        eq(combos.isAvailable, true),
        inArray(combos.restaurantId, restaurantIds),
      ),
    )
    .orderBy(asc(combos.name))
}

function getComboRows(serviceAreaId?: string | null, comboId?: string) {
  const conditions = [
    eq(combos.isAvailable, true),
    eq(restaurants.status, 'active' as const),
  ]

  if (serviceAreaId) {
    conditions.push(eq(restaurants.serviceAreaId, serviceAreaId))
  }

  if (comboId) {
    conditions.push(
      sql`(${combos.id}::text = ${comboId} or ${combos.slug} = ${comboId})`,
    )
  }

  return database
    .select({
      id: combos.id,
      slug: combos.slug,
      name: combos.name,
      description: combos.description,
      priceAmount: combos.priceAmount,
      imageUrl: combos.imageUrl,
      isFeatured: combos.isFeatured,
      restaurantId: restaurants.id,
      restaurantName: restaurants.name,
      restaurantSlug: restaurants.slug,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .where(and(...conditions))
    .orderBy(asc(restaurants.name), asc(combos.name))
}

function serializeRestaurantSummary(
  restaurant: RestaurantSummary,
  comboRows: ComboSummary[],
) {
  const restaurantCombos = comboRows.filter(
    (combo) => combo.restaurantId === restaurant.id,
  )
  const minimumComboAmount = restaurantCombos.reduce<number | null>(
    (minimumAmount, combo) =>
      minimumAmount === null
        ? combo.priceAmount
        : Math.min(minimumAmount, combo.priceAmount),
    null,
  )

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    description: restaurant.description,
    imageUrl: restaurant.imageUrl,
    isVerified: restaurant.isVerified,
    minimumOrderAmount: minimumComboAmount ?? restaurant.minimumOrderAmount,
    preparationMinMinutes: restaurant.preparationMinMinutes,
    preparationMaxMinutes: restaurant.preparationMaxMinutes,
    comboCount: restaurantCombos.length,
    serviceArea: restaurant.serviceArea,
  }
}

function serializeComboSummary(
  combo: ComboSummary,
) {
  return {
    id: combo.id,
    slug: combo.slug,
    name: combo.name,
    description: combo.description,
    priceAmount: combo.priceAmount,
    imageUrl: combo.imageUrl,
    isFeatured: combo.isFeatured,
    restaurant: {
      id: combo.restaurantId,
      name: combo.restaurantName,
      slug: combo.restaurantSlug,
    },
  }
}
