import path from 'path';

const imageMap = {
  LEVEL_1: './level1.png',
  LEVEL_2: './level2.png',
  LEVEL_3: './level3.png',
};

const IMG_LOGO = 'http://image.abcmouse.qq.com/parents-home/logo.png';

export function getImage(index) {
  return `./level${index}.png`;
}

export function getImageById(id) {
  return './level' + id + '.png';
}

export default imageMap;
