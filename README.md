# 🎸 Gear Tracker

A comprehensive web application for tracking music gear flipping and reselling inventory. Built with Vue.js, Node.js, Express, and PostgreSQL.

## Features

- **User Authentication** - Secure registration and login with JWT tokens
- **Inventory Management** - Track owned and sold items with detailed information
- **Categories** - Organize items into custom categories with colors
- **Financial Tracking** - Record purchase prices, sale prices, and additional costs (repairs, shipping, etc.)
- **Status Tracking** - Mark items as "owned" or "sold"
- **Advanced Filtering** - Search and filter items by status, category, price range, and more
- **Quick Add Flow** - Add items quickly with minimal information, fill in details later
- **Dashboard** - View inventory summary, total investment, revenue, and profit/loss
- **Photos & Files** - Photos, receipts and PDFs on items and bundles, stored in brew-bucket. Photos are resized (and stripped of EXIF/GPS) in the browser before upload
- **Bundles** - Buy lots for one price and split the cost evenly or by value; sell several items as one lot
- **Keep vs Flip** - Mark keepers and track their estimated value alongside cost basis
- **Listings & Fees** - Listing platform, link and date (with a 60+ day stale view); sale fees and shipping so profit is net
- **Nightly Backups** - pg_dump streamed to brew-bucket's backups bucket
- **Responsive Design** - Works on desktop and mobile devices, light and dark

## Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Axios** - HTTP client
- **Vite** - Build tool

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Sequelize** - ORM for PostgreSQL
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Request validation

### Database
- **PostgreSQL 16** - Relational database

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server for frontend

## Getting Started

### Prerequisites

- Node.js 20+ (for local development)
- Docker and Docker Compose (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gear-tracker
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Backend (`backend/.env`):
   ```env
   PORT=3000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gear_tracker
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret_key
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start PostgreSQL** (using Docker)
   ```bash
   docker run -d \
     --name gear-tracker-db \
     -e POSTGRES_DB=gear_tracker \
     -e POSTGRES_PASSWORD=your_password \
     -p 5432:5432 \
     postgres:16-alpine
   ```

5. **Run the development servers**
   ```bash
   npm run dev
   ```
   
   This starts:
   - Backend API on http://localhost:3000
   - Frontend on http://localhost:5173

### Docker Deployment (NAS)

1. **Configure environment variables**
   
   Copy `.env.docker` and edit with your settings:
   ```bash
   cp .env.docker .env
   nano .env
   ```
   
   Update these values:
   - `DB_PASSWORD` - Secure database password
   - `JWT_SECRET` - Random secret key for JWT tokens
   - `CORS_ORIGIN` - Your NAS IP (e.g., http://192.168.1.100)
   - `VITE_API_URL` - API endpoint (e.g., http://192.168.1.100:3000/api)

2. **Build and start the containers**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://your-nas-ip
   - Backend API: http://your-nas-ip:3000
   - Database: localhost:5432 (from NAS)

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

5. **Stop the application**
   ```bash
   docker-compose down
   ```

### Configuration (backend env)

| Variable | Purpose |
|---|---|
| `APP_TIMEZONE` | Owner's timezone (default `America/Chicago`) — decides "today" and the backup hour |
| `ALLOW_REGISTRATION` | Sign-up closes after the first account; `true` reopens it |
| `BREW_BUCKET_URL` / `BREW_BUCKET_KEY` | File storage. Key needs read + write + delete, restricted to the uploads bucket. Without these, uploads return 501 and the rest of the app works |
| `BREW_BUCKET_BUCKET` / `BREW_BUCKET_PREFIX` | Default `uploads` / `gear-tracker`. Keys are `<prefix>/<userId>/<attachmentId>/<file>` |
| `ATTACHMENT_MAX_MB` | Per-file limit (default 25). nginx allows 30m — raise both together |
| `BACKUP_BREW_BUCKET_KEY` | Nightly backups. Separate key: read + write on the backups bucket only |
| `BACKUP_HOUR` | Local hour for the nightly dump (default 3) |

### Database Migrations

Schema changes are numbered SQL files in `backend/src/db/migrations/`, applied in order on every boot and recorded in `schema_migrations`. `sequelize.sync()` still creates missing tables first (fresh installs). To add a change, add the next `NNN_name.sql` — make it idempotent where it touches columns sync may already have created. Run without starting the API: `npm run migrate` in `backend/`.

### Database Management

**Backup database:**
```bash
chmod +x database/backup.sh
./database/backup.sh
```

**Restore database:**
```bash
chmod +x database/restore.sh
./database/restore.sh backups/gear_tracker_backup_YYYYMMDD_HHMMSS.sql
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires auth)

### Item Endpoints

- `GET /api/items` - Get all items with filtering. Every item includes `costing` (cost basis, sale, fees, profit, ROI, days held/listed) and `coverPhoto`
  - Query params: `status` (comma-separated ok), `categoryId` (`none` for uncategorized), `intent`, `bundleId`, `listedBefore`, `search`, `sortBy` (`date`, `cost`, `name`, `createdAt`, `updatedAt`, `listedAt`), `sortOrder`, `page`, `limit`
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/stats/summary` - Dashboard numbers by status, keepers, stale listings
- `GET /api/items/stats/detail` - Every item with costing, for charts

### Bundle Endpoints

- `GET /api/bundles`, `GET /api/bundles/:id` (items with costing, stats, attachments), `POST`, `PUT`, `DELETE` (empty bundles only)
- `POST /api/bundles/:id/rebalance` - Weight each item's share of the cost by its sale/asking price
- `DELETE /api/bundles/:id/rebalance` - Back to an even split

### Attachment Endpoints

- `POST /api/items/:id/attachments`, `POST /api/bundles/:id/attachments` - multipart: `kind` (photo|document), `caption`, `width`, `height`, `file`, optional `thumb`
- `PATCH /api/attachments/:id` - `{ caption }`
- `POST /api/attachments/reorder` - `{ ids }` (first photo is the cover)
- `DELETE /api/attachments/:id`
- `GET /api/files/:id/:variant` - `original` | `thumb` | `download`; signed URLs come back on every attachment, no auth header needed

### Data Endpoints

- `GET /api/data/export`, `POST /api/data/import`
- `GET /api/data/backups`, `POST /api/data/backups` - owner account only

### Category Endpoints

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Additional Cost Endpoints

- `GET /api/costs/item/:itemId` - Get all costs for an item
- `POST /api/costs` - Create additional cost
- `PUT /api/costs/:id` - Update cost
- `DELETE /api/costs/:id` - Delete cost

## Database Schema

### Users Table
- id (UUID, PK)
- email (String, unique)
- password (String, hashed)
- username (String, unique)
- firstName (String, optional)
- lastName (String, optional)
- isActive (Boolean)
- timestamps

### Items Table
- id (UUID, PK)
- userId (UUID, FK)
- categoryId (UUID, FK, optional)
- name (String)
- description (Text, optional)
- brand (String, optional)
- model (String, optional)
- serialNumber (String, optional)
- condition (String, optional)
- status (Enum: 'owned', 'sold')
- purchasePrice (Decimal)
- purchaseDate (Date, optional)
- purchaseLocation (String, optional)
- salePrice (Decimal, optional)
- saleDate (Date, optional)
- saleLocation (String, optional)
- notes (Text, optional)
- images (Array, optional)
- metafields (JSONB, optional)
- timestamps

### Categories Table
- id (UUID, PK)
- userId (UUID, FK)
- name (String)
- description (Text, optional)
- color (String)
- timestamps

### Additional Costs Table
- id (UUID, PK)
- itemId (UUID, FK)
- description (String)
- amount (Decimal)
- date (Date)
- type (String, optional)
- notes (Text, optional)
- timestamps

## Features Explained

### Metafields
Items have a flexible `metafields` JSONB column that allows you to store any custom key-value data without modifying the schema.

### Additional Costs
Track repairs, shipping, parts, and any other incurred costs per item. These are included in profit/loss calculations.

### Quick Add Flow
Create items with just a name, then edit later to add full details. Perfect for quickly cataloging new acquisitions.

### Advanced Filtering
- Search by name, brand, model, or description
- Filter by status (owned/sold)
- Filter by category
- Filter by price range
- Sort by multiple fields
- Pagination support

### Statistics Dashboard
- Total owned items and their value
- Total sold items and revenue
- Profit/loss calculations including additional costs
- Visual summary of your flipping business

## Security Considerations

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- CORS configured for your domain
- Environment variables for sensitive data
- Input validation on all endpoints
- SQL injection protection via Sequelize ORM

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to use and modify for your own needs.

## Support

For issues or questions, please open an issue on the repository.

---

Happy flipping! 🎸🎹🎤
