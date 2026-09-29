const SEARCH_API_KEY = NEWS_CONFIG.API_KEY;
const SEARCH_BASE_URL = NEWS_CONFIG.BASE_URL;
const SEARCH_FALLBACK = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80";

document.addEventListener("DOMContentLoaded", initSearch);

async function initSearch() {
  const params = new URLSearchParams(location.search);
  const query = params.get("q")?.trim() || "";

  document.getElementById("searchInput").value = query;
  document.getElementById("searchForm").addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    if (q) location.href = `search.html?q=${encodeURIComponent(q)}`;
  });

  if (!query) {
    document.getElementById("searchSubtitle").textContent = "Enter a topic to search live news.";
    document.getElementById("searchGrid").innerHTML = `<div class="empty-box">Search for India, Odisha, technology, sports, business and more.</div>`;
    return;
  }

  if (!SEARCH_API_KEY || SEARCH_API_KEY === "YOUR_GNEWS_API_KEY") {
    document.getElementById("searchSubtitle").textContent = "API key required.";
    document.getElementById("searchGrid").innerHTML = `<div class="error-box">Add your GNews API key in <b>js/config.js</b>.</div>`;
    return;
  }

  document.getElementById("searchSubtitle").textContent = `Live results for “${query}”`;

  try {
    const params = new URLSearchParams({
      q: query, country: "in", lang: "en", max: "10", sortby: "publishedAt",
      apikey: SEARCH_API_KEY
    });

    const response = await fetch(`${SEARCH_BASE_URL}/search?${params}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.errors?.join(" ") || data.message || `API request failed (${response.status}).`);

    const articles = normalize(data.articles || []);
    cacheArticles(articles);

    render(articles);
  } catch (error) {
    document.getElementById("searchGrid").innerHTML = `<div class="error-box">Unable to load search results.<br><small>${escapeHTML(error.message)}</small></div>`;
  }
}

function normalize(items) {
  return items.filter(a => a && a.title && a.url).map(a => ({
    id: stableId(a), title: a.title, description: a.description || "", content: a.content || "",
    image: validImage(a.image), url: a.url, publishedAt: a.publishedAt || "",
    source: a.source?.name || "News Source", sourceUrl: a.source?.url || ""
  }));
}

function stableId(a) {
  const raw = `${a.url || ""}|${a.title || ""}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
  return `article-${Math.abs(h)}`;
}

function cacheArticles(items) {
  const old = JSON.parse(localStorage.getItem("bharatnews_articles") || "[]");
  const map = new Map(old.map(x => [x.id, x]));
  items.forEach(x => map.set(x.id, x));
  localStorage.setItem("bharatnews_articles", JSON.stringify([...map.values()].slice(-200)));
}

function render(items) {
  const grid = document.getElementById("searchGrid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty-box">No news was returned by the API for this search.</div>`;
    return;
  }

  grid.innerHTML = items.map(a => `
    <article class="news-card">
      <a href="article.html?id=${encodeURIComponent(a.id)}">
        <div class="news-image-wrap">
          <img class="news-image" src="${escapeAttr(a.image)}" alt="${escapeAttr(a.title)}" onerror="this.src='${SEARCH_FALLBACK}'">
          <span class="card-category">SEARCH</span>
        </div>
        <div class="card-body">
          <h3>${escapeHTML(a.title)}</h3>
          <p>${escapeHTML(a.description || a.content || "")}</p>
          <div class="card-meta"><span class="source"><i>N</i>${escapeHTML(a.source)}</span><span>◷ ${relativeTime(a.publishedAt)}</span></div>
          <span class="read-story">Read Full Story →</span>
        </div>
      </a>
    </article>`).join("");
}

function validImage(url) {
  try { const u = new URL(url || ""); return ["http:", "https:"].includes(u.protocol) ? u.href : SEARCH_FALLBACK; }
  catch (_) { return SEARCH_FALLBACK; }
}
function escapeAttr(v) { return String(v ?? "").replace(/"/g, "&quot;").replace(/'/g, "&#039;") }
function escapeHTML(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") }
function relativeTime(v) { const d = new Date(v); if (!v || Number.isNaN(d.getTime())) return "Recently"; const m = Math.floor((Date.now() - d) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`; return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }
