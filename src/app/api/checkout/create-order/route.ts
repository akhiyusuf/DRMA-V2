import { NextRequest, NextResponse } from "next/server";

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

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
    throw new Error("PayPal credentials not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_APP_SECRET in .env.local");
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

    if (!PAYPAL_CLIENT_ID || !PAYPAL_APP_SECRET) {
      // PayPal not configured — return a mock success response
      // This allows the store to function during development without PayPal credentials
      console.warn("PayPal credentials not configured. Running in mock mode.");
      return NextResponse.json({
        approvalUrl: null,
        orderId: `mock_${Date.now()}`,
        mockMode: true,
        message: "PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_APP_SECRET in .env.local to enable real payments.",
      });
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
          items: payload.items.map(item => ({
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
        shipping_preference: "NO_SHIPPING", // We already collected shipping info
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://drma-v2.vercel.app"}/order-confirmation?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://drma-v2.vercel.app"}/checkout?cancelled=true`,
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
      return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
    }

    // Find the approval URL from the HATEOAS links
    const approvalLink = data.links?.find((link: any) => link.rel === "approve");

    return NextResponse.json({
      approvalUrl: approvalLink?.href || null,
      paypalOrderId: data.id,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}