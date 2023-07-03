#!/bin/bash
wrangler2 tail --format json | jq -r '(.event.request.method | gsub("https://cloudflare_kv_test.brandonsturgeon.workers.dev"; "")) + " -> " + (.event.request.url | sub("https://cloudflare_kv_test.brandonsturgeon.workers.dev"; "")) + " [" + (.event.response.status|tostring) + "]" +
(if (.exceptions | length) > 0 then "\n- " + (.exceptions|join("\n- ")) else "" end) +
(if (.logs | length) > 0 then "\n- " + (.logs[].message|join("\n- ")) else "" end) + "\n"'
