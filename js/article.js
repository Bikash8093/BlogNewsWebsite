const ARTICLE_API_KEY = NEWS_CONFIG.API_KEY;
const ARTICLE_BASE_URL = NEWS_CONFIG.BASE_URL;
const ARTICLE_FALLBACK = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80";

document.addEventListener("DOMContentLoaded", loadArticle);

async function loadArticle() {
  const id = new URLSearchParams(location.search).get("id");
  const container = document.getElementById("articleContainer");

  if (!id) {
    showArticleError("No article ID was supplied.");
    return;
  }

  // First use API-fetched browser cache. This is NOT hard-coded news.
  const cached = getCachedArticles().find(a => a.id === id);
  if (cached) {
    renderArticle(cached);
    return;
  }

  /*
    Direct URL recovery:
    If the article isn't in localStorage, search the API using the ID.
    Because an API ID is not a native GNews identifier, the most reliable
    direct recovery is to ask the user to reopen the story from the live
    homepage when no cached article exists.
  */
  showArticleError("This article is not available in the current browser cache. Open the homepage and click “Read Full Story” again so the API-fetched article can be loaded.");
}

function getCachedArticles() {
  try {
    return JSON.parse(localStorage.getItem("bharatnews_articles") || "[]");
  } catch (_) {
    return [];
  }
}

function renderArticle(article) {
  document.title = `${article.title} — BharatNews`;

  document.getElementById("articleContainer").innerHTML = `
    <a class="back-link" href="index.html">← Back to Home</a>

    <article>
      <div class="article-category">NEWS</div>
      <h1 class="article-title">${escapeHTML(article.title)}</h1>

      <div class="article-meta">
        <span>${escapeHTML(article.source)}</span>
        <span>•</span>
        <span>${formatDate(article.publishedAt)}</span>
      </div>

      <img class="article-image" src="${escapeAttr(article.image)}"
           alt="${escapeAttr(article.title)}"
           onerror="this.src='${ARTICLE_FALLBACK}'">

      ${article.description ? `<p class="article-lead">${escapeHTML(article.description)}</p>` : ""}

      <div class="article-content">
        ${formatContent(article.content || "The API did not provide additional article text for this story.")}
      </div>

      <div class="article-source-box">
        <strong>Source</strong>
        <span>${escapeHTML(article.source)}</span>
        <a href="${escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer">Open Original Story ↗</a>
      </div>
    </article>
  `;
}

function showArticleError(message) {
  document.getElementById("articleContainer").innerHTML = `
    <a class="back-link" href="index.html">← Back to Home</a>
    <div class="error-box article-error"><strong>Story unavailable</strong><br>${escapeHTML(message)}<br><br><a class="read-btn red-button" href="index.html">Return to News →</a></div>
  `;
}

function formatContent(text) {
  return escapeHTML(text).split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join("");
}

function formatDate(v) {
  if (!v) return "Recently";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleString("en-IN", {dateStyle:"medium", timeStyle:"short"});
}

function escapeHTML(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function escapeAttr(v) { return escapeHTML(v); }
