import feedparser
import json
import re
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import logging
import hashlib

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    """Fetches, filters, and stores M&A-related news articles in Firestore."""
    # --- Firebase Initialization ---
    try:
        # Read Firebase credentials from environment variable (e.g., GitHub Secret)
        firebase_credentials_json = os.environ.get("FIREBASE_CREDENTIALS")
        if not firebase_credentials_json:
            # Fallback for local development: read from local file if env var not set
            local_credentials_path = "scripts/firebase_credentials.json"
            if os.path.exists(local_credentials_path):
                with open(local_credentials_path, 'r') as f:
                    firebase_credentials_json = f.read()
            else:
                raise ValueError("FIREBASE_CREDENTIALS environment variable not set and local file not found.")

        cred = credentials.Certificate(json.loads(firebase_credentials_json))
        firebase_admin.initialize_app(cred, {
            'projectId': 'opal-230c9',
        })
        db = firestore.client()
        logging.info("Successfully initialized Firebase.")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase: {e}")
        return

    companies = load_companies()
    
    newly_fetched_articles = []

    for feed_url in RSS_FEEDS:
        logging.info(f"Fetching feed from: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries:
            title = entry.title if hasattr(entry, 'title') else ''
            summary = entry.summary if hasattr(entry, 'summary') else ''
            link = entry.link if hasattr(entry, 'link') else ''
            published_date = entry.published if hasattr(entry, 'published') else ''

            try:
                dt_object = datetime.strptime(published_date, '%a, %d %b %Y %H:%M:%S %z')
                formatted_date = dt_object.strftime('%Y-%m-%d')
            except ValueError:
                try:
                    dt_object = datetime.fromisoformat(published_date.replace('Z', '+00:00'))
                    formatted_date = dt_object.strftime('%Y-%m-%d')
                except ValueError:
                    formatted_date = datetime.now().strftime('%Y-%m-%d')

            company_found_in_article = False
            found_company_ticker = None
            found_company_name = None

            text = (title + " " + summary).lower()

            for company_obj in companies:
                name = company_obj["name"]
                symbol = company_obj["symbol"]

                if re.search(r'\b' + re.escape(name.lower()) + r'\b', text):
                    found_company_ticker = symbol
                    found_company_name = name
                    company_found_in_article = True
                    break

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
    
    # --- Firestore Integration ---
    if newly_fetched_articles:
        logging.info(f"Writing {len(newly_fetched_articles)} new articles to Firestore...")
        for article in newly_fetched_articles:
            try:
                # Use a hash of the URL as the document ID to create a unique, valid ID
                doc_id = hashlib.sha256(article['url'].encode()).hexdigest()
                db.collection('news').document(doc_id).set(article)
                logging.info(f"Wrote article {article['title']} to Firestore.")
            except Exception as e:
                logging.error(f"Failed to write article {article['title']} to Firestore: {e}")

    logging.info(f"Successfully fetched and processed {len(newly_fetched_articles)} news articles.")

if __name__ == "__main__":
    monitor_news()