/** 教师可选主教科目 */
export type TeacherSubject = 'chinese' | 'math' | 'english' | 'politics'

/** 科目配置 */
export interface SubjectConfig {
  id: TeacherSubject
  /** 中文名称 */
  name: string
  /** 英文名称 */
  nameEn: string
  /** Material Symbols 图标名 */
  icon: string
  /** 主题色 */
  color: string
  /** 浅色背景 */
  colorLight: string
  /** 渐变色 */
  gradient: string
  /** 中文描述 */
  description: string
  /** 英文描述 */
  descriptionEn: string
}

/** 所有可选科目列表 */
export const SUBJECT_LIST: SubjectConfig[] = [
  {
    id: 'chinese',
    name: '语文',
    nameEn: 'Chinese',
    icon: 'edit_note',
    color: '#E05A3A',
    colorLight: 'rgba(224, 90, 58, 0.12)',
    gradient: 'linear-gradient(135deg, rgba(224, 90, 58, 0.22), rgba(224, 90, 58, 0.06))',
    description: '阅读理解、写作表达、古诗文鉴赏',
    descriptionEn: 'Reading, Writing, Classical Literature'
  },
  {
    id: 'math',
    name: '数学',
    nameEn: 'Math',
    icon: 'calculate',
    color: '#3B82F6',
    colorLight: 'rgba(59, 130, 246, 0.12)',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(59, 130, 246, 0.06))',
    description: '代数运算、几何证明、数据分析',
    descriptionEn: 'Algebra, Geometry, Data Analysis'
  },
  {
    id: 'english',
    name: '英语',
    nameEn: 'English',
    icon: 'translate',
    color: '#10B981',
    colorLight: 'rgba(16, 185, 129, 0.12)',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.06))',
    description: '听说读写、语法词汇、文化交际',
    descriptionEn: 'Listening, Speaking, Reading, Writing'
  },
  {
    id: 'politics',
    name: '思政',
    nameEn: 'Politics',
    icon: 'gavel',
    color: '#C00000',
    colorLight: 'rgba(192, 0, 0, 0.12)',
    gradient: 'linear-gradient(135deg, rgba(192, 0, 0, 0.22), rgba(192, 0, 0, 0.06))',
    description: '思想政治、道德与法治、时政热点',
    descriptionEn: 'Ideology, Ethics & Law, Current Affairs'
  }
]

/** 科目 ID => 配置 映射 */
export const SUBJECT_MAP: Record<TeacherSubject, SubjectConfig> = Object.fromEntries(
  SUBJECT_LIST.map(s => [s.id, s])
) as Record<TeacherSubject, SubjectConfig>

/** 获取科目配置，找不到返回 null */
export function getSubjectConfig(id?: string | null): SubjectConfig | null {
  if (!id) return null
  return SUBJECT_MAP[id as TeacherSubject] ?? null
}

/** 教学区主题色 */
export const TEACHING_PRIMARY = '#C00000'
