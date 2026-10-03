import type { Metadata } from "next";
import { SellerConsole } from "@/components/seller-console";

export const metadata: Metadata = {
  title: "Seller console · DREAMHOUSE",
};

export default function SellerPage() {
  return <SellerConsole />;
}
