import type { FastifyInstance } from 'fastify'
import { and, asc, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import {
  addresses,
  adminSettings,
  comboItems,
  combos,
  menuItems,
  orderReviews,
  restaurants,
  serviceAreas,
} from '../db/schema.js'

type RestaurantSummary = Awaited<ReturnType<typeof getRestaurantRows>>[number]
type ComboSummary = Awaited<ReturnType<typeof getComboRows>>[number]

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/restaurants', async (request, reply) => {
    const nearbyRequested = isNearbyCatalogRequest(request.query)
    const searchQuery = getCatalogSearchQuery(request.query)
    const serviceAreaId = nearbyRequested
      ? await getCustomerServiceAreaId(request.headers.cookie)
      : null
    const restaurantRows = nearbyRequested && !serviceAreaId
      ? []
      : await getRestaurantRows(serviceAreaId, undefined, searchQuery)
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
    const menuItemRows = await getMenuItemsForRestaurant(restaurant.id)

    return reply.status(200).send({
      restaurant: {
        ...serializeRestaurantSummary(restaurant, comboRows),
        phone: restaurant.phone,
        streetAddress: restaurant.streetAddress,
      },
      combos: comboRows.map(serializeComboSummary),
      menuItems: menuItemRows,
    })
  })

  app.get('/combos', async (request, reply) => {
    const nearbyRequested = isNearbyCatalogRequest(request.query)
    const searchQuery = getCatalogSearchQuery(request.query)
    const includePromoCombos = isPromoCatalogRequest(request.query)
    const serviceAreaId = nearbyRequested
      ? await getCustomerServiceAreaId(request.headers.cookie)
      : null
    const comboRows = nearbyRequested && !serviceAreaId
      ? []
      : await getComboRows(serviceAreaId, undefined, searchQuery, includePromoCombos)

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

function isPromoCatalogRequest(query: unknown) {
  return (
    typeof query === 'object' &&
    query !== null &&
    'promo' in query &&
    String((query as { promo?: unknown }).promo) === 'true'
  )
}

function isNearbyCatalogRequest(query: unknown) {
  const nearby = (query as { nearby?: string | boolean | number } | undefined)
    ?.nearby

  return nearby === true || nearby === 'true' || nearby === '1' || nearby === 1
}

function getCatalogSearchQuery(query: unknown) {
  const rawQuery = (query as { q?: string } | undefined)?.q?.trim()

  if (!rawQuery) return undefined

  return rawQuery.slice(0, 80)
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

function getRestaurantRows(
  serviceAreaId?: string | null,
  restaurantId?: string,
  searchQuery?: string,
) {
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

  if (searchQuery) {
    const pattern = `%${searchQuery}%`

    conditions.push(
      or(
        ilike(restaurants.name, pattern),
        ilike(restaurants.description, pattern),
        ilike(serviceAreas.name, pattern),
      )!,
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
      ratingAverage: sql<number>`coalesce(round(avg(${orderReviews.rating})::numeric, 1), 0)`,
      reviewCount: sql<number>`count(${orderReviews.id})::int`,
      serviceArea: {
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
      },
    })
    .from(restaurants)
    .innerJoin(serviceAreas, eq(restaurants.serviceAreaId, serviceAreas.id))
    .leftJoin(orderReviews, eq(orderReviews.restaurantId, restaurants.id))
    .where(and(...conditions))
    .groupBy(restaurants.id, serviceAreas.id)
    .orderBy(asc(restaurants.name))
}

async function getCombosForRestaurants(restaurantIds: string[]) {
  const promoComboIds = await getPromoComboIds()

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
      ratingAverage: sql<number>`coalesce(round(avg(${orderReviews.rating})::numeric, 1), 0)`,
      reviewCount: sql<number>`count(${orderReviews.id})::int`,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .leftJoin(orderReviews, eq(orderReviews.restaurantId, restaurants.id))
    .where(
      and(
        eq(combos.isAvailable, true),
        inArray(combos.restaurantId, restaurantIds),
        promoComboIds.length ? notInArray(combos.id, promoComboIds) : undefined,
      ),
    )
    .groupBy(combos.id, restaurants.id)
    .orderBy(asc(combos.name))
}

function getMenuItemsForRestaurant(restaurantId: string) {
  return database
    .select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      priceAmount: menuItems.priceAmount,
      imageUrl: menuItems.imageUrl,
      isAvailable: menuItems.isAvailable,
    })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.restaurantId, restaurantId),
        eq(menuItems.isAvailable, true),
      ),
    )
    .orderBy(asc(menuItems.name))
}

function getComboRows(
  serviceAreaId?: string | null,
  comboId?: string,
  searchQuery?: string,
  includePromoCombos = false,
  onlyComboIds?: string[],
) {
  const includePromoCombo = Boolean(comboId)
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

  if (onlyComboIds?.length) {
    conditions.push(inArray(combos.id, onlyComboIds))
  }

  if (searchQuery) {
    const pattern = `%${searchQuery}%`

    conditions.push(
      or(
        ilike(combos.name, pattern),
        ilike(combos.description, pattern),
        ilike(restaurants.name, pattern),
      )!,
    )
  }

  return getPromoComboIds().then((promoComboIds) => {
    if (!includePromoCombo && !includePromoCombos && promoComboIds.length > 0) {
      conditions.push(notInArray(combos.id, promoComboIds))
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
      ratingAverage: sql<number>`coalesce(round(avg(${orderReviews.rating})::numeric, 1), 0)`,
      reviewCount: sql<number>`count(${orderReviews.id})::int`,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .leftJoin(orderReviews, eq(orderReviews.restaurantId, restaurants.id))
    .where(and(...conditions))
    .groupBy(combos.id, restaurants.id)
    .orderBy(asc(restaurants.name), asc(combos.name))
  })
}

async function getPromoComboRows() {
  const promoComboIds = await getPromoComboIds()
  if (!promoComboIds.length) return []
  return getComboRows(undefined, undefined, undefined, true, promoComboIds)
}
async function getPromoComboIds() {
  const [setting] = await database
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.settingsKey, 'admin_promo_combo_ids'))
    .limit(1)

  const promoMap = (setting?.value ?? {}) as Record<string, boolean>
  return Object.entries(promoMap)
    .filter(([, isPromo]) => isPromo)
    .map(([comboId]) => comboId)
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
    ratingAverage: Number(restaurant.ratingAverage),
    reviewCount: Number(restaurant.reviewCount),
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
    ratingAverage: Number(combo.ratingAverage),
    reviewCount: Number(combo.reviewCount),
    restaurant: {
      id: combo.restaurantId,
      name: combo.restaurantName,
      slug: combo.restaurantSlug,
    },
  }
}

