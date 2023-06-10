import * as https from 'https';
import proxies from "./proxies.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Writable } from "stream";

const delay = 0.01;
const url = "https://cloudflare_kv_test.brandonsturgeon.workers.dev";

async function writeData() {
  const response = await fetch(url + "/write", {
    method: "POST",
    body: "'hello world'",
  });

  const json = await response.json();
  console.log(json);

  return json.id;
}

async function readData(proxy, id) {
  const agent = new HttpsProxyAgent(`http://${proxy.ip}:${proxy.port}`);
  https.get(url + `/read/${id}`, { agent }, (res) => {
    const status = res.statusCode;
    console.log(`Proxy ${proxy.ip} - ${status}`);
  });
}

// Test Code
(async () => {
  const id = await writeData();
  console.log(`Wrote data with id ${id}`);
  await Promise.all(proxies.map(proxy => readData(proxy, id)));
})();
