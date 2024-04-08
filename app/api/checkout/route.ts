import { resolveTypeJsonValues } from "@/app/utils/helpers/resolveTypeJsonValues";
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

    // we need to generate payment link and send to front end.
    const params: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "BRL",
            unit_amount: cartTotal * 100,
            product_data: {
              name: "Valor total da compra",
            },
          },
        },
      ],
      mode: "payment",
      success_url: `https://3000-pmarq-ecomproject-nkcvuok42oq.ws-us110.gitpod.io/cart/?success=true`,
      cancel_url: `https://3000-pmarq-ecomproject-nkcvuok42oq.ws-us110.gitpod.io/cart/?canceled=true`,
    };
    const checkoutSession = await stripe.checkout.sessions.create(params);

    console.log({ checkoutSession });
    return NextResponse.json({ teste: "teste" }); //----- return not works
  } catch (error) {
    console.log({ error });
  }
};
