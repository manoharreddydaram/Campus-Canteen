export type UserRole = 'student' | 'canteen_staff' | 'canteen_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  rollNumber?: string;
  department?: string;
}

export type MenuCategory =
  | 'breakfast'
  | 'lunch'
  | 'snacks'
  | 'beverages'
  | 'dinner'
  | 'specials';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageURL: string;
  available: boolean;
  preparationTime: number; // minutes
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'placed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  tokenNumber: number;
  paymentMode: 'pay_at_pickup';
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  menuItemIds: string[];
  createdAt: Date;
}

export interface DemandPrediction {
  id: string;
  date: string; // YYYY-MM-DD
  predictions: {
    menuItemId: string;
    itemName: string;
    predictedQuantity: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  }[];
  generatedAt: Date;
  generatedBy: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageURL: string;
}

export interface DashboardStats {
  totalOrdersToday: number;
  revenueToday: number;
  pendingOrders: number;
  topItems: { name: string; count: number }[];
}
