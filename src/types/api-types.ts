// Extracted types from the Modern Classrooms API
// These are the minimal types needed for the checklist demo

export type ActivityType =
  | 'INQUIRY_ACTIVITY'
  | 'VIDEO_AND_NOTES'
  | 'PRACTICE_PROBLEMS'
  | 'ADDITIONAL_PRACTICE'
  | 'MASTERY_CHECK'
  | 'EXTENSION'
  | 'WARM_UP'
  | 'PROBLEM_SET'

export type ActivityClassification = 'ASPIRE_TO_DO' | 'MUST_DO' | 'SHOULD_DO'

export type Workstyle = 'COLLABORATIVE' | 'INDEPENDENT'

export type ResourceType =
  | 'WARM_UP_SLIDE'
  | 'VIDEO_SLIDES'
  | 'GUIDED_NOTES'
  | 'EXEMPLAR_VIDEO'
  | 'INQUIRY_ACTIVITY_WORKSHEET'
  | 'PRACTICE_PROBLEMS'
  | 'EXTENSION_ACTIVITY_WORKSHEET'
  | 'ADDITIONAL_PRACTICE'
  | 'MASTERY_CHECK'
  | 'PROGRESS_TRACKER'
  | 'EDUCATOR_CHECKLIST'
  | 'FACILITATION_GUIDANCE'
  | 'ACTIVITY_MATERIALS'
  | 'WARM_UP_WORKSHEET'
  | 'MATERIALS_NEEDED'
  | 'EXEMPLAR_VIDEO_LINK'
  | 'EXEMPLAR_VIDEO_FILE'
  | 'PROBLEM_SET'
  | 'REFERENCE_SHEET'
  | 'OTHER'

export interface ResourceEntity {
  id: string
  type: ResourceType
  url: string | null
  name: string
  description: string | null
  externalId: string | null
  content: string | null
  activityId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ClassActivityEntity {
  activityId: string
  classId: string
  dueDate?: string | null
  skip: boolean
}

export interface ActivityEntity {
  id: string
  name: string
  classification: ActivityClassification
  type: ActivityType
  workstyle: Workstyle
  order: number
  description: string
  showInTracker: boolean
  timeRequired: string
  externalId: string
  lessonId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  trackedActivities: unknown[]
  lesson: LessonEntity
  resources: ResourceEntity[]
  classActivities: ClassActivityEntity[]
}

export interface LessonEntity {
  id: string
  lessonNumber: string
  name: string
  order: number
  description: string
  learningTarget: string
  externalId: string
  sectionId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  section: SectionEntity
  activities: ActivityEntity[]
}

export interface SectionEntity {
  id: string
  name: string
  sectionLetter: string
  order: number
  description: string
  externalId: string
  unitId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  lessons: LessonEntity[]
  unit: UnitEntity
}

export interface UnitEntity {
  id: string
  name: string
  unitNumber: string
  order: number
  description: string
  externalId: string
  courseId: string
  classCourseId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  sections: SectionEntity[]
  course: CourseEntity
}

export interface CourseEntity {
  id: string
  name: string
  order: number
  description: string
  externalId: string
  createdBy: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  classes: ClassEntity[]
  units: UnitEntity[]
}

export interface ClassEntity {
  id: string
  name: string
  schoolId: string
  courseId: string
  classCourseId: string
  createdAt: string
  updatedAt: string
  school: unknown
  students: unknown[]
  classUsers: unknown[]
  activities: unknown[]
}
