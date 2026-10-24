import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Braces, CheckCircle2, KeyRound, Layers3, Send, Settings2 } from 'lucide-react';

const sendCode = `curl -X POST https://api.your-domain.com/notifications/send \\
  -H "x-api-key: vod_live_your_key" \\
  -H "Idempotency-Key: order-1842-receipt" \\
  -H "Content-Type: application/json" \\
  -d '{"channel":"EMAIL","recipient":{"email":"ada@example.com"},"template":"order-receipt","variables":{"name":"Ada"}}'`;
const batchCode = `curl -X POST https://api.your-domain.com/notifications/batch \\
  -H "x-api-key: vod_live_your_key" \\
  -H "Idempotency-Key: campaign-october-24" \\
  -H "Content-Type: application/json" \\
  -d '{"notifications":[
    {"channel":"EMAIL","recipient":{"email":"ada@example.com"},"template":"product-update","variables":{"name":"Ada"}},
    {"channel":"SMS","recipient":{"phone":"+2348012345678"},"content":"Your code is 842019"}
  ]}'`;
const templateCode = `{
  "name": "Order receipt",
  "channel": "EMAIL",
  "subject": "Order {{orderId}} confirmed",
  "body": "Hi {{name}}, your order is on its way.",
  "active": true
}`;

export default function DocsPage(){return <main className="docs-page">
  <aside className="docs-sidebar"><Link className="brand" href="/"><span className="brand-mark">V</span>Void</Link><nav><p>Get started</p><a href="#overview">How Void works</a><a href="#quickstart">Quickstart</a><p>API</p><a href="#send">Send one</a><a href="#batch">Batch sending</a><a href="#templates">Templates</a><a href="#channels">Channels</a><a href="#statuses">Delivery lifecycle</a></nav><Link className="docs-back" href="/dashboard"><ArrowLeft size={14}/> Back to dashboard</Link></aside>
  <article className="docs-content"><header className="docs-mobile-head"><Link className="brand" href="/"><span className="brand-mark">V</span>Void Docs</Link><Link href="/dashboard">Dashboard</Link></header>
    <section id="overview" className="docs-hero"><span className="landing-kicker"><BookOpen size={13}/> Void documentation</span><h1>Build notifications once.<br/>Deliver them everywhere.</h1><p>Void sits between your application and delivery providers. Your server submits a normalized request; Void renders it, stores its state and dispatches it using credentials configured in your workspace.</p></section>
    <section className="docs-flow"><div><Braces/><strong>1. Your server</strong><p>Authenticates with a secret API key.</p></div><ArrowRight/><div><Layers3/><strong>2. Void</strong><p>Validates, renders and queues.</p></div><ArrowRight/><div><Send/><strong>3. Your provider</strong><p>Delivers with your credentials.</p></div></section>
    <section id="quickstart" className="doc-section"><span className="doc-number">01</span><h2>Quickstart</h2><p>The dashboard manages credentials, templates, keys, webhooks and delivery visibility. Sending is intentionally server-to-server.</p><ol className="steps"><li><KeyRound/><div><strong>Create a workspace and API key</strong><p>The first key is shown once. Store it in your server’s secret manager.</p></div></li><li><Settings2/><div><strong>Connect provider credentials</strong><p>In Providers, select a channel and save the provider credential JSON.</p></div></li><li><CheckCircle2/><div><strong>Send from your backend</strong><p>Call the single or batch endpoint with the <code>x-api-key</code> header.</p></div></li></ol></section>
    <section id="send" className="doc-section"><span className="doc-number">02</span><h2>Send one notification</h2><p><code>POST /notifications/send</code> accepts one message and returns HTTP 202 after it is validated and queued.</p><div className="doc-note">Never expose a live API key in browser JavaScript, a mobile application or a public repository.</div><pre className="doc-code"><code>{sendCode}</code></pre><h3>Safe retries</h3><p>Use a unique <code>Idempotency-Key</code> for each logical message. Repeating an identical request with the same key returns its original response; reusing it for different content is rejected.</p></section>
    <section id="batch" className="doc-section"><span className="doc-number">03</span><h2>Batch sending</h2><p><code>POST /notifications/batch</code> accepts 1–100 messages. Void processes at most ten concurrently and returns an order-preserving result for every item. One rejected item does not discard the valid items.</p><pre className="doc-code"><code>{batchCode}</code></pre><div className="doc-grid"><div><strong>Batch idempotency</strong><p>The request header deduplicates the complete batch for 24 hours.</p></div><div><strong>Item idempotency</strong><p>An item may include its own <code>idempotencyKey</code> for stable retry identity.</p></div><div><strong>Partial results</strong><p>Read <code>accepted</code>, <code>rejected</code>, and each result’s status.</p></div><div><strong>Maximum size</strong><p>Split larger workloads into requests of 100 with unique batch keys.</p></div></div></section>
    <section id="templates" className="doc-section"><span className="doc-number">04</span><h2>Templates</h2><p>A template name becomes its slug: “Order receipt” becomes <code>order-receipt</code>. Variables use double braces such as <code>{'{{name}}'}</code>.</p><pre className="doc-code"><code>{templateCode}</code></pre><div className="doc-grid"><div><strong>Versioning</strong><p>Reusing a slug creates the next version instead of overwriting history.</p></div><div><strong>Active version</strong><p>Sends resolve the active version for the requested channel.</p></div><div><strong>Rendering</strong><p>The <code>variables</code> object replaces subject and body placeholders.</p></div><div><strong>Direct content</strong><p>Skip a template and provide <code>subject</code> and <code>content</code>.</p></div></div></section>
    <section id="channels" className="doc-section"><span className="doc-number">05</span><h2>Channels and recipients</h2><table className="docs-table"><thead><tr><th>Channel</th><th>Recipient property</th><th>Providers</th></tr></thead><tbody><tr><td>EMAIL</td><td><code>email</code></td><td>Resend, SendGrid, Postmark</td></tr><tr><td>SMS</td><td><code>phone</code></td><td>Twilio</td></tr><tr><td>PUSH</td><td><code>pushToken</code></td><td>FCM</td></tr><tr><td>WEBHOOK</td><td><code>webhookUrl</code></td><td>Signed HTTP</td></tr><tr><td>IN_APP</td><td><code>externalUserId</code></td><td>Internal</td></tr></tbody></table></section>
    <section id="statuses" className="doc-section"><span className="doc-number">06</span><h2>Delivery lifecycle</h2><div className="status-line"><span>QUEUED</span><i/><span>PROCESSING</span><i/><span>SENT</span></div><p>Failures enter <code>RETRYING</code> and receive up to three attempts before <code>FAILED</code>. Scheduled messages remain queued until due. Stale claimed jobs recover automatically after two minutes.</p></section>
    <div className="docs-next"><span>Ready to integrate?</span><Link href="/dashboard" className="primary">Create API key <ArrowRight size={14}/></Link></div>
  </article>
</main>}
