# Recurring Invoice Management System

A full-stack web application for managing recurring invoices, built with React, Node.js, TypeScript, and PostgreSQL.

## Project Status

✅ **Phase 1 Complete: Project Setup & Infrastructure**
- Modern TypeScript full-stack architecture
- PostgreSQL database with Prisma ORM
- React frontend with Material-UI
- Express.js backend with security features
- Complete database schema for accounting system

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **Prisma ORM** for database management
- **PostgreSQL** database
- **JWT** authentication (pending)
- Security middleware (Helmet, CORS, Rate Limiting)

### Development Tools
- **TypeScript** configuration for both environments
- **Nodemon** for backend hot reloading
- **Environment variables** for configuration
- Task tracking with markdown files

## Database Schema

Complete schema implemented with the following models:
- **Users** - Admin authentication
- **Clients** - Customer management
- **Orders** - Recurring order definitions
- **Invoices** - Generated invoices
- **Payments** - Payment tracking
- **PaymentReminders** - Automated reminder system
- **EmailTemplates** - Customizable email templates
- **Settings** - System configuration
- **AuditLog** - Activity tracking

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository** (when ready)
```bash
git clone <repository-url>
cd accounting
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend `.env` file:
```
DATABASE_URL="postgresql://username@localhost:5432/accounting_db"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
NODE_ENV=development
```

## Project Structure

```
accounting/
├── backend/
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utility functions
│   │   └── server.ts      # Express server
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   └── App.tsx        # Main app component
│   └── package.json
├── TASKS/                 # Task tracking
└── BUGS/                  # Bug tracking
```

## Features (Planned)

### Core Features
- [x] Project setup and infrastructure
- [ ] User authentication and authorization
- [ ] Client management (CRUD operations)
- [ ] Recurring order management
- [ ] Automated invoice generation
- [ ] Email delivery system
- [ ] Payment tracking
- [ ] Dashboard and reporting

### Advanced Features
- [ ] PDF invoice generation
- [ ] Payment reminders
- [ ] Email templates
- [ ] Audit logging
- [ ] Data export/import
- [ ] Payment gateway integration

## Development Commands

### Backend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## API Endpoints (Planned)

- `GET /health` - Health check ✅
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Generate invoice

## Database

The system uses PostgreSQL with Prisma ORM. The complete schema is defined in `backend/prisma/schema.prisma` with:
- Full relational structure
- Proper indexes and constraints
- Enum types for status management
- JSON fields for flexible data storage

## Next Steps

1. **Phase 2**: Authentication System
   - JWT token management
   - User registration/login
   - Protected routes

2. **Phase 3**: Client & Order Management
   - Client CRUD operations
   - Order creation and management
   - Frequency calculations

3. **Phase 4**: Invoice Generation
   - Automated invoice creation
   - PDF generation
   - Email delivery

## Contributing

This project follows a structured development approach with:
- Task tracking in `TASKS/` directory
- Bug tracking in `BUGS/` directory
- Progressive feature implementation
- Comprehensive testing strategy

## License

MIT License - See LICENSE file for details.

---

**Status**: Phase 1 Complete ✅  
**Next**: Begin authentication system implementation  
**Updated**: 2024-07-24