// LinkedIn Auto Post Script
// Runs via GitHub Actions — no browser needed!

const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN = process.env.LI_TOKEN;
const LI_URN   = process.env.LI_URN   || 'urn:li:person:1772788136593';
const FEED_KEY = process.env.FEED_KEY  || 'tech';

// ── ARTICLE BANK (Tech/AI focused) ───────────────────────────────────────────
const ARTICLES = [
  { title: "The Biggest Mistake Engineers Make When Adopting AI Tools", desc: "Most teams treat AI as a faster search engine. The teams 10x-ing their output are using it to rethink the problem entirely — not just speed up the old solution." },
  { title: "Why Your AI Prototype Works But Your AI Product Doesn't", desc: "The gap between a demo and production AI is not a technical problem. It's a data, feedback loop, and incentive problem. Most teams learn this the hard way." },
  { title: "LLMs Are Not Magic — Here's the Mental Model That Actually Helps", desc: "The engineers shipping the best AI products treat LLMs like a very well-read intern with no memory and no judgment. That framing changes everything about how you design systems." },
  { title: "The Real Reason AI Projects Fail in Enterprise", desc: "It's rarely the model. It's the data pipeline, the stakeholder alignment, and the absence of a feedback loop. 70% of enterprise AI pilots never reach production." },
  { title: "How the Best AI Teams Are Structuring Their Engineering Orgs", desc: "The fastest-moving AI teams share one trait: they've broken down the wall between research and engineering. Separate orgs = 6x slower deployment cycles." },
  { title: "AI Won't Replace Developers — But It Will Split Them Into Two Groups", desc: "Group 1: developers who use AI to go 10x faster. Group 2: developers who don't. The gap is already showing up in hiring, output, and compensation data." },
  { title: "The Skill That Separates Good Engineers From Great Ones in 2026", desc: "It's not the language or the framework. It's the ability to break down ambiguous problems into clear, testable hypotheses — and AI makes this even more critical, not less." },
  { title: "Why the Best Engineers Are Learning to Write Better", desc: "In an AI-assisted world, the person who can specify what they want precisely is the one who ships. Writing is now a core engineering skill, not a soft skill." },
  { title: "What 500 Job Posts Tell Us About What Tech Companies Actually Want in 2026", desc: "AI literacy is now table stakes. What actually differentiates candidates is systems thinking, cross-functional communication, and the ability to work with ambiguous requirements." },
  { title: "The Quiet Shift Happening in How Products Are Built", desc: "The best product teams have cut their planning cycles in half — not by moving faster, but by shipping smaller. AI tools have made tight feedback loops the default, not the exception." },
  { title: "What I Learned From Reviewing 200+ Developer Portfolios", desc: "Most portfolios show what you built. The ones that get interviews show how you think, what tradeoffs you made, and what you'd do differently. Process beats outcome every time." },
  { title: "The Career Advice Nobody in Tech Gives You But Should", desc: "Your first 5 years are for building depth. Your next 5 are for building context. Most people invert this and wonder why they hit a ceiling at senior level." },
  { title: "How to Stand Out in Tech When Everyone Has the Same Skills", desc: "The engineers who get noticed aren't the best coders. They're the ones who understand the business problem deeply enough to push back on the wrong requirements." },
  { title: "Why Junior Developers Who Learn AI Tooling Now Will Lead Teams in 3 Years", desc: "The compounding effect of AI-assisted development is real. Someone using these tools effectively from year one will have the output experience of a 5-year developer by year three." },
  { title: "New Research: Companies With Strong Engineering Culture Ship 4x Faster", desc: "A study of 300 engineering orgs found that culture — not headcount, tooling, or budget — is the single strongest predictor of deployment frequency and developer satisfaction." },
  { title: "The Data Behind Why Async-First Teams Outperform Meeting-Heavy Ones", desc: "Teams that default to async communication ship 28% more features per quarter. The productivity cost of a single unnecessary meeting is higher than most managers estimate." },
  { title: "Open Source AI Is Closing the Gap With Closed Models Faster Than Expected", desc: "Six months ago, open source models were 18 months behind frontier. Today that gap is closer to 6 months — and in some benchmarks, it's already closed completely." },
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
