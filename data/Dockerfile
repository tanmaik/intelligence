FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Set working directory
WORKDIR /app

# Copy poetry files
COPY poetry.lock pyproject.toml ./

# Copy source code
COPY workers/ ./workers/

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the wiki-edits worker
CMD ["poetry", "run", "python", "workers/wiki-edits.py"] 