import fs from 'fs';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { log } from '../utils/logger.js';

const PARSE_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  parseTagValue: false,
};

const BUILD_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
};

export async function updateStringsXml(stringsPath: string, appName: string): Promise<boolean> {
  try {
    const raw = fs.readFileSync(stringsPath, 'utf-8');
    const parser = new XMLParser(PARSE_OPTIONS as any);
    const parsed = parser.parse(raw) as any;
    if (!parsed || !parsed.resources) return false;

    const resources = parsed.resources;
    let changed = false;

    // strings may be an array or single object
    const stringsNode = resources.string;
    if (Array.isArray(stringsNode)) {
      for (const s of stringsNode) {
        const name = s['@_name'];
        if (name === 'app_name') {
          if (s['#text'] !== appName) {
            s['#text'] = appName;
            changed = true;
          }
        }
      }
    } else if (stringsNode && stringsNode['@_name'] === 'app_name') {
      if (stringsNode['#text'] !== appName) {
        stringsNode['#text'] = appName;
        changed = true;
      }
    } else {
      // add app_name string if missing
      if (!resources.string) resources.string = [];
      if (!Array.isArray(resources.string)) resources.string = [resources.string];
      resources.string.push({ '@_name': 'app_name', '#text': appName });
      changed = true;
    }

    if (changed) {
      const builder = new XMLBuilder(BUILD_OPTIONS as any);
      const out = builder.build(parsed);
      fs.writeFileSync(stringsPath, out, 'utf-8');
    }
    return changed;
  } catch (err: any) {
    log.warn(`[xml] updateStringsXml failed: ${err?.message || String(err)}`);
    return false;
  }
}

export async function updateManifestXml(manifestPath: string, packageName: string, versionName: string): Promise<boolean> {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parser = new XMLParser(PARSE_OPTIONS as any);
    const parsed = parser.parse(raw) as any;
    if (!parsed || !parsed.manifest) return false;

    const manifest = parsed.manifest;
    let changed = false;

    if (manifest['@_package'] !== packageName) {
      manifest['@_package'] = packageName;
      changed = true;
    }

    // set android:versionName attribute (preserve namespace prefix)
    if (manifest['@_android:versionName'] !== versionName) {
      manifest['@_android:versionName'] = versionName;
      changed = true;
    }

    if (changed) {
      const builder = new XMLBuilder(BUILD_OPTIONS as any);
      const out = builder.build(parsed);
      // xml builder may omit xml declaration; preserve original declaration if present
      const hasDecl = raw.trim().startsWith('<?xml');
      const result = hasDecl ? out : out;
      fs.writeFileSync(manifestPath, result, 'utf-8');
    }

    return changed;
  } catch (err: any) {
    log.warn(`[xml] updateManifestXml failed: ${err?.message || String(err)}`);
    return false;
  }
}
