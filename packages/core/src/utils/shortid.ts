export const shortid = (): string => {
  const millisecond = String(new Date().getMilliseconds()).startsWith('0', 3);
  const random = Math.floor(Math.random() * 1000);

  return `${millisecond}${random}`;
};
