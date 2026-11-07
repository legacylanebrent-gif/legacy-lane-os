export async function verifiedPrivateSnapshot(service, snapshot) {
  const content = JSON.stringify(snapshot);
  const digest = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(n => n.toString(16).padStart(2, '0')).join('');
  const sha256 = await digest(content);
  const uploaded = await service.integrations.Core.UploadPrivateFile({ file: new File([content], `photo-repair-${snapshot.sale_id}-${crypto.randomUUID()}.json`, { type: 'application/json' }) });
  if (!uploaded.file_uri) throw new Error('Private backup upload did not return a file reference; no repair performed.');
  const signed = await service.integrations.Core.CreateFileSignedUrl({ file_uri: uploaded.file_uri, expires_in: 300 });
  const readback = await fetch(signed.signed_url, { signal: AbortSignal.timeout(15000) });
  if (!readback.ok || await digest(await readback.text()) !== sha256) throw new Error('Backup read-back verification failed; no repair performed.');
  return { file_uri: uploaded.file_uri, sha256, backup_verified: true };
}