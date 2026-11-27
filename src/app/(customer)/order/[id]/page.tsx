import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/customer/Brand";
import { getCustomerOrder } from "@/components/customer/data";
import { OrderTracker } from "@/components/customer/OrderTracker";

export const metadata = { title: "Track your order" };

async function Tracker({ params }: { params: PageProps<"/order/[id]">["params"] }) {
  const { id } = await params;
  const order = await getCustomerOrder(id);
  if (!order) notFound();
  return <OrderTracker initial={order} />;
}

export default function OrderPage({ params }: PageProps<"/order/[id]">) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-2 pb-20 md:px-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-paper-2" />}>
          <Tracker params={params} />
        </Suspense>
      </main>
    </>
  );
}
