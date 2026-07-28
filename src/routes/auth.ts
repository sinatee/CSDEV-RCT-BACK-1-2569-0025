import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { prisma } from '../db.js'

export const auth = new Hono()

// Login //
auth.post('/login', async (c) => {
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
            status: "mai ok",
            message: "user or password not correct na"
        }, 401)
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
    })
})

// Register //
auth.post('/register', async (c) => {
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
        }, 409)
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
