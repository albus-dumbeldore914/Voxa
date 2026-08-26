import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial VOXA users and chats...');

  // 1. Create or upsert users
  const rahul = await prisma.user.upsert({
    where: { phone: '+91 98111 22334' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      phone: '+91 98111 22334',
      email: 'rahul@voxa.app',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      bio: 'Coffee, code, and chill ☕',
      isOnline: true,
    },
  });

  const priya = await prisma.user.upsert({
    where: { phone: '+91 98222 33445' },
    update: {},
    create: {
      name: 'Priya Patel',
      phone: '+91 98222 33445',
      email: 'priya@voxa.app',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Product Designer @ Studio 🎨',
      isOnline: true,
    },
  });

  const arjun = await prisma.user.upsert({
    where: { phone: '+91 98333 44556' },
    update: {},
    create: {
      name: 'Arjun Mehta',
      phone: '+91 98333 44556',
      email: 'arjun@voxa.app',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Let’s build something great 🚀',
      isOnline: false,
    },
  });

  const akash = await prisma.user.upsert({
    where: { phone: '+91 98444 55667' },
    update: {},
    create: {
      name: 'Akash Gupta',
      phone: '+91 98444 55667',
      email: 'akash@voxa.app',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Always up for a short convo! 💬',
      isOnline: false,
    },
  });

  const sneha = await prisma.user.upsert({
    where: { phone: '+91 98555 66778' },
    update: {},
    create: {
      name: 'Sneha Reddy',
      phone: '+91 98555 66778',
      email: 'sneha@voxa.app',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Music enthusiast & traveler 🎧',
      isOnline: true,
    },
  });

  console.log(`Seeded 5 users: ${rahul.name}, ${priya.name}, ${arjun.name}, ${akash.name}, ${sneha.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
