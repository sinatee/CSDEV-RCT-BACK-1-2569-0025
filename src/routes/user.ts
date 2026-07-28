import { Hono } from 'hono'
import { prisma } from '../db.js'
import { authMiddlewares } from '../middlewares/authMiddleware.js'

type Env = {
  Variables: {
    user: {
      id: number
      username: string
    }
  }
}

export const user = new Hono<Env>()

user.get('/@me/items', authMiddlewares, async (c) => {
    try
    {
        const currentUser = c.get('user')

        const myItems = await prisma.item.findMany({
            where: { ownerId : currentUser.id },
        })

        const url = new URL(c.req.url)
        const itemsWithImage = myItems.map(item => ({
            ...item,
            imageUrl: `${url.origin}/api/items/${item.id}/image`
        }))
        
        return c.json(itemsWithImage, 200)
    }
    catch (error)
    {
        console.error('Get my items error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to fetch your items',
        }, 500)
    }
})