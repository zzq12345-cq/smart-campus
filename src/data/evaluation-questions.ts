/**
 * Evaluation questions for psychology mood self-check.
 * Scale: 0–3 per item. Structure allows future multiple scales (e.g. scaleId).
 * References: inspired by PHQ-9 / GAD-7 style items; not a clinical diagnosis tool.
 */

import type { EvaluationQuestion } from '@/types/psychology-evaluation'

export const SCALE_ID_MOOD_SCREEN = 'mood_screen'

export const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: 'q1',
    text: '过去一周，你感到心情低落或兴趣减退的频率？',
    textEn: 'Over the past week, how often did you feel down or lose interest?',
    options: [
      { value: 0, label: '几乎没有', labelEn: 'Rarely' },
      { value: 1, label: '偶尔', labelEn: 'Sometimes' },
      { value: 2, label: '经常', labelEn: 'Often' },
      { value: 3, label: '几乎每天', labelEn: 'Almost daily' }
    ]
  },
  {
    id: 'q2',
    text: '过去一周，你感到紧张或焦虑的程度？',
    textEn: 'How tense or anxious did you feel in the past week?',
    options: [
      { value: 0, label: '几乎没有', labelEn: 'Not at all' },
      { value: 1, label: '轻度', labelEn: 'Mild' },
      { value: 2, label: '中度', labelEn: 'Moderate' },
      { value: 3, label: '较重', labelEn: 'Quite a bit' }
    ]
  },
  {
    id: 'q3',
    text: '过去一周，你的睡眠质量如何？',
    textEn: 'How was your sleep quality in the past week?',
    options: [
      { value: 0, label: '很好', labelEn: 'Good' },
      { value: 1, label: '一般', labelEn: 'Okay' },
      { value: 2, label: '较差', labelEn: 'Poor' },
      { value: 3, label: '很差', labelEn: 'Very poor' }
    ]
  },
  {
    id: 'q4',
    text: '过去一周，你做事时能集中注意力吗？',
    textEn: 'Could you focus when doing things in the past week?',
    options: [
      { value: 0, label: '能', labelEn: 'Yes' },
      { value: 1, label: '有时不能', labelEn: 'Sometimes not' },
      { value: 2, label: '经常不能', labelEn: 'Often not' },
      { value: 3, label: '很难', labelEn: 'Hardly' }
    ]
  },
  {
    id: 'q5',
    text: '过去一周，你对自己的整体状态满意吗？',
    textEn: 'How satisfied were you with your overall state in the past week?',
    options: [
      { value: 0, label: '满意', labelEn: 'Satisfied' },
      { value: 1, label: '一般', labelEn: 'So-so' },
      { value: 2, label: '不太满意', labelEn: 'Not really' },
      { value: 3, label: '很不满意', labelEn: 'Not at all' }
    ]
  },
  {
    id: 'q6',
    text: '过去一周，你感到疲劳或精力不足的频率？',
    textEn: 'How often did you feel tired or low on energy in the past week?',
    options: [
      { value: 0, label: '几乎没有', labelEn: 'Rarely' },
      { value: 1, label: '偶尔', labelEn: 'Sometimes' },
      { value: 2, label: '经常', labelEn: 'Often' },
      { value: 3, label: '几乎每天', labelEn: 'Almost daily' }
    ]
  },
  {
    id: 'q7',
    text: '过去一周，你食欲或饮食有变化吗？',
    textEn: 'Has your appetite or eating changed in the past week?',
    options: [
      { value: 0, label: '没有变化', labelEn: 'No change' },
      { value: 1, label: '稍有变化', labelEn: 'Slight change' },
      { value: 2, label: '明显变化', labelEn: 'Noticeable change' },
      { value: 3, label: '很大变化', labelEn: 'Major change' }
    ]
  },
  {
    id: 'q8',
    text: '过去一周，你容易烦躁或对小事发火吗？',
    textEn: 'Have you felt easily irritated or angry over small things in the past week?',
    options: [
      { value: 0, label: '很少', labelEn: 'Rarely' },
      { value: 1, label: '有时', labelEn: 'Sometimes' },
      { value: 2, label: '经常', labelEn: 'Often' },
      { value: 3, label: '几乎每天', labelEn: 'Almost daily' }
    ]
  },
  {
    id: 'q9',
    text: '过去一周，你会担心很多事难以控制吗？',
    textEn: 'In the past week, have you worried about many things feeling out of control?',
    options: [
      { value: 0, label: '不会', labelEn: 'Not at all' },
      { value: 1, label: '偶尔', labelEn: 'Sometimes' },
      { value: 2, label: '经常', labelEn: 'Often' },
      { value: 3, label: '几乎每天', labelEn: 'Almost daily' }
    ]
  },
  {
    id: 'q10',
    text: '过去一周，你与家人或朋友相处时的感受如何？',
    textEn: 'How did you feel when with family or friends in the past week?',
    options: [
      { value: 0, label: '愉快、有支持', labelEn: 'Good, supported' },
      { value: 1, label: '一般', labelEn: 'Okay' },
      { value: 2, label: '有些疏离', labelEn: 'Somewhat distant' },
      { value: 3, label: '很疏离或不想接触', labelEn: 'Very distant or avoiding' }
    ]
  },
  {
    id: 'q11',
    text: '过去一周，你对自己或未来感到无望吗？',
    textEn: 'In the past week, have you felt hopeless about yourself or the future?',
    options: [
      { value: 0, label: '没有', labelEn: 'Not at all' },
      { value: 1, label: '偶尔', labelEn: 'Sometimes' },
      { value: 2, label: '经常', labelEn: 'Often' },
      { value: 3, label: '几乎每天', labelEn: 'Almost daily' }
    ]
  },
  {
    id: 'q12',
    text: '过去一周，你进行日常活动（学习、工作、爱好）的动力如何？',
    textEn: 'How has your motivation for daily activities been in the past week?',
    options: [
      { value: 0, label: '正常', labelEn: 'Normal' },
      { value: 1, label: '稍低', labelEn: 'A bit low' },
      { value: 2, label: '明显降低', labelEn: 'Noticeably low' },
      { value: 3, label: '几乎没有动力', labelEn: 'Hardly any' }
    ]
  }
]
