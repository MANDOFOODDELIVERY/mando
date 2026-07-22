import 'dotenv/config'

import { sql } from 'drizzle-orm'
import { database, databasePool } from './client.js'
import fs from 'node:fs'
import path from 'node:path'

const migrations = [
  '0000_organic_roughhouse',
  '0001_yellow_vanisher',
  '0002_tiresome_living_tribunal',
  '0003_clean_impossible_man',
  '0004_loving_thaddeus_ross',
  '0005_mando_revenue_rules',
  '0006_new_fenris',
  '0007_rider_vehicle_documents',
  '0008_admin_settings',
  '0009_long_sheva_callister',
  '0010_combo_campaigns',
  '0011_redundant_tattoo',
  '0012_add_menu_items_sub_item',
]

async function main() {
  console.log('Starting production migrations...\n')

  for (const migration of migrations) {
    console.log(`Applying ${migration}...`)

    const filePath = path.join(
      import.meta.dirname,
      '..',
      '..',
      'drizzle',
      `${migration}.sql`,
    )

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`)
    }

    const sqlContent = fs.readFileSync(filePath, 'utf-8')

    try {
      await database.transaction(async (tx) => {
        await tx.execute(sql.raw(sqlContent))
      })

      console.log(`✓ ${migration} applied\n`)
    } catch (error) {
      console.error(`✗ ${migration} failed`)
      throw error
    }
  }

  console.log('All migrations applied successfully!')
}

main()
  .catch((error) => {
    console.error('\nMigration failed:')
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await databasePool.end()
  })