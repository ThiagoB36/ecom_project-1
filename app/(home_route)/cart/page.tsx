import React from "react";
import prisma from "@/prisma";
import { startDb } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import CartItems, { Product } from "@/app/components/CartItems";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";
import { DefaultArgs, JsonValue } from "@prisma/client/runtime/library";
import { resolveTypeJsonValues } from "@/app/utils/helpers/resolveTypeJsonValues";


type TArrPromises = Prisma.Prisma__ProductClient<TItemProd, null, DefaultArgs>;

type TItemProd = {
  id: string;
  title: string;
  price: JsonValue;
  thumbnails: {
    id: string;
    url: string;
    publicId: string;
    productId: string;
  }[];
} | null;

const fetchCartProducts = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  await startDb();

  const cartItems = await prisma.cartDocument.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      cartItems: true,
    },
  });
  const arrItems = cartItems?.cartItems;
  

  let arrProdsPromises: TArrPromises[] = [];
  arrItems?.map(async (item) => {
    const prodId = item.productId;
    const prodsInfo = prisma.product.findUnique({
      where: { id: prodId },
      select: {
        id: true,
        price: true,
        thumbnails: true,
        title: true,
      },
    });
    arrProdsPromises.push(prodsInfo);
  });

  const arrProds = await Promise.all(arrProdsPromises); 

  let arrObjs: Product[] = [];

  cartItems?.cartItems.map((itemCart) => {
    const prodIdCart = itemCart.productId;
    arrProds.map((itemProd: TItemProd) => {
      const prodIdProds = itemProd?.id;
      const condicional = prodIdCart == prodIdProds;
      if (condicional) {
        const newObj = { ...itemCart, ...itemProd };
        arrObjs.push(newObj);
      }
    });
  });
  return arrObjs;  
};



export default async function Cart() {
  const cart = await fetchCartProducts();

  if (!cart)
    return (
      <div className="py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Your Cart Details</h1>
          <hr />
        </div>
        <h1 className="text-center font-semibold text-2xl opacity-40 py-10">
          Your cart is empty
        </h1>
      </div>
    );

  let totalQty = 0;
  let cartTotal = 0;

  cart.map((item: Product) => {
    const newPrice = resolveTypeJsonValues(item?.price);
    const discounted = newPrice.discounted ?? 0;

    totalQty = totalQty + item.quantity;
    cartTotal = cartTotal + discounted * item.quantity;
  });

  if (totalQty === 0) {
    return (
      <div className="py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Your Cart Details</h1>
          <hr />
        </div>
        <h1 className="text-center font-semibold text-2xl opacity-40 py-10">
          Your cart is empty
        </h1>
      </div>
    );
  }

  return (
    <div>
      <CartItems
        products={cart}
        cartTotal={cartTotal}
        totalQty={totalQty}        
      />
    </div>
  );
}