import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function objectName(folder, file) {
  return `${folder}/${randomUUID()}.${EXT[file.mimetype] ?? 'bin'}`;
}

// Lưu ảnh vào thư mục UPLOAD_DIR, app.js phục vụ tĩnh tại <API_PREFIX>/uploads.
export const localStorageDriver = {
  async upload(folder, file, req) {
    const name = objectName(folder, file);
    const target = path.resolve(env.UPLOAD_DIR, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    const base = env.PUBLIC_BASE_URL ?? `${req.protocol}://${req.get('host')}`;
    return `${base}${env.API_PREFIX}/uploads/${name}`;
  },
};

// Bucket public trên Supabase Storage (tạo bucket trên Dashboard trước).
let client;
export const supabaseStorageDriver = {
  async upload(folder, file) {
    client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const name = objectName(folder, file);
    const bucket = client.storage.from(env.SUPABASE_STORAGE_BUCKET);
    const { error } = await bucket.upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw error;
    return bucket.getPublicUrl(name).data.publicUrl;
  },
};
