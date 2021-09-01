const {User} = require('./user.js');
const passport = require('passport');
const support = require('../models/session_support');

const LocalStrategy = require('passport-local').Strategy;
const BasicStrategy = require('passport-http').BasicStrategy;

passport.serializeUser(function(user, done) {
    done(null, user._id);
});


passport.deserializeUser(function(id, done) {
    User.getById(id)
    .populate("highlights")
    .exec()
    .then(user => {
        //console.log(user);
        done(null, user);
    })
    .catch(err => {
        console.log(err.message);
        done(err, null);
    }); 
});

passport.use('admin-login', new BasicStrategy(
    function (username, password, done) {
        let hash = support.sha512(password, support.serverSalt).passwordHash;
        // console.log(username, password);
        User.getUserByLoginAndPassword(username, hash)
            .then(user => {
                //console.log(user);
                if (user.role === 1) {
                    //console.log(user);
                    done(null, user);
                } else {
                    done(null, false, { message: 'Incorrect password.' });
                }
            })
            .catch(err => {
                console.log(err.message);
                done(err, null);
            });
    }
));

passport.use('user-login', new BasicStrategy(
    function (username, password, done) {
        let hash = support.sha512(password, support.serverSalt).passwordHash;
        // console.log(username, password);
        User.getUserByLoginAndPassword(username, hash)
            .then(user => {
                //console.log(user);
                done(null, user);
            })
            .catch(err => {
                console.log(err.message);
                done(err, null);
            });
    }
));

passport.use(new LocalStrategy(
    {   
        usernameField: 'login',
    },
    function (login, password, done) {
        let hash = support.sha512(password, support.serverSalt).passwordHash;
        console.log(`Trying to login with login ${login} and password ${password}\n`);
        User.getUserByLoginAndPassword(login, hash)
            .then(user => {
                if (user) {
                    console.log(`${user.login} just loged in\n`);
                    done(null, user);
                } else 
                    done(null, false, "incorrect password or login");
            })
            .catch(err => {
                console.log(err.message);
                done(err, null);
            });
    }
));



module.exports = passport;