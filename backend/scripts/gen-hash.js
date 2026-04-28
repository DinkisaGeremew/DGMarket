const b = require('bcryptjs');
b.hash('admin123', 10).then(h => {
  console.log(h);
  b.compare('admin123', h).then(ok => console.log('verify:', ok));
});
