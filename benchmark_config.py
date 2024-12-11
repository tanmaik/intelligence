from dataclasses import dataclass
from typing import List

@dataclass
class BenchmarkConfig:
    max_concurrent_requests: int
    num_workers: int
    name: str
    max_depth: int = 2
    root_url: str = "https://en.wikipedia.org/wiki/Python_(programming_language)"

# Define different test scenarios
CONFIGURATIONS = [
    BenchmarkConfig(max_concurrent_requests=5, num_workers=5, name="Small Scale"),
    BenchmarkConfig(max_concurrent_requests=10, num_workers=10, name="Medium Scale"),
    BenchmarkConfig(max_concurrent_requests=25, num_workers=25, name="Large Scale"),
    BenchmarkConfig(max_concurrent_requests=50, num_workers=50, name="Extra Large Scale"),
    # Test different worker to request ratios
    BenchmarkConfig(max_concurrent_requests=10, num_workers=5, name="More Requests Than Workers"),
    BenchmarkConfig(max_concurrent_requests=5, num_workers=10, name="More Workers Than Requests"),
]

# Number of times to repeat each test for statistical significance
NUM_REPETITIONS = 3 