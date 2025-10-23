# Taleemabad Data Portal

A comprehensive data request management system that streamlines data workflows for educational organizations. Built with modern web technologies, it enables team leads to submit data requests and data analysts to efficiently manage, review, and complete them.

## 🚀 Features

### Core Functionality
- **Request Management**: Submit, track, and manage data requests with full lifecycle support
- **Role-Based Access**: Three distinct user roles (Requester, Data Lead, Analyst) with appropriate permissions
- **Task Management**: Kanban-style task tracking with PERT time estimation
- **Real-time Notifications**: WebSocket-based notifications for status updates and assignments
- **File Attachments**: Secure file upload and management with cloud storage
- **Analytics Dashboard**: Comprehensive insights and reporting for data operations

### User Roles & Permissions
- **Data Requester**: Submit requests, view own requests, track progress
- **Data Lead**: Full system access, assign analysts, set priorities, manage team, analytics access
- **Data Analyst**: View assigned requests, update status, manage tasks, add blockers

### Request Types
- New Dashboard/Report
- Modify Dashboard/Report  
- Ad-hoc Analysis
- Data Extraction
- Data Bug Reports
- BigQuery Access Requests
- Event Tracking
- Metric Changes
- Pipeline Changes
- Recurring Reports

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for state management
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Framer Motion** for animations

### Backend
- **Node.js** with TypeScript
- **Express.js** framework
- **Drizzle ORM** with Neon serverless PostgreSQL
- **Passport.js** for authentication
- **WebSocket** for real-time features
- **Express Session** with PostgreSQL storage

### Database
- **Neon Serverless PostgreSQL** for primary data storage
- **Connection pooling** with `@neondatabase/serverless`
- **Drizzle Kit** for migrations

### External Services
- **EmailJS** for client-side email notifications
- **Brevo** for server-side email services
- **Replit Object Storage** (Google Cloud Storage) for file attachments
- **Uppy** with AWS S3 plugin for file uploads

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon account)
- Email service credentials (EmailJS, Brevo)

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Email Services
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
BREVO_API_KEY=your_brevo_api_key

# Session
SESSION_SECRET=your_session_secret

# Object Storage (Replit)
REPLIT_SIDECAR_ENDPOINT=your_replit_sidecar_endpoint
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abdur92Rehman/Taleemabad_Data_Portal.git
   cd Taleemabad_Data_Portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🏗️ Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   └── lib/           # Utility functions
│   └── index.html
├── server/                # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database configuration
│   ├── storage.ts         # Data access layer
│   ├── emailService.ts    # Email service integration
│   └── websocket.ts       # WebSocket server
├── shared/                # Shared types and schemas
├── migrations/            # Database migrations
└── attached_assets/       # Static assets
```

## 🔐 Authentication & Authorization

### User Onboarding
- **Requesters**: Self-signup with company email validation
- **Analysts**: Invitation-only by Data Lead with secure token setup
- **Data Leads**: Bootstrap for primary Data Lead, additional leads added by existing leads

### Security Features
- Password hashing with Node.js scrypt and per-user salts
- Role-based access control with privilege escalation prevention
- Company email domain validation
- Session management with PostgreSQL persistence

## 📊 Database Schema

### Core Tables
- `users` - User profiles, roles, departments
- `dataRequests` - Request details, status, priority, assignee
- `tasks` - Task tracking with Kanban status and due dates
- `attachments` - File metadata and storage references
- `comments` - Threaded discussions on requests
- `blockers` - Issue tracking for requests
- `notifications` - In-app notification system

### Key Enums
- **Request Status**: `submitted`, `under_review`, `in_progress`, `completed`, `pending_review`
- **Priority Levels**: `P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low`
- **User Roles**: `team_lead`, `data_analyst`, `requester`

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (`250 70% 55%`) for main interactive elements
- **Secondary**: Deep Purple (`270 65% 45%`) for gradients and accents
- **Neutrals**: Dark mode optimized with surface and border colors
- **Semantic**: Success, error, and warning color variants

### Typography
- **Primary Font**: Inter (Google Fonts) for UI and forms
- **Display Font**: Outfit (Google Fonts) for headers
- **Scale**: Responsive typography with consistent spacing

### Components
- Built on **Radix UI** primitives for accessibility
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library for consistency
- Mobile-first responsive design

## 📧 Email & Notifications

### Email Services
- **EmailJS**: Client-side analyst credential delivery
- **Brevo**: Server-side notifications for assignments, status changes, deliveries

### Notification Types
- Request assignments and status changes
- Comment notifications
- Task updates and blockers
- Delivery confirmations

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Configuration
- Set `NODE_ENV=production`
- Configure production database URL
- Set up email service credentials
- Configure object storage endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Abdur Rehman** - Lead Developer
- **Taleemabad** - Educational Technology Organization

## 📞 Support

For support and questions:
- Email: abdur.rehman@taleemabad.com
- GitHub Issues: [Create an issue](https://github.com/Abdur92Rehman/Taleemabad_Data_Portal/issues)

---

**Built with ❤️ for educational data management**
