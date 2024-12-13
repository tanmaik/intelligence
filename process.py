from crawl import get_queue
import time
import threading
from queue import Empty
import requests 
from bs4 import BeautifulSoup
import sys

def process_links():
    queue = get_queue()
    thread_name = threading.current_thread().name
    
    while True:
        try:
            link = queue.get(timeout=5)
            print(f"{thread_name} processing: {link.split('/')[-1]}")

            response = requests.get(link)
            soup = BeautifulSoup(response.text, "html.parser")

            queue.task_done()
        except Empty:
            print(f"{thread_name}: Queue is empty. Waiting for new links...")
            time.sleep(0.2)
            sys.exit()

if __name__ == "__main__":
    process_links()
