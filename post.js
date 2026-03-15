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
const STYLES = ['authority', 'educational', 'opinion'];
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
  const day = new Date().getDate();

  const authorityHooks = [
    "I've been tracking this space closely. Here's what most teams still get wrong:",
    "The conversation about this is missing its most important point:",
    "Everyone's talking about this. Almost nobody understands what it actually means:",
    "Hot take that nobody in tech wants to say out loud:",
  ];
  const educationalHooks = [
    "Explained in plain English — no jargon, just what matters:",
    "3 things I wish I knew before starting with this:",
    "The simplest mental model for this that actually works:",
    "Most engineers overcomplicate this. Here's the 80/20 version:",
  ];
  const opinionHooks = [
    "Unpopular opinion: the way most teams approach this is setting them up to fail.",
    "The hype is real. But we're optimizing for the wrong thing.",
    "I'm going to say something that might get me ratio'd:",
    "We're applying last decade's mental models to a fundamentally different problem.",
  ];

  const authorityBodies = [
    `${desc}

I've seen this pattern across dozens of teams.

The ones who fall behind aren't making bad technical decisions. They're making good technical decisions without asking the right strategic questions first.

Here's what separates the teams winning right now:

→ They defined the problem before buying the solution
→ They built for the second-order effect, not just the immediate use case
→ They asked "what breaks at scale?" before it broke

The companies that look smart in 3 years are making those calls today.

What question is your team not asking yet?`,

    `${desc}

Most teams are optimizing for the wrong metric.

They're measuring speed of adoption. The teams pulling ahead are measuring depth of integration.

Speed gets you a demo. Depth gets you a competitive moat.

Are you building for the demo or the moat?`,

    `${desc}

I audited how top teams approach this. The pattern that separates the best from the rest isn't talent or budget.

It's that the best teams treated this as a planning problem, not a technology problem.

The executives who'll look smart in 3 years are asking one question today:

"Are we solving the right problem?"`,
  ];

  const educationalBodies = [
    `${desc}

Here's what this actually means for your team — broken down simply:

→ The immediate impact: your workflows change before your strategy does
→ The hidden cost: teams that skip the fundamentals spend 3x longer fixing it later
→ The real opportunity: engineers who understand the 'why' ship better products than those who only know the 'how'

Most people skip step one and wonder why step three doesn't work.

Which step are you on?`,

    `${desc}

Three things most teams get wrong here:

1. They adopt the tool before defining the problem it solves
2. They measure success by usage, not by outcome
3. They optimize for the first month, not the first year

The teams consistently shipping great work do the opposite on all three.

Which of these is your team most guilty of?`,

    `${desc}

The mental model that changed how I think about this:

Stop asking "how do we use this?" and start asking "what problem disappears if we get this right?"

That single reframe changes your roadmap, your hiring, and your success metrics all at once.

The best teams work backwards from the answer. Most teams work forwards from the tool.

Which direction is your team moving?`,
  ];

  const opinionBodies = [
    `${desc}

Here's the part nobody wants to say out loud:

Most teams aren't behind because of bad technology decisions. They're behind because of bad prioritization decisions dressed up as technology decisions.

The AI isn't the problem. The roadmap is.

The companies that figure that out first won't just catch up — they'll define what the next 3 years look like for everyone else.

Am I wrong? Tell me why.`,

    `${desc}

The mainstream take is focused on the wrong variable.

Everyone is optimizing for speed. The teams actually pulling ahead are optimizing for clarity.

Speed without clarity just means you reach the wrong destination faster.

The uncomfortable truth: most AI initiatives move fast in the wrong direction and call it progress.

What's the one thing your team would do differently with perfect clarity?`,

    `${desc}

Unpopular opinion: the reason most teams struggle with this isn't a skills gap.

It's a decision-making gap.

The question isn't "do we have the right people?" It's "do our best people have the information they need to make the right calls?"

80% of bad technical outcomes trace back to one under-informed decision made 6 months earlier.

What decision from 6 months ago is your team living with right now?`,
  ];

  const pick = (arr) => arr[day % arr.length];
  const hashtags = getHashtags(title, desc);

  if (style === 'authority')   return `${pick(authorityHooks)}\n\n${title}\n\n${pick(authorityBodies)}\n\n${hashtags}`;
  if (style === 'educational') return `${pick(educationalHooks)}\n\n${title}\n\n${pick(educationalBodies)}\n\n${hashtags}`;
  if (style === 'opinion')     return `${pick(opinionHooks)}\n\n${title}\n\n${pick(opinionBodies)}\n\n${hashtags}`;

  return `${title}\n\n${desc}\n\n${hashtags}`;
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
