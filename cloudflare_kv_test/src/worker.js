import { Hono } from "hono"

const app = new Hono()

async function writeRequest(c) {
  const data = await c.req.arrayBuffer()
  const id = crypto.randomUUID()
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  const start = Date.now()

	try {
		await Promise.all([
			c.env.DataStore.put(`data:${id}`, data, {
				type: "arrayBuffer",
				expirationTtl: 60,
				metadata: {
					remote: ip
				}
			}),
			c.env.DataStore.put(`size:${id}`, data.byteLength.toString(), {
				expirationTtl: 60,
				metadata: {
					remote: ip
				}
			})
		])

		const end = Date.now()
		console.log(`[Client: ${ip}] Write took ${end - start}ms`)

		return c.json({id: id})
	} catch	(e) {
		console.log(e)
		return c.json({error: "Internal server error"}, 500)
	}
}

async function readRequest(c) {
  const id = c.req.param("id")
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  const start = Date.now()
  const data = await c.env.DataStore.get(`data:${id}`, { type: "arrayBuffer" } )
  const end = Date.now()
  console.log(`[Client: ${ip}] Read (ID: ${id}) took ${end - start}ms`)

  if (data === null) {
    return c.notFound()
  }

  return c.body(data, 200, {
    "Content-Type": "application/octet-stream",
    "Content-Length": data.byteLength.toString()
  })
}

app.post("/write", writeRequest)
app.get("/read/:id", readRequest)

export default app
