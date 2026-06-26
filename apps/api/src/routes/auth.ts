import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  createSessionToken,
  getSessionTokenFromCookie,
  hashPassword,
  hashSessionToken,
  isSessionExpired,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { database } from '../db/client.js'
import { authSessions, profiles, userRoles, users } from '../db/schema.js'

const signupBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(6)
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/\d/, 'Password must include at least one number.'),
})

const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const parsedBody = signupBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please check the signup details and try again.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { email, fullName, password } = parsedBody.data
    const session = createSessionToken()

    try {
      const signupResult = await database.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(users)
          .values({
            email,
            passwordHash: await hashPassword(password),
          })
          .returning({
            id: users.id,
            email: users.email,
            status: users.status,
            createdAt: users.createdAt,
          })

        if (!createdUser) {
          throw new Error('User creation failed.')
        }

        await tx.insert(profiles).values({
          userId: createdUser.id,
          fullName,
        })

        await tx.insert(userRoles).values({
          userId: createdUser.id,
          role: 'customer',
        })

        await tx.insert(authSessions).values({
          userId: createdUser.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        })

        return {
          user: createdUser,
          profile: {
            fullName,
          },
          roles: ['customer'],
        }
      })

      return reply
        .status(201)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send(signupResult)
    } catch (error) {
      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'email_already_exists',
          message: 'An account with this email already exists.',
        })
      }

      request.log.error(error)

      return reply.status(500).send({
        error: 'signup_failed',
        message: 'Signup failed. Please try again.',
      })
    }
  })

  app.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter a valid email and password.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { email, password } = parsedBody.data

    try {
      const [existingUser] = await database
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1)

      if (!existingUser) {
        return sendInvalidLogin(reply)
      }

      const passwordMatches = await verifyPassword(
        password,
        existingUser.passwordHash,
      )

      if (!passwordMatches) {
        return sendInvalidLogin(reply)
      }

      if (
        existingUser.status === 'suspended' ||
        existingUser.status === 'disabled'
      ) {
        return reply.status(403).send({
          error: 'account_unavailable',
          message: 'This account is not available. Please contact support.',
        })
      }

      const session = createSessionToken()

      const loginResult = await database.transaction(async (tx) => {
        await tx.insert(authSessions).values({
          userId: existingUser.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
        })

        await tx
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, existingUser.id))

        const [profile] = await tx
          .select({
            fullName: profiles.fullName,
            phone: profiles.phone,
            avatarUrl: profiles.avatarUrl,
          })
          .from(profiles)
          .where(eq(profiles.userId, existingUser.id))
          .limit(1)

        const roles = await tx
          .select({
            role: userRoles.role,
          })
          .from(userRoles)
          .where(eq(userRoles.userId, existingUser.id))

        return {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            status: existingUser.status,
            createdAt: existingUser.createdAt,
          },
          profile,
          roles: roles.map((userRole) => userRole.role),
        }
      })

      return reply
        .status(200)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send(loginResult)
    } catch (error) {
      request.log.error(error)

      return reply.status(500).send({
        error: 'login_failed',
        message: 'Login failed. Please try again.',
      })
    }
  })

  app.get('/me', async (request, reply) => {
    try {
      const sessionContext = await getCurrentSessionContext(
        request.headers.cookie,
      )

      if (!sessionContext) {
        return sendUnauthenticated(reply)
      }

      return reply.status(200).send(sessionContext.authPayload)
    } catch (error) {
      request.log.error(error)

      return reply.status(500).send({
        error: 'current_user_failed',
        message: 'Unable to load the current user.',
      })
    }
  })

  app.post('/logout', async (request, reply) => {
    const token = getSessionTokenFromCookie(request.headers.cookie)

    if (token) {
      await database
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.tokenHash, hashSessionToken(token)))
    }

    return reply
      .status(204)
      .header('Set-Cookie', serializeClearSessionCookie())
      .send()
  })
}

async function getCurrentSessionContext(cookieHeader: string | undefined) {
  const token = getSessionTokenFromCookie(cookieHeader)

  if (!token) {
    return null
  }

  const [sessionUser] = await database
    .select({
      sessionId: authSessions.id,
      revokedAt: authSessions.revokedAt,
      expiresAt: authSessions.expiresAt,
      userId: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(eq(authSessions.tokenHash, hashSessionToken(token)))
    .limit(1)

  if (!sessionUser || sessionUser.revokedAt || isSessionExpired(sessionUser.expiresAt)) {
    return null
  }

  if (sessionUser.status === 'suspended' || sessionUser.status === 'disabled') {
    return null
  }

  const [profile] = await database
    .select({
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, sessionUser.userId))
    .limit(1)

  const roles = await database
    .select({
      role: userRoles.role,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionUser.userId))

  return {
    sessionId: sessionUser.sessionId,
    authPayload: {
      user: {
        id: sessionUser.userId,
        email: sessionUser.email,
        status: sessionUser.status,
        createdAt: sessionUser.createdAt,
      },
      profile,
      roles: roles.map((userRole) => userRole.role),
    },
  }
}

function sendUnauthenticated(reply: FastifyReply) {
  return reply
    .status(401)
    .header('Set-Cookie', serializeClearSessionCookie())
    .send({
      error: 'unauthenticated',
      message: 'Please log in to continue.',
    })
}

function sendInvalidLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid email or password.',
  })
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if ('code' in error && error.code === '23505') {
    return true
  }

  if ('cause' in error) {
    return isUniqueViolation(error.cause)
  }

  return false
}
