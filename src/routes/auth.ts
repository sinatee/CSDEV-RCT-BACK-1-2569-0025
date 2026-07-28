import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { prisma } from '../db.js'
import { describeRoute } from 'hono-openapi'

export const auth = new Hono()

// Login //
auth.post(
    '/login',
    describeRoute({
        tags: ['Auth'],
        summary: 'Login',
        description: 'Login and get jwt token',
        requestBody: {
            content: {
                'application/json': {
                    schema: {
                    type: 'object',
                    properties: {
                        username: { type: 'string', example: 'john_doe' },
                        password: { type: 'string', example: '123456' },
                    },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
            200: {
              description: 'Login Successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'ok' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        data: {
                            type: 'object',
                            properties: {
                                id: { type: 'number', example: 1 },
                                username: { type: 'string', example: 'john_doe' }
                            }
                        }
                    },
                  },
                },
              },
            },
            400: { 
                description: 'user or password wrong',
                content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'mai ok' },
                        message: { type: 'string', example: 'user or password not correct na' },
                    },
                  },
                },
              },
            },
        }
    }),
    async (c) => {
    const body = await c.req.json()
    const { username, password } = body 

    if (!username ||!password)
    {
        return c.json({
            status: "mai ok",
            message: "username or password empty na"
        }, 400)
    }

    const user = await prisma.user.findUnique({
        where: { username: username }
    })

    if (!user || user.password !== password)
    {
        return c.json({
            status: 'mai ok',
            message: 'user or password not correct na',
        }, 400)
    }

    const payload = {
        id: user.id,
        username: user.username
    }
    const JWT_SECRET = process.env.JWT_SECRET || 'secondary-secret########'

    const token = await sign(payload, JWT_SECRET, 'HS256')

    return c.json({
        status: "ok",
        token: token,
        data:
        {
            id: user.id,
            username: user.username
        }
    }, 200)
})

// Register //
auth.post(
    '/register',
    describeRoute({
        tags: ['Auth'],
        summary: 'register',
        description: 'create new user',
        requestBody: {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                        username: { type: 'string', example: 'john_doe' },
                        password: { type: 'string', example: '123456' },
                    },
                    required: ['username', 'password'],
                  },
                },
            },
        },
        responses: {
            201: {
                description: 'register done',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                status: { type: 'string', example: 'ok' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'number', example: 1 },
                                        username: { type: 'string', example: 'john_doe' }
                                    }
                                }
                            },
                        },
                    },
                },
            },
            400: {
                description: 'register fail',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                status: { type: 'string', example: 'mai ok' },
                                message: { type: 'string', example: 'username or password empty na' },
                            },
                        },
                    },
                },
            }
        }
    }),
     async (c) => {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password)
    {
        return c.json({
            status: "mai ok",
            message: "username or password empty na"
        }, 400)
    }

    const haveUser = await prisma.user.findUnique({
        where: { username:  username }
    })

    if (haveUser)
    {
        return c.json({
            status: "mai ok",
            data: "this name already have na"
        }, 400)
    }

    const newUser = await prisma.user.create({
        data:
        {
            username: username,
            password: password
        }
    })

    return c.json({
        status: "ok",
        data:
        {
            id: newUser.id,
            username: newUser.username
        }
    }, 201)
})
