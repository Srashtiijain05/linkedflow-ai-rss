// rss.js — Full content fetching via content:encoded + URL scraping fallback
// Dependencies: npm install rss-parser axios cheerio

const RSSParser = require('rss-parser');
const axios     = require('axios');
const cheerio   = require('cheerio');

// FIX 1: Tell rss-parser to extract content:encoded field
// This is where most RSS feeds put the FULL article HTML
// Without this, it was silently ignored
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; LinkedFlowBot/1.0)',
  },
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['description', 'description'],
    ],
  },
});

// ── RSS FEEDS ──────────────────────────────────────────────────────────────────
// Removed: HBR, Wired, MIT Tech Review, Forbes, The Verge, TechCrunch
// Reason: paywalls or JS-rendering — cheerio scraping always fails on these
// Kept/added: feeds that include full content in RSS or have scrapable HTML
const RSS_FEEDS = [
  // ── AI & Machine Learning ──
  { url: 'https://www.anthropic.com/news/rss',                    label: 'Anthropic News',       priority: 1 },
  { url: 'https://huggingface.co/blog/feed.xml',                  label: 'Hugging Face Blog',    priority: 1 },
  { url: 'https://openai.com/news/rss',                           label: 'OpenAI Blog',          priority: 1 },
  { url: 'https://www.deepmind.com/blog/rss.xml',                 label: 'DeepMind Blog',        priority: 1 },
  { url: 'https://blogs.microsoft.com/ai/feed/',                  label: 'Microsoft AI Blog',    priority: 1 },
  { url: 'https://ai.googleblog.com/feeds/posts/default?alt=rss', label: 'Google AI Blog',       priority: 1 },
  { url: 'https://paperswithcode.com/latest.rss',                 label: 'Papers With Code',     priority: 1 },

  // ── Developer & Engineering (these publish full HTML in content:encoded) ──
  { url: 'https://dev.to/feed',                                   label: 'DEV.to',               priority: 1 },
  { url: 'https://stackoverflow.blog/feed/',                      label: 'Stack Overflow Blog',  priority: 1 },
  { url: 'https://aws.amazon.com/blogs/aws/feed/',                label: 'AWS Blog',             priority: 1 },
  { url: 'https://netflixtechblog.com/feed',                      label: 'Netflix Tech Blog',    priority: 1 },
  { url: 'https://engineering.fb.com/feed/',                      label: 'Meta Engineering',     priority: 1 },

  // ── Tech News (scrapable) ──
  { url: 'https://feeds.arstechnica.com/arstechnica/index',       label: 'Ars Technica',         priority: 2 },
  { url: 'https://venturebeat.com/feed/',                         label: 'VentureBeat',          priority: 2 },
  { url: 'https://news.ycombinator.com/rss',                      label: 'Hacker News',          priority: 2 },

  // ── India / Regional ──
  { url: 'https://yourstory.com/feed',                            label: 'YourStory',            priority: 2 },
  { url: 'https://www.inc42.com/feed/',                           label: 'Inc42',                priority: 2 },
  { url: 'https://entrackr.com/feed/',                            label: 'Entrackr',             priority: 2 },

  // ── Cybersecurity ──
  { url: 'https://krebsonsecurity.com/feed/',                     label: 'Krebs on Security',    priority: 3 },
  { url: 'https://feeds.feedburner.com/TheHackersNews',           label: 'The Hacker News',      priority: 3 },

  // ── Fintech ──
  { url: 'https://www.finextra.com/rss/headlines.aspx',           label: 'Finextra',             priority: 3 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',       label: 'CoinDesk',             priority: 3 },
];

// ── STRIP HTML TAGS ────────────────────────────────────────────────────────────
// Used to clean content:encoded HTML into plain readable text
function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, figure, img, iframe').remove();
  return $('p')
    .map((_, p) => $(p).text().trim())
    .get()
    .filter(t => t.length > 30)
    .join('\n\n')
    .slice(0, 5000)
    .trim();
}

// ── URL SCRAPER (fallback only) ───────────────────────────────────────────────
// Only runs when RSS itself didn't provide enough content
async function scrapeUrl(articleUrl) {
  try {
    const { data: html } = await axios.get(articleUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .sidebar, .ads, [class*="related"], [class*="newsletter"], [class*="subscribe"]').remove();

    const selectors = [
      'article', '[class*="article-body"]', '[class*="post-body"]',
      '[class*="entry-content"]', '[class*="story-body"]',
      '[class*="article-content"]', '[class*="post-content"]',
      'main', '.content', '#content',
    ];

    let content = '';
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        content = el.find('p')
          .map((_, p) => $(p).text().trim())
          .get()
          .filter(t => t.length > 30)
          .join('\n\n');
        if (content.length > 300) break;
      }
    }

    if (!content || content.length < 200) {
      content = $('p')
        .map((_, p) => $(p).text().trim())
        .get()
        .filter(t => t.length > 40)
        .join('\n\n');
    }

    return content.slice(0, 5000).trim() || null;

  } catch (err) {
    console.warn(`  ⚠ Scrape failed for ${articleUrl}: ${err.message}`);
    return null;
  }
}

// ── SPAM FILTER ────────────────────────────────────────────────────────────────
function isLowQuality(title, summary) {
  const text = (title + ' ' + summary).toLowerCase();
  const spamWords = [
    'sponsored', 'advertisement', 'buy now', 'click here',
    'limited time', 'coupon', 'discount', 'giveaway', 'prize',
    'promo code', 'flash sale', 'free offer', 'act now',
    'win a', 'you won', 'congratulations you',
  ];
  for (const word of spamWords) {
    if (text.includes(word)) return true;
  }
  if (summary.length < 50) return true;
  return false;
}

// ── MAIN FETCH FUNCTION ───────────────────────────────────────────────────────
async function fetchAllFeeds(maxPerFeed = 2, getFullContent = true) {
  const allArticles = [];
  const sortedFeeds = [...RSS_FEEDS].sort((a, b) => (a.priority || 3) - (b.priority || 3));

  for (const feed of sortedFeeds) {
    try {
      console.log(`📡 ${feed.label}`);
      const parsed = await parser.parseURL(feed.url);
      const items  = (parsed.items || []).slice(0, maxPerFeed);

      for (const item of items) {
        // FIX 2: Use content:encoded first — this has the full article HTML
        // Old code used contentSnippet first which is always the short version
        const rssHtmlContent = item.contentEncoded || item.content || '';
        const rssPlainContent = stripHtml(rssHtmlContent);

        // Short summary for quality filter only
        const summary =
          item.contentSnippet ||
          item.summary        ||
          item.description    ||
          rssPlainContent.slice(0, 200) ||
          '';

        if (isLowQuality(item.title || '', summary)) {
          console.log(`  ⏭ Skipped (low quality): ${item.title?.slice(0, 50)}`);
          continue;
        }

        let fullContent = '';

        if (rssPlainContent.length > 300) {
          // RSS gave us real content — use it, no scraping needed
          fullContent = rssPlainContent;
          console.log(`  ✅ RSS full content: ${fullContent.length} chars — ${item.title?.slice(0, 45)}`);
        } else if (getFullContent && item.link) {
          // RSS only had a snippet — try scraping the URL as fallback
          console.log(`  🌐 Scraping URL: ${item.title?.slice(0, 45)}`);
          const scraped = await scrapeUrl(item.link);
          fullContent = scraped || rssPlainContent || summary;
          console.log(`  📄 Scraped content: ${fullContent.length} chars`);
        } else {
          fullContent = rssPlainContent || summary;
        }

        allArticles.push({
          title:       item.title || 'Untitled',
          link:        item.link  || '',
          pubDate:     item.pubDate || item.isoDate || '',
          feedLabel:   feed.label,
          summary:     summary.slice(0, 800),
          fullContent: fullContent || summary || item.title || '',
        });
      }

    } catch (err) {
      console.error(`  ✗ ${feed.label}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total articles collected: ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAllFeeds };
