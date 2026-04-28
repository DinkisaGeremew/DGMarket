import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin login: admin@gmail.com / admin123`);
});
