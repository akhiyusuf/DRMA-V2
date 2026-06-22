import { NextRequest, NextResponse } from "next/server";

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
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // If it's a mock order, return success immediately
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
      return NextResponse.json({ error: "Payment capture failed" }, { status: 500 });
    }

    return NextResponse.json({
      captured: data.status === "COMPLETED",
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