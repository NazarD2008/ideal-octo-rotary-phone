export interface PatchOptions {
  serverUrl?: string;
  homeUrl?: string;
  bootstrapToken?: string;
  packageName?: string;
  defaultServer?: string;
  defaultHome?: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeSmaliString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function escapeReplacement(s: string): string {
  return s.replace(/\$/g, '$$$$');
}

export function patchSmaliContent(content: string, opts: PatchOptions): { content: string; counts: { serverPatched: number; homePatched: number; tokenPatched: number; packagePatched: number }; modified: boolean } {
  let serverPatched = 0;
  let homePatched = 0;
  let tokenPatched = 0;
  let packagePatched = 0;
  let modified = false;

  if (opts.serverUrl) {
    const safeServer = escapeReplacement(escapeSmaliString(opts.serverUrl));
    const serverFieldPattern = /\.field\s+[^\n]*\bSERVER_HOST:Ljava\/lang\/String;[^\n]*=\s*"[^"]*"/g;
    if (serverFieldPattern.test(content)) {
      content = content.replace(serverFieldPattern, (match) => match.replace(/"[^"]*"/, `"${safeServer}"`));
      modified = true; serverPatched++;
    }

    if (opts.defaultServer) {
      const serverConstRegex = new RegExp(`(const-string\\s+v\\d+,\\s*")${escapeRegex(opts.defaultServer)}(" )?`, 'g');
      // simpler: replace exact const-string occurrences of default server
      const simpleConstRegex = new RegExp(`(const-string\\s+v\\d+,\\s*")${escapeRegex(opts.defaultServer)}("\)`, 'g');
      // replace any occurrence of the default URL
      if (content.includes(opts.defaultServer)) {
        content = content.replace(new RegExp(escapeRegex(opts.defaultServer), 'g'), safeServer);
        modified = true; serverPatched++;
      }
    }
  }

  if (opts.homeUrl) {
    const safeHome = escapeReplacement(escapeSmaliString(opts.homeUrl));
    const homeFieldPattern = /\.field\s+[^\n]*\bHOME_PAGE_URL:Ljava\/lang\/String;[^\n]*=\s*"[^"]*"/g;
    if (homeFieldPattern.test(content)) {
      content = content.replace(homeFieldPattern, (match) => match.replace(/"[^"]*"/, `"${safeHome}"`));
      modified = true; homePatched++;
    }

    if (opts.defaultHome && content.includes(opts.defaultHome)) {
      content = content.replace(new RegExp(escapeRegex(opts.defaultHome), 'g'), safeHome);
      modified = true; homePatched++;
    }
  }

  if (opts.bootstrapToken) {
    const safeToken = escapeSmaliString(opts.bootstrapToken);
    const tokenFieldPattern = /\.field\s+[^\n]*\bBOOTSTRAP_TOKEN:Ljava\/lang\/String;[^\n]*=\s*"[^"]*"/g;
    if (tokenFieldPattern.test(content)) {
      content = content.replace(tokenFieldPattern, (match) => match.replace(/"[^"]*"/, `"${safeToken}"`));
      modified = true; tokenPatched++;
    }

    const tokenInitializerPattern = new RegExp(`(const-string(?:\\/jumbo)?\\s+)([vp]\\d+),\\s*"(?:\\\\.|[^"\\\\])*"(\\s+sput-object\\s+\\2,\\s+Lcom\\/(?:liuma|fason)\\/app\\/core\\/config\\/Config;->BOOTSTRAP_TOKEN:Ljava\\/lang\\/String;)`, 'g');
    if (tokenInitializerPattern.test(content)) {
      content = content.replace(tokenInitializerPattern, (_match, instruction, register, assignment) => `${instruction}${register}, "${safeToken}"${assignment}`);
      modified = true; tokenPatched++;
    }
  }

  if (opts.packageName && opts.defaultServer) {
    // Note: opts.defaultServer used as heuristic for default package in caller; but keep simple
  }

  if (opts.packageName && opts.packageName !== '') {
    const oldPackage = opts.defaultServer ? undefined : undefined; // noop here; caller should pass defaultPackage if needed
    // if caller provided default package, it should perform renames; otherwise skip
  }

  // Package path replacement expectation: caller may run separate replacement if needed

  return { content, counts: { serverPatched, homePatched, tokenPatched, packagePatched }, modified };
}
