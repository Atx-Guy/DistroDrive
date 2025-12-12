# Linux Distribution Directory

## Overview

A web application that provides quick access to direct ISO download links, torrents, and checksums for various Linux distributions. The project is inspired by DistroWatch and Linux Mint's download page, focusing on clear information hierarchy and organized download presentation. It features a dark theme optimized for extended reading sessions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with a custom dark theme design system
- **UI Components**: shadcn/ui component library (Radix UI primitives with custom styling)
- **Typography**: Ubuntu font for headings, Inter for body text, JetBrains Mono for technical content

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build**: Custom build script using esbuild for server bundling, Vite for client

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via drizzle-kit (`db:push` command)

### Key Data Models
- **Distributions**: Linux distros with metadata (name, description, logo, base distro, desktop environments)
- **Releases**: Version releases tied to distributions (version number, release date, LTS status)
- **Downloads**: Download links per release (architecture, ISO URL, torrent URL, checksums, file size)
- **News**: Linux-related news articles with external source links

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema definitions
└── migrations/       # Database migrations
```

### Design Patterns
- **Storage Interface**: `IStorage` interface abstracts database operations, enabling testability
- **API Query Pattern**: React Query with custom `queryFn` that handles authentication and error states
- **Component Composition**: shadcn/ui pattern with composable, accessible components
- **Path Aliases**: `@/` for client source, `@shared/` for shared code

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage (if sessions are needed)

### Third-Party Services
- **Supabase JS Client**: Listed in dependencies (likely for future authentication or additional database features)

### UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting utilities
- **embla-carousel-react**: Carousel functionality
- **react-day-picker**: Calendar/date picker components
- **vaul**: Drawer component
- **cmdk**: Command palette component

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **Replit Plugins**: Development banner and cartographer for Replit environment

### Scripts
- **RSS Feed Fetcher**: `tsx scripts/fetch-news.ts` - Fetches news from DistroWatch, Phoronix, and 9to5Linux RSS feeds and populates the news table. Handles duplicates (based on source URL) and errors gracefully. Can be run as a cron job for automatic updates.