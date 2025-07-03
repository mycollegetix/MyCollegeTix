import { Order } from "../types";
import products from "./products";
import dayjs from "dayjs";

const now = dayjs();

const orders: Order[] = [
  {
    id: 23123,
    created_at: now.subtract(1, "hour").toISOString(),
    total: 599.97,
    status: "Confirmed",
    user_id: "1",
    order_items: [
      {
        id: 1,
        order_id: 23123,
        category: "Premium",
        quantity: 2,
        product_id: products[0].id,
        products: products[0],
      },
      {
        id: 2,
        order_id: 23123,
        category: "Student",
        quantity: 1,
        product_id: products[1].id,
        products: products[1],
      },
    ],
  },
  {
    id: 32145,
    created_at: now.subtract(3, "days").toISOString(),
    total: 91.98,
    status: "Delivered",
    user_id: "1",
    order_items: [
      {
        id: 1,
        order_id: 32145,
        category: "General",
        quantity: 2,
        product_id: products[2].id,
        products: products[2],
      },
    ],
  },
  {
    id: 23445,
    created_at: now.subtract(3, "weeks").toISOString(),
    total: 285.97,
    status: "Delivered",
    user_id: "1",
    order_items: [
      {
        id: 1,
        order_id: 23445,
        category: "Student",
        quantity: 1,
        product_id: products[4].id,
        products: products[4],
      },
      {
        id: 2,
        order_id: 23445,
        category: "VIP",
        quantity: 1,
        product_id: products[0].id,
        products: products[0],
      },
      {
        id: 3,
        order_id: 23445,
        category: "General",
        quantity: 1,
        product_id: products[2].id,
        products: products[2],
      },
    ],
  },
];

export default orders;
