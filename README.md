# APP-ADESOFT

Full-stack application with TypeScript backend and React frontend.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (for the backend database)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

## Configuration

### Backend
1. Copy `.env.example` to `.env` in the backend directory
2. Update the environment variables in `.env` with your database configuration

### Frontend
1. Configure your frontend environment variables if needed

## Development

To run both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:3000

## Available Scripts

- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:backend` - Run only the backend in development mode
- `npm run dev:frontend` - Run only the frontend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm start` - Start the production server (after building)

## Project Structure

- `/backend` - Backend TypeScript/Node.js application
- `/frontend` - Frontend React application
