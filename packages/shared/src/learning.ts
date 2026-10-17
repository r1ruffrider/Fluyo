export const LEARNING_PATHS = {
  dashboard: "/learning/dashboard",
  lessons: "/lessons",
  lesson: "/lessons/:lessonId",
  phraseDecks: "/phrase-decks",
  activityAttempts: "/activities/:activityId/attempts",
  goal: "/learning-goals/me",
  preferences: "/learning-preferences/me",
  notificationPreferences: "/notification-preferences/me",
} as const;

export const LEARNING_DEFAULT_PAGE_LIMIT = 20;
export const LEARNING_MAX_PAGE_LIMIT = 50;
export const LEARNING_DEFAULT_DAILY_TARGET = 3;
export const LEARNING_MIN_DAILY_TARGET = 1;
export const LEARNING_MAX_DAILY_TARGET = 20;

export const ACTIVITY_KINDS = ["phrase_choice"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_ATTEMPT_RESULTS = ["correct", "incorrect"] as const;
export type ActivityAttemptResult = (typeof ACTIVITY_ATTEMPT_RESULTS)[number];

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CatalogListQuery {
  cursor?: string;
  limit?: number;
}

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  activityCount: number;
}

export interface ActivityChoice {
  id: string;
  label: string;
}

export interface PhraseChoiceActivity {
  id: string;
  kind: "phrase_choice";
  contentVersion: number;
  prompt: string;
  choices: ActivityChoice[];
}

export type PublishedActivity = PhraseChoiceActivity;

export interface Phrase {
  id: string;
  sourceText: string;
  targetText: string;
}

export interface PhraseDeckSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sourceLocale: string;
  targetLocale: string;
  phraseCount: number;
}

export interface PhraseDeck extends PhraseDeckSummary {
  phrases: Phrase[];
}

export interface LessonDetail extends LessonSummary {
  activities: PublishedActivity[];
  phraseDecks: PhraseDeck[];
}

export type LessonsResponse = CursorPage<LessonSummary>;
export type PhraseDecksResponse = CursorPage<PhraseDeckSummary>;

export interface SubmitActivityAttemptRequest {
  contentVersion: number;
  selectedChoiceId: string;
}

export interface LessonProgressSummary {
  lessonId: string;
  completedActivityIds: string[];
  nextActivityId: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface SubmitActivityAttemptResponse {
  attemptId: string;
  activityId: string;
  contentVersion: number;
  result: ActivityAttemptResult;
  feedback: string | null;
  completedAt: string;
  progress: LessonProgressSummary;
}

export interface LearningGoal {
  dailyTarget: number;
  updatedAt: string;
}

export interface UpdateLearningGoalRequest {
  dailyTarget: number;
}

export interface LearningPreference {
  timezone: string;
  updatedAt: string;
}

export interface UpdateLearningPreferenceRequest {
  timezone: string;
}

export interface NotificationPreference {
  practiceReminderEnabled: boolean;
  reminderLocalTime: string;
  deliveryAvailable: false;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceRequest {
  practiceReminderEnabled: boolean;
  reminderLocalTime: string;
}

export interface LearningStreak {
  currentDays: number;
  practicedToday: boolean;
  todayCompletedActivities: number;
}

export interface LearningAccessSummary {
  nextActivityAvailable: boolean;
  unavailableReason: "entitlement_required" | "catalog_empty" | null;
}

export interface RecentLessonProgress extends LessonProgressSummary {
  lessonTitle: string;
}

export interface LearningDashboardResponse {
  nextActivity: PublishedActivity | null;
  recentProgress: RecentLessonProgress[];
  goal: LearningGoal;
  streak: LearningStreak;
  learningPreference: LearningPreference;
  notificationPreference: NotificationPreference;
  access: LearningAccessSummary;
}
