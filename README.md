# BharatNews — Dynamic HTML/CSS/JS News Homepage

## Important
News is NOT hard-coded. Headlines, descriptions, images, sources and dates are fetched dynamically from GNews API.

## Setup
1. Get a GNews API key from https://gnews.io/
2. Open `js/config.js`
3. Replace `YOUR_GNEWS_API_KEY` with your key.
4. Run the site through a local web server (recommended), not by double-clicking the HTML file.

Example with VS Code Live Server:
- Open the project in VS Code.
- Install/use Live Server.
- Open `index.html`.

## Files
- index.html — homepage
- article.html — dynamic article detail page
- css/style.css — complete styling
- js/config.js — API configuration
- js/index.js — API fetching and dynamic rendering
