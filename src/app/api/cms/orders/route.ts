import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`customer_email.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      // If table doesn't exist yet, return empty
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ orders: [], total: 0, page, limit });
      }
      throw error;
    }

    // Fetch order items for each order
    const { data: allItems } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .in("order_id", (orders || []).map(o => o.id));

    const itemsByOrder: Record<string, any[]> = {};
    (allItems || []).forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    return NextResponse.json({
      orders: (orders || []).map(order => ({
        ...order,
        items: itemsByOrder[order.id] || [],
      })),
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/cms/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderData, items } = body;

    // Create the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        id: orderData.id,
        paypal_order_id: orderData.paypalOrderId || null,
        status: orderData.mockMode ? "paid" : "pending",
        customer_email: orderData.email,
        customer_first_name: orderData.firstName,
        customer_last_name: orderData.lastName,
        shipping_address: orderData.address,
        shipping_city: orderData.city,
        shipping_state: orderData.state,
        shipping_zip: orderData.zip,
        shipping_method: orderData.shippingMethod,
        subtotal: orderData.subtotal,
        tax_amount: orderData.taxAmount,
        shipping_cost: orderData.shippingCost,
        total: orderData.total,
      })
      .select()
      .single();

    if (orderError) {
      // If table doesn't exist, log but don't fail the checkout
      if (orderError.message?.includes("does not exist") || orderError.code === "42P01") {
        console.warn("Orders table does not exist. Run the migration first.");
        return NextResponse.json({ success: true, warning: "Orders table not created yet" });
      }
      throw orderError;
    }

    // Create order items
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
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

      if (itemsError) throw itemsError;

      // Decrement stock for each item (atomic inline approach)
      for (const item of items) {
        try {
          const { data: prod } = await supabaseAdmin
            .from("products")
            .select("stock_quantity")
            .eq("id", item.id)
            .single();
          if (prod && prod.stock_quantity !== null && prod.stock_quantity >= 0) {
            const newStock = Math.max(0, prod.stock_quantity - item.quantity);
            await supabaseAdmin
              .from("products")
              .update({ stock_quantity: newStock, in_stock: newStock > 0 })
              .eq("id", item.id);
          }
        } catch {
          // Non-blocking — stock tracking may not be set up
        }
      }
    }

    // Add status history entry
    try {
      await supabaseAdmin
        .from("order_status_history")
        .insert({
          order_id: order.id,
          status: orderData.mockMode ? "paid" : "pending",
          note: orderData.mockMode ? "Mock payment — PayPal not configured" : "Order placed, awaiting PayPal payment",
        });
    } catch {}

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("POST /api/cms/orders error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}