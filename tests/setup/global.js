import pg from 'pg';
import { migrate } from '../../scripts/migrate.js';
import { seedCatalog } from '../../scripts/seed.js';

// Tạo lại schema của DB test, áp toàn bộ migration rồi seed danh mục chung.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('Không có TEST_DATABASE_URL: bỏ qua test tích hợp cần Postgres.');
    return;
  }
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) throw new Error(`TEST_DATABASE_URL phải trỏ tới DB có chữ "test" trong tên (đang là "${dbName}")`);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();

  await migrate({ connectionString: url, log: () => {} });
  const seedClient = new pg.Client({ connectionString: url });
  await seedClient.connect();
  await seedCatalog(seedClient, () => {});
  await seedClient.end();
}
