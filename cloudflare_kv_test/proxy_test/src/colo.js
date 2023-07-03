import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
export default async function setLocationData(proxy, url) {
  const agent = new HttpsProxyAgent(`http://${proxy.ip}:${proxy.port}`);

  return new Promise((resolve, reject) => {
    https.get(url + "/colo", { agent }, (res) => {
      let rawData = '';

      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const data = JSON.parse(rawData);
        proxy.colo = data.colo;
        proxy.region = data.country;
        resolve();
      });

      res.on('error', reject);
    })
  });
}
