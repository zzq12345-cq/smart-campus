export type JobCategory = 'campus_job' | 'part_time' | 'internship' | 'volunteer'
export type JobStatus = 'recruiting' | 'filled'

export interface JobListing {
  $id: string
  $createdAt: string
  $updatedAt: string
  authorId: string
  title: string
  description: string
  salary: string
  workTime: string
  location: string
  contactInfo: string
  requirements: string
  category: JobCategory
  status: JobStatus
  deadline: string
}

export interface JobListingCreateData {
  title: string
  description: string
  salary: string
  workTime: string
  location: string
  contactInfo: string
  requirements?: string
  category: JobCategory
  deadline?: string
}

export interface JobListingListOptions {
  category?: JobCategory | 'all'
  status?: JobStatus
  limit?: number
  offset?: number
}
