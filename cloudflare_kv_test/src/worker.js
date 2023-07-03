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
      c.env.BucketStore.put(`data:${id}`, data )
    ])
    const end = Date.now()
    console.log(`[Client: ${ip}] KV+Bucket Write took ${end - start}ms`)

    return c.json({id: id, colo: c.req.raw.cf?.colo || "???"})
  } catch	(e) {
    console.log(e)
    return c.json({error: "Internal server error"}, 500)
  }
}

async function readRequest(c) {
  const id = c.req.param("id")
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")

  let start = Date.now()
  let data = await c.env.DataStore.get(`data:${id}`)
  let end = Date.now()
  console.log(`[Client: ${ip}] KV Read (ID: ${id}) took ${end - start}ms (null: ${data === null})`)

  if (data === null) {
    start = Date.now()
    data = await c.env.BucketStore.get(`data:${id}`)
    data = await data.arrayBuffer()
    end = Date.now()
    console.log(`[Client: ${ip}] Bucket Read (ID: ${id}) took ${end - start}ms`)
    return c.notFound()
  }

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
