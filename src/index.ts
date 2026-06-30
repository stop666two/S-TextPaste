import { Hono } from 'hono'
import api from './routes/api'

const app = new Hono()

app.route('/', api)

export default app
