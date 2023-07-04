import * as https from 'https';
import proxies from "./proxies.js";
import generateData from "./generate.js";
import setLocationData from "./colo.js";
import { HttpsProxyAgent } from 'https-proxy-agent';

const dataSize = 1024 * 1024 * 18;
const url = "https://cloudflare_kv_test.brandonsturgeon.workers.dev";

async function writeData() {
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

async function readData(proxy, id, agent, started, attempts) {
  attempts = attempts || 0;
  agent = agent || new HttpsProxyAgent(`http://${proxy.ip}:${proxy.port}`);

  started = started || Date.now();

  https.get(url + `/read/${id}`, { agent }, (res) => {
    const status = res.statusCode;

    const loc = `${proxy.region + "-" || ""}${proxy.colo}#${proxy.coloID} - ${proxy.ip}`;
    if (status === 404) {
      readData(proxy, id, agent, started, attempts + 1);
    } else {
      const time = Date.now() - started;
      console.log(`${loc} - ${status} - (Took: ${time}ms | ${attempts} retries)`);
    }
  });
}

(async () => {
  console.log("Setting location data for all proxies");
  await Promise.all(proxies.map(proxy => setLocationData(proxy, url)));

  // Write the data
  const id = await writeData();
  console.log(`Wrote data with id ${id}`);

  // Read the data from all proxies simultaneously
  await Promise.all(proxies.map(proxy => readData(proxy, id)));
})();
