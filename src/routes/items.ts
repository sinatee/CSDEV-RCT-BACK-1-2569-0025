import { Hono } from 'hono'
import { prisma } from '../db.js'
import { authMiddlewares } from '../middlewares/authMiddleware.js'
import { uploadToS3, getFromS3, deleteFromS3 } from '../lib/s3.js'

type Env = {
  Variables: {
    user: {
      id: number
      username: string
    }
  }
}

export const items =  new Hono<Env>()

// add item
items.post('/', authMiddlewares, async (c) => {
    try
    {
        const body = await c.req.parseBody()

        const type = body['type'] as 'LOST' | 'FOUND'
        const title = body['title'] as string
        const description = body['description'] as string
        const location = body['location'] as string
        const eventDate = body['eventDate'] as string
        const image = body['image'] as File | undefined

        if (!type || !title || !description || !location || !eventDate || !image)
        {
            return c.json({
                status: 'mai ok',
                message: 'fill more informatoin na',
            }, 400)
        }

        const imageKey = await uploadToS3(image)
        const user = c.get('user')

        const newItem = await prisma.item.create({
            data: 
            {
                type: type,
                title: title,
                description: description,
                location: location,
                eventDate: new Date(eventDate),
                image: imageKey,
                ownerId: Number(user.id),
            }
        })

        return c.json({
            status: 'ok',
            message: 'Notice Successfully Created',
            data: newItem,
        }, 201)
    }

    catch (error)
    {
        console.error('Create item error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to Create Notice'
        }, 500)
    }
})

// list items
items.get('/', async (c) => {
    try
    {
        const search = c.req.query('search')
        const type = c.req.query('type')

        const page = Number(c.req.query('page') || '1')
        const limit = Number(c.req.query('limit') || '10')

        const skip = (page - 1) * limit

        const filter: any = {}

        if(search)
        {
            filter.title = { contains: search, mode: 'insensitive' }
        }

        if(type)
        {
            filter.type = type
        }

        const result = await prisma.item.findMany({
             where: filter,
             skip: skip,
             take: limit,
        })
        return c.json(result, 200)

    }
    catch (error)
    {
        console.error('Get all items error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to fetch items',
        }, 500)
    }
})

// get by id
items.get('/:id', async (c) => {
    try
    {
        const id = Number(c.req.param('id'))

        if(isNaN(id))
        {
            return c.json({
                status: 'mai ok',
                message: 'i want number na',
            }, 400)
        }

        const item = await prisma.item.findUnique({
            where:
            {
                id: id
            },
            include:
            {
                owner:
                {
                    select:
                    {
                        id: true,
                        username: true,
                    }
                }
            }
        })

        if (!item) {
            return c.json({
                status: 'mai ok',
                message: 'Item not found na',
            }, 404)
        }

        const url = new URL(c.req.url)
        const imageUrl = `${url.origin}/api/items/${item.id}/image`

        return c.json({
            ...item,
            imageUrl: imageUrl,
        } as any, 200)
    }
    catch (error)
    {
        console.error('Get item by ID error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to fetch item',
        }, 500)
    }
})

// get image by id
items.get('/:id/image', async (c) => {
    try
    {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) 
        {
            return c.json({
                status: 'mai ok',
                message: 'i want number na',
            }, 400)
        }

        const item = await prisma.item.findUnique({
            where:
            {
                id: id,
            },
            select:
            {
                image: true,
            }
        })

        if (!item || !item.image)
        {
            return c.json({
                status: 'mai',
                message: 'dont find image na',
            }, 404)
        }

        const s3Obj = await getFromS3(item.image)

        if(!s3Obj.Body)
        {
            return c.json({
                status: 'mai ok',
                message: 'Failed to load image from S3',
            }, 404)
        }

        const contentType = s3Obj.ContentType
        c.header('Content-Type', contentType)

        const stream = s3Obj.Body.transformToWebStream()
        return c.body(stream)
    }
    catch (error)
    {
        console.error('Get item image error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to fetch image',
        }, 500)
    }
})

// change info in item table
items.patch('/:id', authMiddlewares, async (c) => {
    try
    {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({
                status: 'mai ok',
                message: 'i want number na',
            }, 400)
        }

        const user = c.get('user')

        const currentItem = await prisma.item.findUnique({
            where: { id: id },
        })

        if (!currentItem)
        {
            return c.json({
                status: 'mai ok',
                message: 'dont have this item na',
            }, 404)
        }

        if (currentItem.ownerId !== user.id)
        {
            return c.json({
                status: 'mai ok',
                message: 'who are u!!! this is not your item na'
            }, 403)
        }

        const body = await c.req.parseBody()

        const type = body['type'] as 'LOST' | 'FOUND' | undefined
        const title = body['title'] as string | undefined
        const description = body['description'] as string | undefined
        const location = body['location'] as string | undefined
        const eventDate = body['eventDate'] as string | undefined
        const status = body['status'] as 'OPEN' | 'CLOSED' | undefined
        const image = body['image'] as File | undefined

        const updateData: any = {}

        if (type) updateData.type = type
        if (title) updateData.title = title
        if (description) updateData.description = description
        if (location) updateData.location = location
        if (eventDate) updateData.eventDate = new Date(eventDate)
        if (status) updateData.status = status

        if (image && image instanceof File && image.size > 0)
        {
            if (currentItem.image)
            {
                await deleteFromS3(currentItem.image)
            }

            const newImageKey = await uploadToS3(image)
            updateData.image = newImageKey
        }

        const updatedItem = await prisma.item.update({
            where: { id: id },
            data: updateData,
        })

        return c.json({
            status: 'ok',
            message: 'Notice Successfully Updated',
            data: updatedItem,
        }, 200)
    }
    catch (error)
    {
        console.error('Update item error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to Update Notice',
        }, 500)
    }
})

// delete by item id
items.delete('/:id', authMiddlewares, async (c) => {
    try
    {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({
                status: 'mai ok',
                message: 'i want number na',
            }, 400)
        }

        const user = c.get('user')

        const currentItem = await prisma.item.findUnique({
            where: { id: id },
        })

        if (!currentItem)
            {
            return c.json({
                status: 'mai ok',
                message: 'dont have this item na',
            }, 404)
        }

        if (currentItem.ownerId !== user.id) {
            return c.json({
                status: 'mai ok',
                message: 'who are u!!! this is not your item na',
            }, 403)
        }

        if (currentItem.image)
        {
            await deleteFromS3(currentItem.image)
        }

        await prisma.item.delete({
            where: { id: id },
        })

        return c.json({
            status: 'ok',
            message: 'Notice Successfully Deleted',
        }, 200)
    }
    catch(error)
    {
        console.error('Delete item error:', error)
        return c.json({
            status: 'mai ok',
            message: 'Failed to Delete Notice',
        }, 500)
    }
})
