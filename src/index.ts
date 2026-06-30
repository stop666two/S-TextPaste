/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import apiRoutes from './routes/api'

const app = new Hono()

// API routes at /api/*
app.route('/api', apiRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

// Serve static assets (JS, CSS, images, etc.)
app.get('/assets/*', serveStatic({ root: './' }))

// Serve favicon
app.get('/favicon.ico', serveStatic({ path: './favicon.ico', root: './' }))
app.get('/favicon.svg', serveStatic({ path: './favicon.svg', root: './' }))

// SPA fallback - serve index.html for all unknown routes
app.get('/*', serveStatic({ path: './index.html', root: './' }))

export default app
