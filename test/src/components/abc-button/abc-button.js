/**
 * ABCmouse 特色的圆角渐变大按钮
 */
Component({
  externalClasses: ['ext-class'],
  /**
   * 组件的属性列表
   */
  properties: {
    width: Number,
    color: {
      type: String,
      // red, blue
      value: 'red'
    },
    type: {
      type: String,
      // normal ghost
      value: 'normal',
    },
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    onClick() {
      if (this.data.disabled) {
        return;
      }
      this.triggerEvent('click');
    }
  }
})
