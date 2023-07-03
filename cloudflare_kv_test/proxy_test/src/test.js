import * as https from 'https';
import proxies from "./proxies.js";
import generateData from "./generate.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Writable } from "stream";

const url = "https://cloudflare_kv_test.brandonsturgeon.workers.dev";

async function writeData() {
  const dataSize = 1024 * 1024 * 10;
  const body = await generateData(dataSize);
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

(async () => {
  // Write the data
  const id = await writeData();
  console.log(`Wrote data with id ${id}`);

  // Read the data from all proxies simultaneously
  await Promise.all(proxies.map(proxy => readData(proxy, id)));
})();
