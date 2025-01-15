import os
import time
import json
import requests
from sseclient import SSEClient

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

RETRY_DELAY = 5  # in seconds
BASE_URL = os.getenv("API_BASE_URL", "https://pulse-production-58ab.up.railway.app/")

def post_edit(data):
    """
    Posts edit data to the API endpoint.
    """
    url = f"{BASE_URL}/wiki/edits"
    payload = {
        "title": data.get("title"),
        "title_url": data.get("title_url"),
        "comment": data.get("comment"),
        "user": data.get("user"),
        "bot": data.get("bot"),
        "notify_url": data.get("notify_url"),
        "minor": data.get("minor"),
        "length_old": data.get("length", {}).get("old"),
        "length_new": data.get("length", {}).get("new"),
        "server_url": data.get("server_url"),
    }
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise Exception(f"Failed to post edit: {response.status_code} {response.text}")
    return response.json()

def connect_to_event_stream(url, attempt_count=1, duration=None):
    """
    Connects to the EventStreams feed and processes incoming events.
    """
    while True:
        try:
            print(f"Connecting to the EventStreams feed (attempt {attempt_count})...")
            client = SSEClient(url)
            
            for event in client:
                try:
                    data = json.loads(event.data)
                    if (
                        data.get("server_name") == "en.wikipedia.org" and
                        data.get("type") == "edit" and
                        data.get("title") and
                        ":" not in data.get("title")
                    ):
                        post_edit(data)
                        print(f"edit: {data.get('title')}")
                except Exception as inner_error:
                    print(f"Error processing edit (retrying): {inner_error}")
                    time.sleep(RETRY_DELAY)

        except Exception as outer_error:
            print(f"Error establishing connection: {outer_error}")
            print(f"Retrying connection after {RETRY_DELAY} seconds (attempt {attempt_count + 1})...")
            time.sleep(RETRY_DELAY)
            attempt_count += 1
        
        if duration:
            time.sleep(duration)
            break

def main(duration=None):
    """
    Main entry point for the script.
    """
    print(BASE_URL)
    url = "https://stream.wikimedia.org/v2/stream/recentchange"
    connect_to_event_stream(url, attempt_count=1, duration=duration)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e)
        exit(1)

