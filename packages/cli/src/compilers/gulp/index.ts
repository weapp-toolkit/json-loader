import * as config from './config';
import CleanTask from './clean.task';
import CopyTask from './copy.task';
import CssPreprocessorTask from './css-preprocessor.task';
import CssTask from './css.task';
import JavascriptTask from './javascript.task';
import WxmlTask from './wxml.task';

export const gulpCompiler = {
  config,
  CssTask,
  CssPreprocessorTask,
  CopyTask,
  WxmlTask,
  JavascriptTask,
  CleanTask,
};
