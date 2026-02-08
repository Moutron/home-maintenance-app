#!/bin/bash

# Docker Startup Script
# Handles initial setup and startup

set -e

echo "🚀 Starting Home Maintenance App with Docker..."

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "⚠️  .env.docker not found. Creating from example..."
    cp .env.docker.example .env.docker
    echo "📝 Please edit .env.docker with your API keys before continuing"
    echo "   Then run this script again."
    exit 1
fi

# Load environment variables
export $(cat .env.docker | grep -v '^#' | xargs)

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check database health
until docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; do
    echo "   Waiting for database..."
    sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy || docker-compose exec -T app npx prisma migrate dev

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
docker-compose exec -T app npx prisma generate

# Seed database (optional - uncomment if needed)
# echo "🌱 Seeding database..."
# docker-compose exec -T app npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Access the app at: http://localhost:${APP_PORT:-3000}"
echo "📊 View logs with: docker-compose logs -f app"
echo "🛑 Stop with: docker-compose down"
echo ""

