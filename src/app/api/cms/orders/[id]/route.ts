import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, note } = body;

    // Validate status transition
    const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Update the order
    const updates: any = {};
    if (status) updates.status = status;
    if (note) updates.notes = note;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Log status change in history
    if (status) {
      try {
        await supabaseAdmin
          .from("order_status_history")
          .insert({
            order_id: id,
            status,
            note: note || `Status changed to ${status}`,
          });
      } catch {}
    }

    // If cancelled or refunded, restore stock atomically (aggregate by product ID)
    if (status === "cancelled" || status === "refunded") {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", id);

      if (items) {
        // Aggregate quantities by product ID
        const restoreByProduct = new Map<string, number>();
        for (const item of items) {
          if (!item.product_id) continue;
          restoreByProduct.set(item.product_id, (restoreByProduct.get(item.product_id) || 0) + item.quantity);
        }

        for (const [productId, totalQty] of restoreByProduct) {
          try {
            // Fetch current stock
            const { data: prod } = await supabaseAdmin
              .from("products")
              .select("stock_quantity")
              .eq("id", productId)
              .single();

            if (prod && prod.stock_quantity !== null && prod.stock_quantity >= 0) {
              const newStock = prod.stock_quantity + totalQty;
              await supabaseAdmin
                .from("products")
                .update({
                  stock_quantity: newStock,
                  in_stock: newStock > 0,
                })
                .eq("id", productId);
            }
          } catch (restoreErr) {
            console.warn(
              `Failed to restore stock for product ${productId}:`,
              restoreErr
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("PATCH /api/cms/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}