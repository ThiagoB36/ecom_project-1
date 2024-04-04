import { authOptions } from "../auth/[...nextauth]/route";
import { getCartItems } from "@/app/lib/cartHelper";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const POST = async (req: Request) => {
  console.log("----checkout -------------");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized request!" },
        { status: 401 }
      );
    }

    const data = await req.json();
    console.log({ data });
    const cartId = data.cartId as string;

    // if (!cartId) {
    //   return NextResponse.json({ error: "Invalid cart id!" }, { status: 401 });
    // }

    // fetching cart details
    const cartItems = await getCartItems();
    console.log({ cartItems, session });

    // if (session.user.id !== cartId) {
    //   return NextResponse.json({ error: "Invalid cart id!" }, { status: 401 });
    // }
    if (!cartItems) {
      return NextResponse.json({ error: "Invalid cart id!" }, { status: 404 });
    }

    // we need to generate payment link and send to front end.
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 100, //----'PRICE OF OUR PRODUCT',
            product_data: {
              name: "teste de checkout",
              images: [],
            },
          },
          quantity: 1,
        },
      ],
    };
    console.log({ params, stripe });
    const checkoutSession = await stripe.checkout.sessions.create(params); //----- tem erro
    console.log({ checkoutSession });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {}
};
