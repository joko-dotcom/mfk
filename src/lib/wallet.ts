// Wallet helpers: deposit, hold, release, debit, credit, escrow.
//
// The wallet model tracks three balances per user:
//   - availableBalance: spendable deposit (required for bidding / BIN)
//   - escrowBalance:    buyer funds locked awaiting settlement
//   - sellerDepositBalance: seller jaminan (auto-penalized on violations)
//
// All mutations MUST happen inside a prisma.$transaction so the WalletTx audit
// trail stays consistent with the balance snapshot. Callers can either pass
// an existing transaction client or call the shorthand helpers below which
// open their own transaction.

import type { Prisma, PrismaClient, Wallet, WalletTxType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function getOrCreateWallet(userId: string, tx: Tx = prisma): Promise<Wallet> {
  const existing = await tx.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.wallet.create({ data: { userId } });
}

export async function getWalletSummary(userId: string) {
  const w = await getOrCreateWallet(userId);
  return {
    availableBalance: w.availableBalance,
    escrowBalance: w.escrowBalance,
    sellerDepositBalance: w.sellerDepositBalance,
    totalSpent: w.totalSpent,
    totalEarned: w.totalEarned,
  };
}

interface MutationArgs {
  userId: string;
  amount: number;
  type: WalletTxType;
  reference?: string | null;
  note?: string | null;
}

/**
 * Credit available balance (e.g. approved deposit, refund, seller payout).
 */
export async function creditAvailable(tx: Tx, a: MutationArgs) {
  const w = await getOrCreateWallet(a.userId, tx);
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: {
      availableBalance: { increment: a.amount },
      totalEarned: a.type === "SELLER_PAYOUT" ? { increment: a.amount } : undefined,
    },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: a.type,
      amount: a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;

  // Note: we don't touch w directly after the update, but we loaded it first
  // to guarantee the wallet row exists.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void w;
}

/**
 * Debit available balance (e.g. withdrawal, direct buy, hold-for-bid).
 * Throws if insufficient.
 */
export async function debitAvailable(tx: Tx, a: MutationArgs) {
  const w = await getOrCreateWallet(a.userId, tx);
  if (w.availableBalance < a.amount) {
    throw new Error(
      `Saldo tidak cukup. Dibutuhkan ${a.amount.toLocaleString("id-ID")}, tersedia ${w.availableBalance.toLocaleString("id-ID")}.`,
    );
  }
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: {
      availableBalance: { decrement: a.amount },
      totalSpent: a.type === "WIN_DEBIT" ? { increment: a.amount } : undefined,
    },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: a.type,
      amount: -a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;
}

/**
 * Move funds available -> escrow (buyer paid, waiting for delivery).
 */
export async function moveToEscrow(tx: Tx, a: MutationArgs) {
  const w = await getOrCreateWallet(a.userId, tx);
  if (w.availableBalance < a.amount) {
    throw new Error("Saldo tidak cukup untuk escrow.");
  }
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: {
      availableBalance: { decrement: a.amount },
      escrowBalance: { increment: a.amount },
    },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: "ESCROW_HOLD",
      amount: -a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;
}

/**
 * Release escrow back to buyer's available (refund / cancelled).
 */
export async function releaseEscrowToAvailable(tx: Tx, a: MutationArgs) {
  const w = await getOrCreateWallet(a.userId, tx);
  if (w.escrowBalance < a.amount) {
    throw new Error("Saldo escrow tidak cukup.");
  }
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: {
      escrowBalance: { decrement: a.amount },
      availableBalance: { increment: a.amount },
    },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: "REFUND",
      amount: a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;
}

/**
 * Finalize escrow: remove from escrow (deleted for buyer, seller was credited
 * separately via creditAvailable(type=SELLER_PAYOUT)). Use when order is
 * marked RELEASED.
 */
export async function finalizeEscrow(tx: Tx, a: MutationArgs) {
  const w = await getOrCreateWallet(a.userId, tx);
  if (w.escrowBalance < a.amount) {
    throw new Error("Saldo escrow tidak cukup untuk difinalisasi.");
  }
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: {
      escrowBalance: { decrement: a.amount },
      totalSpent: { increment: a.amount },
    },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: "ESCROW_RELEASE",
      amount: -a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;
}

/**
 * Apply a BNR penalty: debit from availableBalance first, then from
 * sellerDepositBalance. Returns the amount actually deducted.
 */
export async function applyPenalty(tx: Tx, userId: string, amount: number, reference?: string) {
  const w = await getOrCreateWallet(userId, tx);
  let remaining = amount;
  let fromAvailable = 0;
  let fromDeposit = 0;

  if (w.availableBalance > 0) {
    fromAvailable = Math.min(w.availableBalance, remaining);
    remaining -= fromAvailable;
  }
  if (remaining > 0 && w.sellerDepositBalance > 0) {
    fromDeposit = Math.min(w.sellerDepositBalance, remaining);
    remaining -= fromDeposit;
  }

  const updated = await tx.wallet.update({
    where: { userId },
    data: {
      availableBalance: { decrement: fromAvailable },
      sellerDepositBalance: { decrement: fromDeposit },
    },
  });

  await tx.walletTx.create({
    data: {
      userId,
      type: "PENALTY",
      amount: -(fromAvailable + fromDeposit),
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: reference ?? null,
      note: `Penalty debited ${fromAvailable} from available + ${fromDeposit} from deposit`,
    },
  });

  return { deducted: fromAvailable + fromDeposit, unpaid: remaining };
}

/**
 * Credit the seller deposit sub-balance (jaminan). Called on approved
 * seller-deposit request.
 */
export async function creditSellerDeposit(tx: Tx, a: MutationArgs) {
  await getOrCreateWallet(a.userId, tx);
  const updated = await tx.wallet.update({
    where: { userId: a.userId },
    data: { sellerDepositBalance: { increment: a.amount } },
  });
  await tx.walletTx.create({
    data: {
      userId: a.userId,
      type: "SELLER_DEPOSIT",
      amount: a.amount,
      balanceAfter: updated.availableBalance,
      escrowAfter: updated.escrowBalance,
      reference: a.reference ?? null,
      note: a.note ?? null,
    },
  });
  return updated;
}
