export const getMoscowDate = (): Date => {
  const now = new Date();
  const moscowOffset = 3 * 60;
  const utcOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (moscowOffset + utcOffset) * 60000);
};
