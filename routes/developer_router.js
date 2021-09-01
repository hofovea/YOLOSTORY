const express = require('express');
const path = require('path');

//creating router:
const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/../views/developer.html'));
});

module.exports = router;