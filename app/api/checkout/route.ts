import { resolveTypeJsonValues } from "@/app/utils/helpers/resolveTypeJsonValues";
import { authOptions } from "../auth/[...nextauth]/route";
import { getCartItems } from "@/app/lib/cartHelper";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import Product from "@/app/(home_route)/[...product]/page";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const POST = async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized request!" },
        { status: 401 }
      );
    }


    
    // if (!cartId) {
    //   return NextResponse.json({ error: "Invalid cart id!" }, { status: 401 });
    // }

    // fetching cart details
    const cartItems = await getCartItems();
    let totalQty = 0;
    let cartTotal = 0;

    cartItems?.map((item) => {
      const newPrice = resolveTypeJsonValues(item?.price);
      const discounted = newPrice.discounted ?? 0;

      totalQty = totalQty + item.quantity;
      cartTotal = cartTotal + discounted * item.quantity;
    });

    // if (session.user.id !== cartId) {
    //   return NextResponse.json({ error: "Invalid cart id!" }, { status: 401 });
    // }

    if (!cartItems) {
      return NextResponse.json({ error: "Invalid cart id!" }, { status: 404 });
    }

    const line_items = cartItems.map((product) => {
      const { quantity, price, title, thumbnails } = product;
      const newPrice = resolveTypeJsonValues(price);
      const discounted = newPrice.discounted ?? 0;
      const images = thumbnails ? thumbnails[0]?.url : "";

      return {
        price_data: {
          currency: "BRL",
          unit_amount: discounted * 100,
          product_data: {
            name: String(title),
            images: [images],
          },
        },
        quantity,
      };
    });
    
    // we need to generate payment link and send to front end.
    const params: Stripe.Checkout.SessionCreateParams = {
      line_items,
      mode: "payment",
      payment_method_types:['card'],
      success_url: process.env.PAYMENT_SUCCESS_URL,
      cancel_url: process.env.PAYMENT_CANCEL_URL,
    };
    const checkoutSession = await stripe.checkout.sessions.create(params);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.log({ error });
  }
};
