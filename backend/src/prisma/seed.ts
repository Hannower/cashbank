import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'hannowersousa@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email: { equals: adminEmail, mode: 'insensitive' } },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin', status: 'active' },
    });
    console.log(`✅ Usuário administrador configurado com sucesso: ${user.email} (role: admin)`);
  } else {
    console.log(`ℹ️ Usuário ${adminEmail} ainda não cadastrado. Será atribuído role='admin' automaticamente ao realizar cadastro ou login.`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
