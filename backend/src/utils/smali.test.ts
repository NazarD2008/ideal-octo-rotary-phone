import assert from 'node:assert/strict';
import { patchSmaliContent } from './smali';

function run() {
  console.log('smali tests: starting');

  // Server field replacement
  const serverField = '.field public static final SERVER_HOST:Ljava/lang/String; = "http://127.0.0.1:32766"\n';
  const r1 = patchSmaliContent(serverField, { serverUrl: 'https://example.com' });
  assert(r1.modified, 'server field should be modified');
  assert(r1.counts.serverPatched >= 1, 'serverPatched should be >= 1');
  console.log('✓ server field replacement');

  // Home field replacement
  const homeField = '.field public static final HOME_PAGE_URL:Ljava/lang/String; = "https://google.com"\n';
  const r2 = patchSmaliContent(homeField, { homeUrl: 'https://example.org' });
  assert(r2.modified, 'home field should be modified');
  assert(r2.counts.homePatched >= 1, 'homePatched should be >= 1');
  console.log('✓ home field replacement');

  // Token field and initializer replacement
  const tokenSnippet = '.field public static BOOTSTRAP_TOKEN:Ljava/lang/String; = "OLD"\n' +
    'const-string v3, "OLDTOKEN"\n' +
    'sput-object v3, Lcom/liuma/app/core/config/Config;->BOOTSTRAP_TOKEN:Ljava/lang/String;\n';
  const r3 = patchSmaliContent(tokenSnippet, { bootstrapToken: 'NEW-TOKEN-123' });
  assert(r3.modified, 'token snippet should be modified');
  assert(r3.counts.tokenPatched >= 1, 'tokenPatched should be >= 1');
  console.log('✓ bootstrap token replacement');

  // Default server replacement in const-string occurrences
  const constStringSnippet = 'const-string v1, "http://127.0.0.1:32766"\n';
  const r4 = patchSmaliContent(constStringSnippet, { serverUrl: 'https://custom.local', defaultServer: 'http://127.0.0.1:32766' });
  assert(r4.modified, 'const-string default server should be modified');
  assert(r4.counts.serverPatched >= 1, 'serverPatched should be >= 1 (const-string)');
  console.log('✓ const-string default server replacement');

  console.log('smali tests: all passed');
}

run();
