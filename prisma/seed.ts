import { PrismaClient } from "@prisma/client";

// 開發種子資料:兩個系列(舒壓/補運)、四堂課程,影片都指向 mock provider 的範例影片。
const prisma = new PrismaClient();

async function ensureVideo(key: string) {
  return prisma.videoAsset.upsert({
    where: { provider_providerAssetId: { provider: "mock", providerAssetId: key } },
    update: { status: "READY" },
    create: {
      provider: "mock",
      providerAssetId: key,
      status: "READY",
      durationSec: 10,
    },
  });
}

async function main() {
  const stress = await prisma.series.upsert({
    where: { slug: "stress-relief" },
    update: {},
    create: {
      slug: "stress-relief",
      title: "舒壓靜心系列",
      description:
        "在忙碌與焦慮之間,為自己留一段安靜的時光。呼吸、冥想、肢體釋放,一步步放下緊繃。",
      category: "STRESS_RELIEF",
      monthlyPriceTwd: 399,
      published: true,
      sortOrder: 1,
      coverUrl: "/covers/series-stress.png",
    },
  });

  const fortune = await prisma.series.upsert({
    where: { slug: "fortune" },
    update: {},
    create: {
      slug: "fortune",
      title: "補運能量系列",
      description:
        "梳理自身的能量狀態,以儀式與意念練習迎接流動的好運,替生活重新對齊方向。",
      category: "FORTUNE",
      monthlyPriceTwd: 499,
      published: true,
      sortOrder: 2,
      coverUrl: "/covers/series-fortune.png",
    },
  });

  const courses = [
    {
      slug: "breath-reset",
      seriesId: stress.id,
      title: "呼吸重置:十分鐘找回平靜",
      description:
        "以簡單而深層的呼吸法,快速安定神經系統。適合工作間隙與睡前練習。",
      priceTwd: 690,
      sortOrder: 1,
      lessons: ["導言與準備", "基礎呼吸練習", "深層釋放引導"],
    },
    {
      slug: "deep-sleep",
      seriesId: stress.id,
      title: "深眠儀式:夜間放鬆引導",
      description: "從身體掃描到意念放空,一套完整的睡前放鬆儀式,陪你入睡。",
      priceTwd: 890,
      sortOrder: 2,
      lessons: ["夜間準備", "身體掃描", "入眠引導"],
    },
    {
      slug: "energy-cleanse",
      seriesId: fortune.id,
      title: "能量淨化:清理與歸零",
      description: "清理累積的沉重能量,建立日常淨化習慣,讓好運有位置進來。",
      priceTwd: 990,
      sortOrder: 1,
      lessons: ["能量狀態檢視", "淨化儀式實作", "日常維持練習"],
    },
    {
      slug: "luck-alignment",
      seriesId: fortune.id,
      title: "補運對齊:意念與行動",
      description: "以意念設定與具體行動對齊心願,溫柔而有力地推動改變。",
      priceTwd: 1290,
      sortOrder: 2,
      lessons: ["心願盤點", "意念設定儀式", "行動對齊計畫"],
    },
  ];

  for (const c of courses) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        seriesId: c.seriesId,
        title: c.title,
        description: c.description,
        priceTwd: c.priceTwd,
        published: true,
        sortOrder: c.sortOrder,
        coverUrl: `/covers/${c.slug}.png`,
      },
    });
    const existing = await prisma.lesson.count({ where: { courseId: course.id } });
    if (existing === 0) {
      for (let i = 0; i < c.lessons.length; i++) {
        const video = await ensureVideo(`sample-${c.slug}-${i + 1}`);
        await prisma.lesson.create({
          data: {
            courseId: course.id,
            title: c.lessons[i],
            sortOrder: i + 1,
            isFreePreview: i === 0,
            videoAssetId: video.id,
          },
        });
      }
    }
  }

  console.log("Seed 完成:2 系列、4 課程、12 單元");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
