import { prisma } from './src/lib/prisma';

async function test() {
  try {
    const count = await prisma.todo.count();
    console.log('Todo count:', count);
  } catch (e: any) {
    console.error('Error accessing todo model:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
