const API_KEY = NEWS_CONFIG.API_KEY;
const BASE_URL = NEWS_CONFIG.BASE_URL;

const state = {
    articles: [],
    categoryCache: new Map(),
    pendingRequests: new Map(),
    heroIndex: 0
};

const FALLBACK_IMAGE =
    "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg";
const CACHE_TIME =
    15 * 60 * 1000;

const API_REQUEST_DELAY = 1500;
const MAX_API_RETRIES = 2;
let lastApiRequestTime = 0;


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

document.addEventListener(
    "DOMContentLoaded",
    init
);

async function init() {
    setDate();

    const footerYear = document.getElementById("footerYear");

    if (footerYear) {
        footerYear.textContent =
            new Date().getFullYear();
    }
    setupTheme();
    setupMobileMenu();
    setupSearch();
    setupCategoryTabs();
    setupSubscribe();


    if (
        !API_KEY || API_KEY === "YOUR_GNEWS_API_KEY"
    ) {
        showConfigurationError();
        return;
    }
    await loadHomepage();
}


function setDate() {
    const date =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        ).format(new Date());

    const element = document.getElementById("todayDate");

    if (element) {
        element.textContent = date;
    }
}


function setupTheme() {
    const saved = localStorage.getItem("bharatnews-theme");

    if (saved === "dark") {
        document.body.classList.add("dark");
    }

    const toggle = document.getElementById("themeToggle");
    if (!toggle)
        return;

    toggle.addEventListener("click",() => {

            document.body.classList.toggle(
                "dark"
            );


            localStorage.setItem(

                "bharatnews-theme",

                document.body.classList.contains(
                    "dark"
                )
                    ? "dark"
                    : "light"

            );

        }
    );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenuBtn"
        );


    const nav =
        document.getElementById(
            "mainNav"
        );


    if (!button || !nav)
        return;


    button.addEventListener(
        "click",
        () => {

            nav.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const form =
        document.getElementById(
            "searchForm"
        );


    const input =
        document.getElementById(
            "searchInput"
        );


    if (!form || !input)
        return;


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const query =
                input.value.trim();


            if (!query) {

                showToast(
                    "Enter a topic, place or keyword to search."
                );

                return;

            }


            window.location.href =
                `search.html?q=${encodeURIComponent(query)}`;

        }
    );

}


/* =========================================================
   CATEGORY TABS
========================================================= */

function setupCategoryTabs() {

    const buttons =
        document.querySelectorAll(
            ".category-tab"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    /*
                     * Remove active class.
                     */

                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    const category =
                        button.dataset.category;


                    if (!category)
                        return;


                    try {

                        showToast(
                            `Loading ${categoryMap[category] || category} news...`
                        );


                        const data =
                            await fetchTopHeadlines(
                                category
                            );


                        if (!data.length) {

                            showToast(
                                "No news available for this category."
                            );

                            return;

                        }


                        /*
                         * Display selected category
                         * inside the India/news grid.
                         */

                        renderNewsGrid(

                            document.getElementById(
                                "indiaGrid"
                            ),

                            data.slice(
                                0,
                                8
                            ),

                            categoryMap[category] ||
                            category

                        );


                        const indiaSection =
                            document.getElementById(
                                "india"
                            );


                        if (
                            indiaSection
                        ) {

                            const heading =
                                indiaSection.querySelector(
                                    "h2"
                                );


                            if (heading) {

                                heading.innerHTML =

                                    `<span class="red-line"></span>${escapeHTML(
                                        categoryMap[category] ||
                                        category
                                    )} News`;

                            }

                        }


                        scrollToSection(
                            "india"
                        );


                    } catch (error) {

                        console.error(
                            `Category ${category}:`,
                            error
                        );


                        showToast(
                            error.message ||
                            "Unable to load news."
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   SUBSCRIBE
========================================================= */

function setupSubscribe() {

    const form =
        document.getElementById(
            "subscribeForm"
        );


    const input =
        document.getElementById(
            "subscribeEmail"
        );


    if (!form || !input)
        return;


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const email =
                input.value.trim();


            if (!email)
                return;


            showToast(
                "Subscription form is ready. Connect an email service to receive subscriptions."
            );


            form.reset();

        }
    );

}


/* =========================================================
   HOMEPAGE
========================================================= */

async function loadHomepage() {

    try {

        /*
         * -------------------------------------------------
         * INDIA
         * -------------------------------------------------
         */

        const india =
            await fetchTopHeadlines(
                "nation"
            );


        if (!india.length) {

            throw new Error(
                "No India news was returned by the API."
            );

        }


        /*
         * Save India articles in memory.
         */

        state.articles =
            india;


        /*
         * Save India articles for article page.
         */

        saveArticlesForArticlePage(
            india
        );


        /*
         * Hero.
         */

        renderHero(
            india[0]
        );


        /*
         * Trending.
         */

        renderTrending(
            india.slice(
                0,
                5
            )
        );


        /*
         * India grid.
         */

        renderNewsGrid(

            document.getElementById(
                "indiaGrid"
            ),

            india.slice(
                0,
                8
            ),

            "India"

        );


        /*
         * -------------------------------------------------
         * BUSINESS / TECHNOLOGY / SPORTS
         * -------------------------------------------------
         */

        await loadAdditionalSections();


        /*
         * Start hero rotation.
         */

        startHeroRotation(

            india.slice(
                0,
                Math.min(
                    india.length,
                    5
                )
            )

        );


    } catch (error) {

        console.error(
            "Homepage error:",
            error
        );


        showGlobalError(
            error.message ||
            "Unable to load news."
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



    for (
        const item of requests
    ) {

        try {
            const data =
                await fetchTopHeadlines(
                    item.category
                );

            const container =
                document.getElementById(
                    item.id
                );


            if (!container)
                continue;


            renderNewsGrid(

                container,

                data.slice(
                    0,
                    4
                ),

                item.label

            );


        } catch (error) {

            console.error(

                `${item.label}:`,

                error

            );


            renderError(

                document.getElementById(
                    item.id
                ),

                error.message

            );

        }

    }

}


/* =========================================================
   API REQUEST DELAY
========================================================= */

async function waitForApiSlot() {

    const now =
        Date.now();


    const elapsed =
        now -
        lastApiRequestTime;


    const remaining =
        API_REQUEST_DELAY -
        elapsed;


    if (remaining > 0) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    remaining
                )
        );

    }


    lastApiRequestTime =
        Date.now();

}


/* =========================================================
   CACHE KEY
========================================================= */

function getCacheKey(category) {

    return `bharatnews_cache_${category}`;

}


/* =========================================================
   READ CACHE
========================================================= */

function getCachedArticles(category) {

    try {

        const key =
            getCacheKey(
                category
            );


        const cached =
            localStorage.getItem(
                key
            );


        if (!cached)
            return null;


        const parsed =
            JSON.parse(
                cached
            );


        if (
            !parsed ||
            !Array.isArray(
                parsed.articles
            )
        ) {

            return null;

        }


        if (
            !parsed.timestamp
        ) {

            return null;

        }


        return {

            articles:
                parsed.articles,

            timestamp:
                parsed.timestamp,

            expired:
                Date.now() -
                parsed.timestamp >
                CACHE_TIME

        };


    } catch (error) {

        console.warn(
            "Cache read error:",
            error
        );


        return null;

    }

}


/* =========================================================
   SAVE CACHE
========================================================= */

function saveCachedArticles(
    category,
    articles
) {

    try {

        const key =
            getCacheKey(
                category
            );


        localStorage.setItem(

            key,

            JSON.stringify({

                timestamp:
                    Date.now(),

                articles:
                    articles

            })

        );


    } catch (error) {

        console.warn(
            "Cache save error:",
            error
        );

    }

}


/* =========================================================
   TOP HEADLINES
========================================================= */

async function fetchTopHeadlines(
    category
) {

    /*
     * -------------------------------------------------
     * MEMORY CACHE
     * -------------------------------------------------
     */

    if (
        state.categoryCache.has(
            category
        )
    ) {

        return state.categoryCache.get(
            category
        );

    }


    /*
     * -------------------------------------------------
     * LOCAL STORAGE CACHE
     * -------------------------------------------------
     */

    const cached =
        getCachedArticles(
            category
        );


    if (
        cached &&
        !cached.expired
    ) {

        state.categoryCache.set(

            category,

            cached.articles

        );


        return cached.articles;

    }


    /*
     * -------------------------------------------------
     * PREVENT DUPLICATE REQUESTS
     * -------------------------------------------------
     */

    if (
        state.pendingRequests.has(
            category
        )
    ) {

        return state.pendingRequests.get(
            category
        );

    }


    /*
     * -------------------------------------------------
     * CREATE REQUEST
     * -------------------------------------------------
     */

    const request =
        fetchCategoryFromAPI(
            category,
            cached
        );


    state.pendingRequests.set(
        category,
        request
    );


    try {

        return await request;

    } finally {

        state.pendingRequests.delete(
            category
        );

    }

}


/* =========================================================
   FETCH CATEGORY FROM API
========================================================= */

async function fetchCategoryFromAPI(
    category,
    staleCache = null
) {

    let attempt = 0;


    while (
        attempt <= MAX_API_RETRIES
    ) {

        try {

            /*
             * Wait before request.
             */

            await waitForApiSlot();


            /*
             * Build parameters.
             */

            const params =
                new URLSearchParams({

                    category:
                        category,

                    lang:
                        "en",

                    country:
                        "in",

                    max:
                        "10",

                    apikey:
                        API_KEY

                });


            /*
             * Request.
             */

            const response =
                await fetch(

                    `${BASE_URL}/top-headlines?${params}`

                );


            /*
             * -------------------------------------------------
             * RATE LIMIT
             * -------------------------------------------------
             */

            if (
                response.status === 429
            ) {

                attempt++;


                console.warn(

                    `GNews rate limit reached for ${category}. Attempt ${attempt}.`

                );


                /*
                 * If stale cache exists,
                 * use it immediately.
                 */

                if (
                    staleCache &&
                    Array.isArray(
                        staleCache.articles
                    ) &&
                    staleCache.articles.length
                ) {

                    console.warn(

                        `Using cached ${category} news because API returned 429.`

                    );


                    state.categoryCache.set(

                        category,

                        staleCache.articles

                    );


                    return staleCache.articles;

                }


                /*
                 * Retry with exponential delay.
                 */

                if (
                    attempt <=
                    MAX_API_RETRIES
                ) {

                    const retryDelay =
                        3000 *
                        attempt;


                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                retryDelay
                            )
                    );


                    continue;

                }


                throw new Error(

                    "News API rate limit reached. Please wait a moment and refresh."

                );

            }


            /*
             * -------------------------------------------------
             * OTHER API ERRORS
             * -------------------------------------------------
             */

            if (
                !response.ok
            ) {

                const message =
                    await readApiError(
                        response
                    );


                /*
                 * If API temporarily fails
                 * and stale cache exists,
                 * use cached data.
                 */

                if (
                    staleCache &&
                    Array.isArray(
                        staleCache.articles
                    ) &&
                    staleCache.articles.length
                ) {

                    console.warn(

                        `Using cached ${category} news because API failed.`

                    );


                    state.categoryCache.set(

                        category,

                        staleCache.articles

                    );


                    return staleCache.articles;

                }


                throw new Error(
                    message
                );

            }


            /*
             * -------------------------------------------------
             * SUCCESS
             * -------------------------------------------------
             */

            const data =
                await response.json();


            const articles =
                normalizeArticles(

                    data.articles ||
                    []

                );


            /*
             * Save memory cache.
             */

            state.categoryCache.set(

                category,

                articles

            );


            /*
             * Save local cache.
             */

            saveCachedArticles(

                category,

                articles

            );


            /*
             * Save articles for article.html.
             */

            saveArticlesForArticlePage(

                articles

            );


            return articles;


        } catch (error) {

            /*
             * Network error.
             */

            if (
                attempt <
                MAX_API_RETRIES
            ) {

                attempt++;


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            2000 *
                            attempt
                        )
                );


                continue;

            }


            /*
             * Stale cache fallback.
             */

            if (
                staleCache &&
                Array.isArray(
                    staleCache.articles
                ) &&
                staleCache.articles.length
            ) {

                console.warn(

                    `Using stale cache for ${category}.`

                );


                state.categoryCache.set(

                    category,

                    staleCache.articles

                );


                return staleCache.articles;

            }


            throw error;

        }

    }


    throw new Error(
        "Unable to load news."
    );

}


/* =========================================================
   SEARCH NEWS
========================================================= */

async function searchNews(
    query
) {

    /*
     * Search requests also use
     * the same API limiter.
     */

    await waitForApiSlot();


    const params =
        new URLSearchParams({

            q:
                query,

            lang:
                "en",

            country:
                "in",

            max:
                "10",

            sortby:
                "publishedAt",

            apikey:
                API_KEY

        });


    const response =
        await fetch(

            `${BASE_URL}/search?${params}`

        );


    if (
        response.status === 429
    ) {

        throw new Error(

            "Search API rate limit reached. Please wait a moment and try again."

        );

    }


    if (
        !response.ok
    ) {

        const message =
            await readApiError(
                response
            );


        throw new Error(
            message
        );

    }


    const data =
        await response.json();


    const articles =
        normalizeArticles(

            data.articles ||
            []

        );


    saveArticlesForArticlePage(
        articles
    );


    return articles;

}


/* =========================================================
   NORMALIZE ARTICLES
========================================================= */

function normalizeArticles(
    rawArticles
) {

    if (
        !Array.isArray(
            rawArticles
        )
    ) {

        return [];

    }


    return rawArticles

        .filter(
            article =>

                article &&
                article.title &&
                article.url

        )

        .map(
            article => ({

                id:
                    createArticleId(
                        article
                    ),

                title:
                    article.title,

                description:
                    article.description ||
                    "",

                content:
                    article.content ||
                    "",

                image:
                    article.image ||
                    FALLBACK_IMAGE,

                url:
                    article.url,

                publishedAt:
                    article.publishedAt ||
                    "",

                source:
                    article.source?.name ||
                    "News Source",

                sourceUrl:
                    article.source?.url ||
                    ""

            })
        );

}


/* =========================================================
   STABLE ARTICLE ID
========================================================= */

function createArticleId(
    article
) {

    const raw =
        `${article.url || ""}|${article.title || ""}`;


    let hash = 0;


    for (
        let i = 0;
        i < raw.length;
        i++
    ) {

        hash =
            ((hash << 5) - hash) +
            raw.charCodeAt(i);


        hash |= 0;

    }


    return `article-${Math.abs(hash)}`;

}


/* =========================================================
   SAVE ARTICLES FOR ARTICLE PAGE
========================================================= */

function saveArticlesForArticlePage(
    articles
) {

    try {

        const current =
            JSON.parse(

                localStorage.getItem(
                    "bharatnews_articles"
                ) ||
                "[]"

            );


        const merged =
            [...current];


        articles.forEach(
            article => {

                const exists =
                    merged.some(

                        item =>
                            item.id ===
                            article.id

                    );


                if (!exists) {

                    merged.push(
                        article
                    );

                }

            }
        );


        localStorage.setItem(

            "bharatnews_articles",

            JSON.stringify(

                merged.slice(
                    0,
                    100
                )

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

function renderHero(
    article
) {

    if (!article)
        return;


    const hero =
        document.getElementById(
            "heroMain"
        );


    if (!hero)
        return;


    hero.innerHTML = `

        <article
            class="hero-article"
            style="background-image:url('${safeUrl(article.image)}')"
        >

            <div class="hero-content">

                <span class="badge">
                    TOP NEWS
                </span>


                <h1>

                    ${escapeHTML(
        article.title
    )}

                </h1>


                <p>

                    ${escapeHTML(

        article.description ||

        getShortText(
            article.content
        )

    )}

                </p>


                <button
                    class="read-btn"
                    onclick="openArticle('${escapeAttribute(article.id)}')"
                >

                    Read Full Story
                    <span>→</span>

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


    if (!dots)
        return;


    dots.innerHTML = "";


    const count =
        Math.min(

            state.articles.length,

            5

        );


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const dot =
            document.createElement(
                "span"
            );


        dot.className =

            `hero-dot ${i === state.heroIndex
                ? "active"
                : ""
            }`;


        dot.addEventListener(
            "click",
            () => {

                state.heroIndex =
                    i;


                renderHero(

                    state.articles[
                    i
                    ]

                );

            }
        );


        dots.appendChild(
            dot
        );

    }

}


/* =========================================================
   HERO ROTATION
========================================================= */

function startHeroRotation(
    articles
) {

    if (
        !Array.isArray(
            articles
        )
    )
        return;


    if (
        articles.length < 2
    )
        return;


    setInterval(
        () => {

            state.heroIndex =

                (
                    state.heroIndex +
                    1
                ) %
                articles.length;


            renderHero(

                articles[
                state.heroIndex
                ]

            );

        },

        7000

    );

}


/* =========================================================
   TRENDING
========================================================= */

function renderTrending(
    articles
) {

    const container =
        document.getElementById(
            "trendingList"
        );


    if (!container)
        return;


    if (
        !articles ||
        !articles.length
    ) {

        container.innerHTML = `

            <div class="empty-box">

                No trending stories available.

            </div>

        `;


        return;

    }


    container.innerHTML =

        articles.map(

            (article, index) => `

                <a
                    class="trend-item"
                    href="article.html?id=${encodeURIComponent(article.id)}"
                >

                    <span class="trend-number">

                        ${String(
                index + 1
            ).padStart(
                2,
                "0"
            )}

                    </span>


                    <img
                        src="${safeUrl(article.image)}"
                        alt=""
                        loading="lazy"
                        onerror="this.src='${FALLBACK_IMAGE}'"
                    >


                    <div class="trend-copy">

                        <h3>

                            ${escapeHTML(
                article.title
            )}

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


    if (
        !Array.isArray(
            articles
        ) ||
        !articles.length
    ) {

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

                <article
                    class="news-card"
                >

                    <a
                        href="article.html?id=${encodeURIComponent(article.id)}"
                    >

                        <div
                            class="news-image-wrap"
                        >

                            <img
                                class="news-image"
                                src="${safeUrl(article.image)}"
                                alt="${escapeAttribute(article.title)}"
                                loading="lazy"
                                onerror="this.src='${FALLBACK_IMAGE}'"
                            >


                            <span
                                class="card-category"
                            >

                                ${escapeHTML(
                categoryLabel
            )}

                            </span>

                        </div>


                        <div
                            class="card-body"
                        >

                            <h3>

                                ${escapeHTML(
                article.title
            )}

                            </h3>


                            <p>

                                ${escapeHTML(

                article.description ||

                getShortText(
                    article.content
                ) ||

                "Open the story to read more."

            )}

                            </p>


                            <div
                                class="card-meta"
                            >

                                <span
                                    class="card-source"
                                >

                                    <span
                                        class="source-dot"
                                    >
                                        N
                                    </span>


                                    <span>

                                        ${escapeHTML(
                article.source
            )}

                                    </span>

                                </span>


                                <span>

                                    ◷

                                    ${formatRelativeTime(
                article.publishedAt
            )}

                                </span>

                            </div>


                            <span
                                class="read-story"
                            >

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

function openArticle(
    id
) {

    window.location.href =

        `article.html?id=${encodeURIComponent(id)}`;

}


/* =========================================================
   API ERROR
========================================================= */

async function readApiError(
    response
) {

    try {

        const data =
            await response.json();


        if (
            data.errors &&
            Array.isArray(
                data.errors
            )
        ) {

            return data.errors.join(
                " "
            );

        }


        if (
            data.message
        ) {

            return data.message;

        }


    } catch (_) {

        /*
         * Ignore JSON parsing errors.
         */

    }


    if (
        response.status === 401
    ) {

        return (
            "Invalid GNews API key. Check js/config.js."
        );

    }


    if (
        response.status === 403
    ) {

        return (
            "GNews API access was denied. Check your API plan and key."
        );

    }


    if (
        response.status === 429
    ) {

        return (
            "Too many API requests. Please wait and try again."
        );

    }


    return (

        `News API request failed (${response.status}).`

    );

}


/* =========================================================
   RENDER ERROR
========================================================= */

function renderError(
    container,
    message
) {

    if (!container)
        return;


    container.innerHTML = `

        <div class="error-box">

            Unable to load this section.

            <br>

            <small>

                ${escapeHTML(
        message ||
        "Unknown API error."
    )}

            </small>

        </div>

    `;

}


/* =========================================================
   CONFIGURATION ERROR
========================================================= */

function showConfigurationError() {

    const hero =
        document.getElementById(
            "heroMain"
        );


    if (hero) {

        hero.innerHTML = `

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

    }


    const sections = [

        "indiaGrid",

        "businessGrid",

        "technologyGrid",

        "sportsGrid"

    ];


    sections.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (!element)
                return;


            element.innerHTML = `

                <div class="error-box">

                    Add your GNews API key in
                    <b>js/config.js</b>.

                </div>

            `;

        }
    );

}


/* =========================================================
   GLOBAL ERROR
========================================================= */

function showGlobalError(
    message
) {

    const hero =
        document.getElementById(
            "heroMain"
        );


    if (hero) {

        hero.innerHTML = `

            <div class="hero-loading">

                <strong>

                    Unable to load news

                </strong>


                <span>

                    ${escapeHTML(
            message
        )}

                </span>


                <button
                    class="read-btn"
                    onclick="location.reload()"
                >

                    Retry →

                </button>

            </div>

        `;

    }


    /*
     * Render errors without
     * assuming elements exist.
     */

    renderError(

        document.getElementById(
            "indiaGrid"
        ),

        message

    );


    renderError(

        document.getElementById(
            "businessGrid"
        ),

        message

    );


    renderError(

        document.getElementById(
            "technologyGrid"
        ),

        message

    );


    renderError(

        document.getElementById(
            "sportsGrid"
        ),

        message

    );

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToSection(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element)
        return;


    element.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}


/* =========================================================
   RELATIVE TIME
========================================================= */

function formatRelativeTime(
    dateString
) {

    if (!dateString)
        return "Recently";


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Recently";

    }


    const seconds =

        Math.floor(

            (
                Date.now() -
                date.getTime()
            ) / 1000

        );


    if (
        seconds < 60
    ) {

        return "just now";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (
        minutes < 60
    ) {

        return `${minutes} min${minutes === 1
                ? ""
                : "s"
            } ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (
        hours < 24
    ) {

        return `${hours} hour${hours === 1
                ? ""
                : "s"
            } ago`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (
        days < 7
    ) {

        return `${days} day${days === 1
                ? ""
                : "s"
            } ago`;

    }


    return date.toLocaleDateString(

        "en-IN",

        {

            day:
                "numeric",

            month:
                "short",

            year:
                "numeric"

        }

    );

}


/* =========================================================
   SHORT TEXT
========================================================= */

function getShortText(
    text
) {

    if (!text)
        return "";


    return String(text)

        .replace(
            /\s+/g,
            " "
        )

        .replace(
            /\[\+\d+ chars\]$/i,
            ""
        )

        .trim()

        .slice(
            0,
            220
        );

}


/* =========================================================
   SAFE URL
========================================================= */

function safeUrl(
    url
) {

    try {

        const parsed =
            new URL(
                url
            );


        if (

            parsed.protocol ===
            "https:" ||

            parsed.protocol ===
            "http:"

        ) {

            return parsed.href
                .replace(
                    /'/g,
                    "%27"
                );

        }

    } catch (_) {

        /*
         * Invalid URL.
         */

    }


    return FALLBACK_IMAGE;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        );

}


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast)
        return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.__toastTimer
    );


    window.__toastTimer =

        setTimeout(

            () => {

                toast.classList.remove(
                    "show"
                );

            },

            3500

        );

}

window.openArticle =
    openArticle;