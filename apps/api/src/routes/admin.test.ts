import assert from 'node:assert/strict'
import test from 'node:test'

import { chooseRestaurantManager } from './admin.js'

test('chooseRestaurantManager ignores invited members when no active owner or manager exists', () => {
  const members = [
    {
      restaurantId: 'restaurant-1',
      userId: 'user-1',
      membershipRole: 'manager',
      status: 'invited',
      createdByAdminId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as Parameters<typeof chooseRestaurantManager>[0]

  assert.equal(chooseRestaurantManager(members), null)
})
