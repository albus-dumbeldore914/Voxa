const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany({});
  await prisma.conversationMember.deleteMany({});
  await prisma.conversation.deleteMany({});
  const deleted = await prisma.user.deleteMany({
    where: {
      name: { in: ['Rahul Sharma', 'Priya Patel', 'Arjun Mehta', 'Akash Gupta', 'Sneha Reddy'] }
    }
  });
  console.log('Cleared seeded users:', deleted.count);
  await prisma.$disconnect();
}

main().catch(console.error);
