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
- **Responsive Design** - Works on desktop and mobile devices

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

- `GET /api/items` - Get all items with filtering
  - Query params: `status`, `categoryId`, `search`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder`, `page`, `limit`
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/stats/summary` - Get inventory statistics

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
