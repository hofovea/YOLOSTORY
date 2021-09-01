//@ts-check
const express = require('express');
const {User} = require('../models/user.js');
const router = express.Router();
const config = require('../config.js');
const support = require('../models/session_support');

const cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret
});

const passport = require('../models/passport_config.js');

//

router.get('/register', function(req, res) {
    //TODO: render registration page
    res.render('register', {user : req.user});
});

router.post('/register', function(req, res, next) {
    //TODO: add user to DateBase
    let login = req.body.login;
    let uniquePromise = User.isUniqueLogin(login);
    uniquePromise.then(result => {
        console.log('acync result here ' + result);
        if (!result) {
            res.redirect('/auth/register?error=Login+already+exists');
            return;
        }
        let password = req.body.password;
        let confirmPassword = req.body.confirmPassword;
        if (password !== confirmPassword) {
            res.redirect('/auth/register?error=Passwords+do+not+match');
            return;
        }
        let now_long = new Date().getTime();
        const fileBuffer = req.files.image.data;
        cloudinary.v2.uploader.upload_stream({ resource_type: 'raw', public_id : now_long},
            function (error, result) { 
                let newUser = new User(req.body.login, support.sha512(password, support.serverSalt).passwordHash, 0, 
                    req.body.fullname, now_long, result.url, req.body.bio);
                User.insert(newUser)
                .then(() => {
                    next();
                })
                .catch(err => {
                    "Insert" + console.log(err);
                    res.status(500).render('500');
                });
            })
        .end(fileBuffer);
    });
}, passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/auth/login'
    //failureFlash: true
}));

router.get('/login', function(req, res) {
    if (req.user) 
        res.redirect('../../profile');
    else {
        //TODO: render login page
        console.log(`User connected`);
        res.render('login', {user : req.user});
    }
    
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/auth/login?Error=Something+went+wrong',
    failureFlash: true
}));

router.get('/logout', support.checkAuth, function(req, res) {
    //TODO: logout user
    req.logout();
    console.log('user logged out');
    res.redirect('../../../');
});



module.exports = router;