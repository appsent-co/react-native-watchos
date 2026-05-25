#!/usr/bin/env node
// Extracts a SwiftUI catalog (views + modifiers) from the watchOS SDK's
// .swiftinterface files shipped with Xcode. This is the ground truth: the
// exact public API the Swift compiler sees when targeting watchOS.
//
// Outputs:
//   scripts/swiftui-catalog/catalog.json  - structured catalog
//   scripts/swiftui-catalog/summary.md    - human-readable summary
//
// Re-run after Xcode updates.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'swiftui-catalog'
);
mkdirSync(OUT_DIR, { recursive: true });

const sdkPath = execSync('xcrun --sdk watchos --show-sdk-path')
  .toString()
  .trim();
const sdkName = (sdkPath.match(/WatchOS[\d.]+\.sdk/) || ['unknown'])[0];
const ARCH = 'arm64_32-apple-watchos';

const MODULES = [
  {
    name: 'SwiftUI',
    path: `${sdkPath}/System/Library/Frameworks/SwiftUI.framework/Modules/SwiftUI.swiftmodule/${ARCH}.swiftinterface`,
  },
  {
    name: 'SwiftUICore',
    path: `${sdkPath}/System/Library/Frameworks/SwiftUICore.framework/Modules/SwiftUICore.swiftmodule/${ARCH}.swiftinterface`,
  },
];

// Protocol names that mean "this is the View protocol itself" — extensions on
// these contribute global modifiers.
const VIEW_PROTOCOLS = new Set(['View', 'SwiftUI.View', 'SwiftUICore.View']);

// Protocols whose conformers are Views (Shape : View, InsettableShape : Shape).
// Anything conforming to one of these is treated as a watchOS View in pass 1.
const VIEW_LIKE_CONFORMANCES = new Set([
  'View',
  'SwiftUI.View',
  'SwiftUICore.View',
  'Shape',
  'SwiftUI.Shape',
  'SwiftUICore.Shape',
  'InsettableShape',
  'SwiftUI.InsettableShape',
  'SwiftUICore.InsettableShape',
]);

// Keywords that mark a line as a declaration (so a `@`-prefixed line with
// these is an inline-attributed decl, not a pure attribute line).
const DECL_KW =
  /\b(struct|class|enum|protocol|extension|func|var|let|init|subscript|typealias|associatedtype|actor)\b/;

// ---------- helpers ----------

function parseAvailability(attrLines) {
  const out = {
    watchOSAvailable: true,
    watchOSIntroduced: null,
    watchOSDeprecated: null,
    raw: attrLines.filter((l) => l.startsWith('@available')),
  };
  for (const line of out.raw) {
    if (/@available\s*\(\s*watchOS\s*,\s*unavailable/.test(line)) {
      out.watchOSAvailable = false;
      continue;
    }
    const kw = /@available\s*\(\s*watchOS\s*,([^)]+)\)/.exec(line);
    if (kw) {
      const intro = /introduced:\s*([\d.]+)/.exec(kw[1]);
      const depr = /deprecated:\s*([\d.]+)/.exec(kw[1]);
      if (intro) out.watchOSIntroduced = intro[1];
      if (depr) out.watchOSDeprecated = depr[1];
      continue;
    }
    const multi = /@available\s*\(([^)]+)\)/.exec(line);
    if (multi) {
      for (const part of multi[1].split(',').map((s) => s.trim())) {
        const m = /^watchOS\s+([\d.]+)$/.exec(part);
        if (m) out.watchOSIntroduced = m[1];
      }
    }
  }
  return out;
}

// Split a comma-separated list respecting <> () [] depth
function splitTopLevel(s) {
  const out = [];
  let depth = 0,
    cur = '';
  for (const c of s) {
    if ('<(['.includes(c)) depth++;
    else if ('>)]'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function conformancesIncludeView(conformancesRaw) {
  return splitTopLevel(conformancesRaw || '').some((c) =>
    VIEW_LIKE_CONFORMANCES.has(c.trim())
  );
}

// Count {/} in a line — robust enough for swiftinterface (no string/comment edge cases of concern).
function braceDelta(line) {
  let d = 0;
  for (const c of line) {
    if (c === '{') d++;
    else if (c === '}') d--;
  }
  return d;
}

// Strip a trailing line comment without scanning chars one by one with backrefs.
function stripComment(line) {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

// Parse a top-level type-decl header. Handles inline `{}` bodies like
// `extension X : Y {}`. Returns null if `line` is not a type decl header.
function parseTypeHeader(trimmed) {
  // Take the header (everything before the first `{`)
  const braceIdx = trimmed.indexOf('{');
  const head = (braceIdx === -1 ? trimmed : trimmed.slice(0, braceIdx)).trim();

  // Strip leading attribute chain (e.g. `@frozen`, `@_Concurrency.MainActor`,
  // `@preconcurrency`, `@_originallyDefinedIn(module: "...")`).
  let rest = head;
  while (/^@[\w.]+(\([^)]*\))?\s+/.test(rest))
    rest = rest.replace(/^@[\w.]+(\([^)]*\))?\s+/, '');
  // require `public`
  if (!/^public\s+/.test(rest)) return null;
  rest = rest.replace(/^public\s+/, '');
  // optional modifiers
  rest = rest.replace(/^(?:final\s+|indirect\s+)+/, '');

  const m = /^(struct|class|enum|actor)\s+([A-Za-z_]\w*)(<[^>]*>)?\s*/.exec(
    rest
  );
  if (!m) return null;
  const kind = m[1],
    name = m[2];
  let generics = m[3] || null;
  if (generics) generics = generics.slice(1, -1); // strip <>
  rest = rest.slice(m[0].length).trim();

  // Pull off `where ...` (rightmost)
  let whereClause = null;
  const whereIdx = rest.lastIndexOf(' where ');
  if (whereIdx !== -1) {
    whereClause = rest.slice(whereIdx + ' where '.length).trim();
    rest = rest.slice(0, whereIdx).trim();
  }

  // Conformances after `:`
  let conformances = [];
  if (rest.startsWith(':')) {
    conformances = splitTopLevel(rest.slice(1).trim());
  }

  return { kind, name, generics, conformances, where: whereClause };
}

function parseExtensionHeader(trimmed) {
  if (!trimmed.startsWith('extension ')) return null;

  const braceIdx = trimmed.indexOf('{');
  const head = (braceIdx === -1 ? trimmed : trimmed.slice(0, braceIdx)).trim();

  let rest = head.slice('extension '.length).trim();

  // Pull off `where ...` from the right
  let whereClause = null;
  const whereIdx = rest.lastIndexOf(' where ');
  if (whereIdx !== -1) {
    whereClause = rest.slice(whereIdx + ' where '.length).trim();
    rest = rest.slice(0, whereIdx).trim();
  }

  // Target is everything up to optional `:` for conformances
  let target,
    conformancesRaw = null;
  const colonIdx = rest.indexOf(':');
  if (colonIdx === -1) {
    target = rest;
  } else {
    target = rest.slice(0, colonIdx).trim();
    conformancesRaw = rest.slice(colonIdx + 1).trim();
  }
  return { target, conformancesRaw, where: whereClause };
}

// ---------- shared walker ----------
//
// Two-pass:
//   pass 1: classify top-level types as View-conforming (direct or via retro extension)
//   pass 2: collect modifiers from extensions on View-conforming types and on the View protocol
//
// Both passes share the same walker that yields top-level decl events and depth=1 member lines.

function walk(filePath, { onType, onExtension, onMember }) {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');

  let depth = 0;
  let attrs = [];
  // Stack of contexts entered. Each entry: { kind: 'type'|'extension', ...details }
  const ctxStack = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = stripComment(raw).trim();
    if (trimmed.length === 0) continue;

    // Pure attribute line (e.g. `@available(...)` on its own): accumulate.
    // Lines that START with `@` but ALSO contain a declaration keyword on the
    // same line (e.g. `@inlinable nonisolated public func padding(...)`) are
    // declarations with an inline attribute — fall through to the decl matchers.
    if (trimmed.startsWith('@') && !DECL_KW.test(trimmed)) {
      attrs.push(trimmed);
      continue;
    }

    // Does this line OPEN a block whose body we should enter?
    // A block is opened when the line ends with `{` (no closing `}` after) OR
    // when there's a `{` followed by more content that doesn't close at end of line.
    // For headers we just need to know if a body follows. We compute it from braceDelta.
    const lineDelta = braceDelta(raw);
    const opensBlock = lineDelta > 0;

    if (depth === 0) {
      // Top-level: struct/class/enum/actor OR extension. Header is everything
      // before the first `{` on the line.
      const parsedType = parseTypeHeader(trimmed);
      if (parsedType) {
        const availability = parseAvailability(attrs);
        const event = { ...parsedType, availability };
        onType?.(event);
        attrs = [];
        if (opensBlock) {
          ctxStack.push({ kind: 'type', name: parsedType.name });
          depth += lineDelta;
        }
        continue;
      }

      const parsedExt = parseExtensionHeader(trimmed);
      if (parsedExt) {
        const availability = parseAvailability(attrs);
        const event = {
          target: parsedExt.target,
          conformancesRaw: parsedExt.conformancesRaw,
          where: parsedExt.where,
          availability,
        };
        onExtension?.(event);
        attrs = [];
        if (opensBlock) {
          ctxStack.push({
            kind: 'extension',
            target: parsedExt.target,
            where: parsedExt.where,
            availability,
          });
          depth += lineDelta;
        }
        continue;
      }

      // Unknown line at depth 0: clear pending attrs and continue.
      if (!trimmed.startsWith('@')) attrs = [];
      depth = Math.max(0, depth + lineDelta);
      while (ctxStack.length > depth) ctxStack.pop();
      continue;
    }

    if (depth === 1) {
      const ctx = ctxStack[0];
      // Member of an extension at top level
      if (ctx?.kind === 'extension') {
        // Detect func / var / init / subscript at start-ish of line.
        const funcMatch =
          /\b(func|init|var|subscript)\b(?:\s+([A-Za-z_]\w*))?/.exec(trimmed);
        if (funcMatch && /\bpublic\b/.test(trimmed)) {
          const availability = parseAvailability(attrs);
          const memberKind = funcMatch[1];
          let memberName;
          if (memberKind === 'init') memberName = 'init';
          else if (memberKind === 'subscript') memberName = 'subscript';
          else memberName = funcMatch[2];
          if (memberName) {
            onMember?.({
              extensionTarget: ctx.target,
              extensionWhere: ctx.where,
              extensionAvailability: ctx.availability,
              kind: memberKind,
              name: memberName,
              static: /\bstatic\b/.test(trimmed),
              signature: trimmed,
              availability,
            });
            attrs = [];
          }
        } else if (trimmed !== '}') {
          // member-like line we couldn't parse; clear attrs to avoid leaking
          if (!trimmed.startsWith('@')) attrs = [];
        }
      } else {
        // members of a struct/class type — we don't collect (modifiers come via extensions)
        if (!trimmed.startsWith('@')) attrs = [];
      }
    } else {
      // depth >= 2: ignore content
      if (!trimmed.startsWith('@')) attrs = [];
    }

    const d = braceDelta(raw);
    depth = Math.max(0, depth + d);
    while (ctxStack.length > depth) ctxStack.pop();
  }
}

// ---------- run pass 1 ----------

const viewTypes = new Map(); // "Module.Name" -> entry
const allTypes = new Map();

for (const m of MODULES) {
  walk(m.path, {
    onType(ev) {
      const key = `${m.name}.${ev.name}`;
      const entry = { module: m.name, ...ev };
      allTypes.set(key, entry);
      if (
        conformancesIncludeView(ev.conformances.join(',')) &&
        ev.availability.watchOSAvailable
      ) {
        viewTypes.set(key, entry);
      }
    },
    onExtension(ev) {
      if (!ev.conformancesRaw) return;
      if (!conformancesIncludeView(ev.conformancesRaw)) return;
      if (!ev.availability.watchOSAvailable) return;
      const parts = ev.target.split('.');
      if (parts.length < 2) return;
      const key = `${parts[0]}.${parts[1]}`;
      if (!viewTypes.has(key)) {
        viewTypes.set(key, {
          module: parts[0],
          name: parts[1],
          kind: 'extension-conformed',
          generics: null,
          conformances: splitTopLevel(ev.conformancesRaw),
          where: null,
          availability: ev.availability,
        });
      }
    },
  });
}

console.log(`Pass 1: View-conforming types = ${viewTypes.size}`);

// ---------- run pass 2 ----------

const globalModifiers = []; // members in extensions on the View protocol
const viewModifiers = {}; // key "Mod.Type" -> [ members ]

for (const m of MODULES) {
  walk(m.path, {
    onMember(ev) {
      if (!ev.availability.watchOSAvailable) return;
      if (!ev.extensionAvailability.watchOSAvailable) return;
      const isInit = ev.kind === 'init';
      if (isInit) return; // initializers aren't modifiers
      const target = ev.extensionTarget;
      const targetParts = target.split('.');
      const key =
        targetParts.length >= 2
          ? `${targetParts[0]}.${targetParts[1]}`
          : target;

      const entry = {
        module: m.name,
        name: ev.name,
        kind: ev.kind,
        static: ev.static,
        signature: ev.signature.replace(/\s+/g, ' ').trim(),
        where: ev.extensionWhere,
        introducedWatchOS:
          ev.availability.watchOSIntroduced ||
          ev.extensionAvailability.watchOSIntroduced,
        deprecatedWatchOS:
          ev.availability.watchOSDeprecated ||
          ev.extensionAvailability.watchOSDeprecated,
      };
      if (VIEW_PROTOCOLS.has(target)) {
        globalModifiers.push(entry);
      } else if (viewTypes.has(key)) {
        (viewModifiers[key] ||= []).push(entry);
      }
    },
  });
}

console.log(
  `Pass 2: global modifier overloads = ${globalModifiers.length}, types with extensions = ${Object.keys(viewModifiers).length}`
);

// ---------- assemble & write ----------

// Filter out underscored (SPI/private) view names and modifier names.
const isPublic = (name) => !name.startsWith('_');

const viewsList = [...viewTypes.values()]
  .filter((v) => isPublic(v.name))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((v) => ({
    name: v.name,
    module: v.module,
    kind: v.kind,
    generics: v.generics,
    conformances: v.conformances,
    where: v.where,
    introducedWatchOS: v.availability.watchOSIntroduced,
    deprecatedWatchOS: v.availability.watchOSDeprecated,
    availability: v.availability.raw,
    modifiers: (viewModifiers[`${v.module}.${v.name}`] || [])
      .filter((m) => isPublic(m.name))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.signature.localeCompare(b.signature)
      ),
  }));

const publicGlobalModifiers = globalModifiers
  .filter((m) => isPublic(m.name))
  .sort(
    (a, b) =>
      a.name.localeCompare(b.name) || a.signature.localeCompare(b.signature)
  );

const catalog = {
  generatedAt: new Date().toISOString(),
  sdk: sdkName,
  sdkPath,
  arch: ARCH,
  source:
    'Apple SwiftUI/SwiftUICore .swiftinterface (compiler-visible public API)',
  counts: {
    views: viewsList.length,
    globalModifierOverloads: publicGlobalModifiers.length,
    uniqueGlobalModifierNames: new Set(publicGlobalModifiers.map((m) => m.name))
      .size,
    viewsWithSpecificModifiers: viewsList.filter((v) => v.modifiers.length > 0)
      .length,
  },
  views: viewsList,
  globalModifiers: publicGlobalModifiers,
};

writeFileSync(join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));

// markdown summary
const uniqueGlobalNames = [
  ...new Set(publicGlobalModifiers.map((m) => m.name)),
].sort();
const md = [];
md.push(`# SwiftUI watchOS Catalog`);
md.push('');
md.push(`- SDK: \`${sdkName}\``);
md.push(`- Generated: ${catalog.generatedAt}`);
md.push(
  `- Source: Apple's \`SwiftUI.swiftinterface\` + \`SwiftUICore.swiftinterface\` (the watchOS compiler-visible public API)`
);
md.push(`- Regenerate with: \`node scripts/extract-swiftui-catalog.mjs\``);
md.push('');
md.push(
  `**Counts:** ${catalog.counts.views} views, ${catalog.counts.uniqueGlobalModifierNames} unique global modifier names (${catalog.counts.globalModifierOverloads} overloads), ${catalog.counts.viewsWithSpecificModifiers} views with type-specific modifier extensions.`
);
md.push('');
md.push(`## Views (${viewsList.length})`);
md.push('');
md.push(`| View | Module | Introduced (watchOS) | Type-specific modifiers |`);
md.push(`|------|--------|----------------------|-------------------------|`);
for (const v of viewsList) {
  md.push(
    `| \`${v.name}\` | ${v.module} | ${v.introducedWatchOS || '—'} | ${v.modifiers.length} |`
  );
}
md.push('');
md.push(`## Global modifier names (${uniqueGlobalNames.length} unique)`);
md.push('');
md.push(
  `These live in \`extension SwiftUICore.View { ... }\` and apply to every \`View\`. Use \`catalog.json\` for full signatures and per-overload availability.`
);
md.push('');
md.push(uniqueGlobalNames.map((n) => `\`${n}\``).join(', '));
md.push('');

writeFileSync(join(OUT_DIR, 'summary.md'), md.join('\n'));

console.log('Wrote:');
console.log('  ' + join(OUT_DIR, 'catalog.json'));
console.log('  ' + join(OUT_DIR, 'summary.md'));
console.log(`Views: ${catalog.counts.views}`);
console.log(
  `Global modifier overloads: ${catalog.counts.globalModifierOverloads} (${catalog.counts.uniqueGlobalModifierNames} unique names)`
);
console.log(
  `Views with type-specific modifiers: ${catalog.counts.viewsWithSpecificModifiers}`
);
