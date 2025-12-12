# Linux Distribution Directory - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from DistroWatch and Linux Mint's download page for their clear information hierarchy and organized download presentation.

## Core Design Principles
- **Technical Clarity**: Present complex distribution data in scannable, organized formats
- **Download Focus**: Make ISO links, torrents, and checksums immediately accessible
- **Dark Theme Efficiency**: Optimize for extended reading sessions with high contrast
- **Information Density**: Balance comprehensive data with visual breathing room

## Typography System
- **Headings**: Ubuntu font family - Bold for h1/h2, Medium for h3/h4
- **Body Text**: Inter - Regular 16px base, Medium for emphasis
- **Code/Technical**: JetBrains Mono for version numbers, checksums, file sizes
- **Hierarchy**: h1 (36px), h2 (28px), h3 (20px), body (16px), small (14px)

## Layout & Spacing
- **Base Unit**: 16px (Tailwind spacing scale: 4, 6, 8, 12, 16)
- **Container**: max-w-7xl with px-6 horizontal padding
- **Card Padding**: p-6 for distribution cards, p-4 for compact elements
- **Vertical Rhythm**: space-y-8 for sections, space-y-4 for related content groups

## Component Library

### Distribution Cards
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Card structure: Logo (64x64), name, description (2-line truncate), base distro badge, desktop environment tags
- Hover state: Subtle lift with shadow elevation
- Click target: Entire card navigates to distribution detail page

### Release Tables
- Tabular format with sticky header: Version | Release Date | LTS Badge | Downloads
- Row hover: Highlight entire row for clarity
- Zebra striping: Subtle alternating row backgrounds for readability
- Responsive: Stack to cards on mobile

### Download Buttons
- Architecture tabs: Pill-style toggle between amd64/arm64
- Primary action: Large "Download ISO" button with file size
- Secondary actions: Smaller torrent/magnet link buttons with icons
- Checksum display: Monospace text in expandable section
- Button hierarchy: ISO (primary color), Torrent (secondary), Checksum (text link)

### News Feed
- Card-based timeline: Article title (bold), source link, timestamp
- Chronological order with date separators
- External link indicators on source URLs
- Compact spacing: space-y-3 between items

### Navigation
- Sticky top navigation with logo, search bar, and primary nav links
- Search: Prominent search input with Lucide search icon, real-time filtering
- Mobile: Hamburger menu with slide-out drawer

## Color Application
- **Primary (#0EA5E9)**: Download buttons, active states, links, badges
- **Secondary (#10B981)**: LTS indicators, success states, torrent links
- **Background (#0F172A)**: Page background
- **Surface (#1E293B)**: Cards, tables, modals, navigation bar
- **Text (#F8FAFC)**: Primary text content
- **Accent (#F59E0B)**: Highlights, warnings, featured distributions
- **Muted Text**: #94A3B8 for secondary information

## Visual Elements
- **Badges**: Rounded-full px-3 py-1 for base distro, desktop environments, LTS status
- **Icons**: Lucide React icons at 20px for UI actions, 16px inline with text
- **Logos**: Distribution logos at 64x64 in cards, 96x96 on detail pages
- **Dividers**: 1px borders using slate-700 for section separation

## Page Layouts

### Home/Browse Page
- Hero: Minimal header with tagline "Direct Download Links for Linux Distributions"
- Distribution grid immediately below with search/filter bar
- Trending/featured section: Highlighted 3-card row at top

### Distribution Detail Page
- Header: Large logo, name, description, official website link
- Release history table with expandable download options per version
- Sidebar: Quick stats (base distro, desktop environments, latest version)

### News Page
- Two-column layout: Main feed (2/3 width), sidebar with filters/categories (1/3 width)
- Pagination or infinite scroll for older entries

## Images
**No hero images required** - This is a utility-focused application where information density takes priority. Distribution logos serve as the primary visual elements throughout the interface.

## Accessibility
- High contrast ratios maintained throughout (WCAG AAA compliant)
- Focus states: 2px sky-blue outline on interactive elements
- Semantic HTML for screen readers
- Keyboard navigation: Tab through cards and tables logically