import os
import requests

#api_key = os.environ.get("API_KEY")
# Example API call (update with your own logic)
#response = requests.get("https://api.example.com/data", headers={"Authorization": f"Bearer {api_key}"})
#data = response.json()
data = "jello"
# Process data and write output to site/output.txt
with open("site/output.txt", "w") as f:
    f.write(str(data))
