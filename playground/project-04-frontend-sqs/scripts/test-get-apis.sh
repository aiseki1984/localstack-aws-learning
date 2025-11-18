#!/bin/bash

# Phase 5: GET API エンドポイントテストスクリプト

set -e

echo "🧪 Phase 5: GET API Endpoints Test"
echo "=================================="
echo ""

# API Gateway URLを取得
API_URL=$(awslocal cloudformation describe-stacks \
  --stack-name Project03Cdk03Stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

if [ -z "$API_URL" ]; then
  echo "❌ Error: Could not retrieve API Gateway URL"
  exit 1
fi

echo "📍 API Gateway URL: $API_URL"
echo ""

# 1️⃣ GET /orders
echo "1️⃣  Testing GET /orders"
echo "-----------------------------------"
RESPONSE=$(curl -s "${API_URL}orders")
echo "$RESPONSE" | jq '.'
ORDER_COUNT=$(echo "$RESPONSE" | jq -r '.count')
echo "✅ Found $ORDER_COUNT orders"
echo ""

# 2️⃣ GET /inventory
echo "2️⃣  Testing GET /inventory"
echo "-----------------------------------"
RESPONSE=$(curl -s "${API_URL}inventory")
echo "$RESPONSE" | jq '.'
INVENTORY_COUNT=$(echo "$RESPONSE" | jq -r '.count')
OUT_OF_STOCK=$(echo "$RESPONSE" | jq -r '.outOfStockCount')
echo "✅ Found $INVENTORY_COUNT products ($OUT_OF_STOCK out of stock)"
echo ""

# 3️⃣ GET /notifications
echo "3️⃣  Testing GET /notifications"
echo "-----------------------------------"
RESPONSE=$(curl -s "${API_URL}notifications")
echo "$RESPONSE" | jq '.'
NOTIFICATION_COUNT=$(echo "$RESPONSE" | jq -r '.count')
echo "✅ Found $NOTIFICATION_COUNT notifications"
echo ""

# 4️⃣ GET /billing
echo "4️⃣  Testing GET /billing"
echo "-----------------------------------"
RESPONSE=$(curl -s "${API_URL}billing")
echo "$RESPONSE" | jq '.'
BILLING_COUNT=$(echo "$RESPONSE" | jq -r '.count')
TOTAL_AMOUNT=$(echo "$RESPONSE" | jq -r '.totalAmount')
echo "✅ Found $BILLING_COUNT billing records (Total: ¥$TOTAL_AMOUNT)"
echo ""

# 5️⃣ GET /dashboard
echo "5️⃣  Testing GET /dashboard"
echo "-----------------------------------"
RESPONSE=$(curl -s "${API_URL}dashboard")
echo "$RESPONSE" | jq '.'
ORDERS_COUNT=$(echo "$RESPONSE" | jq -r '.stats.ordersCount')
INVENTORY_COUNT=$(echo "$RESPONSE" | jq -r '.stats.inventoryCount')
NOTIFICATIONS_COUNT=$(echo "$RESPONSE" | jq -r '.stats.notificationsCount')
BILLING_COUNT=$(echo "$RESPONSE" | jq -r '.stats.billingCount')
OUT_OF_STOCK_COUNT=$(echo "$RESPONSE" | jq -r '.stats.outOfStockCount')
echo "✅ Dashboard Statistics:"
echo "   📦 Orders: $ORDERS_COUNT"
echo "   📋 Inventory: $INVENTORY_COUNT"
echo "   📧 Notifications: $NOTIFICATIONS_COUNT"
echo "   💳 Billing: $BILLING_COUNT"
echo "   ⚠️  Out of Stock: $OUT_OF_STOCK_COUNT"
echo ""

echo "=================================="
echo "✅ All GET API endpoints are working!"
echo "=================================="
