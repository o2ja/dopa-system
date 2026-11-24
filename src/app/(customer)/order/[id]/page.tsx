import { notFound } from "next/navigation";
import { TopBar } from "@/components/customer/Brand";
import { getCustomerOrder } from "@/components/customer/data";
import { OrderTracker } from "@/components/customer/OrderTracker";

export const metadata = { title: "Track your order" };

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  const order = await getCustomerOrder(id);
  if (!order) notFound();

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-2 pb-20 md:px-8">
        <OrderTracker initial={order} />
      </main>
    </>
  );
}
