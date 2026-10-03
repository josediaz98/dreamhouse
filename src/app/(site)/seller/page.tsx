import type { Metadata } from "next";
import { SellerConsole } from "@/components/seller-console";

export const metadata: Metadata = {
  title: "Seller console · Lotline",
};

export default function SellerPage() {
  return <SellerConsole />;
}
