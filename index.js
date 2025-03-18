require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');
const bodyParser = require('body-parser');
const ErrorMiddleware = require('./middlewares/ErrorMiddleware');
const AuthRoute = require('./routes/AuthRoute');

const AdminRoute = require('./routes/AdminRoute');


const PORT = process.env.PORT || 5000;
const app = express();



app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/images', express.static('public/images'));

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.use("/api/auth/user", AuthRoute);
app.use("/api/admin", AdminRoute);

app.use(ErrorMiddleware);

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });
