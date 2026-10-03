import type { Metadata } from "next";
import { SellerLot } from "@/components/seller/seller-lot";

export const metadata: Metadata = {
  title: "Lot · Seller console · Lotline",
};

export default async function SellerLotPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  return <SellerLot propertyId={decodeURIComponent(propertyId)} />;
}
