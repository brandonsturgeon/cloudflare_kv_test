import * as https from 'https';
import proxies from "./proxies.js";
import generateData from "./generate.js";
import setLocationData from "./colo.js";
import { HttpsProxyAgent } from 'https-proxy-agent';

const dataSize = 1024 * 1024 * 10;
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

async function readData(proxy, id, agent, firstFailed, attempts) {
  agent = agent || new HttpsProxyAgent(`http://${proxy.ip}:${proxy.port}`);

  https.get(url + `/read/${id}`, { agent }, (res) => {
    const status = res.statusCode;

    if (status === 404) {
      firstFailed = firstFailed || Date.now();
      attempts = attempts || 0;

      readData(proxy, id, agent, firstFailed, attempts + 1);
    } else {
      const loc = `${proxy.region + "-" || ""}${proxy.colo}`;
      if (firstFailed) {
        const time = Date.now() - firstFailed;
        console.log(`${loc} - ${proxy.ip} - Success - (Took: ${time}ms | ${attempts} retries)`);
      } else {
        console.log(`${loc} - ${proxy.ip} - Success`);
      }
    }
  });
}

(async () => {
  await Promise.all(proxies.map(proxy => setLocationData(proxy, url)));
  console.log("Set location data for all proxies");

  // Write the data
  const id = await writeData();
  console.log(`Wrote data with id ${id}`);

  // Read the data from all proxies simultaneously
  await Promise.all(proxies.map(proxy => readData(proxy, id)));
})();
