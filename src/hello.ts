export default {
  async fetch() {
    return new Response('hello', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
}
