// E-commerce System API Types

// 注文関連
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  customerEmail: string;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface OrdersResponse {
  orders: Order[];
  count: number;
}

// 在庫関連
export interface InventoryItem {
  productId: string;
  productName: string;
  price: number;
  stock: number;
  lastUpdated?: string;
  lastOrderId?: string;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
  count: number;
  outOfStockCount: number;
}

// 通知関連
export interface Notification {
  notificationId: string;
  orderId: string;
  customerEmail: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  count: number;
}

// 請求関連
export interface BillingRecord {
  billingId: string;
  orderId: string;
  customerId: string;
  customerEmail: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  items: OrderItem[];
  status: string;
  createdAt: string;
}

export interface BillingResponse {
  billingRecords: BillingRecord[];
  count: number;
  totalAmount: number;
}

// ダッシュボード関連
export interface DashboardStats {
  ordersCount: number;
  inventoryCount: number;
  notificationsCount: number;
  billingCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export interface OutOfStockProduct {
  productId: string;
  productName: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentOrders: Order[];
  outOfStockProducts: OutOfStockProduct[];
}

// 注文作成リクエスト
export interface CreateOrderRequest {
  customerId: string;
  customerEmail: string;
  items: OrderItem[];
}

export interface CreateOrderResponse {
  message: string;
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}
