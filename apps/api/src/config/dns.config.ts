import * as dns from 'node:dns';

export function configureMongoDns() {
  const dnsServers = process.env.MONGODB_DNS_SERVERS;
  if (dnsServers) {
    const servers = dnsServers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length > 0) {
      try {
        dns.setServers(servers);
        console.log(
          `[DNS Config] Node DNS servers overridden with: ${servers.join(', ')}`,
        );
      } catch (err: any) {
        console.error(`[DNS Config] Failed to set DNS servers: ${err.message}`);
      }
    }
  }
}
