import * as crypto from 'crypto';
import * as https from 'https';
import proxies from "./proxies.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Writable } from "stream";

const delay = 0.01;
const url = "https://cloudflare_kv_test.brandonsturgeon.workers.dev";

async function generateRandomArrayBuffer(size) {
  const maxChunkSize = 65536; // Maximum chunk size
  const numChunks = Math.ceil(size / maxChunkSize);
  const chunks = [];

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = Math.min(maxChunkSize, size - i * maxChunkSize);
    const chunkBuffer = new ArrayBuffer(chunkSize);
    const chunkView = new Uint8Array(chunkBuffer);
    crypto.getRandomValues(chunkView);
    chunks.push(chunkBuffer);
  }

  const buffer = new Uint8Array(size);
  let offset = 0;

  chunks.forEach((chunkBuffer) => {
    buffer.set(new Uint8Array(chunkBuffer), offset);
    offset += chunkBuffer.byteLength;
  });

  return buffer.buffer;
}

async function writeData() {
  const body = await generateRandomArrayBuffer(1024 * 1024 * 10);
  console.log(`Writing ${body.byteLength} bytes of data`);

  const response = await fetch(url + "/write", {
    method: "POST",
    body: body,
  });

  const json = await response.json();
  console.log(json);

  return json.id;
}

async function readData(proxy, id) {
  const agent = new HttpsProxyAgent(`http://${proxy.ip}:${proxy.port}`);
  https.get(url + `/read/${id}`, { agent }, (res) => {
    const status = res.statusCode;
    console.log(`Proxy ${proxy.city} - (${proxy.ip}) - ${status} - ${res.headers['content-length']}`);
  });
}

// Test Code
(async () => {
  const id = await writeData();
  console.log(`Wrote data with id ${id}`);
  await Promise.all(proxies.map(proxy => readData(proxy, id)));
})();
