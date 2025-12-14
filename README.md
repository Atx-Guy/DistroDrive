# Linux Distribution Directory

A web application that provides quick access to direct ISO download links, torrents, and checksums for various Linux distributions. Inspired by DistroWatch and Linux Mint's download page.

## Features

- **50+ Linux Distributions** - Browse a comprehensive collection of popular Linux distros
- **Direct Download Links** - Access ISO files, torrent links, and checksums
- **Search & Filter** - Find distributions by name, base distro, or desktop environment
- **Distribution Details** - View descriptions, release history, and available architectures
- **News Feed** - Stay updated with Linux-related news from popular sources
- **Dark Theme** - Optimized for extended reading sessions
- **Admin Tools** - Manage releases and fix broken download links

## Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS with custom dark theme
- shadcn/ui component library
- TanStack React Query for data fetching
- Wouter for routing

### Backend
- Node.js with Express
- TypeScript (ESM modules)
- Drizzle ORM with PostgreSQL
- RESTful API design

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities
├── server/               # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── db.ts             # Database connection
├── shared/               # Shared code
│   └── schema.ts         # Drizzle schema definitions
└── scripts/              # Utility scripts
    ├── fetch-news.ts     # RSS feed fetcher
    ├── scrape_iso_links.py   # ISO link scraper
    ├── validate_links.py     # Link validator
    └── fetch_metadata.py     # Logo/description fetcher
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Session encryption key

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

## Scripts

- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
- `npx tsx scripts/fetch-news.ts` - Fetch latest news from RSS feeds
- `python scripts/validate_links.py` - Validate all download links

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/distributions` | List all distributions with latest release |
| GET | `/api/distributions/:id` | Get distribution details with releases |
| GET | `/api/distributions/search?q=` | Search distributions |
| GET | `/api/news` | Get news articles |
| GET | `/api/top-distros` | Get popular distributions |
| POST | `/api/download-clicks/:id` | Record a download click |

## Admin Routes

- `/admin/add-release` - Add new releases with download links
- `/admin/broken-links` - View and fix broken download URLs

## License

MIT
