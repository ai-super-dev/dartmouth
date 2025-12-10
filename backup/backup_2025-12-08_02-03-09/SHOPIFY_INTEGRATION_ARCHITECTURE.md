# Shopify Integration Architecture

**Last Updated**: December 5, 2025  
**Status**: ✅ Complete

---

## Overview

The Shopify integration provides real-time customer and order data within the customer service dashboard, enabling staff to view order history, product details, and tracking information without leaving the ticket view.

---

## Architecture

### Backend (Cloudflare Worker)

**Location**: `packages/worker/src/`

#### 1. Shopify Service
**File**: `services/ShopifyIntegration.ts`

- **GraphQL Client**: Uses Shopify Admin GraphQL API
- **Authentication**: Stored in Cloudflare KV (APP_CONFIG namespace)
- **Endpoints**:
  - `getCustomerByEmail()` - Fetch customer data
  - `getCustomerOrders(customerId, limit)` - Fetch up to 100 orders
  - `getTicketShopifyData(email)` - Combined customer + orders data

#### 2. Shopify Controller
**File**: `controllers/shopify.ts`

- **Routes**:
  - `GET /api/shopify/ticket-data?email=...` - Main endpoint for dashboard
  - `POST /api/integrations/:id/settings` - Save Shopify credentials
  - `POST /api/integrations/:id/test` - Test connection

#### 3. Data Fetched

**Customer Data**:
- Name (firstName, lastName)
- Email
- Phone
- Total spent
- Total orders count
- Last order date
- VIP status (calculated: >$1000 spent)

**Order Data** (per order):
- Order number
- Total price + currency
- Financial status (paid, pending, etc.)
- Fulfillment status (fulfilled, unfulfilled, partial)
- Created/updated dates
- Tracking number, URL, company
- Shipping address

**Line Items** (per product):
- Product ID, Variant ID
- Title, Variant title
- Quantity, Price
- SKU
- Image URL
- **Custom Attributes** (all `_` prefixed fields):
  - `_previewLink` - Artwork preview URL
  - `_cartEditLink` - Cart edit URL
  - `_portalEditLink` - Portal edit URL
  - `_jsonFileLink` - JSON file URL
  - `_dtp` - DTF/DTP type
  - `_dtpId` - Unique DTF ID
  - `_dpi` - Print resolution
  - `_name` - Custom product name
  - `_printAnyway` - Print anyway flag
  - `_requestReview` - Review request flag
  - `_enabledRollingCanvas` - Rolling canvas flag
  - `_canvasSize` - Canvas dimensions (JSON)
  - `_printSize` - Print dimensions (JSON)

---

### Frontend (React Dashboard)

**Location**: `packages/customer-service-dashboard/src/pages/`

#### 1. Shopify Panel Components

**Implemented in**:
- `TicketDetailPage.tsx` - Main email tickets
- `ChatDashboardPage.tsx` - Live chat list/preview
- `ChatTicketDetailPage.tsx` - Live chat full view

**Features**:
- Slide-in panel from right side
- Customer info section
- Order navigation (left/right arrows)
- Clickable/expandable product items
- Tracking info section
- Consistent design across all views

#### 2. Order Navigation

**State Management**:
```typescript
const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
```

**Features**:
- Shows "ORDER 1 OF 21" header
- Left/right arrow buttons
- Disabled states when at first/last order
- Resets to order 1 when:
  - Switching tickets/conversations
  - Opening/closing Shopify panel

#### 3. Product Items Display

**State Management**:
```typescript
const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
```

**Features**:
- Clickable product rows
- Expand/collapse animation
- Chevron icon rotation
- Shows when expanded:
  - Price, SKU, Variant
  - All custom attributes
  - Clickable links (blue underline)
  - Monospace font for technical data

**Link Detection**:
- Any attribute with "Link" or "link" in key name
- Opens in new tab
- Displays as "View →"

---

## Configuration

### Shopify Settings Page

**Location**: `packages/customer-service-dashboard/src/pages/ShopifyIntegrationPage.tsx`

**Tabs**:
1. **Configuration** - API credentials, connection test
2. **Installation Guide** - Step-by-step setup instructions

**Stored in**: Cloudflare KV (APP_CONFIG namespace)
- `shopify_domain` - Store domain (e.g., dtfink.myshopify.com)
- `shopify_access_token` - Admin API access token

**Required Scopes**:
- `read_customers`
- `read_orders`
- `read_products`
- `read_fulfillments`

---

## Data Flow

```
1. Staff opens ticket → Click "Shopify" button
2. Frontend calls: GET /api/shopify/ticket-data?email=customer@example.com
3. Backend:
   a. Fetch credentials from KV storage
   b. Query Shopify GraphQL API for customer
   c. Query Shopify GraphQL API for orders (limit: 100)
   d. Transform and return data
4. Frontend:
   a. Display customer info
   b. Show first order by default
   c. Enable navigation if multiple orders
   d. Render clickable product items
5. Staff clicks product → Expand to show metadata
6. Staff clicks link → Open in new tab
```

---

## Performance

- **API Response Time**: ~500ms (Shopify GraphQL)
- **Caching**: None (real-time data)
- **Order Limit**: 100 orders per customer
- **Line Items Limit**: 50 items per order

---

## Security

- **Credentials Storage**: Cloudflare KV (encrypted at rest)
- **API Access**: Admin API with read-only scopes
- **Authentication**: JWT required for all dashboard endpoints
- **CORS**: Restricted to dashboard domain

---

## Future Enhancements

### Planned Features:
1. **Product Display Configuration**
   - Choose which custom attributes to show
   - Rename/relabel attributes
   - Set display order
   - Format types (link, text, JSON, etc.)

2. **Order Actions**
   - Refund orders from dashboard
   - Update fulfillment status
   - Add order notes

3. **Customer Actions**
   - View full order history (beyond 100)
   - Customer lifetime value metrics
   - Purchase patterns analysis

---

## Troubleshooting

### Common Issues:

1. **"No Shopify data found"**
   - Customer email doesn't match Shopify
   - API credentials incorrect
   - Network timeout

2. **"403 Forbidden"**
   - Invalid access token
   - Missing API scopes
   - Domain mismatch

3. **"Order 1 OF 5" (should be 21)**
   - Backend limit was 5, now fixed to 100
   - Clear browser cache

4. **Custom attributes not showing**
   - Shopify product doesn't have custom properties
   - GraphQL query missing `customAttributes` field

---

## Files Modified

### Backend:
- `packages/worker/src/services/ShopifyIntegration.ts` - Added customAttributes to GraphQL
- `packages/worker/src/controllers/shopify.ts` - Increased order limit to 100

### Frontend:
- `packages/customer-service-dashboard/src/pages/TicketDetailPage.tsx` - Navigation + expandable items
- `packages/customer-service-dashboard/src/pages/ChatDashboardPage.tsx` - Navigation + expandable items
- `packages/customer-service-dashboard/src/pages/ChatTicketDetailPage.tsx` - Navigation + expandable items
- `packages/customer-service-dashboard/src/pages/ShopifyIntegrationPage.tsx` - Configuration UI

---

## Testing

### Manual Test Steps:

1. **Connection Test**:
   - Go to Settings → Integrations → Shopify
   - Click "Test Connection"
   - Should show green checkmark

2. **Customer Lookup**:
   - Open ticket from Shopify customer
   - Click "Shopify" button
   - Should show customer info + orders

3. **Order Navigation**:
   - Click left/right arrows
   - Should cycle through all orders
   - Counter should update

4. **Product Expansion**:
   - Click any product item
   - Should expand with details
   - Links should be clickable

5. **Live Chat Sync**:
   - Open live chat ticket
   - Click "Shopify" button
   - Should match main ticket format

---

## Deployment

**Production URLs**:
- Worker: https://dartmouth-os-worker.dartmouth.workers.dev
- Dashboard: https://dartmouth-os-dashboard.pages.dev

**Deployment Commands**:
```bash
# Backend
cd packages/worker
npx wrangler deploy

# Frontend
cd packages/customer-service-dashboard
npm run build
npx wrangler pages deploy dist --project-name=dartmouth-os-dashboard --commit-dirty=true
```

---

## Support

For issues or questions about the Shopify integration:
1. Check Cloudflare Worker logs: `npx wrangler tail dartmouth-os-worker`
2. Check browser console for frontend errors
3. Verify Shopify API credentials in KV storage
4. Test connection via Settings → Integrations → Shopify

