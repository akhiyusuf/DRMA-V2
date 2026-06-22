import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const PAYPAL_APP_SECRET = process.env.PAYPAL_APP_SECRET || "";
const PAYPAL_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

interface OrderPayload {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  shippingMethod: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize: string;
    selectedColor: string;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
}

// Validate stock for all items before creating an order
// Returns null if all good, or an error message if something is out of stock
async function validateStock(items: OrderPayload["items"]): Promise<string | null> {
  // Collect unique product IDs
  const productIds = [...new Set(items.map(i => i.id))];

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, name, stock_quantity, in_stock, max_per_order")
    .in("id", productIds);

  if (error) {
    // If we can't check stock, allow the order (graceful degradation)
    console.warn("Could not validate stock:", error.message);
    return null;
  }

  if (!products) return null;

  const stockMap = new Map(products.map(p => [p.id, p]));

  for (const item of items) {
    const product = stockMap.get(item.id);
    if (!product) {
      return `"${item.name}" is no longer available.`;
    }
    // -1 or null means stock is not tracked (infinite)
    if (product.stock_quantity !== null && product.stock_quantity >= 0) {
      if (product.stock_quantity === 0) {
        return `"${product.name}" is out of stock.`;
      }
      // Count total quantity requested for this product across all cart items
      const totalRequested = items
        .filter(i => i.id === item.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (totalRequested > product.stock_quantity) {
        return `Not enough stock for "${product.name}". Please reduce the quantity in your cart.`;
      }
    }
    // Enforce max_per_order limit
    const maxPerOrder = product.max_per_order ?? 3;
    const totalForProduct = items
      .filter(i => i.id === item.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (totalForProduct > maxPerOrder) {
      return `Maximum ${maxPerOrder} per order for "${product.name}". You have ${totalForProduct} in your cart.`;
    }
  }

  return null;
}

// Atomically decrement stock using WHERE clause (prevents race conditions)
async function decrementStock(productId: string, quantity: number): Promise<boolean> {
  // First check if stock is tracked for this product
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (!product) return false;

  // -1 or null means stock is not tracked
  if (product.stock_quantity === null || product.stock_quantity === -1) {
    return true; // Always succeeds for untracked products
  }

  if (product.stock_quantity < quantity) {
    return false; // Not enough stock
  }

  const newStock = product.stock_quantity - quantity;

  // Use atomic update — the eq() ensures we're updating the right row
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      stock_quantity: newStock,
      in_stock: newStock > 0,
    })
    .eq("id", productId)
    .eq("stock_quantity", product.stock_quantity); // Optimistic lock

  if (error) {
    console.warn(`Stock decrement failed for ${productId}:`, error.message);
    return false;
  }

  return true;
}

// Save order to Supabase and return the order ID
// Now blocking — stock validation happens BEFORE PayPal order creation
async function saveOrderToDatabase(
  payload: OrderPayload,
  paypalOrderId: string | null,
  mockMode: boolean
): Promise<string | null> {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      id: orderId,
      paypal_order_id: paypalOrderId,
      status: mockMode ? "paid" : "pending",
      customer_email: payload.email,
      customer_first_name: payload.firstName,
      customer_last_name: payload.lastName,
      shipping_address: payload.address,
      shipping_city: payload.city,
      shipping_state: payload.state,
      shipping_zip: payload.zip,
      shipping_method: payload.shippingMethod,
      subtotal: payload.subtotal,
      tax_amount: payload.taxAmount,
      shipping_cost: payload.shippingCost,
      total: payload.total,
    });

  if (orderError) {
    console.error("Failed to save order to Supabase:", orderError.message);
    return null;
  }

  // Save order items
  const orderItems = payload.items.map(item => ({
    order_id: orderId,
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,
    selected_size: item.selectedSize,
    selected_color: item.selectedColor,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Failed to save order items:", itemsError.message);
  }

  // Log initial status
  try {
    await supabaseAdmin
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: mockMode ? "paid" : "pending",
        note: mockMode
          ? "Mock payment — PayPal not configured"
          : "Order placed, awaiting PayPal payment",
      });
  } catch {}

  // Decrement stock aggregated by unique product ID
  // (same product in different sizes/colors should be one decrement with summed quantity)
  const quantityByProduct = new Map<string, number>();
  for (const item of payload.items) {
    quantityByProduct.set(item.id, (quantityByProduct.get(item.id) || 0) + item.quantity);
  }
  for (const [productId, totalQty] of quantityByProduct) {
    const success = await decrementStock(productId, totalQty);
    if (!success) {
      console.warn(`Stock decrement failed for product ${productId}, quantity ${totalQty}`);
    }
  }

  return orderId;
}

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
    throw new Error(
      "PayPal credentials not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_APP_SECRET in .env.local"
    );
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_APP_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get PayPal access token");
  }
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const payload: OrderPayload = await request.json();

    if (!payload.items || payload.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // === Stock Validation (before any payment) ===
    const stockError = await validateStock(payload.items);
    if (stockError) {
      return NextResponse.json({ error: stockError, code: "OUT_OF_STOCK" }, { status: 422 });
    }

    // === Mock Mode ===
    if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
      console.warn("PayPal credentials not configured. Running in mock mode.");
      const orderId = await saveOrderToDatabase(payload, null, true);
      return NextResponse.json({
        approvalUrl: null,
        orderId: orderId || `mock_${Date.now()}`,
        dbOrderId: orderId,
        mockMode: true,
        message:
          "PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_APP_SECRET in .env.local to enable real payments.",
      });
    }

    // === PayPal Mode ===
    // Save order to database FIRST (so we have the order record before redirecting to PayPal)
    // Status is "pending" until PayPal capture succeeds
    const dbOrderId = await saveOrderToDatabase(payload, null, false);

    if (!dbOrderId) {
      return NextResponse.json(
        { error: "Failed to create order record. Please try again." },
        { status: 500 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: payload.total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: payload.subtotal.toFixed(2),
              },
              tax_total: {
                currency_code: "USD",
                value: payload.taxAmount.toFixed(2),
              },
              shipping: {
                currency_code: "USD",
                value: payload.shippingCost.toFixed(2),
              },
            },
          },
          items: payload.items.map((item) => ({
            name: item.name.substring(0, 127), // PayPal max 127 chars
            unit_amount: {
              currency_code: "USD",
              value: item.price.toFixed(2),
            },
            quantity: String(item.quantity),
            description: `${item.selectedColor} / ${item.selectedSize}`,
          })),
          shipping: {
            name: {
              full_name: `${payload.firstName} ${payload.lastName}`,
            },
            address: {
              address_line_1: payload.address,
              admin_area_2: payload.city,
              admin_area_1: payload.state,
              postal_code: payload.zip,
              country_code: "US",
            },
          },
        },
      ],
      application_context: {
        brand_name: "DRMA",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://drma-v2.vercel.app"}/order-confirmation?success=true&orderId=${dbOrderId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://drma-v2.vercel.app"}/checkout?cancelled=true&orderId=${dbOrderId}`,
      },
    };

    const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(order),
    });

    const data = await res.json();

    if (data.error) {
      console.error("PayPal order creation error:", data);
      // Update our DB order to reflect the PayPal failure
      try {
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled", notes: "PayPal order creation failed" })
          .eq("id", dbOrderId);
        // Restore stock since order failed (aggregate by unique product ID)
        const restoreByProduct = new Map<string, number>();
        for (const item of payload.items) {
          restoreByProduct.set(item.id, (restoreByProduct.get(item.id) || 0) + item.quantity);
        }
        for (const [productId, totalQty] of restoreByProduct) {
          try {
            const { data: prod } = await supabaseAdmin
              .from("products")
              .select("stock_quantity")
              .eq("id", productId)
              .single();
            if (prod && prod.stock_quantity !== null && prod.stock_quantity >= 0) {
              await supabaseAdmin
                .from("products")
                .update({
                  stock_quantity: prod.stock_quantity + totalQty,
                  in_stock: true,
                })
                .eq("id", productId);
            }
          } catch {}
        }
      } catch {}
      return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
    }

    // Link the PayPal order ID to our DB order
    const approvalLink = data.links?.find((link: any) => link.rel === "approve");

    // Update with PayPal order ID
    try {
      await supabaseAdmin
        .from("orders")
        .update({ paypal_order_id: data.id })
        .eq("id", dbOrderId);
    } catch {}

    return NextResponse.json({
      approvalUrl: approvalLink?.href || null,
      paypalOrderId: data.id,
      dbOrderId,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}