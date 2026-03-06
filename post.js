// api/post.js — LinkedIn Auto Post API
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, text, personUrn } = req.body || {};

  if (!token) return res.status(400).json({ error: "Token missing" });
  if (!text)  return res.status(400).json({ error: "Post text missing" });
  if (!personUrn) return res.status(400).json({ error: "Person URN missing" });

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, postId: data.id });
    } else {
      return res.status(400).json({ error: data.message || "LinkedIn API error", details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
