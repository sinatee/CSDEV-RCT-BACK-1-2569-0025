import { createMiddleware } from 'hono/factory'
import { verify  } from 'hono/jwt'

export const authMiddlewares = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer '))
    {
        return c.json({
            status: 'mai ok',
            message: 'Login first na',
        }, 401)
    }

    const token = authHeader.split(' ')[1]

    const JWT_SECRET = process.env.JWT_SECRET || 'secondary-secret########'
    try
    {
        const payload = await verify(token, JWT_SECRET, 'HS256')
        c.set('user', payload)

        await next()
    }
    catch(error)
    {
        return c.json({
            status: 'mai ok',
            message: 'Wrong token na',
        }, 401)
    }
})