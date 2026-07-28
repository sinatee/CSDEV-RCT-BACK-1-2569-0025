import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { auth } from './routes/auth.js'
import { items } from './routes/items.js'
import { user } from './routes/user.js'

const app = new Hono()

app.route('/api/auth', auth)
app.route('/api/items', items)
app.route('/api/user', user)




serve({
  fetch: app.fetch,
  port: 6767
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
