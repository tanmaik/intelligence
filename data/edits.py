import json
import asyncio
import aiohttp

async def main():
    url = "https://stream.wikimedia.org/v2/stream/recentchange"
    
    while True:
        try:
            async with aiohttp.ClientSession() as session:
                print("Connecting to the EventStreams feed...")
                async with session.get(url, headers={'Accept': 'text/event-stream'}) as response:
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            try:
                                data = json.loads(line[6:])
                                if (data.get('server_name') == 'en.wikipedia.org' 
                                    and data.get('type') == 'edit'
                                    and ':' not in data.get('title', '')):
                                    print(f"Edit to {data['title']}")
                            except json.JSONDecodeError as e:
                                print(f"Error decoding JSON: {e}")
                                continue
        except Exception as e:
            print(f"Connection error: {e}")
            print("Attempting to reconnect in 5 seconds...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())


