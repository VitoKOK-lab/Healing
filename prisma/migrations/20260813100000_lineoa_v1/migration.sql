-- CreateTable
CREATE TABLE "TarotUser" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "birthday" TIMESTAMP(3),
    "deepenCredits" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastDailyDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarotUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "spreadId" TEXT NOT NULL,
    "topic" TEXT,
    "question" TEXT,
    "cardsJson" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "seedNonce" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'drawn',
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "readingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDraw" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardSeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardN" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TarotUser_lineUserId_key" ON "TarotUser"("lineUserId");

-- CreateIndex
CREATE INDEX "Reading_userId_createdAt_idx" ON "Reading"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_providerTxId_key" ON "Purchase"("providerTxId");

-- CreateIndex
CREATE INDEX "Purchase_userId_createdAt_idx" ON "Purchase"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDraw_userId_date_key" ON "DailyDraw"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CardSeen_userId_cardN_key" ON "CardSeen"("userId", "cardN");

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TarotUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TarotUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDraw" ADD CONSTRAINT "DailyDraw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TarotUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSeen" ADD CONSTRAINT "CardSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TarotUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

