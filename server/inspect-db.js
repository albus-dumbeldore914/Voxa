const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== USERS COUNT:', users.length);
  console.log(users.map(u => ({ id: u.id, name: u.name, phone: u.phone, email: u.email })));

  const convs = await prisma.conversation.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true }
          }
        }
      },
      messages: true
    }
  });
  console.log('=== CONVERSATIONS COUNT:', convs.length);
  console.log(JSON.stringify(convs, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
