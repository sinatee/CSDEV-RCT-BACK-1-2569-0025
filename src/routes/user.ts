import { Hono } from 'hono'
import { prisma } from '../db.js'
import { authMiddlewares } from '../middlewares/authMiddleware.js'
import { describeRoute } from 'hono-openapi'

type Env = {
  Variables: {
    user: {
      id: number
      username: string
    }
  }
}

export const user = new Hono<Env>()

user.get(
    '/@me/items',
    describeRoute({
        tags: ['User'],
        summary: 'Get my items',
        description: 'list all notices created by user',
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'List of items created by current user',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number', example: 1 },
                                    type: { type: 'string', enum: ['LOST', 'FOUND'], example: 'LOST' },
                                    title: { type: 'string', example: 'find a Dog' },
                                    description: { type: 'string', example: 'Big Black Dog' },
                                    location: { type: 'string', example: 'Doggy Land' },
                                    eventDate: { type: 'string', format: 'date-time' },
                                    image: { type: 'string', example: 's3-key.jpg' },
                                    ownerId: { type: 'number', example: 123 },
                                    imageUrl: { type: 'string', example: 'http://localhost:6767/api/items/1/image' }
                                }
                            }
                        }
                    }
                }
            },
            500: {
                description: 'Server Error',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                status: { type: 'string', example: 'mai ok' },
                                message: { type: 'string', example: 'Failed to fetch your items' },
                            }
                        }
                    }
                }
            }
        }
    }),
    authMiddlewares, async (c) => {
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