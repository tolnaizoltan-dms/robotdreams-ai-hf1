import { PrismaClient } from '../generated/client/index.js';
import { plants } from './plants.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();
  const result = await prisma.product.createMany({ data: plants });
  console.log(`Seed kész: ${result.count} növény betöltve.`);
}

main()
  .catch((e) => {
    console.error('Seed hiba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
