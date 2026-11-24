/** All money is Int fils (1 JOD = 1000 fils). */
export const formatJOD = (fils: number) => `${(fils / 1000).toFixed(2)} د.أ`;
export const toFils = (jod: number | string) => Math.round(Number(jod) * 1000);
