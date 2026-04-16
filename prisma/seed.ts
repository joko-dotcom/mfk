import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("🌱 Seeding Mafia Koi Marketplace...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  const sellerPw = await bcrypt.hash("seller123", 10);
  const buyerPw = await bcrypt.hash("buyer123", 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@mafiakoi.id" },
    update: {},
    create: {
      email: "admin@mafiakoi.id",
      name: "Super Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  // Buyer
  await prisma.user.upsert({
    where: { email: "kolektor@mafiakoi.id" },
    update: {},
    create: {
      email: "kolektor@mafiakoi.id",
      name: "Aditya Kolektor",
      passwordHash: buyerPw,
      role: "BUYER",
      membershipTier: "GOLD",
      membershipUntil: new Date(Date.now() + 30 * 86400_000),
    },
  });

  await prisma.user.upsert({
    where: { email: "hobbyist@mafiakoi.id" },
    update: {},
    create: {
      email: "hobbyist@mafiakoi.id",
      name: "Rizky Hobbyist",
      passwordHash: buyerPw,
      role: "BUYER",
    },
  });

  // Sellers
  const sellers = [
    {
      email: "sakai@mafiakoi.id",
      name: "Sakai Farm Indonesia",
      farmName: "Sakai Fish Farm Indonesia",
      province: "Jawa Timur",
      location: "Blitar",
      description:
        "Cabang resmi Sakai Fish Farm Hiroshima. Spesialis Sanke & Showa kelas Grand Champion.",
      verified: true,
      topSeller: true,
      championBreeder: true,
      rating: 4.9,
    },
    {
      email: "dainichi@mafiakoi.id",
      name: "Dainichi Koi Jatim",
      farmName: "Dainichi Koi Jatim",
      province: "Jawa Timur",
      location: "Tulungagung",
      description:
        "Bloodline Dainichi murni. Kohaku & Tancho dengan pattern sempurna untuk kontes nasional.",
      verified: true,
      topSeller: true,
      rating: 4.8,
    },
    {
      email: "nirwana@mafiakoi.id",
      name: "Nirwana Koi Farm",
      farmName: "Nirwana Koi Farm",
      province: "Jawa Barat",
      location: "Sukabumi",
      description:
        "Farm lokal dengan koi lokalan kualitas jempolan. Harga bersahabat untuk hobbyist.",
      verified: true,
      rating: 4.6,
    },
    {
      email: "omosako@mafiakoi.id",
      name: "Omosako Indonesia",
      farmName: "Omosako Indonesia",
      province: "Bali",
      location: "Denpasar",
      description:
        "Spesialis Shiro Utsuri & rare collection langka. Pengiriman pakai packing khusus oksigen.",
      verified: true,
      championBreeder: true,
      rating: 4.95,
    },
  ];

  const sellerRecords: {
    id: string;
    farmName: string;
    province: string;
    verified: boolean;
  }[] = [];
  for (const s of sellers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        passwordHash: sellerPw,
        role: "SELLER",
      },
    });
    const slug = slugify(s.farmName);
    const seller = await prisma.seller.upsert({
      where: { userId: user.id },
      update: {
        farmName: s.farmName,
        description: s.description,
        location: s.location,
        province: s.province,
        status: "VERIFIED",
        verified: s.verified,
        topSeller: s.topSeller ?? false,
        championBreeder: s.championBreeder ?? false,
        rating: s.rating,
      },
      create: {
        userId: user.id,
        farmName: s.farmName,
        slug,
        description: s.description,
        location: s.location,
        province: s.province,
        status: "VERIFIED",
        verified: s.verified,
        topSeller: s.topSeller ?? false,
        championBreeder: s.championBreeder ?? false,
        rating: s.rating,
      },
    });
    sellerRecords.push({
      id: seller.id,
      farmName: seller.farmName,
      province: seller.province,
      verified: seller.verified,
    });
  }

  // Listings
  const IMG = {
    kohaku:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=80",
    showa:
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
    sanke:
      "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?auto=format&fit=crop&w=900&q=80",
    baby:
      "https://images.unsplash.com/photo-1550503519-ba3eaaa8d0b4?auto=format&fit=crop&w=900&q=80",
    jumbo:
      "https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=900&q=80",
    rare:
      "https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=900&q=80",
  } as const;

  const listings: Array<{
    sellerIdx: number;
    name: string;
    category:
      | "GOSANKE_KOHAKU"
      | "GOSANKE_SANKE"
      | "GOSANKE_SHOWA"
      | "NON_GOSANKE"
      | "BABY_KOI"
      | "JUMBO_KOI"
      | "RARE_COLLECTION";
    bloodline: string;
    breederName: string;
    sizeCm: number;
    ageMonths: number;
    sex: string;
    description: string;
    coverImage: string;
    price: number;
    mode: "FIXED" | "AUCTION";
    startingBid?: number;
    durationHours?: number;
    featured?: boolean;
    memberOnly?: boolean;
    minTier?: "SILVER" | "GOLD" | "PLATINUM";
  }> = [
    {
      sellerIdx: 0,
      name: "Grand Champion Showa 72cm",
      category: "GOSANKE_SHOWA",
      bloodline: "Hiroshima",
      breederName: "Sakai",
      sizeCm: 72,
      ageMonths: 48,
      sex: "Female",
      description:
        "Showa Sanshoku tosai ke-4, juara Blitar Koi Show 2024. Pattern sumi solid, shiroji bersih.",
      coverImage: IMG.showa,
      price: 85_000_000,
      mode: "AUCTION",
      startingBid: 30_000_000,
      durationHours: 72,
      featured: true,
      memberOnly: true,
      minTier: "GOLD",
    },
    {
      sellerIdx: 1,
      name: "Kohaku Tancho 55cm",
      category: "GOSANKE_KOHAKU",
      bloodline: "Dainichi",
      breederName: "Dainichi",
      sizeCm: 55,
      ageMonths: 36,
      sex: "Female",
      description:
        "Tancho sempurna bulat merah di kepala. Hi dense & shiroji snow-white.",
      coverImage: IMG.kohaku,
      price: 18_500_000,
      mode: "FIXED",
      featured: true,
    },
    {
      sellerIdx: 1,
      name: "Sanke Maruten 48cm",
      category: "GOSANKE_SANKE",
      bloodline: "Dainichi",
      breederName: "Dainichi",
      sizeCm: 48,
      ageMonths: 30,
      sex: "Male",
      description:
        "Sanke pattern klasik dengan maruten kecil. Sumi sudah finish.",
      coverImage: IMG.sanke,
      price: 9_750_000,
      mode: "AUCTION",
      startingBid: 4_000_000,
      durationHours: 48,
    },
    {
      sellerIdx: 2,
      name: "Baby Kohaku Tosai 22cm",
      category: "BABY_KOI",
      bloodline: "Marusei",
      breederName: "Nirwana",
      sizeCm: 22,
      ageMonths: 7,
      sex: "Unknown",
      description: "Baby kohaku pattern promising. Cocok untuk dibesarkan sampai jumbo.",
      coverImage: IMG.baby,
      price: 1_250_000,
      mode: "FIXED",
    },
    {
      sellerIdx: 2,
      name: "Shiro Utsuri 38cm",
      category: "NON_GOSANKE",
      bloodline: "Nirwana",
      breederName: "Nirwana",
      sizeCm: 38,
      ageMonths: 18,
      sex: "Female",
      description: "Utsuri sumi jelas dengan shiroji bersih. Harga hobbyist-friendly.",
      coverImage: IMG.rare,
      price: 3_400_000,
      mode: "FIXED",
    },
    {
      sellerIdx: 3,
      name: "Ginrin Sanke 62cm Jumbo",
      category: "JUMBO_KOI",
      bloodline: "Omosako",
      breederName: "Omosako",
      sizeCm: 62,
      ageMonths: 36,
      sex: "Female",
      description:
        "Ginrin Sanke jumbo body massive. Kirikin full body, worthy showpiece.",
      coverImage: IMG.jumbo,
      price: 42_000_000,
      mode: "AUCTION",
      startingBid: 20_000_000,
      durationHours: 96,
      featured: true,
    },
    {
      sellerIdx: 3,
      name: "Benigoi Ochiba 50cm",
      category: "RARE_COLLECTION",
      bloodline: "Omosako",
      breederName: "Omosako",
      sizeCm: 50,
      ageMonths: 30,
      sex: "Female",
      description: "Rare Ochiba ginrin langka. Kapur kepala light pattern lembut.",
      coverImage: IMG.rare,
      price: 15_000_000,
      mode: "AUCTION",
      startingBid: 6_000_000,
      durationHours: 60,
      memberOnly: true,
      minTier: "SILVER",
    },
    {
      sellerIdx: 0,
      name: "Showa Sanshoku 45cm",
      category: "GOSANKE_SHOWA",
      bloodline: "Hiroshima",
      breederName: "Sakai",
      sizeCm: 45,
      ageMonths: 24,
      sex: "Male",
      description: "Showa bloodline Sakai dengan sumi progresif. Price below market.",
      coverImage: IMG.showa,
      price: 7_500_000,
      mode: "FIXED",
    },
  ];

  for (const l of listings) {
    const seller = sellerRecords[l.sellerIdx];
    const slug = `${slugify(l.name)}-${slugify(seller.farmName).slice(0, 6)}`;
    const existing = await prisma.koi.findUnique({ where: { slug } });
    if (existing) continue;

    const koi = await prisma.koi.create({
      data: {
        sellerId: seller.id,
        name: l.name,
        slug,
        category: l.category,
        bloodline: l.bloodline,
        breederName: l.breederName,
        sizeCm: l.sizeCm,
        ageMonths: l.ageMonths,
        sex: l.sex,
        description: l.description,
        coverImage: l.coverImage,
        price: l.price,
        mode: l.mode,
        status: "ACTIVE",
        featured: l.featured ?? false,
      },
    });

    if (l.mode === "AUCTION") {
      const duration = l.durationHours ?? 48;
      const now = new Date();
      await prisma.auction.create({
        data: {
          koiId: koi.id,
          startingBid: l.startingBid ?? 1_000_000,
          currentBid: l.startingBid ?? 1_000_000,
          minIncrement: 500_000,
          startTime: now,
          endTime: new Date(now.getTime() + duration * 3600_000),
          status: "LIVE",
          memberOnly: l.memberOnly ?? false,
          minTier: l.minTier ?? "NONE",
        },
      });
    }
  }

  // Platform setting
  const existingSetting = await prisma.platformSetting.findFirst();
  if (!existingSetting) {
    await prisma.platformSetting.create({ data: {} });
  }

  // Community posts
  const randomUser = await prisma.user.findFirst({ where: { role: "BUYER" } });
  if (randomUser) {
    const count = await prisma.communityPost.count();
    if (count === 0) {
      await prisma.communityPost.createMany({
        data: [
          {
            userId: randomUser.id,
            title: "Koleksi Showa pertama saya!",
            body: "Sharing koi Showa yang baru tiba dari Sakai. Packing-nya rapi, ikan sampe sehat banget.",
            imageUrl: IMG.showa,
          },
          {
            userId: randomUser.id,
            title: "Tips karantina koi baru datang",
            body: "Pastikan suhu air, salt ratio 0.3%, dan jangan langsung mix sama koi existing. Minimal 14 hari karantina.",
          },
        ],
      });
    }
  }

  console.log("✅ Seed selesai. Login admin: admin@mafiakoi.id / admin123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
