/*
 * BharatNews dynamic homepage
 *
 * IMPORTANT:
 * - No news is hard-coded here.
 * - All article data is fetched from GNews.
 * - UI labels/category names are static website structure only.
 */

const API_KEY = NEWS_CONFIG.API_KEY;
const BASE_URL = NEWS_CONFIG.BASE_URL;

const state = {
    articles: [],
    categoryCache: new Map(),
    heroIndex: 0
};

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80";

const categoryMap = {
    nation: "India",
    business: "Business",
    technology: "Technology",
    sports: "Sports",
    entertainment: "Entertainment",
    health: "Health",
    world: "World",
    science: "Science"
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    setDate();
    document.getElementById("footerYear").textContent =
        new Date().getFullYear();

    setupTheme();
    setupMobileMenu();
    setupSearch();
    setupCategoryTabs();
    setupSubscribe();

    if (!API_KEY || API_KEY === "YOUR_GNEWS_API_KEY") {
        showConfigurationError();
        return;
    }

    await loadHomepage();
}

function setDate() {
    const date = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date());

    document.getElementById("todayDate").textContent = date;
}

function setupTheme() {
    const saved = localStorage.getItem("bharatnews-theme");

    if (saved === "dark") {
        document.body.classList.add("dark");
    }

    document.getElementById("themeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark");

        localStorage.setItem(
            "bharatnews-theme",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );
    });
}

function setupMobileMenu() {
    document.getElementById("mobileMenuBtn").addEventListener("click", () => {
        document.getElementById("mainNav").classList.toggle("open");
    });
}

function setupSearch() {
    document.getElementById("searchForm").addEventListener("submit", event => {
        event.preventDefault();

        const query =
            document.getElementById("searchInput").value.trim();

        if (!query) {
            showToast("Enter a topic, place or keyword to search.");
            return;
        }

        window.location.href =
            `search.html?q=${encodeURIComponent(query)}`;
    });
}

function setupCategoryTabs() {
    document.querySelectorAll(".category-tab").forEach(button => {

        button.addEventListener("click", async () => {

            document.querySelectorAll(".category-tab")
                .forEach(item =>
                    item.classList.remove("active")
                );

            button.classList.add("active");

            const category =
                button.dataset.category;

            if (category === "odisha") {
                scrollToSection("odisha");
                return;
            }

            const data =
                await fetchTopHeadlines(category);

            if (data.length) {

                renderNewsGrid(
                    document.getElementById("indiaGrid"),
                    data.slice(0, 8),
                    categoryMap[category] || category
                );

                document.getElementById("india")
                    .querySelector("h2").innerHTML =
                    `<span class="red-line"></span>${escapeHTML(
                        categoryMap[category] || category
                    )} News`;

                scrollToSection("india");
            }
        });
    });
}

function setupSubscribe() {
    document.getElementById("subscribeForm")
        .addEventListener("submit", event => {

            event.preventDefault();

            const email =
                document.getElementById("subscribeEmail")
                    .value.trim();

            if (!email) return;

            showToast(
                "Subscription form is ready. Connect an email service to receive subscriptions."
            );

            event.target.reset();
        });
}


/* =========================================================
   HOMEPAGE
========================================================= */

async function loadHomepage() {

    try {

        const india =
            await fetchTopHeadlines("nation");

        if (!india.length) {
            throw new Error(
                "No India news was returned by the API."
            );
        }

        state.articles = india;

        /*
         * Use localStorage so article.html can access
         * the articles after navigation.
         */
        localStorage.setItem(
            "bharatnews_articles",
            JSON.stringify(india)
        );

        renderHero(india[0]);

        renderTrending(
            india.slice(0, 5)
        );

        renderNewsGrid(
            document.getElementById("indiaGrid"),
            india.slice(0, 8),
            "India"
        );

        /*
         * Do NOT load all 4 additional APIs here.
         *
         * This prevents:
         * Business + Technology + Sports + Odisha
         * from being requested immediately and causing 429.
         */

        // await loadAdditionalSections();

        startHeroRotation(
            india.slice(
                0,
                Math.min(india.length, 5)
            )
        );

    } catch (error) {

        console.error(error);

        showGlobalError(
            error.message
        );
    }
}


/* =========================================================
   ADDITIONAL SECTIONS
========================================================= */

async function loadAdditionalSections() {

    const requests = [
        {
            id: "businessGrid",
            category: "business",
            label: "Business"
        },
        {
            id: "technologyGrid",
            category: "technology",
            label: "Technology"
        },
        {
            id: "sportsGrid",
            category: "sports",
            label: "Sports"
        }
    ];

    for (const item of requests) {

        try {

            const data =
                await fetchTopHeadlines(
                    item.category
                );

            renderNewsGrid(
                document.getElementById(item.id),
                data.slice(0, 4),
                item.label
            );

        } catch (error) {

            renderError(
                document.getElementById(item.id),
                error.message
            );
        }
    }

    try {

        const odisha =
            await searchNews("Odisha");

        renderNewsGrid(
            document.getElementById("odishaGrid"),
            odisha.slice(0, 4),
            "Odisha"
        );

    } catch (error) {

        renderError(
            document.getElementById("odishaGrid"),
            error.message
        );
    }
}


/* =========================================================
   TOP HEADLINES
========================================================= */

async function fetchTopHeadlines(category) {

    if (state.categoryCache.has(category)) {
        return state.categoryCache.get(category);
    }

    const params = new URLSearchParams({
        category,
        lang: "en",
        country: "in",
        max: "10",
        apikey: API_KEY
    });

    const response =
        await fetch(
            `${BASE_URL}/top-headlines?${params}`
        );

    if (!response.ok) {

        const message =
            await readApiError(response);

        throw new Error(message);
    }

    const data =
        await response.json();

    const articles =
        normalizeArticles(
            data.articles || []
        );

    state.categoryCache.set(
        category,
        articles
    );

    saveArticlesForArticlePage(
        articles
    );

    return articles;
}


/* =========================================================
   SEARCH NEWS
========================================================= */

async function searchNews(query) {

    const params = new URLSearchParams({
        q: query,
        lang: "en",
        country: "in",
        max: "10",
        sortby: "publishedAt",
        apikey: API_KEY
    });

    const response =
        await fetch(
            `${BASE_URL}/search?${params}`
        );

    if (!response.ok) {

        const message =
            await readApiError(response);

        throw new Error(message);
    }

    const data =
        await response.json();

    const articles =
        normalizeArticles(
            data.articles || []
        );

    saveArticlesForArticlePage(
        articles
    );

    return articles;
}


/* =========================================================
   NORMALIZE ARTICLES
========================================================= */

function normalizeArticles(rawArticles) {

    return rawArticles
        .filter(article =>
            article &&
            article.title &&
            article.url
        )
        .map(article => ({

            id: createArticleId(article),

            title: article.title,

            description:
                article.description || "",

            content:
                article.content || "",

            image:
                article.image ||
                FALLBACK_IMAGE,

            url:
                article.url,

            publishedAt:
                article.publishedAt || "",

            source:
                article.source?.name ||
                "News Source",

            sourceUrl:
                article.source?.url ||
                ""
        }));
}


/* =========================================================
   STABLE ARTICLE ID
========================================================= */

function createArticleId(article) {

    const raw =
        `${article.url || ""}|${article.title || ""}`;

    let hash = 0;

    for (let i = 0; i < raw.length; i++) {

        hash =
            ((hash << 5) - hash) +
            raw.charCodeAt(i);

        hash |= 0;
    }

    return `article-${Math.abs(hash)}`;
}


/* =========================================================
   SAVE ARTICLES
========================================================= */

function saveArticlesForArticlePage(articles) {

    try {

        const current =
            JSON.parse(
                localStorage.getItem(
                    "bharatnews_articles"
                ) || "[]"
            );

        const merged = [...current];

        articles.forEach(article => {

            if (
                !merged.some(
                    item =>
                        item.id === article.id
                )
            ) {
                merged.push(article);
            }

        });

        localStorage.setItem(
            "bharatnews_articles",
            JSON.stringify(
                merged.slice(0, 100)
            )
        );

    } catch (error) {

        console.warn(
            "Could not save article data:",
            error
        );
    }
}


/* =========================================================
   HERO
========================================================= */

function renderHero(article) {

    const hero =
        document.getElementById("heroMain");

    hero.innerHTML = `
        <article class="hero-article"
            style="background-image:url('${safeUrl(article.image)}')">

            <div class="hero-content">

                <span class="badge">
                    TOP NEWS
                </span>

                <h1>
                    ${escapeHTML(article.title)}
                </h1>

                <p>
                    ${escapeHTML(
                        article.description ||
                        getShortText(article.content)
                    )}
                </p>

                <button class="read-btn"
                    onclick="openArticle('${escapeAttribute(article.id)}')">

                    Read Full Story <span>→</span>

                </button>

            </div>

        </article>
    `;

    renderHeroDots();
}


/* =========================================================
   HERO DOTS
========================================================= */

function renderHeroDots() {

    const dots =
        document.getElementById(
            "heroDots"
        );

    dots.innerHTML = "";

    const count =
        Math.min(
            state.articles.length,
            5
        );

    for (let i = 0; i < count; i++) {

        const dot =
            document.createElement("span");

        dot.className =
            `hero-dot ${
                i === state.heroIndex
                    ? "active"
                    : ""
            }`;

        dot.addEventListener(
            "click",
            () => {

                state.heroIndex = i;

                renderHero(
                    state.articles[i]
                );
            }
        );

        dots.appendChild(dot);
    }
}


/* =========================================================
   HERO ROTATION
========================================================= */

function startHeroRotation(articles) {

    if (articles.length < 2)
        return;

    setInterval(() => {

        state.heroIndex =
            (state.heroIndex + 1) %
            articles.length;

        renderHero(
            articles[state.heroIndex]
        );

    }, 7000);
}


/* =========================================================
   TRENDING
========================================================= */

function renderTrending(articles) {

    const container =
        document.getElementById(
            "trendingList"
        );

    if (!articles.length) {

        container.innerHTML =
            `<div class="empty-box">
                No trending stories available.
            </div>`;

        return;
    }

    container.innerHTML =
        articles.map(
            (article, index) => `

        <a class="trend-item"
            href="article.html?id=${encodeURIComponent(article.id)}">

            <span class="trend-number">
                ${String(index + 1).padStart(2, "0")}
            </span>

            <img
                src="${safeUrl(article.image)}"
                alt=""
                loading="lazy"
                onerror="this.src='${FALLBACK_IMAGE}'"
            >

            <div class="trend-copy">

                <h3>
                    ${escapeHTML(article.title)}
                </h3>

                <small>
                    ${formatRelativeTime(
                        article.publishedAt
                    )}
                </small>

            </div>

        </a>
    `
        ).join("");
}


/* =========================================================
   NEWS GRID
========================================================= */

function renderNewsGrid(
    container,
    articles,
    categoryLabel
) {

    if (!container)
        return;

    if (!articles.length) {

        container.innerHTML = `
            <div class="empty-box">
                No news available from the API right now.
            </div>
        `;

        return;
    }

    container.innerHTML =
        articles.map(
            article => `

        <article class="news-card">

            <a
                href="article.html?id=${encodeURIComponent(article.id)}"
            >

                <div class="news-image-wrap">

                    <img
                        class="news-image"
                        src="${safeUrl(article.image)}"
                        alt="${escapeAttribute(article.title)}"
                        loading="lazy"
                        onerror="this.src='${FALLBACK_IMAGE}'"
                    >

                    <span class="card-category">
                        ${escapeHTML(categoryLabel)}
                    </span>

                </div>

                <div class="card-body">

                    <h3>
                        ${escapeHTML(article.title)}
                    </h3>

                    <p>
                        ${escapeHTML(
                            article.description ||
                            getShortText(article.content) ||
                            "Open the story to read more."
                        )}
                    </p>

                    <div class="card-meta">

                        <span class="card-source">

                            <span class="source-dot">
                                N
                            </span>

                            <span>
                                ${escapeHTML(article.source)}
                            </span>

                        </span>

                        <span>
                            ◷ ${formatRelativeTime(
                                article.publishedAt
                            )}
                        </span>

                    </div>

                    <span class="read-story">
                        Read Full Story →
                    </span>

                </div>

            </a>

        </article>
    `
        ).join("");
}


/* =========================================================
   OPEN ARTICLE
========================================================= */

function openArticle(id) {

    window.location.href =
        `article.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   API ERROR
========================================================= */

async function readApiError(response) {

    try {

        const data =
            await response.json();

        if (
            data.errors &&
            Array.isArray(data.errors)
        ) {

            return data.errors.join(" ");
        }

        if (data.message) {
            return data.message;
        }

    } catch (_) {}

    if (response.status === 429) {

        return "Too many API requests. Please wait and try again.";
    }

    return `News API request failed (${response.status}).`;
}


/* =========================================================
   ERROR
========================================================= */

function renderError(
    container,
    message
) {

    container.innerHTML = `
        <div class="error-box">

            Unable to load this section.

            <br>

            <small>
                ${escapeHTML(message)}
            </small>

        </div>
    `;
}


/* =========================================================
   CONFIGURATION ERROR
========================================================= */

function showConfigurationError() {

    document.getElementById(
        "heroMain"
    ).innerHTML = `

        <div class="hero-loading">

            <strong>
                API key required
            </strong>

            <span>
                Add your GNews API key in
                <b>js/config.js</b>.
            </span>

        </div>
    `;

    [
        "indiaGrid",
        "odishaGrid",
        "businessGrid",
        "technologyGrid",
        "sportsGrid"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {

            element.innerHTML = `
                <div class="error-box">
                    Add your GNews API key in
                    <b>js/config.js</b>.
                </div>
            `;
        }
    });
}


/* =========================================================
   GLOBAL ERROR
========================================================= */

function showGlobalError(message) {

    document.getElementById(
        "heroMain"
    ).innerHTML = `

        <div class="hero-loading">

            <strong>
                Unable to load news
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

            <button
                class="read-btn"
                onclick="location.reload()"
            >
                Retry →
            </button>

        </div>
    `;

    document.getElementById(
        "indiaGrid"
    ).innerHTML = `

        <div class="error-box">

            News could not be loaded from the API.

            <br>

            <small>
                ${escapeHTML(message)}
            </small>

            <br>

            <button onclick="location.reload()">
                Retry
            </button>

        </div>
    `;
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToSection(id) {

    document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   RELATIVE TIME
========================================================= */

function formatRelativeTime(dateString) {

    if (!dateString)
        return "Recently";

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Recently";
    }

    const seconds =
        Math.floor(
            (Date.now() -
                date.getTime()) / 1000
        );

    if (seconds < 60)
        return "just now";

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {

        return `${minutes} min${
            minutes === 1 ? "" : "s"
        } ago`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {

        return `${hours} hour${
            hours === 1 ? "" : "s"
        } ago`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 7) {

        return `${days} day${
            days === 1 ? "" : "s"
        } ago`;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================================================
   SHORT TEXT
========================================================= */

function getShortText(text) {

    if (!text)
        return "";

    return text
        .replace(/\s+/g, " ")
        .replace(/\[\+\d+ chars\]$/i, "")
        .trim()
        .slice(0, 220);
}


/* =========================================================
   SAFE URL
========================================================= */

function safeUrl(url) {

    try {

        const parsed =
            new URL(url);

        if (
            parsed.protocol === "https:" ||
            parsed.protocol === "http:"
        ) {

            return parsed.href
                .replace(/'/g, "%27");
        }

    } catch (_) {}

    return FALLBACK_IMAGE;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(
        window.__toastTimer
    );

    window.__toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3500);
}


window.openArticle =
    openArticle;