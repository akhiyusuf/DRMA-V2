import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const PAYPAL_APP_SECRET = process.env.PAYPAL_APP_SECRET || "";
const PAYPAL_BASE_URL = process.env.NEXT_PUBLIC_PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
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
    const { orderId, dbOrderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // If it's a mock order, just confirm success
    if (orderId.startsWith("mock_")) {
      return NextResponse.json({ captured: true, mockMode: true, orderId });
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }

    const accessToken = await getPayPalAccessToken();

    const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (data.error) {
      console.error("PayPal capture error:", data);

      // Update the DB order to cancelled since payment failed
      if (dbOrderId) {
        try {
          await supabaseAdmin
            .from("orders")
            .update({ status: "cancelled", notes: "PayPal capture failed" })
            .eq("id", dbOrderId);

          await supabaseAdmin
            .from("order_status_history")
            .insert({
              order_id: dbOrderId,
              status: "cancelled",
              note: "PayPal capture failed",
            });

          // Restore stock
          const { data: items } = await supabaseAdmin
            .from("order_items")
            .select("product_id, quantity")
            .eq("order_id", dbOrderId);

          if (items) {
            for (const item of items) {
              if (!item.product_id) continue;
              const { data: prod } = await supabaseAdmin
                .from("products")
                .select("stock_quantity")
                .eq("id", item.product_id)
                .single();
              if (prod && prod.stock_quantity !== null && prod.stock_quantity >= 0) {
                await supabaseAdmin
                  .from("products")
                  .update({
                    stock_quantity: prod.stock_quantity + item.quantity,
                    in_stock: true,
                  })
                  .eq("id", item.product_id);
              }
            }
          }
        } catch (restoreErr) {
          console.error("Failed to restore stock on capture failure:", restoreErr);
        }
      }

      return NextResponse.json({ error: "Payment capture failed" }, { status: 500 });
    }

    const captureSuccess = data.status === "COMPLETED";

    // Update the Supabase order status to "paid" on successful capture
    if (captureSuccess && dbOrderId) {
      try {
        await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            notes: `PayPal payment captured. Payer: ${data.payer?.email_address || "N/A"}`,
          })
          .eq("id", dbOrderId);

        await supabaseAdmin
          .from("order_status_history")
          .insert({
            order_id: dbOrderId,
            status: "paid",
            note: `Payment captured via PayPal. PayPal Order ID: ${data.id}. Payer: ${data.payer?.email_address || "N/A"}`,
          });

        console.log(`Order ${dbOrderId} marked as paid after PayPal capture.`);
      } catch (dbErr) {
        console.error("Failed to update order status in Supabase:", dbErr);
        // Payment was captured but DB update failed — log prominently
        console.error(`CRITICAL: PayPal order ${data.id} was captured but order ${dbOrderId} still shows "pending" in database. Manual fix needed.`);
      }
    }

    return NextResponse.json({
      captured: captureSuccess,
      paypalOrderId: data.id,
      payerEmail: data.payer?.email_address,
    });
  } catch (error: any) {
    console.error("Capture order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to capture payment" },
      { status: 500 }
    );
  }
}