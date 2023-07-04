import { Hono } from "hono"

const app = new Hono()

async function writeRequest(c) {
  const data = await c.req.arrayBuffer()
  const id = crypto.randomUUID()
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  const start = Date.now()

  try {
    await Promise.all([
      c.env.DataStore.put(`size:${id}`, data.byteLength, {
        expirationTtl: 60,
        metadata: {
          remote: ip
        }
      }),
      c.env.DataStore.put(`data:${id}`, data, {
        type: "arrayBuffer",
        expirationTtl: 60,
        metadata: {
          remote: ip
        }
      }),
    ])
    console.log(`[Client: ${ip}] KV Writes took ${Date.now() - start}ms`)

    return c.json({id: id, colo: c.req.raw.cf?.colo || "???"})
  } catch	(e) {
    console.log(e)
    return c.json({error: "Internal server error"}, 500)
  }
}

async function readRequest(c) {
  const id = c.req.param("id")
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  let sizeData = await c.env.DataStore.get(`size:${id}`)
  if (sizeData === null) {
    console.log(`[Client: ${ip}] KV Size read is NULL, waiting for 2s to try full data`)
    await new Promise(r => setTimeout(r, 2000))
  }
  console.log(`[Client: ${ip}] KV Size read is: ${sizeData}`)

  const data = await c.env.DataStore.get(`data:${id}`, {type: "arrayBuffer"})
  if (data === null) {
    console.log(`[Client: ${ip}] KV Data read is NULL, returning 404 (Size data: ${sizeData})`)
    return c.notFound()
  }

  console.log(`[Client: ${ip}] KV Data read is: ${data.byteLength}`)

  return c.body(data, 200, {
    "Content-Type": "application/octet-stream",
    "Content-Length": data.byteLength.toString()
  })
}

const coloRegex = new RegExp("fl=(.*)f");
async function getColo(c) {
  try {
    const resp = await fetch("https://cloudflare.com/cdn-cgi/trace");
    const trace = await resp.text();
    const colo = trace.match(coloRegex)[1]

    return c.json({
      coloID: colo,
      colo: c.req.raw.cf?.colo,
      country: c.req.raw.cf?.country
    })
  } catch (e) {
    console.log(e)
    return c.json({error: e.toString()}, 500)
  }
}

app.post("/write", writeRequest)
app.get("/read/:id", readRequest)
app.get("/colo", getColo)

export default app
