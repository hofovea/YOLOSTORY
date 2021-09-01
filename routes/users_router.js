//@ts-check/
const express = require('express');
const {User} = require('../models/user');
const {Highlight} = require('../models/highlight.js');
const {Story} = require('../models/story.js');
const router = express.Router();
const support = require('../models/session_support');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary');
router.get('/', support.checkAuth, function(req, res) {
    let pageNum = Number(req.query.page);
    let searchString = req.query.search;
    if (isNaN(pageNum) || pageNum < 1) {
        pageNum = 1;
    }
    const maxEntitiesperPage = 4;
    User.getAll()
    .populate("highlights")
    .populate("stories")
    .exec()
    .then(entitiesAr => {
        for (let user of entitiesAr) {
            user.password = "undefined";
        }
        if (pageNum > entitiesAr.length / maxEntitiesperPage + 1) 
            pageNum = 1;
        let usersForUserSearch = searchUsers(entitiesAr, searchString);
        let finalUsersAr = createPartofArrayToShowOnPage(usersForUserSearch, maxEntitiesperPage, pageNum);
        let next_page = (pageNum * maxEntitiesperPage) < usersForUserSearch.length ? pageNum + 1 : 0;
        let prev_page = pageNum - 1;
        res.render("users", {
            "next_page": next_page,
            "prev_page": prev_page,
            "search_str": searchString,
            "users" : finalUsersAr,
            "user" : req.user,
            "current_page": pageNum
        });
    })
    .catch(err => {
        console.log(err.message);
        res.status(500).render('500');
        req.next();
    });        
});

router.get('/:id', support.checkAuth, function(req, res) {
    if (support.checkID(req.params.id)) {
        res.status(400).render('400');    //redirect to custom 404 not found
        return;
    }
    console.log("======================================");
    if (req.user._id.equals(mongoose.Types.ObjectId(req.params.id))) {    //rework
        res.redirect("/profile");
    } else {
        User.getById(req.params.id)
        .populate("highlights")
        .populate("stories")
        .exec()
        .then(user => {
            //console.log(user);
            if (user) {
                console.log("isFriend:");
                let friendValue = isAlreadyFriend(user._id, req.user.friends);
                res.render('user', {userToView: user, user: req.user,
                        isFriend: friendValue});        
            } else 
                res.redirect("/");    //redirect to custom 404 not found
        })
        .catch(err => console.log(err.message)); 
    }
});

router.get('/:id/subscribe', support.checkAuth, function(req, res) {
    console.log(`check id:`);
    console.log(`check id: ${req.params}`);
    if (support.checkID(req.params.id) || req.user._id.equals(mongoose.Types.ObjectId(req.params.id))) {
        res.status(400).render('400');    //redirect to custom 404 not found
        return;
    }
    User.getById(req.params.id)
    .then(user => {
        if (user) {
            //console.log(user);
            req.user.friends.push(mongoose.Types.ObjectId(user._id));
            let updatedUser = new User(req.user.login, req.user.password, req.user.role,
                req.user.fullname, req.user.registeredAt, req.user.avaUrl, req.user.bio, req.user.highlights, 
                req.user.stories, req.user.friends);
            User.update(req.user._id, updatedUser);
                console.log(user);
                res.redirect(`/users/${req.params.id}`);
        } else {
            console.log("invalid user:");
            console.log(user);
            res.redirect("/");    //redirect to custom 404 not found
        }
    })
    .catch(err => console.log(err.message)); 
});

router.post('/:id/promote', support.checkAuth, support.checkAdmin, function(req, res) {
    if (support.checkID(req.params.id)) res.redirect("/");
    User.getById(req.params.id)
    .populate("highlights")
    .populate("stories")
    .exec()
    .then(user => {
        //console.log(user);
        let updatedUser = new User(user.login, user.password, 1,
            user.fullname, user.registeredAt, user.avaUrl, user.bio, user.highlights, 
            req.user.stories, req.user.friends);
        User.update(req.params.id, updatedUser)
            .then(() => {
                console.log('User promoted!');
                res.redirect('../../profile');
            })
            .catch(error => console.log(error.message));
        
    })
    .catch(err => console.log(err.message)); 
});

router.post('/:id/update', support.checkAuth, (req, res) => {
    console.log("patch request: update user");
        User.getById(req.params.id)
        .then(user => {
            let login = req.body.login;
            if (User.isUniqueLogin(login)) {
                res.status(400).render('400');
                return;
            }
            let password = req.body.password;
            let confirmPassword = req.body.confirmPassword;
            if (password !== confirmPassword) {
                res.status(400).render('400');
                return;
            }
            let now_long = new Date().getTime();
            //const fileObject = req.files.image;
            const fileBuffer = req.files.image.data;
            cloudinary.v2.uploader.upload_stream({ resource_type: 'raw', public_id : now_long},
                function (error, result) { 
                    let newUser = new User(req.body.login, support.sha512(password, support.serverSalt).passwordHash, user.role, 
                        req.body.fullname, now_long, result.url, req.body.bio, user.highlights, user.stories, user.friends);
                    User.update(req.params.id, newUser);
                    res.redirect('/users');
                })
                .end(fileBuffer);
        })
        .catch(err => {
            console.log(`ERROR : ${err.message}`);
            res.status(404).json(err.message);
        });
});

router.post('/:id', support.checkAuth, support.checkAdmin, function(req, res) {
    if (support.checkID(req.params.id)) res.redirect("/");
    User.getById(req.params.id)
        .populate("highlights")
        .populate("stories")
        .exec()
        .then(user => {
            if (user.role !== 1) {
                User.getById(req.params.id)
                .populate("highlights")
                .populate("stories")
                .exec()
                .then(user => {
                    User.deleteUser(user)
                    .then(res.redirect('../users'))
                    .catch(err => {
                        console.log(err.message);
                        res.status(500).render('500');
                    });
                });
            } else 
                res.redirect('../users');
        })
        .catch(err => console.log(err.message));     
});

function createPartofArrayToShowOnPage(arr, itemsPerPage, page) {
    let start = (page - 1) * itemsPerPage;
    let end = (page) * itemsPerPage;
    end = end < arr.length ? end : arr.length;
    return arr.slice(start, end);
}

function searchUsers(usersArr, searchString) {
    let resultStoriesArr = [];
    if (!searchString) resultStoriesArr = usersArr;
    else {
        for (let user of usersArr) {
            if (searchSubstringInUserFields(user, searchString))
                resultStoriesArr.push(user);
        }
    }
    return resultStoriesArr;
}

function searchSubstringInUserFields(user, searchString) {
    searchString = searchString.toLowerCase();
    //console.log("search: [" + searchString + "]");
    return user.fullname.toLowerCase().includes(searchString) 
        || user.login.toString().includes(searchString) 
        || user.bio.toString().includes(searchString);
}

function isAlreadyFriend(idToCheck, friends) {
    console.log(friends);
    console.log("this is idToCheck:");
    console.log(idToCheck);
    let isFriend = false;;
    if (friends !== []) {
        friends.forEach(friend => {
            console.log(friend._id.equals(mongoose.Types.ObjectId(idToCheck)));
            if (friend._id.equals(mongoose.Types.ObjectId(idToCheck)))
                isFriend = true;
        });
    }
    return isFriend;
}

module.exports = router;