-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER', 'BUYER');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('NONE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ListingMode" AS ENUM ('FIXED', 'AUCTION');

-- CreateEnum
CREATE TYPE "AuctionKind" AS ENUM ('OB', 'KB', 'BIN');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BID_HOLD', 'BID_RELEASE', 'WIN_DEBIT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'FEE', 'PENALTY', 'SELLER_DEPOSIT', 'SELLER_PAYOUT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOCK', 'MIDTRANS', 'XENDIT', 'MANUAL_BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "ConsignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AzukariStatus" AS ENUM ('ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KoiCategory" AS ENUM ('GOSANKE_KOHAKU', 'GOSANKE_SANKE', 'GOSANKE_SHOWA', 'NON_GOSANKE', 'BABY_KOI', 'JUMBO_KOI', 'RARE_COLLECTION');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID_ESCROW', 'SHIPPED', 'DELIVERED', 'RELEASED', 'REFUNDED', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "BlacklistReason" AS ENUM ('BID_AND_RUN', 'FRAUD', 'ABUSE', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "otpExpires" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "membershipTier" "MembershipTier" NOT NULL DEFAULT 'NONE',
    "membershipUntil" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "bio" TEXT,
    "whatsappNumber" TEXT,
    "whatsappVerified" BOOLEAN NOT NULL DEFAULT false,
    "waLinkCode" TEXT,
    "waLinkExpires" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" "BlacklistReason",
    "blacklistNote" TEXT,
    "bidAndRunCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "addressDetail" TEXT,
    "location" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT NOT NULL,
    "ktpNumber" TEXT,
    "ktpUrl" TEXT,
    "selfieWithKtpUrl" TEXT,
    "faceUrl" TEXT,
    "farmPhotoUrl" TEXT,
    "socialInstagram" TEXT,
    "socialTiktok" TEXT,
    "socialYoutube" TEXT,
    "socialFacebook" TEXT,
    "socialWebsite" TEXT,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "topSeller" BOOLEAN NOT NULL DEFAULT false,
    "championBreeder" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "whatsappGroupId" TEXT,
    "whatsappGroupName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Koi" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "KoiCategory" NOT NULL,
    "bloodline" TEXT,
    "breederName" TEXT,
    "sizeCm" INTEGER NOT NULL,
    "ageMonths" INTEGER,
    "sex" TEXT,
    "description" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mode" "ListingMode" NOT NULL DEFAULT 'FIXED',
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Koi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KoiMedia" (
    "id" TEXT NOT NULL,
    "koiId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KoiMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "koiId" TEXT NOT NULL,
    "kind" "AuctionKind" NOT NULL DEFAULT 'OB',
    "startingBid" INTEGER NOT NULL,
    "currentBid" INTEGER NOT NULL,
    "minIncrement" INTEGER NOT NULL DEFAULT 100000,
    "bidStep" INTEGER,
    "reservePrice" INTEGER,
    "buyItNowPrice" INTEGER,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "antiSniperMinutes" INTEGER NOT NULL DEFAULT 3,
    "antiSniperExtendSec" INTEGER NOT NULL DEFAULT 600,
    "memberOnly" BOOLEAN NOT NULL DEFAULT false,
    "minTier" "MembershipTier" NOT NULL DEFAULT 'NONE',
    "requiredDeposit" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "winningBid" INTEGER,
    "boughtViaBin" BOOLEAN NOT NULL DEFAULT false,
    "liveStreamUrl" TEXT,
    "liveActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChat" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "koiId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentRef" TEXT,
    "shippingAddress" TEXT,
    "courier" TEXT,
    "trackingNo" TEXT,
    "oxygenHours" INTEGER,
    "packingNote" TEXT,
    "paymentDueAt" TIMESTAMP(3),
    "flaggedBidAndRun" BOOLEAN NOT NULL DEFAULT false,
    "sourceAuctionId" TEXT,
    "notifiedDefaultAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "BlacklistReason" NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaBotSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "phoneNumber" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaBotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaInboundLog" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "userId" TEXT,
    "command" TEXT NOT NULL,
    "payload" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaInboundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "koiId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "koiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "auctionFeeBps" INTEGER NOT NULL DEFAULT 700,
    "listingFeeIDR" INTEGER NOT NULL DEFAULT 0,
    "silverPriceIDR" INTEGER NOT NULL DEFAULT 99000,
    "goldPriceIDR" INTEGER NOT NULL DEFAULT 299000,
    "platinumPriceIDR" INTEGER NOT NULL DEFAULT 999000,
    "minBuyerDepositIDR" INTEGER NOT NULL DEFAULT 500000,
    "minSellerDepositIDR" INTEGER NOT NULL DEFAULT 1000000,
    "bnrPenaltyBps" INTEGER NOT NULL DEFAULT 5000,
    "bnrStrikesForBan" INTEGER NOT NULL DEFAULT 2,
    "withdrawalFeeIDR" INTEGER NOT NULL DEFAULT 5000,
    "withdrawalMinIDR" INTEGER NOT NULL DEFAULT 50000,
    "azukariMonthlyFeeIDR" INTEGER NOT NULL DEFAULT 250000,
    "kcFeeBps" INTEGER NOT NULL DEFAULT 1500,
    "paymentMethodDefault" "PaymentMethod" NOT NULL DEFAULT 'MOCK',
    "waBotNumber" TEXT,
    "waAutoReply" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "escrowBalance" INTEGER NOT NULL DEFAULT 0,
    "sellerDepositBalance" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTx" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL DEFAULT 0,
    "escrowAfter" INTEGER NOT NULL DEFAULT 0,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'MOCK',
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'BUYER',
    "proofUrl" TEXT,
    "note" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentListing" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "hostSellerId" TEXT NOT NULL,
    "koiName" TEXT NOT NULL,
    "sizeCm" INTEGER NOT NULL,
    "bloodline" TEXT,
    "description" TEXT,
    "askingPrice" INTEGER NOT NULL,
    "feeBps" INTEGER NOT NULL DEFAULT 1500,
    "photoUrl" TEXT,
    "status" "ConsignmentStatus" NOT NULL DEFAULT 'PENDING',
    "soldPrice" INTEGER,
    "soldAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AzukariContract" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "hostSellerId" TEXT NOT NULL,
    "koiName" TEXT NOT NULL,
    "sizeCm" INTEGER NOT NULL,
    "bloodline" TEXT,
    "photoUrl" TEXT,
    "monthlyFeeIDR" INTEGER NOT NULL DEFAULT 250000,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "AzukariStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AzukariContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "ip" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappNumber_key" ON "User"("whatsappNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_userId_key" ON "Seller"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_slug_key" ON "Seller"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Koi_slug_key" ON "Koi"("slug");

-- CreateIndex
CREATE INDEX "Koi_category_status_idx" ON "Koi"("category", "status");

-- CreateIndex
CREATE INDEX "Koi_sellerId_idx" ON "Koi"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_koiId_key" ON "Auction"("koiId");

-- CreateIndex
CREATE INDEX "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveChat_auctionId_createdAt_idx" ON "LiveChat"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_paymentDueAt_idx" ON "Order"("status", "paymentDueAt");

-- CreateIndex
CREATE INDEX "BlacklistStrike_userId_idx" ON "BlacklistStrike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WaBotSession_label_key" ON "WaBotSession"("label");

-- CreateIndex
CREATE INDEX "WaInboundLog_jid_createdAt_idx" ON "WaInboundLog"("jid", "createdAt");

-- CreateIndex
CREATE INDEX "Review_subjectId_idx" ON "Review"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_koiId_key" ON "Watchlist"("userId", "koiId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTx_userId_createdAt_idx" ON "WalletTx"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTx_type_createdAt_idx" ON "WalletTx"("type", "createdAt");

-- CreateIndex
CREATE INDEX "DepositRequest_userId_createdAt_idx" ON "DepositRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DepositRequest_status_idx" ON "DepositRequest"("status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_createdAt_idx" ON "WithdrawalRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "ConsignmentListing_hostSellerId_status_idx" ON "ConsignmentListing"("hostSellerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentListing_ownerUserId_idx" ON "ConsignmentListing"("ownerUserId");

-- CreateIndex
CREATE INDEX "AzukariContract_hostSellerId_status_idx" ON "AzukariContract"("hostSellerId", "status");

-- CreateIndex
CREATE INDEX "AzukariContract_ownerUserId_idx" ON "AzukariContract"("ownerUserId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Koi" ADD CONSTRAINT "Koi_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KoiMedia" ADD CONSTRAINT "KoiMedia_koiId_fkey" FOREIGN KEY ("koiId") REFERENCES "Koi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_koiId_fkey" FOREIGN KEY ("koiId") REFERENCES "Koi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChat" ADD CONSTRAINT "LiveChat_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChat" ADD CONSTRAINT "LiveChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_koiId_fkey" FOREIGN KEY ("koiId") REFERENCES "Koi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlacklistStrike" ADD CONSTRAINT "BlacklistStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_koiId_fkey" FOREIGN KEY ("koiId") REFERENCES "Koi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_koiId_fkey" FOREIGN KEY ("koiId") REFERENCES "Koi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTx" ADD CONSTRAINT "WalletTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentListing" ADD CONSTRAINT "ConsignmentListing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentListing" ADD CONSTRAINT "ConsignmentListing_hostSellerId_fkey" FOREIGN KEY ("hostSellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AzukariContract" ADD CONSTRAINT "AzukariContract_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AzukariContract" ADD CONSTRAINT "AzukariContract_hostSellerId_fkey" FOREIGN KEY ("hostSellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

