import asyncio
import aiohttp
from aiohttp import ClientSession
from urllib.parse import urlparse, unquote, urljoin
from bs4 import BeautifulSoup
from collections import defaultdict
import time



# Constants
WIKIPEDIA_BASE_URL = "https://en.wikipedia.org"
WIKIPEDIA_PREFIX = "/wiki/"

def parse_wikipedia_title(url):
    """
    Extracts the Wikipedia page title from a given URL.
    
    Args:
        url (str): The full URL of the Wikipedia page.
        
    Returns:
        str: The title of the Wikipedia page.
    """
    parsed_url = urlparse(url)
    if 'wikipedia.org' not in parsed_url.netloc:
        raise ValueError("URL provided is not a Wikipedia URL.")
    path = parsed_url.path
    if not path.startswith(WIKIPEDIA_PREFIX):
        raise ValueError("URL does not point to a valid Wikipedia article.")
    title = path[len(WIKIPEDIA_PREFIX):]
    return unquote(title)

def extract_article_links(html_content):
    """
    Extracts valid Wikipedia article links from the HTML content of a page.
    
    Args:
        html_content (str): HTML content of the Wikipedia page.
        
    Returns:
        set: A set of article titles linked from the page.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    links = set()
    
    # Find all anchor tags within the content text
    for link in soup.find_all('a', href=True):
        href = link['href']
        # Check if the link is a valid Wikipedia article link
        if href.startswith(WIKIPEDIA_PREFIX):
            # Exclude links with ':' to avoid special pages (e.g., Category:, File:, etc.)
            if ':' in href[len(WIKIPEDIA_PREFIX):]:
                continue
            # Exclude fragment-only links
            if '#' in href:
                href = href.split('#')[0]
            title = href[len(WIKIPEDIA_PREFIX):]
            if title:
                links.add(unquote(title))
    
    return links

async def fetch(session: ClientSession, url: str, semaphore: asyncio.Semaphore, max_retries=3):
    """
    Asynchronously fetches the HTML content of a given URL with retries.
    
    Args:
        session (ClientSession): The aiohttp session object.
        url (str): The URL to fetch.
        semaphore (asyncio.Semaphore): Semaphore to limit concurrent requests.
        max_retries (int): Number of retries for failed requests.
        
    Returns:
        str: HTML content of the page, or None if failed.
    """
    retries = 0
    while retries < max_retries:
        try:
            async with semaphore:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        return await response.text()
                    else:
                        print(f"Failed to fetch {url}: Status {response.status}")
                        return None
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            print(f"Error fetching {url}: {e}. Retrying ({retries+1}/{max_retries})...")
            retries += 1
            await asyncio.sleep(0.5)  # Reduced from 2 seconds to 0.5 seconds
    print(f"Failed to fetch {url} after {max_retries} retries.")
    return None

async def worker(name, session, queue, graph, visited, depth_dict, semaphore, max_depth):
    """
    Worker coroutine to process articles from the queue.
    
    Args:
        name (str): Name of the worker.
        session (ClientSession): The aiohttp session object.
        queue (asyncio.Queue): The queue containing articles to process.
        graph (defaultdict): The graph being built.
        visited (set): Set of already visited articles.
        depth_dict (dict): Dictionary tracking the depth of each article.
        semaphore (asyncio.Semaphore): Semaphore to limit concurrent requests.
        max_depth (int): Maximum depth to crawl.
    """
    while True:
        try:
            current_title = await queue.get()
        except asyncio.CancelledError:
            break

        current_depth = depth_dict[current_title]
        print(f"[Worker {name}] Crawling '{current_title}' at depth {current_depth}")

        if current_depth >= max_depth:
            queue.task_done()
            continue  # Do not crawl further from this node

        url = urljoin(WIKIPEDIA_BASE_URL, f"{WIKIPEDIA_PREFIX}{current_title}")
        html_content = await fetch(session, url, semaphore)

        if html_content:
            linked_titles = extract_article_links(html_content)
            graph[current_title] = linked_titles

            for linked_title in linked_titles:
                if linked_title not in visited:
                    visited.add(linked_title)
                    depth_dict[linked_title] = current_depth + 1
                    await queue.put(linked_title)
        else:
            graph[current_title] = set()

        queue.task_done()
        # Reduced delay between requests
        await asyncio.sleep(0.001)  # Reduced from 0.01 to 0.001 seconds

async def crawl_wikipedia_async(root_url: str, max_depth: int = 5, max_concurrent_requests: int = 10, num_workers: int = 10):
    """
    Asynchronously crawls Wikipedia articles starting from the root URL up to a specified depth.
    
    Args:
        root_url (str): The starting Wikipedia article URL.
        max_depth (int): The maximum depth to crawl.
        max_concurrent_requests (int): The maximum number of concurrent HTTP requests.
        num_workers (int): Number of worker coroutines.
        
    Returns:
        dict: A dictionary representing the graph where keys are article titles and values are sets of linked article titles.
    """
    root_title = parse_wikipedia_title(root_url)
    graph = defaultdict(set)
    visited = set()
    depth_dict = {root_title: 0}
    queue = asyncio.Queue()
    await queue.put(root_title)
    visited.add(root_title)

    semaphore = asyncio.Semaphore(max_concurrent_requests)

    async with aiohttp.ClientSession(headers={'User-Agent': 'WikipediaCrawler/1.0 (https://yourdomain.com)'} ) as session:
        # Start worker tasks
        tasks = []
        for i in range(num_workers):
            task = asyncio.create_task(worker(f"W{i+1}", session, queue, graph, visited, depth_dict, semaphore, max_depth))
            tasks.append(task)

        # Wait until the queue is fully processed
        await queue.join()

        # Cancel worker tasks
        for task in tasks:
            task.cancel()
        # Wait until all worker tasks are cancelled
        await asyncio.gather(*tasks, return_exceptions=True)

    return graph

def print_graph_summary(graph, max_articles=10):
    """
    Prints a summary of the graph.
    
    Args:
        graph (dict): The graph representing Wikipedia articles and their links.
        max_articles (int): Maximum number of articles to print in the summary.
    """
    for idx, (article, links) in enumerate(graph.items()):
        print(f"'{article}' links to {len(links)} articles.")
        if idx + 1 >= max_articles:
            print("...")
            break

async def crawl_with_config(root_url, max_depth, max_concurrent_requests, num_workers):
    start_time = time.time()
    graph = await crawl_wikipedia_async(
        root_url=root_url,
        max_depth=max_depth,
        max_concurrent_requests=max_concurrent_requests,
        num_workers=num_workers
    )
    end_time = time.time()
    return graph, end_time - start_time

async def benchmark():
    root_wikipedia_url = "https://en.wikipedia.org/wiki/Charlottesville,_Virginia"
    max_depth = 2  # Reduced depth for testing
    
    configurations = [
        {"max_concurrent": 1, "workers": 1, "name": "Single worker"},
        {"max_concurrent": 10, "workers": 10, "name": "10 workers"},
        {"max_concurrent": 50, "workers": 50, "name": "50 workers"},
        {"max_concurrent": 100, "workers": 100, "name": "100 workers"},
    ]

    results = []
    for config in configurations:
        print(f"\nTesting configuration: {config['name']}")
        print("=" * 50)
        
        graph, duration = await crawl_with_config(
            root_wikipedia_url,
            max_depth,
            config['max_concurrent'],
            config['workers']
        )
        
        results.append({
            "config": config,
            "duration": duration,
            "articles_crawled": len(graph),
            "total_links": sum(len(links) for links in graph.values()),
            "avg_links_per_article": sum(len(links) for links in graph.values()) / len(graph) if graph else 0
        })

    # Print comparison
    print("\nBenchmark Results:")
    print("=" * 80)
    print(f"{'Configuration':<20} {'Duration (s)':<15} {'Articles':<12} {'Avg Links':<12} {'Links/Sec':<12}")
    print("-" * 80)
    
    for result in results:
        config_name = result['config']['name']
        duration = result['duration']
        articles = result['articles_crawled']
        avg_links = round(result['avg_links_per_article'], 2)
        links_per_sec = round(result['total_links'] / duration, 2)
        
        print(f"{config_name:<20} {duration:<15.2f} {articles:<12} {avg_links:<12.2f} {links_per_sec:<12.2f}")

async def main():
    await benchmark()

if __name__ == "__main__":
    asyncio.run(main())
