import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const CATEGORIES = [
  { id: "eletricista", name: "Eletricista", iconName: "Zap", description: "Instalação elétrica, reparações de curtos-circuitos e manutenção." },
  { id: "canalizador", name: "Canalizador", iconName: "Droplet", description: "Resolução de fugas, instalação de torneiras e desentupimentos." },
  { id: "carpinteiro", name: "Carpinteiro", iconName: "Hammer", description: "Mobiliário sob medida, reparação de portas e estruturas de madeira." },
  { id: "pedreiro", name: "Pedreiro", iconName: "Construction", description: "Construção, reboco, assentamento de blocos e azulejos." },
  { id: "informatica", name: "Técnico de Informática", iconName: "Laptop", description: "Reparação de computadores, redes domésticas e suporte técnico." },
  { id: "limpeza", name: "Serviços de Limpeza", iconName: "Sparkles", description: "Limpeza doméstica recorrente, pós-obra ou pós-evento." },
  { id: "pintura", name: "Pintor", iconName: "Paintbrush", description: "Pintura interior e exterior, impermeabilização de paredes." },
  { id: "mecanico", name: "Mecânico", iconName: "Wrench", description: "Manutenção de automóveis, diagnóstico e reparações mecânicas." },
  { id: "ar_condicionado", name: "Ar Condicionado", iconName: "Wind", description: "Instalação, limpeza de filtros, carregamento de gás e reparação." },
];

const SAMPLE_PROFESSIONALS = [
  {
    ownerEmail: "carlos.semedo@example.cv",
    ownerName: "Carlos Semedo",
    categoryId: "eletricista",
    island: "Santiago",
    zone: "Praia (Palmarejo)",
    phone: "+238 991 34 52",
    whatsapp: "+238 991 34 52",
    bio: "Eletricista certificado com mais de 8 anos de experiência em instalações residenciais e industriais na Praia.",
    avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&q=80",
    startingPrice: 1500,
    services: ["Instalação de tomadas, interruptores e lâmpadas", "Diagnóstico e reparação de curtos-circuitos"],
    availability: "Segunda a Sábado, 08:00 - 18:00",
    verified: true,
  },
  {
    ownerEmail: "arlindo.delgado@example.cv",
    ownerName: "Arlindo Delgado",
    categoryId: "canalizador",
    island: "São Vicente",
    zone: "Mindelo (Chã de Alecrim)",
    phone: "+238 985 12 78",
    whatsapp: "+238 985 12 78",
    bio: "Técnico de canalização experiente em São Vicente. Resposta imediata a fugas e desentupimentos.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    startingPrice: 1200,
    services: ["Resolução de fugas e humidades", "Desentupimento de pias e sanitas"],
    availability: "Todos os dias, 24 horas (Serviço de Urgência)",
    verified: true,
  },
  {
    ownerEmail: "vera.lopes@example.cv",
    ownerName: "Vera Lopes",
    categoryId: "limpeza",
    island: "Santiago",
    zone: "Praia (Achada St. António)",
    phone: "+238 912 45 61",
    whatsapp: "+238 912 45 61",
    bio: "Especialista em limpeza residencial profunda e limpeza de escritórios na cidade da Praia.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    startingPrice: 800,
    services: ["Limpeza doméstica regular", "Limpeza profunda pós-obra"],
    availability: "Segunda a Sexta, 08:00 - 17:00",
    verified: true,
  },
];

async function main() {
  console.log("A semear categorias...");
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: { ...category, active: true },
    });
  }

  console.log("A semear utilizador administrador...");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        name: process.env.ADMIN_NAME ?? "Administrador",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`   admin pronto: ${adminEmail}`);
  } else {
    console.warn("   ADMIN_EMAIL/ADMIN_PASSWORD nao definidos - a saltar bootstrap do admin.");
  }

  console.log("A semear profissionais de exemplo...");
  const demoPasswordHash = await hashPassword("Demo1234"); // ver docs/API.md para credenciais de demonstracao

  for (const sample of SAMPLE_PROFESSIONALS) {
    const owner = await prisma.user.upsert({
      where: { email: sample.ownerEmail },
      update: {},
      create: {
        name: sample.ownerName,
        email: sample.ownerEmail,
        passwordHash: demoPasswordHash,
        role: "PROFESSIONAL",
      },
    });

    await prisma.professional.upsert({
      where: { ownerId: owner.id },
      update: {},
      create: {
        ownerId: owner.id,
        name: sample.ownerName,
        categoryId: sample.categoryId,
        island: sample.island,
        zone: sample.zone,
        phone: sample.phone,
        whatsapp: sample.whatsapp,
        bio: sample.bio,
        avatar: sample.avatar,
        startingPrice: sample.startingPrice,
        services: sample.services,
        portfolio: [],
        availability: sample.availability,
        status: "APPROVED",
        active: true,
        verified: sample.verified,
        reviewedAt: new Date(),
      },
    });
  }

  console.log("Seed concluido.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
