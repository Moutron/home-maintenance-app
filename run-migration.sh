#!/bin/bash

# Budget Planning Migration Script
# Run this script to apply the budget planning database migration

echo "🚀 Running Budget Planning Migration..."
echo ""

# Load .env file if it exists
if [ -f .env ]; then
    echo "📝 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found"
    echo "Please set DATABASE_URL environment variable or ensure .env file exists"
    exit 1
fi

echo "✅ Database URL configured"
echo ""

# Check if migration already exists
if [ -d "prisma/migrations/20260107152333_add_budget_planning" ]; then
    echo "📦 Migration file found. Applying with 'migrate deploy'..."
    echo "(This applies pending migrations without using shadow database)"
    ./node_modules/.bin/prisma migrate deploy
    MIGRATE_EXIT_CODE=$?
else
    echo "📦 Creating new migration with 'migrate dev'..."
    ./node_modules/.bin/prisma migrate dev --name add_budget_planning
    MIGRATE_EXIT_CODE=$?
fi

if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📦 Generating Prisma client..."
    ./node_modules/.bin/prisma generate
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 All done! Budget planning features are now ready to use."
        echo ""
        echo "Next steps:"
        echo "1. Start your dev server: npm run dev"
        echo "2. Go to /budget to create your first budget plan"
    else
        echo ""
        echo "⚠️  Migration succeeded but Prisma client generation failed"
        echo "Try running: npx prisma generate"
    fi
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "Troubleshooting:"
    echo "- Make sure your database is running"
    echo "- Verify DATABASE_URL is correct in .env file"
    echo "- Check database permissions"
    exit 1
fi
