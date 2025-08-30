import os
import requests
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import logging

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")
COMPANIES_FILE = os.path.join("scripts", "sp500_companies.json")
FINNHUB_API_URL = "https://finnhub.io/api/v1/stock/profile2?symbol={ticker}&token={api_key}"

def enrich_and_store_companies():
    """Fetches company profiles from FMP API and stores them in Firestore."""
    if not FINNHUB_API_KEY:
        logging.error("FINNHUB_API_KEY not found in .env file. The script cannot proceed.")
        return

    # --- Firebase Initialization ---
    try:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': 'opal-230c9',
        })
        db = firestore.client()
        logging.info("Successfully initialized Firebase.")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase: {e}")
        return

    try:
        with open(COMPANIES_FILE, "r") as f:
            companies = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.error(f"Could not load or parse {COMPANIES_FILE}: {e}. Cannot proceed.")
        return

    companies_collection = db.collection('companies')

    for company in companies:
        ticker = company.get('symbol')
        if not ticker:
            continue

        try:
            url = FINNHUB_API_URL.format(ticker=ticker, api_key=FINNHUB_API_KEY)
            response = requests.get(url)
            response.raise_for_status()
            profile_data = response.json()

            if profile_data:
                # The API returns a list with one element
                profile = profile_data
                # Add the CIK from our local file to the profile
                profile['cik'] = company.get('cik')
                # Add employees and marketCap if available
                profile['employees'] = profile_data.get('fullTimeEmployees')
                profile['marketCap'] = profile_data.get('marketCap')
                companies_collection.document(ticker).set(profile)
                logging.info(f"Successfully enriched and stored data for {ticker}.")
            else:
                logging.warning(f"No profile data found for {ticker}.")

        except requests.exceptions.RequestException as e:
            logging.error(f"Failed to fetch data for {ticker}: {e}")
        except Exception as e:
            logging.error(f"An unexpected error occurred for {ticker}: {e}")
        finally:
            import time
            time.sleep(1) # Add a 1-second delay to avoid hitting API rate limits

if __name__ == "__main__":
    enrich_and_store_companies()