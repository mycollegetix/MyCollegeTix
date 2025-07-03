export type Product = {
  id: number;
  image: string | null;
  name: string;
  price: number;
  venue: string;
  date: string;
};

export type TicketCategory = "Student" | "General" | "Premium" | "VIP";

export type CartItem = {
  id: string;
  product: Product;
  product_id: number;
  category: TicketCategory;
  quantity: number;
};

export const OrderStatusList: OrderStatus[] = [
  "New",
  "Confirmed",
  "Processing",
  "Delivered",
];

export type OrderStatus = "New" | "Confirmed" | "Processing" | "Delivered";

export type Order = {
  id: number;
  created_at: string;
  total: number;
  user_id: string;
  status: OrderStatus;

  order_items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  product_id: number;
  products: Product;
  order_id: number;
  category: TicketCategory;
  quantity: number;
};

export type Profile = {
  id: string;
  group: string;
};
