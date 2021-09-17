export const shortid = (): string => {
  const millisecond = String(new Date().getMilliseconds()).padStart(3, '0');
  const random = Math.floor(Math.random() * 1000);

  return `${millisecond}${random}`;
};
