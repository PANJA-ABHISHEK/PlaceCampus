export function assertSafeDemoSeedTarget() {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error('Refusing demo seed: set DEMO_MODE=true explicitly.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data in production.');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const uri = new URL(process.env.MONGODB_URI);
  const database = decodeURIComponent(uri.pathname.replace(/^\//, '').split('/')[0] || '');
  if (!/demo/i.test(database)) {
    throw new Error(`Refusing database "${database}": use an isolated database whose name contains "demo".`);
  }
}
