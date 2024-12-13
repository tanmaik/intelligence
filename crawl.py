import requests
from bs4 import BeautifulSoup
from queue import Queue


# Create a global queue
wiki_queue = Queue()
visited = set()
def crawl(start_url: str):
    response = requests.get(start_url)
    soup = BeautifulSoup(response.text, "html.parser")
    
    for link in soup.find_all('a'):
        href = link.get('href')
        if href and '/wiki/' in href and ':' not in href:
            wiki_link = "https://en.wikipedia.org" + href
            if wiki_link not in visited:
                visited.add(wiki_link)
                wiki_queue.put(wiki_link)

            print(f"Added to queue: {wiki_link}")
    return wiki_queue

def get_queue():
    return wiki_queue
