type EnvRecord = Record<string, string | undefined>

function getEnv() {
  return (import.meta as ImportMeta & { env?: EnvRecord }).env || {}
}

function readEnv(key: string, fallback: string): string {
  const value = getEnv()[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export const APPWRITE_ENDPOINT = readEnv('VITE_APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1')
export const APPWRITE_PROJECT_ID = readEnv('VITE_APPWRITE_PROJECT_ID', 'rainbowrain')

export const MINDGUARD_DATABASE_ID = readEnv(
  'VITE_APPWRITE_MINDGUARD_DATABASE_ID',
  readEnv('VITE_APPWRITE_DATABASE_ID', 'mindguard')
)
export const UNISMART_DATABASE_ID = readEnv('VITE_APPWRITE_UNISMART_DATABASE_ID', 'unismart')

export const USERS_TABLE_ID = readEnv('VITE_APPWRITE_USERS_TABLE_ID', 'users')
export const USER_SESSIONS_TABLE_ID = readEnv('VITE_APPWRITE_USER_SESSIONS_TABLE_ID', 'user_sessions')
export const JOURNALS_TABLE_ID = readEnv('VITE_APPWRITE_JOURNALS_TABLE_ID', 'journals')
export const POSTS_TABLE_ID = readEnv('VITE_APPWRITE_POSTS_TABLE_ID', 'posts')
export const COMMENTS_TABLE_ID = readEnv('VITE_APPWRITE_COMMENTS_TABLE_ID', 'comments')
export const CHECKINS_TABLE_ID = readEnv('VITE_APPWRITE_CHECKINS_TABLE_ID', 'checkins')

export const STUDY_CHECKINS_TABLE_ID = readEnv('VITE_APPWRITE_STUDY_CHECKINS_TABLE_ID', 'study_checkins')
export const TASKS_TABLE_ID = readEnv('VITE_APPWRITE_TASKS_TABLE_ID', 'tasks')
export const SUGGESTIONS_TABLE_ID = readEnv('VITE_APPWRITE_SUGGESTIONS_TABLE_ID', 'suggestions')
export const TASK_SUGGESTIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_TASK_SUGGESTIONS_TABLE_ID',
  'task_suggestions'
)
export const MENTAL_HEALTH_ASSESSMENTS_TABLE_ID = readEnv(
  'VITE_APPWRITE_MENTAL_HEALTH_ASSESSMENTS_TABLE_ID',
  'mental_health_assessments'
)
/** Table for user self-assessment results (心理测评); pipeline uses mental_health_assessments. */
export const USER_EVALUATION_RESULTS_TABLE_ID = readEnv(
  'VITE_APPWRITE_USER_EVALUATION_RESULTS_TABLE_ID',
  'user_evaluation_results'
)
export const MENTAL_HEALTH_INTERVENTIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_MENTAL_HEALTH_INTERVENTIONS_TABLE_ID',
  'mental_health_interventions'
)
export const POST_INTERACTIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_POST_INTERACTIONS_TABLE_ID',
  'post_interactions'
)
export const RISK_FLAGS_TABLE_ID = readEnv('VITE_APPWRITE_RISK_FLAGS_TABLE_ID', 'risk_flags')
export const CONVERSATIONS_TABLE_ID = readEnv('VITE_APPWRITE_CONVERSATIONS_TABLE_ID', 'conversations')
export const CONVERSATION_MEMBERS_TABLE_ID = readEnv(
  'VITE_APPWRITE_CONVERSATION_MEMBERS_TABLE_ID',
  'conversation_members'
)
export const MESSAGES_TABLE_ID = readEnv('VITE_APPWRITE_MESSAGES_TABLE_ID', 'messages')
export const FOLLOWS_TABLE_ID = readEnv('VITE_APPWRITE_FOLLOWS_TABLE_ID', 'follows')
export const NOTIFICATIONS_TABLE_ID = readEnv('VITE_APPWRITE_NOTIFICATIONS_TABLE_ID', 'notifications')
export const JW_LOGIN_CHALLENGES_TABLE_ID = readEnv(
  'VITE_APPWRITE_JW_LOGIN_CHALLENGES_TABLE_ID',
  'jw_login_challenges'
)
export const FOLLOWS_FUNCTION_ID = readEnv('VITE_APPWRITE_FOLLOWS_FUNCTION_ID', 'follows-manager')
export const PRIVATE_MESSAGING_FUNCTION_ID = readEnv(
  'VITE_APPWRITE_PRIVATE_MESSAGING_FUNCTION_ID',
  'private-messaging'
)
export const EDUCATION_JW_FUNCTION_ID = readEnv('VITE_APPWRITE_EDUCATION_JW_FUNCTION_ID', 'education-jw')
export const MENTAL_HEALTH_PIPELINE_FUNCTION_ID = readEnv(
  'VITE_APPWRITE_MENTAL_HEALTH_PIPELINE_FUNCTION_ID',
  'mental-health-pipeline'
)

export const EVENTS_TABLE_ID = readEnv('VITE_APPWRITE_EVENTS_TABLE_ID', 'events')
export const EVENT_REGISTRATIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_EVENT_REGISTRATIONS_TABLE_ID',
  'event_registrations'
)
export const MARKET_ITEMS_TABLE_ID = readEnv('VITE_APPWRITE_MARKET_ITEMS_TABLE_ID', 'market_items')
export const JOB_LISTINGS_TABLE_ID = readEnv('VITE_APPWRITE_JOB_LISTINGS_TABLE_ID', 'job_listings')
export const STUDY_MATERIALS_TABLE_ID = readEnv(
  'VITE_APPWRITE_STUDY_MATERIALS_TABLE_ID',
  'study_materials'
)
export const EXAM_PLANS_TABLE_ID = readEnv('VITE_APPWRITE_EXAM_PLANS_TABLE_ID', 'exam_plans')
export const VENUES_TABLE_ID = readEnv('VITE_APPWRITE_VENUES_TABLE_ID', 'venues')
export const VENUE_RESERVATIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_VENUE_RESERVATIONS_TABLE_ID',
  'venue_reservations'
)

export const POINT_BALANCES_TABLE_ID = readEnv('VITE_APPWRITE_POINT_BALANCES_TABLE_ID', 'point_balances')
export const POINT_TRANSACTIONS_TABLE_ID = readEnv(
  'VITE_APPWRITE_POINT_TRANSACTIONS_TABLE_ID',
  'point_transactions'
)
export const USER_ACHIEVEMENTS_TABLE_ID = readEnv(
  'VITE_APPWRITE_USER_ACHIEVEMENTS_TABLE_ID',
  'user_achievements'
)
export const ROBOT_INVENTORY_TABLE_ID = readEnv('VITE_APPWRITE_ROBOT_INVENTORY_TABLE_ID', 'robot_inventory')

export const TEACHING_DATABASE_ID = readEnv('VITE_APPWRITE_TEACHING_DATABASE_ID', 'teaching')
export const LESSON_PLANS_TABLE_ID = readEnv('VITE_APPWRITE_LESSON_PLANS_TABLE_ID', 'lesson_plans')

export interface AppwriteConfig {
  endpoint: string
  projectId: string
  databaseId: string
  unismartDatabaseId: string
  usersTableId: string
  userSessionsTableId: string
  journalsTableId: string
  postsTableId: string
  commentsTableId: string
  checkinsTableId: string

  studyCheckinsTableId: string
  tasksTableId: string
  suggestionsTableId: string
  taskSuggestionsTableId: string
  mentalHealthAssessmentsTableId: string
  userEvaluationResultsTableId: string
  mentalHealthInterventionsTableId: string
  postInteractionsTableId: string
  riskFlagsTableId: string
  conversationsTableId: string
  conversationMembersTableId: string
  messagesTableId: string
  followsTableId: string
  notificationsTableId: string
  jwLoginChallengesTableId: string
  followsFunctionId: string
  privateMessagingFunctionId: string
  educationJwFunctionId: string
  mentalHealthPipelineFunctionId: string

  marketItemsTableId: string
  studyMaterialsTableId: string
  jobListingsTableId: string
  eventsTableId: string
  eventRegistrationsTableId: string
  examPlansTableId: string
  venuesTableId: string
  venueReservationsTableId: string

  pointBalancesTableId: string
  pointTransactionsTableId: string
  userAchievementsTableId: string
  robotInventoryTableId: string

  teachingDatabaseId: string
  lessonPlansTableId: string
}

export const config: AppwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: MINDGUARD_DATABASE_ID,
  unismartDatabaseId: UNISMART_DATABASE_ID,
  usersTableId: USERS_TABLE_ID,
  userSessionsTableId: USER_SESSIONS_TABLE_ID,
  journalsTableId: JOURNALS_TABLE_ID,
  postsTableId: POSTS_TABLE_ID,
  commentsTableId: COMMENTS_TABLE_ID,
  checkinsTableId: CHECKINS_TABLE_ID,

  studyCheckinsTableId: STUDY_CHECKINS_TABLE_ID,
  tasksTableId: TASKS_TABLE_ID,
  suggestionsTableId: SUGGESTIONS_TABLE_ID,
  taskSuggestionsTableId: TASK_SUGGESTIONS_TABLE_ID,
  mentalHealthAssessmentsTableId: MENTAL_HEALTH_ASSESSMENTS_TABLE_ID,
  userEvaluationResultsTableId: USER_EVALUATION_RESULTS_TABLE_ID,
  mentalHealthInterventionsTableId: MENTAL_HEALTH_INTERVENTIONS_TABLE_ID,
  postInteractionsTableId: POST_INTERACTIONS_TABLE_ID,
  riskFlagsTableId: RISK_FLAGS_TABLE_ID,
  conversationsTableId: CONVERSATIONS_TABLE_ID,
  conversationMembersTableId: CONVERSATION_MEMBERS_TABLE_ID,
  messagesTableId: MESSAGES_TABLE_ID,
  followsTableId: FOLLOWS_TABLE_ID,
  notificationsTableId: NOTIFICATIONS_TABLE_ID,
  jwLoginChallengesTableId: JW_LOGIN_CHALLENGES_TABLE_ID,
  followsFunctionId: FOLLOWS_FUNCTION_ID,
  privateMessagingFunctionId: PRIVATE_MESSAGING_FUNCTION_ID,
  educationJwFunctionId: EDUCATION_JW_FUNCTION_ID,
  mentalHealthPipelineFunctionId: MENTAL_HEALTH_PIPELINE_FUNCTION_ID,
  marketItemsTableId: MARKET_ITEMS_TABLE_ID,
  studyMaterialsTableId: STUDY_MATERIALS_TABLE_ID,
  jobListingsTableId: JOB_LISTINGS_TABLE_ID,
  eventsTableId: EVENTS_TABLE_ID,
  eventRegistrationsTableId: EVENT_REGISTRATIONS_TABLE_ID,
  examPlansTableId: EXAM_PLANS_TABLE_ID,
  venuesTableId: VENUES_TABLE_ID,
  venueReservationsTableId: VENUE_RESERVATIONS_TABLE_ID,

  pointBalancesTableId: POINT_BALANCES_TABLE_ID,
  pointTransactionsTableId: POINT_TRANSACTIONS_TABLE_ID,
  userAchievementsTableId: USER_ACHIEVEMENTS_TABLE_ID,
  robotInventoryTableId: ROBOT_INVENTORY_TABLE_ID,

  teachingDatabaseId: TEACHING_DATABASE_ID,
  lessonPlansTableId: LESSON_PLANS_TABLE_ID
}
