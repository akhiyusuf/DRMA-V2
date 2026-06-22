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
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
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

    // If cancelled or refunded, restore stock
    if (status === "cancelled" || status === "refunded") {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", id);

      if (items) {
        for (const item of items) {
          try {
            await supabaseAdmin.rpc("increment_stock", {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });
          } catch {}
        }
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("PATCH /api/cms/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}