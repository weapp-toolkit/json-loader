import ora from 'ora';

type LastMsg = {
  text: string;
} | null;

const spinner = ora();
let lastMsg: LastMsg = null;

const logWithSpinner = (msg: string): void => {
  if (lastMsg) {
    spinner.stopAndPersist({
      text: lastMsg.text,
    });
  }
  spinner.text = ` ${msg}`;
  lastMsg = {
    text: msg,
  };
  spinner.start();
};

const succeed = (msg?: string): void => {
  spinner.succeed(msg);
};
const info = (msg: string): void => {
  spinner.info(msg);
};
const warn = (msg: string): void => {
  spinner.warn(msg);
};
const fail = (msg?: string): void => {
  spinner.fail(msg);
};
const stop = (): void => {
  spinner.stop();
};
const stopSpinner = (persist?: boolean): void => {
  if (lastMsg && persist !== false) {
    spinner.stopAndPersist({
      text: lastMsg.text,
    });
  } else {
    spinner.stop();
  }
  lastMsg = null;
};

const pauseSpinner = (): void => {
  spinner.stop();
};

const resumeSpinner = (): void => {
  spinner.start();
};

export default {
  logWithSpinner,
  succeed,
  info,
  warn,
  fail,
  stop,
  stopSpinner,
  pauseSpinner,
  resumeSpinner,
};
