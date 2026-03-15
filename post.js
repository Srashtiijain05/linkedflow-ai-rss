// LinkedIn Auto Post Script
// Runs via GitHub Actions — no browser needed!

const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN = process.env.LI_TOKEN;
const LI_URN   = process.env.LI_URN   || 'urn:li:person:1772788136593';
const FEED_KEY = process.env.FEED_KEY  || 'tech';

// ── ARTICLE BANK (Tech/AI focused) ───────────────────────────────────────────
const ARTICLES = [
  // 🚀 New Models
  { title: "Meta Releases Llama 4 — Open Source Just Caught Up to GPT-4", desc: "Llama 4's mixture-of-experts architecture matches closed frontier models on most benchmarks. The open source vs closed model debate just got a lot more interesting." },
  { title: "Google DeepMind's Gemini 2.0 Rewrites the Rules on Multimodal AI", desc: "Native audio, image, and video understanding in a single model. The architecture shift from text-first to truly multimodal changes how we think about AI system design." },
  { title: "Mistral's New Model Runs on a Laptop — And It's Surprisingly Good", desc: "7B parameters, 4-bit quantized, running locally at 40 tokens/second. The gap between cloud and edge AI just closed by a significant margin." },
  { title: "Anthropic's Claude 3.5 Sets a New Bar for Code Generation", desc: "Beating GPT-4 on SWE-bench with 49% solve rate. The architectural changes behind this jump are more interesting than the benchmark number itself." },
  { title: "OpenAI o3 Reasoning Model: What the New Architecture Actually Changes", desc: "Chain-of-thought is now a first-class citizen in the model architecture, not a prompting trick. This changes how you build reliable AI systems fundamentally." },

  // 🏗️ New Architectures
  { title: "Mamba Architecture Is Replacing Transformers in Production — Here's Why", desc: "State space models process sequences in O(n) instead of O(n²). For long context, the performance difference is not marginal — it's an order of magnitude." },
  { title: "Mixture of Experts Is Now the Default Architecture for Frontier Models", desc: "GPT-4, Gemini, Mixtral, Llama 4 — they all use MoE. Understanding why this architecture won matters more than knowing it exists." },
  { title: "The New Diffusion Architecture That's Making Image Generation 10x Faster", desc: "Consistency models and flow matching are replacing DDPM. The inference speed improvement makes real-time image generation practical for the first time." },
  { title: "Why Everyone Is Moving From RAG to Agentic Retrieval in 2026", desc: "Static RAG pipelines break on complex queries. Agentic retrieval — where the model decides what to look up and when — solves the problems RAG couldn't." },
  { title: "Kolmogorov-Arnold Networks: The Architecture That Challenges MLPs", desc: "KANs replace fixed activation functions with learnable splines on edges. Smaller, more interpretable, and surprisingly competitive on scientific tasks." },

  // ⚙️ New Frameworks & Tools
  { title: "LangGraph Is Replacing LangChain for Production AI Agents", desc: "Stateful, cyclical graphs instead of linear chains. The mental model shift is significant — and the production stability difference is even more so." },
  { title: "DSPy: The Framework That's Killing Hand-Written Prompts", desc: "Compile your prompts instead of writing them. DSPy optimizes prompts automatically using your data. The prompting-as-code paradigm is here." },
  { title: "Vercel's AI SDK 4.0 Makes Streaming LLM Responses Trivial", desc: "Unified API across OpenAI, Anthropic, Mistral, and Cohere. Structured outputs, tool calling, and streaming — all with the same three lines of code." },
  { title: "Ollama Just Made Local LLM Deployment as Easy as Docker", desc: "Pull, run, and serve any open source model in under 60 seconds. The local-first AI development workflow is now accessible to every developer." },
  { title: "CrewAI vs AutoGen vs LangGraph — The Multi-Agent Framework Comparison Nobody Did Properly", desc: "After building the same agent system in all three, the differences in reliability, debuggability, and production readiness are stark. Here's the honest breakdown." },

  // 🎨 New Designs & Patterns
  { title: "The Context Window Is Now a Design Surface — Not Just a Limit", desc: "With 1M+ token windows, the constraint has flipped. The hard problem is now what to put in context, not whether it fits. This changes AI system architecture completely." },
  { title: "Function Calling Is Obsolete — Structured Outputs Are the New Primitive", desc: "JSON mode was a hack. Native structured outputs with schema validation change how you build reliable AI pipelines. The reliability improvement is not subtle." },
  { title: "The Evaluation-Driven Development Pattern for AI Systems", desc: "Build your evals before your prompts. The teams shipping reliable AI in production have adopted this discipline. It's the TDD moment for AI engineering." },
  { title: "Constitutional AI: The Design Pattern Behind Claude's Reliability", desc: "RLAIF instead of RLHF, with explicit principles. The architectural choice explains why some models are more consistently useful than others across edge cases." },
  { title: "Vector Databases Are Being Replaced — Here's What Comes Next", desc: "Hybrid search combining dense vectors with sparse BM25 retrieval outperforms pure vector search on real-world queries. The all-vector approach has a ceiling." },
];


// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = ['authority', 'educational', 'opinion', 'story'];
const dayOfWeek = new Date().getDay();
const hourOfDay = new Date().getHours();
const style     = STYLES[dayOfWeek % STYLES.length];
const articleIdx = (dayOfWeek * 2 + (hourOfDay > 12 ? 1 : 0)) % ARTICLES.length;
const article    = ARTICLES[articleIdx];

// ── SMART HASHTAGS ────────────────────────────────────────────────────────────
function getHashtags(title, desc) {
  const hashMap = [
    { words: ['gpt','chatgpt','openai','claude','llm','llms','language model'], tag: '#LLMs' },
    { words: ['generative','genai','gen ai','stable diffusion'],                tag: '#GenerativeAI' },
    { words: ['machine learning','ml model','training','fine-tun','dataset'],   tag: '#MachineLearning' },
    { words: ['deep learning','neural','transformer'],                          tag: '#DeepLearning' },
    { words: ['agi','artificial general','superintelligence'],                  tag: '#AGI' },
    { words: ['prompt','prompting','prompt engineering'],                       tag: '#PromptEngineering' },
    { words: ['agent','agentic','autonomous','multi-agent'],                    tag: '#AIAgents' },
    { words: ['copilot','cursor','ai coding','ai tool'],                        tag: '#AITools' },
    { words: ['mlops','llmops','deployment','inference'],                       tag: '#MLOps' },
    { words: ['open source','hugging face','mistral','llama'],                  tag: '#OpenSourceAI' },
    { words: ['safety','alignment','hallucin','bias','ethics'],                 tag: '#AIEthics' },
    { words: ['startup','founder','seed','venture','fundrais'],                 tag: '#TechStartups' },
    { words: ['product manager','product management','roadmap'],                tag: '#ProductManagement' },
    { words: ['engineer','software','coding','developer'],                      tag: '#SoftwareEngineering' },
    { words: ['cloud','aws','gcp','azure','kubernetes'],                        tag: '#CloudComputing' },
    { words: ['career','hiring','interview','layoff'],                          tag: '#TechCareers' },
    { words: ['leadership','manager','cto','engineering manager'],              tag: '#TechLeadership' },
    { words: ['remote','async','productivity','workflow'],                      tag: '#FutureOfWork' },
    { words: ['research','paper','study','benchmark'],                          tag: '#AIResearch' },
    { words: ['innovation','breakthrough','disrupt'],                           tag: '#Innovation' },
  ];
  const txt     = (title + ' ' + desc).toLowerCase();
  const matched = hashMap.filter(h => h.words.some(w => txt.includes(w))).map(h => h.tag);
  return [...new Set(['#AI', '#Tech', ...matched])].slice(0, 5).join(' ');
}

// ── GENERATE POST ─────────────────────────────────────────────────────────────
function generatePost(article, style) {
  const { title, desc } = article;
  const day  = new Date().getDate();
  const pick = arr => arr[day % arr.length];
  const tags = getHashtags(title, desc);

  const authorityHooks = [
    "This is one of those shifts most people will understand too late:",
    "The part of this story nobody is talking about:",
    "Most takes on this are wrong. Here's what's actually happening:",
    "I keep watching smart teams make the same mistake here:",
    "This landed differently than I expected. Worth slowing down on:",
  ];
  const eduHooks = [
    "Most people are using this wrong. Here's the right mental model:",
    "Nobody explained this clearly when it came out. Let me fix that:",
    "I spent a week going deep on this. Three things I wish I'd known:",
    "Here's the part that actually matters (the coverage missed it):",
  ];
  const opinionHooks = [
    "The hot take nobody wants to publish because it makes everyone uncomfortable:",
    "Everyone is celebrating this. I think we're celebrating the wrong thing:",
    "Unpopular opinion that I'll stand behind:",
    "The consensus on this is wrong. Here's the more honest read:",
  ];
  const storyOpeners = [
    "A developer just shared something that stopped me mid-scroll.",
    "Someone posted a demo this week and I genuinely couldn't believe it was real.",
    "This landed in my feed today and I've been thinking about it since.",
    "A researcher shared something quietly this week. It deserved way more attention.",
  ];

  if (style === 'authority') {
    const bodies = [
`${title}.

${desc}

This isn't an incremental improvement. It's a category shift.

The teams that recognize the difference between those two things right now will have a 12-month head start on everyone else.

→ Your architecture decisions from 6 months ago need revisiting
→ The "wait and see" strategy just got significantly more expensive
→ The first-mover advantage in your domain is closing fast

What's the one assumption in your current roadmap this changes?`,

`${title}.

${desc}

The headline is interesting. The second-order effect is what matters.

Most teams are reacting to what this is. The teams pulling ahead are already designing for what this makes possible next.

There's a 6-month window where that distinction is worth a lot.

Are you in the first group or the second?`,

`${title}.

${desc}

Here's what nobody is saying clearly: this isn't a feature update. It's a new baseline.

What was "impressive" last quarter is now table stakes. The teams that internalized that months ago are already building on top of it.

The gap between those teams and everyone else isn't talent. It's timing.

How far ahead — or behind — is your current thinking?`,
    ];
    return `${pick(authorityHooks)}\n\n${bodies[day % bodies.length]}\n\n${tags}`;
  }

  if (style === 'educational') {
    const bodies = [
`${title}.

${desc}

Let me make this concrete:

→ What it replaces: the approach that worked fine until about 6 months ago
→ What it unlocks: use cases that were too unreliable to ship before
→ What it doesn't fix: the hard problems that were always about data, not models

The teams getting the most out of this aren't the ones who adopted fastest. They're the ones who understood the boundaries clearly first.

Which of those three points changes something in how you're building?`,

`${title}.

${desc}

Three things most teams get wrong here:

1. Treat it as a drop-in replacement — it's not
2. Benchmark it on the wrong task and draw the wrong conclusion
3. Skip evaluation and discover edge cases in production

The teams doing this well inverted all three. Start with evals. Work backwards from what "good" actually looks like.

What does good look like for your use case?`,
    ];
    return `${pick(eduHooks)}\n\n${bodies[day % bodies.length]}\n\n${tags}`;
  }

  if (style === 'opinion') {
    const bodies = [
`${title}.

${desc}

The uncomfortable version of this story:

Most teams aren't behind on this because they lack access. They're behind because they lack clarity on what problem they're actually solving.

Better tools don't fix fuzzy thinking. They just let you be wrong faster and at greater scale.

The teams winning right now didn't get there by adopting more. They got there by being ruthlessly specific about less.

What's the one problem your team is clearest about?`,

`${title}.

${desc}

Hot take: we're optimizing for the wrong signal.

Speed of adoption isn't the metric. Depth of integration is. Benchmark performance isn't the metric. Reliability on your specific use case is.

The leaderboard tells you who's winning the benchmark. It doesn't tell you who's building something people actually depend on.

Those are different competitions. Which one is your team in?`,
    ];
    return `${pick(opinionHooks)}\n\n${bodies[day % bodies.length]}\n\n${tags}`;
  }

  if (style === 'story') {
    const closers = [
`Just a year ago, this would have been a funded research project. Now it's a weekend build.

The gap between "research" and "anyone can build this" has never been smaller.

We might actually be cooked — in the best way possible.`,

`Six months ago this was a paper. Three months ago it was a closed demo. This week someone open sourced it.

The compounding is real. And it's not slowing down.

Are you keeping up, or are you already playing catch-up?`,

`The thing that gets me isn't the technology. It's the pace.

Every week there's a new "this changes everything." And somehow, every week, it actually does.

What does your roadmap look like if this pace holds for another 12 months?`,
    ];
    return `${pick(storyOpeners)}\n\n${title}.\n\n${desc}\n\n${closers[day % closers.length]}\n\n${tags}`;
  }

  return `${title}\n\n${desc}\n\nThe ceiling keeps moving.\n\n${tags}`;
}

// ── POST TO LINKEDIN ──────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) {
      reject(new Error('LI_TOKEN secret not set! Go to GitHub → Settings → Secrets → New secret'));
      return;
    }
    const body = JSON.stringify({
      author: LI_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    });
    const options = {
      hostname: 'api.linkedin.com',
      path:     '/v2/ugcPosts',
      method:   'POST',
      headers: {
        'Authorization':             `Bearer ${LI_TOKEN}`,
        'Content-Type':              'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Length':            Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) resolve({ success: true, status: res.statusCode });
        else reject(new Error(`LinkedIn API error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 LinkedIn Auto Post starting...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📰 Article: ${article.title}`);
  console.log(`🎨 Style: ${style}`);
  console.log(`👤 URN: ${LI_URN}`);

  const postText = generatePost(article, style);
  console.log('\n📝 Post preview:');
  console.log('─'.repeat(60));
  console.log(postText);
  console.log('─'.repeat(60));

  try {
    const result = await postToLinkedIn(postText);
    console.log('\n✅ Posted successfully!', result);
  } catch (err) {
    console.error('\n❌ Failed to post:', err.message);
    process.exit(1);
  }
}

main();
