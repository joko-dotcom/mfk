import Link from "next/link";
import { Crown } from "lucide-react";

export default function MembershipSuccessPage() {
  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-20">
      <div className="card max-w-md p-10 text-center">
        <Crown className="mx-auto text-koi-gold" size={42} />
        <h1 className="mt-4 font-display text-2xl text-white">
          Welcome to the <span className="gold-text">Elite Circle</span>
        </h1>
        <p className="mt-2 text-sm text-koi-muted">
          Membership Anda aktif. Silakan logout & login kembali untuk menyegarkan akses.
        </p>
        <Link href="/auctions" className="btn-gold mt-6 w-full">
          Ke Lelang Eksklusif
        </Link>
      </div>
    </div>
  );
}
