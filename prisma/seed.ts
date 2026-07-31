import { PrismaClient } from "@prisma/client";
import { seedDemoContent } from "../lib/seed-demo";

const prisma = new PrismaClient();

seedDemoContent(prisma)
  .then((msg) => console.log(msg))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
