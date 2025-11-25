// api/server.js
require('dotenv').config(); // load bien moi truong tu env

const express =  require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_URL = process/env.DATABASE_URL || 'mongodb://localhost:27017/pickleball_db';

app.use(cors()); //  cho phep font end truy cap
app.use(express.json()); //cho phep doc du lieu json

//ket noi data
mongoose.connect(DB_URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("DB connection error : " ,err));

// khoi tao aip routes
app.get('/',(req, res) => res.send("Api Server Running"));

// sever lang nghe
app.listen(PORT , () => console.log(`Server running on port ${PORT}`));
