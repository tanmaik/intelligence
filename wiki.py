from crawl import crawl
from process import process_links
import threading
import time
from crawl import get_queue
from queue import Empty

def run_processor(num_threads):
    start_time = time.time()
    
    processor_threads = []
    for i in range(num_threads):
        thread = threading.Thread(
            target=process_links,
            daemon=True,
            name=f"Processor-{i+1}"
        )
        thread.start()
        processor_threads.append(thread)
    
    print(f"Started {num_threads} processor threads")
        
    try:
        end_time = time.time()
        duration = end_time - start_time
        return duration
    except KeyboardInterrupt:
        print("\nBenchmark interrupted...")
        return None

if __name__ == "__main__":
    run_processor(32)
    
    crawl(start_url="https://en.wikipedia.org/wiki/United_States")
    print("starting timer")
    start_time = time.time()
    while get_queue().qsize() > 0:
        pass
    end_time = time.time()
    duration = end_time - start_time
    print(f"time taken: {duration:.2f} seconds")
    
