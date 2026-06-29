import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { eq, inArray } from 'drizzle-orm'

import { createCloudinaryUploadSignature } from '../config/cloudinary.js'
import { database } from './client.js'
import {
  comboItems,
  combos,
  menuItems,
  restaurants,
  serviceAreas,
} from './schema.js'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
)

const restaurantSlugs = [
  'mama-chef-cafe',
  'iya-ruka-kitchen',
  'spice-hub-grill',
  'mealstop-kitchen',
]

type SeedMenuItem = {
  key: string
  name: string
  description: string
  priceAmount: number
}

type SeedCombo = {
  slug: string
  name: string
  description: string
  isFeatured: boolean
  items: Array<{
    key: string
    quantity: number
  }>
}

type SeedRestaurant = {
  slug: string
  name: string
  description: string
  serviceAreaName: string
  streetAddress: string
  prepMin: number
  prepMax: number
  imagePath: string
  menuItems: SeedMenuItem[]
  combos: SeedCombo[]
}

const seedRestaurants: SeedRestaurant[] = [
  {
    slug: 'mama-chef-cafe',
    name: 'Mama Chef Cafe',
    description: 'Local African dishes',
    serviceAreaName: 'Modomo',
    streetAddress: '12 Modomo Market Road',
    prepMin: 30,
    prepMax: 40,
    imagePath: 'public/restaurant-dummy.png',
    menuItems: [
      { key: 'jollof-rice', name: 'Jollof Rice', description: 'One spoon of smoky party jollof rice.', priceAmount: 800 },
      { key: 'fried-chicken', name: 'Fried Chicken', description: 'One medium fried chicken piece.', priceAmount: 1200 },
      { key: 'fried-plantain', name: 'Fried Plantain', description: 'One portion of sweet fried plantain.', priceAmount: 500 },
      { key: 'coleslaw', name: 'Coleslaw', description: 'One small side of coleslaw.', priceAmount: 300 },
    ],
    combos: [
      {
        slug: 'jollof-rice-and-chicken',
        name: 'Jollof Rice + Chicken',
        description: 'Two spoons of jollof rice with one medium fried chicken and coleslaw.',
        isFeatured: true,
        items: [
          { key: 'jollof-rice', quantity: 2 },
          { key: 'fried-chicken', quantity: 1 },
          { key: 'coleslaw', quantity: 1 },
        ],
      },
      {
        slug: 'jollof-rice-and-plantain',
        name: 'Jollof Rice + Plantain',
        description: 'Two spoons of jollof rice with one portion of fried plantain.',
        isFeatured: true,
        items: [
          { key: 'jollof-rice', quantity: 2 },
          { key: 'fried-plantain', quantity: 1 },
        ],
      },
    ],
  },
  {
    slug: 'iya-ruka-kitchen',
    name: 'Iya Ruka Kitchen',
    description: 'Traditional Yoruba meals',
    serviceAreaName: 'Fashina',
    streetAddress: '4 Fashina Junction',
    prepMin: 25,
    prepMax: 35,
    imagePath: 'public/restaurant-dummy.png',
    menuItems: [
      { key: 'amala', name: 'Amala', description: 'One wrap of smooth amala.', priceAmount: 500 },
      { key: 'ewedu', name: 'Ewedu Soup', description: 'One bowl of ewedu soup.', priceAmount: 700 },
      { key: 'gbegiri', name: 'Gbegiri Soup', description: 'One bowl of gbegiri soup.', priceAmount: 600 },
      { key: 'beef', name: 'Beef', description: 'One tender beef piece.', priceAmount: 900 },
      { key: 'ofada-rice', name: 'Ofada Rice', description: 'One spoon of ofada rice.', priceAmount: 900 },
      { key: 'ayamase', name: 'Ayamase Stew', description: 'One portion of ayamase stew.', priceAmount: 1000 },
    ],
    combos: [
      {
        slug: 'amala-ewedu-and-beef',
        name: 'Amala + Ewedu + Beef',
        description: 'Two wraps of amala with ewedu soup and one beef piece.',
        isFeatured: true,
        items: [
          { key: 'amala', quantity: 2 },
          { key: 'ewedu', quantity: 1 },
          { key: 'beef', quantity: 1 },
        ],
      },
      {
        slug: 'ofada-rice-and-ayamase',
        name: 'Ofada Rice + Ayamase',
        description: 'Two spoons of ofada rice with one portion of ayamase stew.',
        isFeatured: true,
        items: [
          { key: 'ofada-rice', quantity: 2 },
          { key: 'ayamase', quantity: 1 },
        ],
      },
    ],
  },
  {
    slug: 'spice-hub-grill',
    name: 'Spice Hub Grill',
    description: 'Afro-fusion grills and rice bowls',
    serviceAreaName: 'Mayfair',
    streetAddress: '18 Mayfair Avenue',
    prepMin: 20,
    prepMax: 30,
    imagePath: 'public/restaurant-dummy.png',
    menuItems: [
      { key: 'fried-rice', name: 'Fried Rice', description: 'One spoon of vegetable fried rice.', priceAmount: 900 },
      { key: 'grilled-chicken', name: 'Grilled Chicken', description: 'One medium grilled chicken piece.', priceAmount: 1300 },
      { key: 'suya-beef', name: 'Suya Beef', description: 'One portion of suya beef.', priceAmount: 1200 },
      { key: 'salad', name: 'Salad', description: 'One small salad side.', priceAmount: 300 },
    ],
    combos: [
      {
        slug: 'fried-rice-and-grilled-chicken',
        name: 'Fried Rice + Grilled Chicken',
        description: 'Two spoons of fried rice with grilled chicken and salad.',
        isFeatured: true,
        items: [
          { key: 'fried-rice', quantity: 2 },
          { key: 'grilled-chicken', quantity: 1 },
          { key: 'salad', quantity: 1 },
        ],
      },
      {
        slug: 'suya-fried-rice-bowl',
        name: 'Suya Fried Rice Bowl',
        description: 'Two spoons of fried rice with one portion of suya beef.',
        isFeatured: false,
        items: [
          { key: 'fried-rice', quantity: 2 },
          { key: 'suya-beef', quantity: 1 },
        ],
      },
    ],
  },
  {
    slug: 'mealstop-kitchen',
    name: 'MealStop Kitchen',
    description: 'Campus comfort meals',
    serviceAreaName: 'Moremi Estate',
    streetAddress: '7 Moremi Estate Road',
    prepMin: 15,
    prepMax: 25,
    imagePath: 'public/restaurant-dummy.png',
    menuItems: [
      { key: 'beans', name: 'Beans Porridge', description: 'One spoon of beans porridge.', priceAmount: 800 },
      { key: 'plantain', name: 'Fried Plantain', description: 'One portion of fried plantain.', priceAmount: 400 },
      { key: 'yam', name: 'Boiled Yam', description: 'One slice of boiled yam.', priceAmount: 700 },
      { key: 'egg-sauce', name: 'Egg Sauce', description: 'One portion of egg sauce.', priceAmount: 900 },
    ],
    combos: [
      {
        slug: 'beans-and-plantain',
        name: 'Beans + Plantain',
        description: 'Two spoons of beans porridge with one portion of plantain.',
        isFeatured: true,
        items: [
          { key: 'beans', quantity: 2 },
          { key: 'plantain', quantity: 1 },
        ],
      },
      {
        slug: 'yam-and-egg-sauce',
        name: 'Yam + Egg Sauce',
        description: 'Two slices of boiled yam with one portion of egg sauce.',
        isFeatured: false,
        items: [
          { key: 'yam', quantity: 2 },
          { key: 'egg-sauce', quantity: 1 },
        ],
      },
    ],
  },
]

async function main() {
  const serviceAreaRows = await database
    .select({
      id: serviceAreas.id,
      name: serviceAreas.name,
    })
    .from(serviceAreas)

  const serviceAreaIds = new Map(
    serviceAreaRows.map((serviceArea) => [serviceArea.name, serviceArea.id]),
  )

  const missingServiceAreas = seedRestaurants
    .map((restaurant) => restaurant.serviceAreaName)
    .filter((name) => !serviceAreaIds.has(name))

  if (missingServiceAreas.length > 0) {
    throw new Error(`Missing service areas: ${missingServiceAreas.join(', ')}`)
  }

  const existingRestaurants = await database
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(inArray(restaurants.slug, restaurantSlugs))

  if (existingRestaurants.length > 0) {
    await database
      .delete(restaurants)
      .where(inArray(restaurants.id, existingRestaurants.map((restaurant) => restaurant.id)))
  }

  const restaurantImageUrl = await uploadSeedImage(
    'restaurant_logo',
    'public/restaurant-dummy.png',
    '/restaurant-dummy.png',
  )
  const comboImageUrl = await uploadSeedImage(
    'combo_image',
    'public/test-img-one.png',
    '/test-img-one.png',
  )

  for (const restaurantSeed of seedRestaurants) {
    const [restaurant] = await database
      .insert(restaurants)
      .values({
        slug: restaurantSeed.slug,
        name: restaurantSeed.name,
        description: restaurantSeed.description,
        phone: '08000000000',
        serviceAreaId: serviceAreaIds.get(restaurantSeed.serviceAreaName)!,
        streetAddress: restaurantSeed.streetAddress,
        preparationMinMinutes: restaurantSeed.prepMin,
        preparationMaxMinutes: restaurantSeed.prepMax,
        imageUrl: restaurantImageUrl,
        status: 'active',
        isVerified: true,
        onboardedAt: new Date(),
      })
      .returning({ id: restaurants.id })

    const menuItemIds = new Map<string, string>()

    for (const menuItemSeed of restaurantSeed.menuItems) {
      const [menuItem] = await database
        .insert(menuItems)
        .values({
          restaurantId: restaurant.id,
          name: menuItemSeed.name,
          description: menuItemSeed.description,
          priceAmount: menuItemSeed.priceAmount,
          imageUrl: comboImageUrl,
          isAvailable: true,
        })
        .returning({ id: menuItems.id })

      menuItemIds.set(menuItemSeed.key, menuItem.id)
    }

    for (const comboSeed of restaurantSeed.combos) {
      const priceAmount = comboSeed.items.reduce((total, item) => {
        const menuItem = restaurantSeed.menuItems.find(
          (candidate) => candidate.key === item.key,
        )

        if (!menuItem) {
          throw new Error(`Missing menu item ${item.key}`)
        }

        return total + menuItem.priceAmount * item.quantity
      }, 0)

      const [combo] = await database
        .insert(combos)
        .values({
          restaurantId: restaurant.id,
          slug: comboSeed.slug,
          name: comboSeed.name,
          description: comboSeed.description,
          priceAmount,
          imageUrl: comboImageUrl,
          isFeatured: comboSeed.isFeatured,
          isAvailable: true,
        })
        .returning({ id: combos.id })

      for (const item of comboSeed.items) {
        await database.insert(comboItems).values({
          comboId: combo.id,
          menuItemId: menuItemIds.get(item.key)!,
          quantity: item.quantity,
          isOptional: false,
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        restaurants: seedRestaurants.length,
        combos: seedRestaurants.reduce(
          (total, restaurant) => total + restaurant.combos.length,
          0,
        ),
        imageSource: restaurantImageUrl.startsWith('http')
          ? 'cloudinary'
          : 'local',
      },
      null,
      2,
    ),
  )
}

async function uploadSeedImage(
  type: 'restaurant_logo' | 'combo_image',
  imagePath: string,
  fallbackUrl: string,
) {
  try {
    const signature = createCloudinaryUploadSignature(type)
    const file = await readFile(path.join(repoRoot, imagePath))
    const formData = new FormData()

    formData.append('file', new Blob([file]), path.basename(imagePath))
    formData.append('api_key', signature.apiKey)
    formData.append('timestamp', String(signature.timestamp))
    formData.append('signature', signature.signature)
    formData.append('folder', signature.folder)
    formData.append('public_id', signature.publicId)

    const response = await fetch(signature.uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.status}`)
    }

    const body = (await response.json()) as { secure_url: string }
    return body.secure_url
  } catch (error) {
    console.warn(error)
    return fallbackUrl
  }
}

main()
