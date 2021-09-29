import MyLog from '../../libs/log';

Component({
  options: {
    addGlobalClass: true,
  },
  externalClasses: ['cnt-cls'],
  properties: {
    msg: {
      type: String,
      value: '内容为空',
    },
  },
  data: {},
  lifetimes: {
    attached() {
      new MyLog().log('no-data: my log');
    },
  },
  methods: {},
});
