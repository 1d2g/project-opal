import feedparser
import json
import re
from datetime import datetime, timedelta

# List of RSS feed URLs for reputable financial news sources
RSS_FEEDS = [
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",  # The Wall Street Journal - Markets
    "https://ft.com/rss/home",  # Financial Times - Home (general news)
    "https://feeds.bloomberg.com/markets/news.rss",  # Bloomberg - Markets
    "https://www.economist.com/finance-and-economics/",  # The Economist - Finance & Economics
]

# Load company data from sp500_companies.json
def load_companies(file_path="scripts/sp500_companies.json"):
    with open(file_path, "r") as f:
        return json.load(f)

# Strict M&A keywords for filtering
PRIMARY_MNA_TERMS = ["merger", "acquisition", "takeover", "deal", "buyout", "acquires", "merges"]

def is_mna_relevant(title, summary):
    text = (title + " " + summary).lower()
    
    for term in PRIMARY_MNA_TERMS:
        if term in text:
            return True
    return False

# List of symbols that are also common English words, requiring full name match
COMMON_WORD_SYMBOLS = ["A", "ALL", "ARE", "HAS", "IT", "MO", "ON", "SO", "T", "WM", 
                       "AMP", "KEY", "NOW", "PM", "MS", "CAT", "COST", "TAP", "HUM"]

def monitor_news():
    companies = load_companies()
    
    # Load existing articles
    existing_articles = []
    try:
        with open("site/news_summary.json", "r") as f:
            existing_articles = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing_articles = []

    # No date-based filtering, keep all existing articles
    fresh_existing_articles = existing_articles

    newly_fetched_articles = []

    for feed_url in RSS_FEEDS:
        print(f"Fetching feed from: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries:
            title = entry.title if hasattr(entry, 'title') else ''
            summary = entry.summary if hasattr(entry, 'summary') else ''
            link = entry.link if hasattr(entry, 'link') else ''
            published_date = entry.published if hasattr(entry, 'published') else ''

            # Try to parse date, default to current if not available or invalid
            try:
                # feedparser dates are often in RFC 822 or ISO 8601 format
                # We'll try to parse it and then format to YYYY-MM-DD
                dt_object = datetime.strptime(published_date, '%a, %d %b %Y %H:%M:%S %z')
                formatted_date = dt_object.strftime('%Y-%m-%d')
            except ValueError:
                try:
                    dt_object = datetime.fromisoformat(published_date.replace('Z', '+00:00'))
                    formatted_date = dt_object.strftime('%Y-%m-%d')
                except ValueError:
                    formatted_date = datetime.now().strftime('%Y-%m-%d') # Default to today

            # Check for company names or symbols in title or summary
            company_found_in_article = False
            found_company_ticker = None
            found_company_name = None

            text = (title + " " + summary).lower()

            for company_obj in companies: # Iterate through each company
                name = company_obj["name"]
                symbol = company_obj["symbol"]

                # Prioritize matching full company name
                if re.search(r'\b' + re.escape(name.lower()) + r'\b', text):
                    found_company_ticker = symbol
                    found_company_name = name
                    company_found_in_article = True
                    break

                # If full name not found, try matching symbol
                # Only match symbol if it's NOT in COMMON_WORD_SYMBOLS
                if not company_found_in_article and symbol not in COMMON_WORD_SYMBOLS:
                    if re.search(r'\b' + re.escape(symbol.lower()) + r'\b', text):
                        found_company_ticker = symbol
                        found_company_name = name
                        company_found_in_article = True
                        break

            mna_relevant = is_mna_relevant(title, summary)

            if found_company_ticker and mna_relevant:
                article = {
                    "ticker": found_company_ticker,
                    "company_name": found_company_name,
                    "title": title,
                    "url": link,
                    "published_at": formatted_date,
                    "source": feed.feed.title if hasattr(feed.feed, 'title') else 'Unknown Source',
                    "summary": summary
                }
                newly_fetched_articles.append(article)
    
    # Combine and Deduplicate articles
    all_articles = fresh_existing_articles + newly_fetched_articles
    unique_articles = {article["url"]: article for article in all_articles}.values()
    
    # Sort by date (newest first)
    sorted_articles = sorted(list(unique_articles), key=lambda x: x.get("published_at", ""), reverse=True)

    # Limit to 25 articles
    final_articles = sorted_articles[:25]

    # Save news to json file
    with open("site/news_summary.json", "w") as f:
        json.dump(final_articles, f, indent=4)

    print(f"Successfully fetched and saved {len(final_articles)} news articles.")

if __name__ == "__main__":
    monitor_news()