import { Hono } from 'hono'
import api from './routes/api'

const app = new Hono()

app.route('/', api)

app.get('/health', (c) => c.json({ status: 'ok', version: '4.0' }))

app.onError((err, c) => {
  console.error('Worker error:', err.message)
  return c.json({ error: 'Internal error' }, 500)
})

export default {
  async fetch(request, env, ctx) {
    const res = await app.fetch(request, env, ctx)
    if (res) {
      res.headers.set('Permissions-Policy', 'interest-cohort=(), run-ad-auction=()')
    }
    return res
  }
}
