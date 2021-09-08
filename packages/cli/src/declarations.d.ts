declare module 'gulp-progeny' {
  interface Option {
    regexp?: RegExp;
    debug?: boolean;
  }
  export default function (option?: Option): NodeJS.ReadWriteStream;
}
