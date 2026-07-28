import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { auth } from './routes/auth.js'
import { items } from './routes/items.js'
import { user } from './routes/user.js'

import { openAPIRouteHandler } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'

const app = new Hono()

app.route('/api/auth', auth)
app.route('/api/items', items)
app.route('/api/user', user)

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Lost and Found API',
        version: '1.0.0',
        description: 'Lost and Found API',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })
)

app.get(
  '/docs',
  Scalar({
    spec: { url: '/openapi.json' },
    theme: 'alternate',
    pageTitle: 'Lost and Found API',
    darkMode: false, 
  })
)

// serve({
//   fetch: app.fetch,
//   port: 6767
// }, (info) => {
//   console.log(`Server is running on http://localhost:${info.port}`)
// })

export default app