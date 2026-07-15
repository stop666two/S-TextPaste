import { Hono } from 'hono'
import api from './routes/api'

const app = new Hono()

app.route('/', api)

// Health check (used by monitoring and dev server)
app.get('/health', (c) => c.json({ status: 'ok', version: '4.0' }))

// Global error handler — never leak stack traces to client
app.onError((err, c) => {
  console.error('Worker error:', err.message)
  return c.json({ error: 'Internal error' }, 500)
})

export default app
