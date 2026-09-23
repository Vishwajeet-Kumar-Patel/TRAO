import {
  Question,
  Requirement,
  Schedule,
  ScheduleDay,
} from '@prep-kit/shared';

export function allocateSchedule(
  daysAvailable: number,
  questions: Question[],
  requirements: Requirement[]
): Schedule {
  const safeDaysAvailable = Math.max(1, Math.min(60, Math.floor(daysAvailable)));

  if (questions.length === 0) {
    const emptyDays: ScheduleDay[] = [];
    for (let i = 1; i <= safeDaysAvailable; i++) {
      emptyDays.push({
        day: i,
        focus: `Day ${i}: General Concepts & Background Review`,
        question_ids: [],
        minutes: 45,
      });
    }
    return {
      days_available: safeDaysAvailable,
      days: emptyDays,
    };
  }

  // Create a map of requirement priority for questions
  const mustReqIds = new Set(
    requirements.filter((r) => r.priority === 'must').map((r) => r.id)
  );

  // Score questions for prioritization:
  // Higher score = more urgent = placed earlier
  // - Covers must-have requirement: +20
  // - Difficulty: diff * 5 (3 -> 15, 2 -> 10, 1 -> 5)
  // - System design / technical gets slight priority over fit: +3
  const scoredQuestions = questions.map((q) => {
    let score = 0;
    const coversMust = q.requirement_ids.some((id) => mustReqIds.has(id));
    if (coversMust) score += 20;

    score += (q.difficulty || 2) * 5;

    if (q.category === 'system-design') score += 4;
    else if (q.category === 'technical') score += 3;
    else if (q.category === 'behavioural') score += 2;
    else score += 1;

    return { question: q, score, coversMust };
  });

  // Sort descending: highest priority & hardest first
  scoredQuestions.sort((a, b) => b.score - a.score);

  const days: ScheduleDay[] = [];
  const totalDays = safeDaysAvailable;

  if (totalDays === 1) {
    // 1-Day Schedule: All questions packed into 1 intensive day
    const allQIds = scoredQuestions.map((sq) => sq.question.id);
    const minutes = Math.max(45, Math.min(180, allQIds.length * 20));

    days.push({
      day: 1,
      focus: 'Day 1: Comprehensive High-Yield Interview Simulation & Technical Deep Dive',
      question_ids: allQIds,
      minutes,
    });

    return {
      days_available: 1,
      days,
    };
  }

  // For multi-day schedules (2 to 60 days):
  // 1. Initialize day containers
  const dayBuckets: string[][] = Array.from({ length: totalDays }, () => []);

  // 2. Ensure every must-have requirement is allocated early
  // Distribute all questions across days
  scoredQuestions.forEach((sq, idx) => {
    // Map idx into day buckets, weighting earlier days for high scores
    // Spread evenly across the available days
    const targetDayIndex = idx % totalDays;
    dayBuckets[targetDayIndex].push(sq.question.id);
  });

  // 3. For long schedules (e.g. > questions count), populate remaining days with review/spaced repetition
  if (scoredQuestions.length > 0) {
    for (let d = 0; d < totalDays; d++) {
      if (dayBuckets[d].length === 0) {
        // Assign reinforcement questions from earlier high-priority days
        const sampleQ = scoredQuestions[d % scoredQuestions.length].question.id;
        dayBuckets[d].push(sampleQ);
      }
    }
  }

  // 4. Generate contextual focus titles and calculate realistic minutes
  for (let i = 0; i < totalDays; i++) {
    const dayNumber = i + 1;
    const qIdsInDay = dayBuckets[i];
    const dayQuestions = questions.filter((q) => qIdsInDay.includes(q.id));

    // Determine day category focus
    const categoriesInDay = dayQuestions.map((q) => q.category);
    let focus = `Day ${dayNumber}: Core Concepts & Practice`;

    if (categoriesInDay.includes('system-design')) {
      focus = `Day ${dayNumber}: System Architecture & High-Scalability Design`;
    } else if (categoriesInDay.includes('technical')) {
      focus = `Day ${dayNumber}: Core Technical Proficiencies & Code Deep Dive`;
    } else if (categoriesInDay.includes('behavioural')) {
      focus = `Day ${dayNumber}: Behavioral STAR Scenarios & Leadership Alignment`;
    } else if (categoriesInDay.includes('company-fit')) {
      focus = `Day ${dayNumber}: Company Mission, Values & Cultural Synergy`;
    }

    if (dayNumber === totalDays && totalDays > 2) {
      focus = `Day ${dayNumber}: Final Mock Interview & Comprehensive Revision`;
    }

    // Realistic minutes calculation: 20 mins per question + 15 min review buffer (min 30, max 120)
    const minutes = Math.max(30, Math.min(120, qIdsInDay.length * 20 + 15));

    days.push({
      day: dayNumber,
      focus,
      question_ids: qIdsInDay,
      minutes,
    });
  }

  // 5. Final Guarantee: Verify every must-have requirement with questions exists in schedule
  const allScheduledQIds = new Set(days.flatMap((d) => d.question_ids));
  for (const mustReqId of mustReqIds) {
    const questionForReq = questions.find((q) => q.requirement_ids.includes(mustReqId));
    if (questionForReq && !allScheduledQIds.has(questionForReq.id)) {
      // Put it on Day 1
      days[0].question_ids.push(questionForReq.id);
      allScheduledQIds.add(questionForReq.id);
    }
  }

  return {
    days_available: totalDays,
    days,
  };
}
