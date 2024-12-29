from tqdm import tqdm
import requests
import dash
from dash import dcc, html
from dash.dependencies import Input, Output
import plotly.express as px
import pandas as pd
from collections import defaultdict

app = dash.Dash(__name__)
server = app.server  # For potential deployment usage

app.layout = html.Div([
    html.H1("Wikipedia Edit Volume - Interactive Graph"),
    html.Label("Granularity:"),
    dcc.Dropdown(
        id="granularity",
        options=[
            {"label": "1 minute", "value": "1m"},
            {"label": "5 minutes", "value": "5m"},
            {"label": "1 hour", "value": "1h"},
            {"label": "6 hours", "value": "6h"},
        ],
        value="1m",  # default
    ),
    dcc.Graph(id="edit-volume-graph"),
])

@app.callback(
    Output("edit-volume-graph", "figure"),
    [Input("granularity", "value")]
)
def update_graph(granularity):
    """
    1. Fetch data from the Go server (http://localhost:8000/analytics?granularity=...).
    2. Group by StartTime & Article, pick top 5 articles for each time bucket.
    3. Plot an interactive line chart with Plotly.
    """
    url = f"http://localhost:8000/analytics?granularity={granularity}"
    try:
        print("Fetching data from analytics endpoint...")
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()  # e.g. [{ "startTime": "...", "article": "...", "editVolume": ... }, ...]
        print(f"Fetched {len(data)} rows from analytics endpoint")
    except Exception as e:
        print(f"Error fetching data: {e}")
        # Return a blank figure with an error message
        return px.line(title="Error fetching data from analytics endpoint")

    # Group by startTime -> store (article, volume) pairs
    grouped = defaultdict(list)
    for row in tqdm(data):
        st = row.get("startTime")
        article = row.get("article")
        volume = row.get("editVolume", 0)
        grouped[st].append((article, volume))

    # For each startTime, pick top 5 articles
    final_rows = []
    for st, articles in tqdm(grouped.items()):
        articles_sorted = sorted(articles, key=lambda x: x[1], reverse=True)
        top_five = articles_sorted[:5]
        for (art, vol) in top_five:
            final_rows.append({
                "startTime": st,
                "article": art,
                "volume": vol
            })

    # Convert to DataFrame
    df = pd.DataFrame(final_rows)
    if not df.empty:
        # Convert startTime to real datetimes so Plotly gives a proper time axis
        df["startTime"] = pd.to_datetime(df["startTime"], utc=True, errors="coerce")

    # Create an interactive line chart, one line per article
    fig = px.line(
        df,
        x="startTime",
        y="volume",
        color="article",
        markers=True,
        title=f"Top 5 Articles by Edit Volume ({granularity} buckets)"
    )
    # Show a range slider at the bottom for time-based zooming
    fig.update_xaxes(rangeslider_visible=True)

    return fig

if __name__ == "__main__":
    # Runs on port 3000 -> go to http://localhost:3000
    app.run_server(debug=True, port=3000)

