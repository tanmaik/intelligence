<h1 align="center" style="border-bottom: none">
    <a href="https://perceptronlabs.ai" target="_blank">
        <img alt="Perceptron Pulse" src="/documentation/images/pulse-logo.svg">
    </a><br>Pulse
</h1>

<p align="center">Visit <a href="https://perceptronlabs.ai" target="_blank">perceptronlabs.ai</a> for full documentation, examples, and guides.</p>

<div align="center">

[![CI](https://github.com/tanmaik/pulse/actions/workflows/main.yml/badge.svg)](https://github.com/tanmaik/pulse/actions/workflows/main.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/tanmaik/pulse.svg?maxAge=604800)][hub]
[![Go Report Card](https://goreportcard.com/badge/github.com/tanmaik/pulse)](https://goreportcard.com/report/github.com/tanmaik/pulse)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/486/badge)](https://bestpractices.coreinfrastructure.org/projects/486)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/tanmaik/pulse)

</div>

Pulse is an open-source project by [Perceptron Labs](https://perceptronlabs.ai) that streams, stores, and tracks real-time Wikipedia edit data. It connects to Wikimedia's live stream, processes edit events, and provides APIs for querying historical data over various time intervals.

The core features of Pulse include:

- **Real-time ingestion of Wikipedia edits** directly into a PostgreSQL database.
- **Customizable time-interval queries** (last 1 hr, 3 hrs, 6 hrs, 12 hrs, and 24 hrs).
- Built-in **Express API** for querying edit data.
- **Prisma ORM** for seamless database interaction.
- **Next.js frontend** with Tailwind CSS for quick visualization and UI development.
- **Go-based ingestion engine** for low-latency event streaming and processing.

## Architecture overview

Pulse consists of the following key components:

- **Engine (Go)** – Streams and processes edit data from Wikimedia.
- **Web (Next.js)** – Frontend built with Tailwind and Next.js.
- **API (Express)** – API server for fetching historical edit data from PostgreSQL.
- **Database (PostgreSQL)** – Stores real-time edits with Prisma ORM integration.

## Install

There are several ways to get started with Pulse.

### Precompiled binaries

Precompiled binaries for released versions are available in the
[_Releases_ section](https://github.com/tanmaik/pulse/releases) on GitHub.

Download and extract the latest release, and run the following command:

```bash
./pulse
```

````

### Docker

A pre-built Docker image is available:

```bash
docker run --name pulse -d -p 8080:8080 tanmaik/pulse
```

The API will now be reachable at <http://localhost:8080/>.

### Building from source

To build Pulse from source, you need:

- Go [version 1.22 or greater](https://golang.org/doc/install).
- NodeJS [version 20 or greater](https://nodejs.org/).
- Bun [version 1.0 or greater](https://bun.sh/).

Clone the repository:

```bash
git clone https://github.com/tanmaik/pulse.git
cd pulse
```

Then build and run:

```bash
make build
./pulse
```

### Development

For development, use Bun to install dependencies and start the server:

```bash
bun install
bun dev
```

## Running Tests

Pulse uses Jest and Supertest for testing. Run tests with:

```bash
bun test
```

## Prisma Database

Ensure you have PostgreSQL running locally. Update `.env` with your database URL:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/pulsedb
```

Then, push Prisma schema:

```bash
bunx prisma db push
```

## API Endpoints

- **GET** `/edits` – Fetch all edits.
- **GET** `/edits/24hrs` – Fetch edits from the last 24 hours.
- **GET** `/edits/12hrs` – Fetch edits from the last 12 hours.
- **GET** `/edits/6hrs` – Fetch edits from the last 6 hours.
- **GET** `/edits/3hrs` – Fetch edits from the last 3 hours.
- **GET** `/edits/1hr` – Fetch edits from the last hour.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/tanmaik/pulse/blob/main/CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0, see [LICENSE](https://github.com/tanmaik/pulse/blob/main/LICENSE).

[hub]: https://hub.docker.com/r/tanmaik/pulse
````
