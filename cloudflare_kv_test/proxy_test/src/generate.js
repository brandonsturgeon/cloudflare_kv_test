import * as crypto from 'crypto';

export default async function generateRandomArrayBuffer(size) {
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
