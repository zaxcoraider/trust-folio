'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Code, Copy, CheckCircle2, ChevronRight, Key, ExternalLink } from 'lucide-react';
import { NeonCard } from '@/components/NeonCard';

// ── Code block component ──────────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Very simple syntax coloring via dangerouslySetInnerHTML
  const highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // strings
    .replace(/(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#06b6d4">$1$2$3</span>')
    // keywords
    .replace(/\b(const|let|var|function|async|await|return|import|from|export|def|import|print|if|else|for|while|class|new|try|catch|throw|true|false|null|undefined)\b/g,
      '<span style="color:#a855f7">$1</span>')
    // numbers
    .replace(/\b(\d+)\b/g, '<span style="color:#f59e0b">$1</span>')
    // comments
    .replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color:#4b5563">$1</span>');

  return (
    <div className="relative group">
      <pre className="bg-[#0a0a14] border border-white/10 rounded-lg p-4 overflow-x-auto font-mono text-xs leading-relaxed text-gray-300"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-bg-card border border-white/10 text-gray-500 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <CheckCircle2 size={13} className="text-neon-cyan" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Multi-tab code example ────────────────────────────────────────────────────

function CodeTabs({ examples }: { examples: { lang: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 mb-2 border-b border-white/10">
        {examples.map((ex, i) => (
          <button
            key={ex.lang}
            onClick={() => setActive(i)}
            className={`font-mono text-xs px-3 py-1.5 -mb-px border-b-2 transition-all
              ${active === i ? 'text-neon-cyan border-neon-cyan' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            {ex.lang}
          </button>
        ))}
      </div>
      <CodeBlock code={examples[active].code} language={examples[active].lang} />
    </div>
  );
}

// ── Method badge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border font-bold
      ${method === 'GET'
        ? 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10'
        : 'text-neon-purple border-neon-purple/30 bg-neon-purple/10'
      }`}>
      {method}
    </span>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  'Overview', 'Authentication', 'POST /verify', 'GET /profile', 'GET /search', 'POST /hire', 'GET /verify-proof', 'Rate Limits', 'SDKs',
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('Overview');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (section: string) => {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen bg-bg-primary page-enter">
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-10 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <NeonCard glow="none" className="p-4">
              <p className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => scrollTo(s)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md font-mono text-xs transition-all
                      ${activeSection === s
                        ? 'text-neon-purple bg-neon-purple/10 border-l-2 border-neon-purple pl-1.5'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
                      }`}
                  >
                    <ChevronRight size={11} />
                    {s}
                  </button>
                ))}
              </nav>

              <div className="mt-4 pt-4 border-t border-white/10">
                <Link
                  href="/api-keys"
                  className="flex items-center gap-2 font-mono text-xs px-3 py-2 rounded-lg border border-neon-purple/30 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
                >
                  <Key size={13} />
                  Get API Key
                </Link>
              </div>
            </NeonCard>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
                  <Code size={22} className="text-neon-cyan" />
                </div>
                <h1 className="font-mono text-2xl font-bold text-gray-100">API Documentation</h1>
              </div>
              <p className="font-mono text-sm text-gray-500">
                Integrate TrustFolio verification into your platform with our REST API.
              </p>
            </div>
            <Link
              href="/api-keys"
              className="shrink-0 hidden sm:flex items-center gap-2 font-mono text-sm px-4 py-2 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
            >
              <Key size={14} />
              Get API Key
            </Link>
          </div>

          {/* Overview */}
          <section ref={(el) => { sectionRefs.current['Overview'] = el; }}>
            <h2 className="font-mono text-lg font-bold text-gray-100 mb-4">Overview</h2>
            <NeonCard glow="cyan" className="p-5 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Base URL</p>
                  <p className="text-neon-cyan bg-bg-primary rounded px-2 py-1 text-xs">
                    https://trustfolio.app/api/v1
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Authentication Header</p>
                  <p className="text-neon-purple bg-bg-primary rounded px-2 py-1 text-xs">
                    x-api-key: YOUR_API_KEY
                  </p>
                </div>
              </div>
            </NeonCard>

            <NeonCard glow="none" className="p-5">
              <p className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rate Limits by Tier</p>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      <th className="text-left py-2 pr-6">Tier</th>
                      <th className="text-left py-2 pr-6">Daily Requests</th>
                      <th className="text-left py-2 pr-6">Cost/Request</th>
                      <th className="text-left py-2">Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-6 text-gray-400">Free</td>
                      <td className="py-2 pr-6 text-neon-cyan">100 / day</td>
                      <td className="py-2 pr-6 text-gray-400">Free</td>
                      <td className="py-2 text-gray-400">All endpoints</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-6 text-neon-purple">Paid</td>
                      <td className="py-2 pr-6 text-neon-cyan">10,000 / day</td>
                      <td className="py-2 pr-6 text-amber-400">$0.001/call</td>
                      <td className="py-2 text-gray-400">All endpoints + webhooks + priority</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </NeonCard>
          </section>

          {/* Authentication */}
          <section ref={(el) => { sectionRefs.current['Authentication'] = el; }}>
            <h2 className="font-mono text-lg font-bold text-gray-100 mb-4">Authentication</h2>
            <NeonCard glow="none" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-4">
                All API requests require an API key passed in the <span className="text-neon-cyan">x-api-key</span> header.
                Generate your key on the <Link href="/api-keys" className="text-neon-purple hover:underline">API Keys</Link> page.
              </p>
              <CodeBlock
                language="bash"
                code={`# Include in every request
curl -H "x-api-key: tf_live_your_key_here" \\
     https://trustfolio.app/api/v1/profile/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`}
              />
            </NeonCard>
          </section>

          {/* Endpoint 1: POST /verify */}
          <section ref={(el) => { sectionRefs.current['POST /verify'] = el; }}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <h2 className="font-mono text-lg font-bold text-gray-100">/api/v1/verify</h2>
            </div>
            <NeonCard glow="purple" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-5">
                Submit a portfolio file for AI verification. Returns a score, tier, skill category, and proof hash.
              </p>

              <h3 className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request Body</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      <th className="text-left py-2 pr-4">Parameter</th>
                      <th className="text-left py-2 pr-4">Type</th>
                      <th className="text-left py-2 pr-4">Required</th>
                      <th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['fileName', 'string', 'Yes', 'Name of the file being verified'],
                      ['fileType', 'string', 'Yes', 'MIME type (e.g. application/pdf)'],
                      ['fileSize', 'number', 'Yes', 'File size in bytes'],
                      ['rootHash', 'string', 'Yes', '0G Storage root hash of the file'],
                      ['walletAddress', 'string', 'No', 'Wallet address to associate with verification'],
                      ['description', 'string', 'No', 'Optional description of the work'],
                    ].map(([param, type, req, desc]) => (
                      <tr key={param}>
                        <td className="py-2 pr-4 text-neon-cyan">{param}</td>
                        <td className="py-2 pr-4 text-amber-400">{type}</td>
                        <td className={`py-2 pr-4 ${req === 'Yes' ? 'text-neon-pink' : 'text-gray-500'}`}>{req}</td>
                        <td className="py-2 text-gray-400">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Code Examples</h3>
              <CodeTabs examples={[
                {
                  lang: 'JavaScript',
                  code: `const response = await fetch('https://trustfolio.app/api/v1/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'tf_live_your_key_here'
  },
  body: JSON.stringify({
    fileName: 'smart-contract.sol',
    fileType: 'text/plain',
    fileSize: 4096,
    rootHash: '0xabc123...',
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })
});
const { score, tier, skillCategory, breakdown } = await response.json();`
                },
                {
                  lang: 'Python',
                  code: `import requests

response = requests.post(
    'https://trustfolio.app/api/v1/verify',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'tf_live_your_key_here'
    },
    json={
        'fileName': 'smart-contract.sol',
        'fileType': 'text/plain',
        'fileSize': 4096,
        'rootHash': '0xabc123...',
        'walletAddress': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    }
)
data = response.json()
print(data['score'], data['tier'])`
                },
                {
                  lang: 'cURL',
                  code: `curl -X POST https://trustfolio.app/api/v1/verify \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tf_live_your_key_here" \\
  -d '{
    "fileName": "smart-contract.sol",
    "fileType": "text/plain",
    "fileSize": 4096,
    "rootHash": "0xabc123...",
    "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  }'`
                },
              ]} />
            </NeonCard>
          </section>

          {/* Endpoint 2: GET /profile */}
          <section ref={(el) => { sectionRefs.current['GET /profile'] = el; }}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="GET" />
              <h2 className="font-mono text-lg font-bold text-gray-100">/api/v1/profile/[wallet]</h2>
            </div>
            <NeonCard glow="cyan" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-5">
                Retrieve a user's public profile including verified credentials, INFTs, and reputation score.
              </p>
              <h3 className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Path Parameters</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      <th className="text-left py-2 pr-4">Parameter</th><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="py-2 pr-4 text-neon-cyan">wallet</td><td className="py-2 pr-4 text-amber-400">string</td><td className="py-2 text-gray-400">Ethereum wallet address (0x...)</td></tr>
                  </tbody>
                </table>
              </div>
              <CodeTabs examples={[
                { lang: 'JavaScript', code: `const wallet = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const res = await fetch(\`https://trustfolio.app/api/v1/profile/\${wallet}\`, {
  headers: { 'x-api-key': 'tf_live_your_key_here' }
});
const profile = await res.json();
console.log(profile.displayName, profile.verifications);` },
                { lang: 'Python', code: `import requests
wallet = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
res = requests.get(
    f'https://trustfolio.app/api/v1/profile/{wallet}',
    headers={'x-api-key': 'tf_live_your_key_here'}
)
profile = res.json()
print(profile['displayName'])` },
                { lang: 'cURL', code: `curl https://trustfolio.app/api/v1/profile/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \\
  -H "x-api-key: tf_live_your_key_here"` },
              ]} />
            </NeonCard>
          </section>

          {/* Endpoint 3: GET /search */}
          <section ref={(el) => { sectionRefs.current['GET /search'] = el; }}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="GET" />
              <h2 className="font-mono text-lg font-bold text-gray-100">/api/v1/search</h2>
            </div>
            <NeonCard glow="none" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-5">
                Search for verified talent by skill, tier, or score threshold.
              </p>
              <h3 className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Query Parameters</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full font-mono text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Parameter</th><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2 pr-4">Required</th><th className="text-left py-2">Description</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['skill', 'string', 'No', 'Filter by skill category: code, design, writing, document, other'],
                      ['tier', 'string', 'No', 'Filter by verification tier: diamond, gold, silver, bronze'],
                      ['minScore', 'number', 'No', 'Minimum verification score (0-100)'],
                      ['limit', 'number', 'No', 'Results per page (default: 20, max: 100)'],
                      ['offset', 'number', 'No', 'Pagination offset'],
                    ].map(([p, t, r, d]) => (
                      <tr key={p}><td className="py-2 pr-4 text-neon-cyan">{p}</td><td className="py-2 pr-4 text-amber-400">{t}</td><td className={`py-2 pr-4 ${r === 'Yes' ? 'text-neon-pink' : 'text-gray-500'}`}>{r}</td><td className="py-2 text-gray-400">{d}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CodeTabs examples={[
                { lang: 'JavaScript', code: `const res = await fetch(
  'https://trustfolio.app/api/v1/search?skill=code&tier=gold&minScore=80&limit=10',
  { headers: { 'x-api-key': 'tf_live_your_key_here' } }
);
const { results, total } = await res.json();` },
                { lang: 'Python', code: `import requests
res = requests.get(
    'https://trustfolio.app/api/v1/search',
    params={'skill': 'code', 'tier': 'gold', 'minScore': 80, 'limit': 10},
    headers={'x-api-key': 'tf_live_your_key_here'}
)
data = res.json()` },
                { lang: 'cURL', code: `curl "https://trustfolio.app/api/v1/search?skill=code&tier=gold&minScore=80" \\
  -H "x-api-key: tf_live_your_key_here"` },
              ]} />
            </NeonCard>
          </section>

          {/* Endpoint 4: POST /hire */}
          <section ref={(el) => { sectionRefs.current['POST /hire'] = el; }}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <h2 className="font-mono text-lg font-bold text-gray-100">/api/v1/hire</h2>
            </div>
            <NeonCard glow="purple" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-5">
                Initiate a hiring contract with a verified talent. Creates an on-chain escrow via the TrustFolio Hiring contract.
              </p>
              <h3 className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request Body</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full font-mono text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Parameter</th><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2 pr-4">Required</th><th className="text-left py-2">Description</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['talent', 'string', 'Yes', 'Wallet address of talent to hire'],
                      ['title', 'string', 'Yes', 'Job title or project name'],
                      ['description', 'string', 'Yes', 'Scope of work'],
                      ['amount', 'string', 'Yes', 'Payment amount in 0G (in ether units)'],
                      ['deadline', 'number', 'Yes', 'Unix timestamp deadline'],
                    ].map(([p, t, r, d]) => (
                      <tr key={p}><td className="py-2 pr-4 text-neon-cyan">{p}</td><td className="py-2 pr-4 text-amber-400">{t}</td><td className={`py-2 pr-4 ${r === 'Yes' ? 'text-neon-pink' : 'text-gray-500'}`}>{r}</td><td className="py-2 text-gray-400">{d}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CodeTabs examples={[
                { lang: 'JavaScript', code: `const res = await fetch('https://trustfolio.app/api/v1/hire', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'tf_live_your_key_here'
  },
  body: JSON.stringify({
    talent: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    title: 'Build DeFi Dashboard',
    description: 'React + wagmi dashboard for our protocol',
    amount: '10.5',
    deadline: 1735689600
  })
});
const { requestId, txHash } = await res.json();` },
                { lang: 'Python', code: `import requests
res = requests.post(
    'https://trustfolio.app/api/v1/hire',
    headers={'x-api-key': 'tf_live_your_key_here'},
    json={
        'talent': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        'title': 'Build DeFi Dashboard',
        'description': 'React + wagmi dashboard',
        'amount': '10.5',
        'deadline': 1735689600
    }
)
print(res.json()['requestId'])` },
                { lang: 'cURL', code: `curl -X POST https://trustfolio.app/api/v1/hire \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tf_live_your_key_here" \\
  -d '{"talent":"0xf39Fd6...","title":"Build DeFi Dashboard","amount":"10.5","deadline":1735689600}'` },
              ]} />
            </NeonCard>
          </section>

          {/* Endpoint 5: GET /verify-proof */}
          <section ref={(el) => { sectionRefs.current['GET /verify-proof'] = el; }}>
            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="GET" />
              <h2 className="font-mono text-lg font-bold text-gray-100">/api/v1/verify-proof/[rootHash]</h2>
            </div>
            <NeonCard glow="none" className="p-5">
              <p className="font-mono text-sm text-gray-400 mb-5">
                Publicly verify a credential proof using its 0G Storage root hash. No API key required.
              </p>
              <CodeTabs examples={[
                { lang: 'JavaScript', code: `const rootHash = '0xabc123...';
const res = await fetch(
  \`https://trustfolio.app/api/v1/verify-proof/\${rootHash}\`
);
const proof = await res.json();
console.log(proof.valid, proof.score, proof.tier);` },
                { lang: 'Python', code: `import requests
root_hash = '0xabc123...'
res = requests.get(
    f'https://trustfolio.app/api/v1/verify-proof/{root_hash}'
)
proof = res.json()
print(proof['valid'], proof['score'])` },
                { lang: 'cURL', code: `curl https://trustfolio.app/api/v1/verify-proof/0xabc123...` },
              ]} />
            </NeonCard>
          </section>

          {/* Rate Limits */}
          <section ref={(el) => { sectionRefs.current['Rate Limits'] = el; }}>
            <h2 className="font-mono text-lg font-bold text-gray-100 mb-4">Rate Limits</h2>
            <NeonCard glow="none" className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      <th className="text-left py-2 pr-6">Tier</th>
                      <th className="text-left py-2 pr-6">Daily Requests</th>
                      <th className="text-left py-2 pr-6">Rate (per min)</th>
                      <th className="text-left py-2 pr-6">Cost/Request</th>
                      <th className="text-left py-2">Features</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { tier: 'Free', daily: '100', rate: '10/min', cost: 'Free', features: 'All endpoints' },
                      { tier: 'Paid', daily: '10,000', rate: '100/min', cost: '$0.001', features: 'All + webhooks + priority queue' },
                    ].map((r) => (
                      <tr key={r.tier}>
                        <td className="py-3 pr-6">
                          <span className={`px-2 py-0.5 rounded border text-xs ${r.tier === 'Paid' ? 'text-neon-purple border-neon-purple/30 bg-neon-purple/10' : 'text-gray-400 border-gray-600/30 bg-gray-600/10'}`}>
                            {r.tier}
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-neon-cyan">{r.daily}</td>
                        <td className="py-3 pr-6 text-gray-400">{r.rate}</td>
                        <td className="py-3 pr-6 text-amber-400">{r.cost}</td>
                        <td className="py-3 text-gray-400">{r.features}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-neon-pink/5 border border-neon-pink/20">
                <p className="font-mono text-xs text-gray-400">
                  <span className="text-neon-pink">429 Too Many Requests</span> is returned when rate limits are exceeded.
                  Response includes <span className="text-neon-cyan">X-RateLimit-Reset</span> header with reset timestamp.
                </p>
              </div>
            </NeonCard>
          </section>

          {/* SDKs */}
          <section ref={(el) => { sectionRefs.current['SDKs'] = el; }}>
            <h2 className="font-mono text-lg font-bold text-gray-100 mb-4">SDKs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <NeonCard glow="cyan" className="p-4">
                <p className="font-mono text-sm font-semibold text-neon-cyan mb-2">JavaScript / TypeScript</p>
                <CodeBlock language="bash" code={`npm install @trustfolio/sdk`} />
              </NeonCard>
              <NeonCard glow="purple" className="p-4">
                <p className="font-mono text-sm font-semibold text-neon-purple mb-2">Python</p>
                <CodeBlock language="bash" code={`pip install trustfolio-sdk`} />
              </NeonCard>
            </div>

            <NeonCard glow="none" className="p-5">
              <p className="font-mono text-sm font-semibold text-gray-300 mb-4">Quick Start</p>
              <CodeTabs examples={[
                {
                  lang: 'JavaScript',
                  code: `import { TrustFolio } from '@trustfolio/sdk';

const client = new TrustFolio({
  apiKey: 'tf_live_your_key_here'
});

// Verify a portfolio
const result = await client.verify({
  fileName: 'portfolio.pdf',
  fileType: 'application/pdf',
  fileSize: 102400,
  rootHash: '0xabc123...'
});

console.log(result.tier); // 'gold'
console.log(result.score); // 82

// Search talent
const talent = await client.search({ skill: 'code', tier: 'diamond' });`
                },
                {
                  lang: 'Python',
                  code: `from trustfolio import TrustFolio

client = TrustFolio(api_key='tf_live_your_key_here')

# Verify a portfolio
result = client.verify(
    file_name='portfolio.pdf',
    file_type='application/pdf',
    file_size=102400,
    root_hash='0xabc123...'
)

print(result.tier)   # 'gold'
print(result.score)  # 82

# Search talent
talent = client.search(skill='code', tier='diamond')`
                },
              ]} />
            </NeonCard>

            <div className="mt-4 flex items-center gap-2 font-mono text-xs text-gray-500">
              <ExternalLink size={13} />
              <a href="#" className="text-neon-purple hover:underline">Full SDK Documentation →</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
