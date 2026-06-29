import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const timestampWithTimezone = (name: string) =>
  timestamp(name, { withTimezone: true })

const createdAt = () => timestampWithTimezone('created_at').notNull().defaultNow()

const updatedAt = () =>
  timestampWithTimezone('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

const moneyAmount = (name: string) => bigint(name, { mode: 'number' })

const coordinate = (name: string) =>
  numeric(name, { precision: 10, scale: 7, mode: 'number' })

export const userStatusEnum = pgEnum('user_status', [
  'pending',
  'active',
  'suspended',
  'disabled',
])

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'rider',
  'sales_agent',
  'restaurant',
  'admin',
])

export const verificationTokenPurposeEnum = pgEnum(
  'verification_token_purpose',
  ['email_verification', 'password_reset'],
)

export const staffOnboardingStatusEnum = pgEnum('staff_onboarding_status', [
  'invited',
  'pending',
  'active',
  'rejected',
  'suspended',
])

export const riderAvailabilityStatusEnum = pgEnum('rider_availability_status', [
  'offline',
  'available',
  'busy',
  'suspended',
])

export const salesAgentStatusEnum = pgEnum('sales_agent_status', [
  'pending',
  'active',
  'suspended',
])

export const restaurantStatusEnum = pgEnum('restaurant_status', [
  'draft',
  'active',
  'paused',
  'archived',
])

export const restaurantMembershipRoleEnum = pgEnum(
  'restaurant_membership_role',
  ['owner', 'manager', 'operator'],
)

export const restaurantMembershipStatusEnum = pgEnum(
  'restaurant_membership_status',
  ['invited', 'active', 'suspended'],
)

export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'awaiting_restaurant',
  'restaurant_accepted',
  'restaurant_rejected',
  'admin_review',
  'preparing',
  'ready_for_pickup',
  'on_the_way',
  'delivered',
  'cancelled',
  'refunded',
])

export const restaurantOrderDecisionEnum = pgEnum(
  'restaurant_order_decision',
  ['accepted', 'rejected'],
)

export const orderIssueTypeEnum = pgEnum('order_issue_type', [
  'restaurant_rejection',
  'payment_exception',
  'delivery_exception',
  'customer_complaint',
])

export const orderIssueStatusEnum = pgEnum('order_issue_status', [
  'open',
  'in_review',
  'resolved',
  'cancelled',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'card',
  'bank',
  'ussd',
  'wallet',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'submitted',
  'verified',
  'failed',
  'cancelled',
  'refunded',
])

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'unassigned',
  'available',
  'assigned',
  'accepted',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
])

export const referralStatusEnum = pgEnum('referral_status', [
  'attributed',
  'qualified',
  'rejected',
])

export const commissionStatusEnum = pgEnum('commission_status', [
  'pending',
  'earned',
  'approved',
  'paid',
  'reversed',
])

export const restaurantEarningStatusEnum = pgEnum(
  'restaurant_earning_status',
  ['pending', 'available', 'held', 'requested', 'paid', 'reversed'],
)

export const payoutTypeEnum = pgEnum('payout_type', [
  'restaurant_earnings',
  'rider_earnings',
  'agent_commissions',
])

export const payoutRequestStatusEnum = pgEnum('payout_request_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'processing',
  'paid',
  'cancelled',
])

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    status: userStatusEnum('status').notNull().default('pending'),
    emailVerifiedAt: timestampWithTimezone('email_verified_at'),
    lastLoginAt: timestampWithTimezone('last_login_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
    index('users_status_index').on(table.status),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      name: 'user_roles_user_id_role_pk',
      columns: [table.userId, table.role],
    }),
    index('user_roles_role_index').on(table.role),
  ],
)

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    birthday: date('birthday', { mode: 'string' }),
    avatarUrl: text('avatar_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('profiles_phone_index').on(table.phone),
  ],
)

export const serviceAreas = pgTable(
  'service_areas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('service_areas_name_city_state_lower_unique').on(
      sql`lower(${table.name})`,
      sql`lower(${table.city})`,
      sql`lower(${table.state})`,
    ),
    index('service_areas_is_active_index').on(table.isActive),
  ],
)

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serviceAreaId: uuid('service_area_id')
      .notNull()
      .references(() => serviceAreas.id),
    label: text('label').notNull(),
    streetAddress: text('street_address').notNull(),
    landmark: text('landmark'),
    latitude: coordinate('latitude'),
    longitude: coordinate('longitude'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('addresses_user_id_index').on(table.userId),
    index('addresses_service_area_id_index').on(table.serviceAreaId),
    uniqueIndex('addresses_one_default_per_user_unique')
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
)

export const staffOnboardingRecords = pgTable(
  'staff_onboarding_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    status: staffOnboardingStatusEnum('status').notNull().default('invited'),
    onboardedByAdminId: uuid('onboarded_by_admin_id').references(
      () => users.id,
    ),
    notes: text('notes'),
    invitedAt: timestampWithTimezone('invited_at'),
    completedAt: timestampWithTimezone('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('staff_onboarding_records_user_id_index').on(table.userId),
    index('staff_onboarding_records_status_index').on(table.status),
    check(
      'staff_onboarding_records_operational_role_check',
      sql`${table.role} in ('rider', 'sales_agent', 'restaurant', 'admin')`,
    ),
  ],
)

export const riderProfiles = pgTable(
  'rider_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    riderCode: text('rider_code').notNull(),
    serviceAreaId: uuid('service_area_id')
      .notNull()
      .references(() => serviceAreas.id),
    availabilityStatus: riderAvailabilityStatusEnum('availability_status')
      .notNull()
      .default('offline'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('rider_profiles_rider_code_unique').on(table.riderCode),
    index('rider_profiles_service_area_id_index').on(table.serviceAreaId),
    index('rider_profiles_availability_status_index').on(
      table.availabilityStatus,
    ),
  ],
)

export const salesAgentProfiles = pgTable(
  'sales_agent_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentCode: text('agent_code').notNull(),
    referralCode: text('referral_code').notNull(),
    status: salesAgentStatusEnum('status').notNull().default('pending'),
    tier: text('tier').notNull().default('standard'),
    commissionRateBps: integer('commission_rate_bps').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('sales_agent_profiles_agent_code_unique').on(table.agentCode),
    uniqueIndex('sales_agent_profiles_referral_code_unique').on(
      table.referralCode,
    ),
    index('sales_agent_profiles_status_index').on(table.status),
  ],
)

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    phone: text('phone'),
    serviceAreaId: uuid('service_area_id')
      .notNull()
      .references(() => serviceAreas.id),
    streetAddress: text('street_address').notNull(),
    latitude: coordinate('latitude'),
    longitude: coordinate('longitude'),
    minimumOrderAmount: moneyAmount('minimum_order_amount')
      .notNull()
      .default(0),
    preparationMinMinutes: integer('preparation_min_minutes'),
    preparationMaxMinutes: integer('preparation_max_minutes'),
    imageUrl: text('image_url'),
    status: restaurantStatusEnum('status').notNull().default('draft'),
    isVerified: boolean('is_verified').notNull().default(false),
    onboardedByAdminId: uuid('onboarded_by_admin_id').references(
      () => users.id,
    ),
    onboardedAt: timestampWithTimezone('onboarded_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('restaurants_slug_unique').on(table.slug),
    index('restaurants_service_area_id_index').on(table.serviceAreaId),
    index('restaurants_status_index').on(table.status),
  ],
)

export const restaurantMembers = pgTable(
  'restaurant_members',
  {
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    membershipRole: restaurantMembershipRoleEnum('membership_role').notNull(),
    status: restaurantMembershipStatusEnum('status')
      .notNull()
      .default('invited'),
    createdByAdminId: uuid('created_by_admin_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      name: 'restaurant_members_restaurant_id_user_id_pk',
      columns: [table.restaurantId, table.userId],
    }),
    index('restaurant_members_user_id_index').on(table.userId),
    index('restaurant_members_status_index').on(table.status),
  ],
)

export const payoutAccounts = pgTable(
  'payout_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id').references(() => restaurants.id, {
      onDelete: 'cascade',
    }),
    bankCode: text('bank_code').notNull(),
    accountName: text('account_name').notNull(),
    accountNumberEncrypted: text('account_number_encrypted').notNull(),
    accountNumberLast4: text('account_number_last4').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
    collectedByAdminId: uuid('collected_by_admin_id').references(
      () => users.id,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('payout_accounts_user_id_index').on(table.userId),
    index('payout_accounts_restaurant_id_index').on(table.restaurantId),
    check(
      'payout_accounts_exactly_one_owner_check',
      sql`(${table.userId} is not null and ${table.restaurantId} is null) or (${table.userId} is null and ${table.restaurantId} is not null)`,
    ),
  ],
)

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    priceAmount: moneyAmount('price_amount').notNull(),
    imageUrl: text('image_url'),
    isAvailable: boolean('is_available').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('menu_items_restaurant_id_index').on(table.restaurantId),
    index('menu_items_is_available_index').on(table.isAvailable),
  ],
)

export const combos = pgTable(
  'combos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    priceAmount: moneyAmount('price_amount').notNull(),
    imageUrl: text('image_url'),
    isFeatured: boolean('is_featured').notNull().default(false),
    isAvailable: boolean('is_available').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('combos_restaurant_id_slug_unique').on(
      table.restaurantId,
      table.slug,
    ),
    index('combos_restaurant_id_index').on(table.restaurantId),
    index('combos_is_featured_index').on(table.isFeatured),
    index('combos_is_available_index').on(table.isAvailable),
  ],
)

export const comboItems = pgTable(
  'combo_items',
  {
    comboId: uuid('combo_id')
      .notNull()
      .references(() => combos.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    isOptional: boolean('is_optional').notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: 'combo_items_combo_id_menu_item_id_pk',
      columns: [table.comboId, table.menuItemId],
    }),
  ],
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    addressId: uuid('address_id').references(() => addresses.id, {
      onDelete: 'set null',
    }),
    deliveryRecipientName: text('delivery_recipient_name').notNull(),
    deliveryPhone: text('delivery_phone').notNull(),
    deliveryStreetAddress: text('delivery_street_address').notNull(),
    deliveryServiceArea: text('delivery_service_area').notNull(),
    deliveryLandmark: text('delivery_landmark'),
    status: orderStatusEnum('status').notNull().default('pending_payment'),
    currency: text('currency').notNull().default('NGN'),
    subtotalAmount: moneyAmount('subtotal_amount').notNull(),
    deliveryFeeAmount: moneyAmount('delivery_fee_amount').notNull().default(0),
    discountAmount: moneyAmount('discount_amount').notNull().default(0),
    totalAmount: moneyAmount('total_amount').notNull(),
    customerNote: text('customer_note'),
    placedAt: timestampWithTimezone('placed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('orders_order_number_unique').on(table.orderNumber),
    index('orders_customer_id_index').on(table.customerId),
    index('orders_restaurant_id_index').on(table.restaurantId),
    index('orders_status_index').on(table.status),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id').references(() => menuItems.id, {
      onDelete: 'set null',
    }),
    comboId: uuid('combo_id').references(() => combos.id, {
      onDelete: 'set null',
    }),
    itemName: text('item_name').notNull(),
    unitPriceAmount: moneyAmount('unit_price_amount').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalAmount: moneyAmount('line_total_amount').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('order_items_order_id_index').on(table.orderId),
    check(
      'order_items_exactly_one_catalog_reference_check',
      sql`(${table.menuItemId} is not null and ${table.comboId} is null) or (${table.menuItemId} is null and ${table.comboId} is not null)`,
    ),
  ],
)

export const orderItemComponents = pgTable(
  'order_item_components',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id').references(() => menuItems.id, {
      onDelete: 'set null',
    }),
    itemName: text('item_name').notNull(),
    unitPriceAmount: moneyAmount('unit_price_amount').notNull().default(0),
    quantity: integer('quantity').notNull(),
    lineTotalAmount: moneyAmount('line_total_amount').notNull().default(0),
  },
  (table) => [
    index('order_item_components_order_item_id_index').on(table.orderItemId),
  ],
)

export const orderStatusEvents = pgTable(
  'order_status_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatusEnum('status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    note: text('note'),
    createdAt: createdAt(),
  },
  (table) => [
    index('order_status_events_order_id_index').on(table.orderId),
  ],
)

export const restaurantOrderDecisions = pgTable(
  'restaurant_order_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    decidedByUserId: uuid('decided_by_user_id')
      .notNull()
      .references(() => users.id),
    decision: restaurantOrderDecisionEnum('decision').notNull(),
    rejectionReasonCode: text('rejection_reason_code'),
    rejectionNote: text('rejection_note'),
    decidedAt: timestampWithTimezone('decided_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('restaurant_order_decisions_order_id_unique').on(table.orderId),
    index('restaurant_order_decisions_restaurant_id_index').on(
      table.restaurantId,
    ),
    check(
      'restaurant_order_decisions_rejection_reason_check',
      sql`${table.decision} = 'accepted' or ${table.rejectionReasonCode} is not null`,
    ),
  ],
)

export const orderIssues = pgTable(
  'order_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: orderIssueTypeEnum('type').notNull(),
    status: orderIssueStatusEnum('status').notNull().default('open'),
    raisedByUserId: uuid('raised_by_user_id').references(() => users.id),
    assignedAdminId: uuid('assigned_admin_id').references(() => users.id),
    reason: text('reason').notNull(),
    resolution: text('resolution'),
    resolvedAt: timestampWithTimezone('resolved_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('order_issues_order_id_index').on(table.orderId),
    index('order_issues_status_index').on(table.status),
  ],
)

export const orderReviews = pgTable(
  'order_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('order_reviews_order_id_unique').on(table.orderId),
    index('order_reviews_restaurant_id_index').on(table.restaurantId),
    index('order_reviews_customer_id_index').on(table.customerId),
    check(
      'order_reviews_rating_range_check',
      sql`${table.rating} between 1 and 5`,
    ),
  ],
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    method: paymentMethodEnum('method').notNull(),
    provider: text('provider'),
    providerReference: text('provider_reference'),
    customerReference: text('customer_reference'),
    amount: moneyAmount('amount').notNull(),
    currency: text('currency').notNull().default('NGN'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    paidAt: timestampWithTimezone('paid_at'),
    verifiedAt: timestampWithTimezone('verified_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('payments_order_id_index').on(table.orderId),
    uniqueIndex('payments_provider_reference_unique').on(
      table.providerReference,
    ),
    index('payments_status_index').on(table.status),
  ],
)

export const deliveries = pgTable(
  'deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    riderId: uuid('rider_id').references(() => users.id),
    serviceAreaId: uuid('service_area_id')
      .notNull()
      .references(() => serviceAreas.id),
    status: deliveryStatusEnum('status').notNull().default('unassigned'),
    deliveryFeeAmount: moneyAmount('delivery_fee_amount').notNull().default(0),
    riderEarningAmount: moneyAmount('rider_earning_amount')
      .notNull()
      .default(0),
    assignedAt: timestampWithTimezone('assigned_at'),
    acceptedAt: timestampWithTimezone('accepted_at'),
    pickedUpAt: timestampWithTimezone('picked_up_at'),
    deliveredAt: timestampWithTimezone('delivered_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('deliveries_order_id_unique').on(table.orderId),
    index('deliveries_rider_id_index').on(table.riderId),
    index('deliveries_service_area_id_index').on(table.serviceAreaId),
    index('deliveries_status_index').on(table.status),
  ],
)

export const deliveryStatusEvents = pgTable(
  'delivery_status_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => deliveries.id, { onDelete: 'cascade' }),
    status: deliveryStatusEnum('status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    note: text('note'),
    createdAt: createdAt(),
  },
  (table) => [
    index('delivery_status_events_delivery_id_index').on(table.deliveryId),
  ],
)

export const referrals = pgTable(
  'referrals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salesAgentId: uuid('sales_agent_id')
      .notNull()
      .references(() => users.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    referralCode: text('referral_code').notNull(),
    attributedAt: timestampWithTimezone('attributed_at').notNull().defaultNow(),
    firstEligibleOrderId: uuid('first_eligible_order_id').references(
      () => orders.id,
    ),
    status: referralStatusEnum('status').notNull().default('attributed'),
  },
  (table) => [
    uniqueIndex('referrals_customer_id_unique').on(table.customerId),
    index('referrals_sales_agent_id_index').on(table.salesAgentId),
    index('referrals_referral_code_index').on(table.referralCode),
  ],
)

export const commissions = pgTable(
  'commissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    salesAgentId: uuid('sales_agent_id')
      .notNull()
      .references(() => users.id),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    referralId: uuid('referral_id')
      .notNull()
      .references(() => referrals.id),
    rateBps: integer('rate_bps').notNull(),
    eligibleAmount: moneyAmount('eligible_amount').notNull(),
    commissionAmount: moneyAmount('commission_amount').notNull(),
    status: commissionStatusEnum('status').notNull().default('pending'),
    earnedAt: timestampWithTimezone('earned_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('commissions_sales_agent_id_order_id_unique').on(
      table.salesAgentId,
      table.orderId,
    ),
    index('commissions_status_index').on(table.status),
  ],
)

export const restaurantEarnings = pgTable(
  'restaurant_earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    grossAmount: moneyAmount('gross_amount').notNull(),
    platformFeeAmount: moneyAmount('platform_fee_amount').notNull().default(0),
    netAmount: moneyAmount('net_amount').notNull(),
    status: restaurantEarningStatusEnum('status').notNull().default('pending'),
    availableAt: timestampWithTimezone('available_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('restaurant_earnings_order_id_unique').on(table.orderId),
    index('restaurant_earnings_restaurant_id_index').on(table.restaurantId),
    index('restaurant_earnings_status_index').on(table.status),
  ],
)

export const payoutRequests = pgTable(
  'payout_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id),
    userId: uuid('user_id').references(() => users.id),
    restaurantId: uuid('restaurant_id').references(() => restaurants.id),
    type: payoutTypeEnum('type').notNull(),
    payoutAccountId: uuid('payout_account_id')
      .notNull()
      .references(() => payoutAccounts.id),
    amount: moneyAmount('amount').notNull(),
    status: payoutRequestStatusEnum('status').notNull().default('pending'),
    reviewedByAdminId: uuid('reviewed_by_admin_id').references(() => users.id),
    adminNote: text('admin_note'),
    requestedAt: timestampWithTimezone('requested_at').notNull().defaultNow(),
    reviewedAt: timestampWithTimezone('reviewed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('payout_requests_requested_by_user_id_index').on(
      table.requestedByUserId,
    ),
    index('payout_requests_status_index').on(table.status),
    check(
      'payout_requests_exactly_one_beneficiary_check',
      sql`(${table.userId} is not null and ${table.restaurantId} is null) or (${table.userId} is null and ${table.restaurantId} is not null)`,
    ),
  ],
)

export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payoutRequestId: uuid('payout_request_id')
      .notNull()
      .references(() => payoutRequests.id),
    userId: uuid('user_id').references(() => users.id),
    restaurantId: uuid('restaurant_id').references(() => restaurants.id),
    type: payoutTypeEnum('type').notNull(),
    amount: moneyAmount('amount').notNull(),
    status: payoutStatusEnum('status').notNull().default('pending'),
    reference: text('reference'),
    processedByAdminId: uuid('processed_by_admin_id').references(
      () => users.id,
    ),
    processedAt: timestampWithTimezone('processed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('payouts_payout_request_id_unique').on(table.payoutRequestId),
    uniqueIndex('payouts_reference_unique').on(table.reference),
    index('payouts_status_index').on(table.status),
    check(
      'payouts_exactly_one_beneficiary_check',
      sql`(${table.userId} is not null and ${table.restaurantId} is null) or (${table.userId} is null and ${table.restaurantId} is not null)`,
    ),
  ],
)

export const payoutItems = pgTable(
  'payout_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payoutId: uuid('payout_id')
      .notNull()
      .references(() => payouts.id, { onDelete: 'cascade' }),
    restaurantEarningId: uuid('restaurant_earning_id').references(
      () => restaurantEarnings.id,
    ),
    deliveryId: uuid('delivery_id').references(() => deliveries.id),
    commissionId: uuid('commission_id').references(() => commissions.id),
    amount: moneyAmount('amount').notNull(),
  },
  (table) => [
    index('payout_items_payout_id_index').on(table.payoutId),
    uniqueIndex('payout_items_restaurant_earning_id_unique')
      .on(table.restaurantEarningId)
      .where(sql`${table.restaurantEarningId} is not null`),
    uniqueIndex('payout_items_delivery_id_unique')
      .on(table.deliveryId)
      .where(sql`${table.deliveryId} is not null`),
    uniqueIndex('payout_items_commission_id_unique')
      .on(table.commissionId)
      .where(sql`${table.commissionId} is not null`),
    check(
      'payout_items_exactly_one_source_check',
      sql`(case when ${table.restaurantEarningId} is not null then 1 else 0 end + case when ${table.deliveryId} is not null then 1 else 0 end + case when ${table.commissionId} is not null then 1 else 0 end) = 1`,
    ),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data'),
    readAt: timestampWithTimezone('read_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('notifications_user_id_index').on(table.userId),
    index('notifications_read_at_index').on(table.readAt),
  ],
)

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    summary: text('summary').notNull(),
    data: jsonb('data'),
    createdAt: createdAt(),
  },
  (table) => [
    index('activity_events_created_at_index').on(table.createdAt),
    index('activity_events_entity_index').on(table.entityType, table.entityId),
  ],
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('reviews_order_id_unique').on(table.orderId),
    index('reviews_restaurant_id_index').on(table.restaurantId),
    check('reviews_rating_range_check', sql`${table.rating} between 1 and 5`),
  ],
)

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
    revokedAt: timestampWithTimezone('revoked_at'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    index('auth_sessions_user_id_index').on(table.userId),
    index('auth_sessions_expires_at_index').on(table.expiresAt),
  ],
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: verificationTokenPurposeEnum('purpose').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
    usedAt: timestampWithTimezone('used_at'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('verification_tokens_token_hash_unique').on(table.tokenHash),
    index('verification_tokens_user_id_purpose_index').on(
      table.userId,
      table.purpose,
    ),
    index('verification_tokens_expires_at_index').on(table.expiresAt),
  ],
)
