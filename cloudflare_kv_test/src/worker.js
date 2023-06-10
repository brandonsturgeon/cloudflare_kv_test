import { Hono } from "hono"

const app = new Hono()

async function writeRequest(c) {
  const data = await c.req.body()
  const id = crypto.randomUUID()
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  const start = Date.now()
  await c.env.DataStore.put(id, data, {
    expirationTtl: 60 * 60 * 24,
    metadata: {
      remote: ip
    }
  })

  const end = Date.now()
  console.log(`[Client: ${ip}] Write took ${end - start}ms`)

  return c.json({id: id})
}

async function readRequest(c) {
  const id = c.req.param("id")
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  const start = Date.now()
  const data = await c.env.DataStore.get(id)
  const end = Date.now()
  console.log(`[Client: ${ip}] Read (ID: ${id}) took ${end - start}ms`)

  return c.json({data : data})
}

app.post("/write", writeRequest)
app.get("/read/:id", readRequest)
