
export default class LogTest {
  a = 1

  log = (...args) => {
    console.info('[INFO]:', ...args);
  };
}
