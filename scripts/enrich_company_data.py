import json
import os
import requests
import pandas as pd
import logging

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Input and Output file paths
CSV_INPUT_FILE = os.path.join("scripts", "constituents.csv")
OUTPUT_FILE = os.path.join("scripts", "sp500_companies.json")

def create_company_list_from_csv(csv_path):
    """
    Reads company data from a local CSV file and formats it for the project.
    Assumes the CSV has 'Symbol', 'Name', and 'CIK' columns.
    """
    try:
        logging.info(f"Reading company data from '{csv_path}'...")
        df = pd.read_csv(csv_path)

        # Verify required columns exist
        required_cols = {'Symbol', 'Security', 'CIK'}
        if not required_cols.issubset(df.columns):
            logging.error(f"CSV file must contain the following columns: {required_cols}. Found: {df.columns.tolist()}")
            return None

        enriched_companies = []
        for index, row in df.iterrows():
            # CIKs from some sources can be floats; ensure they are strings and zero-padded.
            if pd.notna(row['CIK']):
                # Convert to int to remove decimals, then to string for zfill
                cik_val = str(int(row['CIK'])).zfill(10)
                enriched_companies.append({
                    "symbol": row['Symbol'],
                    "name": row['Security'],
                    "cik": cik_val
                })

        # Sort by symbol for consistency
        enriched_companies.sort(key=lambda x: x['symbol'])

        logging.info(f"Successfully processed {len(enriched_companies)} companies from CSV.")
        return enriched_companies

    except FileNotFoundError:
        logging.error(f"The file '{csv_path}' was not found. Please ensure 'constituents.csv' is in the 'scripts' directory.")
        return None
    except Exception as e:
        logging.error(f"An error occurred while processing the CSV file: {e}")
        return None

def main():
    """
    Main function to create the sp500_companies.json file from a local CSV.
    """
    enriched_companies = create_company_list_from_csv(CSV_INPUT_FILE)

    if not enriched_companies:
        logging.error("Failed to create company list. Exiting.")
        return

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(enriched_companies, f, indent=4)

    logging.info(f"Successfully created '{OUTPUT_FILE}' with {len(enriched_companies)} companies.")

if __name__ == "__main__":
    main()