import { ActivityKind, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STARTER_LESSON_ID = "10000000-0000-4000-8000-000000000001";
const GREETINGS_DECK_ID = "40000000-0000-4000-8000-000000000001";

const STARTER_ACTIVITIES = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    versionId: "30000000-0000-4000-8000-000000000001",
    sortOrder: 1,
    prompt: "Which Spanish phrase means “Hello”?",
    choices: [
      { id: "hola", label: "Hola" },
      { id: "gracias", label: "Gracias" },
      { id: "adios", label: "Adiós" },
    ],
    correctChoiceId: "hola",
    correctFeedback: "¡Muy bien! Hola means hello.",
    incorrectFeedback: "Try again: hola is the everyday greeting.",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    versionId: "30000000-0000-4000-8000-000000000002",
    sortOrder: 2,
    prompt: "How do you say “Thank you” in Spanish?",
    choices: [
      { id: "por-favor", label: "Por favor" },
      { id: "gracias", label: "Gracias" },
      { id: "buenas-noches", label: "Buenas noches" },
    ],
    correctChoiceId: "gracias",
    correctFeedback: "Exactly—gracias means thank you.",
    incorrectFeedback: "Keep going: gracias is the phrase for thank you.",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    versionId: "30000000-0000-4000-8000-000000000003",
    sortOrder: 3,
    prompt: "Choose the phrase for “Goodbye.”",
    choices: [
      { id: "adios", label: "Adiós" },
      { id: "hola", label: "Hola" },
      { id: "si", label: "Sí" },
    ],
    correctChoiceId: "adios",
    correctFeedback: "That’s it—adiós means goodbye.",
    incorrectFeedback: "One more try: adiós is the goodbye phrase.",
  },
] as const;

const STARTER_PHRASES = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    sortOrder: 1,
    sourceText: "Hello",
    targetText: "Hola",
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    sortOrder: 2,
    sourceText: "Please",
    targetText: "Por favor",
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    sortOrder: 3,
    sourceText: "Thank you",
    targetText: "Gracias",
  },
  {
    id: "50000000-0000-4000-8000-000000000004",
    sortOrder: 4,
    sourceText: "Goodbye",
    targetText: "Adiós",
  },
] as const;

async function main(): Promise<void> {
  await prisma.systemMetadata.upsert({
    where: { key: "platform.foundation" },
    update: { value: "sprint-1" },
    create: {
      key: "platform.foundation",
      value: "sprint-1",
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: { slug: "first-conversations" },
    update: {
      title: "First conversations",
      description: "Build a friendly first exchange with greetings and everyday courtesy.",
      sortOrder: 1,
      requiredEntitlementKey: null,
      archivedAt: null,
    },
    create: {
      id: STARTER_LESSON_ID,
      slug: "first-conversations",
      title: "First conversations",
      description: "Build a friendly first exchange with greetings and everyday courtesy.",
      sortOrder: 1,
    },
  });

  for (const activity of STARTER_ACTIVITIES) {
    await prisma.activity.upsert({
      where: { id: activity.id },
      update: {
        lessonId: lesson.id,
        kind: ActivityKind.PHRASE_CHOICE,
        sortOrder: activity.sortOrder,
        requiredEntitlementKey: null,
        archivedAt: null,
      },
      create: {
        id: activity.id,
        lessonId: lesson.id,
        kind: ActivityKind.PHRASE_CHOICE,
        sortOrder: activity.sortOrder,
      },
    });

    await prisma.activityVersion.createMany({
      data: [
        {
          id: activity.versionId,
          activityId: activity.id,
          contentVersion: 1,
          prompt: activity.prompt,
          choices: activity.choices,
          feedback: {
            correct: activity.correctFeedback,
            incorrect: activity.incorrectFeedback,
          },
          validation: { correctChoiceId: activity.correctChoiceId },
          publishedAt: new Date("2026-10-18T00:00:00.000Z"),
        },
      ],
      skipDuplicates: true,
    });

    await prisma.activity.updateMany({
      where: { id: activity.id, publishedVersion: null },
      data: { publishedVersion: 1 },
    });
  }

  const deck = await prisma.phraseDeck.upsert({
    where: { slug: "everyday-greetings" },
    update: {
      title: "Everyday greetings",
      description: "Four useful phrases for a warm first exchange.",
      sourceLocale: "en",
      targetLocale: "es",
      requiredEntitlementKey: null,
      archivedAt: null,
    },
    create: {
      id: GREETINGS_DECK_ID,
      slug: "everyday-greetings",
      title: "Everyday greetings",
      description: "Four useful phrases for a warm first exchange.",
      sourceLocale: "en",
      targetLocale: "es",
    },
  });

  for (const phrase of STARTER_PHRASES) {
    await prisma.phrase.upsert({
      where: { id: phrase.id },
      update: {
        deckId: deck.id,
        sortOrder: phrase.sortOrder,
        sourceText: phrase.sourceText,
        targetText: phrase.targetText,
      },
      create: { ...phrase, deckId: deck.id },
    });
  }

  await prisma.lessonPhraseDeck.upsert({
    where: { lessonId_deckId: { lessonId: lesson.id, deckId: deck.id } },
    update: { sortOrder: 1 },
    create: {
      id: "60000000-0000-4000-8000-000000000001",
      lessonId: lesson.id,
      deckId: deck.id,
      sortOrder: 1,
    },
  });
}

main()
  .catch(() => {
    console.error("Database seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
