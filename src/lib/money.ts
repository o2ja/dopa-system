/** All money is Int fils (1 JOD = 1000 fils). */
export const formatJOD = (fils: number) => `JOD ${(fils / 1000).toFixed(2)}`;
export const toFils = (jod: number | string) => Math.round(Number(jod) * 1000);
