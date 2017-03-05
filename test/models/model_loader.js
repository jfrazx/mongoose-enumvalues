const path = require('path');
const fs = require('fs');
const modelsPath = path.resolve('test', 'models');

fs.readdirSync(modelsPath)
  .filter(file => !(/model/.test(file)))
  .forEach(file => {
    if (/\.js$/.test(file)) {
      require(path.join(modelsPath, file));
    }
  }
);
