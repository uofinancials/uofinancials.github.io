const STUDENT_ROLE =
  /\b(Interns?|Intrn|PreDoc|Pre-Doc|GE|GTF|Work[- ]Study)\b|^UO Student\b|\bStudent (Worker|Employee|Assistant|Asst|Regular|Temp)\b/i

const STAFF_ROLE =
  /\b(Director|Dir|Coord|Coordinator|Developer|Dev|Specialist|Supervisor|Manager|Mgr|Prog|Program|Prgm|Prgrm)\b|Intr?n'l/i

export function isPossibleStudent(
  titles: ReadonlyArray<string | null>,
): boolean {
  return titles.some(
    (title) =>
      title !== null && STUDENT_ROLE.test(title) && !STAFF_ROLE.test(title),
  )
}
