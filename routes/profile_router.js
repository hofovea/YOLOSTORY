//@ts-check/
const express = require('express');
const {User} = require('../models/user');
const {Highlight} = require('../models/highlight.js');
const {Story} = require('../models/story.js');
const support = require('../models/session_support');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', support.checkAuth, (req, res) => {
    User.getById(req.user._id)
    .populate('friends')
    .populate('highlights')
    .populate('stories')
    .exec()
    .then(curUser => res.render('profile', {user: curUser}))
    .catch(err => {
        console.log(err.message);
        res.status(500).render('500');
    });
});

router.get('/friends', support.checkAuth, (req, res) => {
    let pageNum = Number(req.query.page);
    let searchString = req.query.search;
    if (isNaN(pageNum) || pageNum < 1) {
        pageNum = 1;
    }
    let maxEntitiesperPage = 4;
    User.getById(req.user._id) 
    .populate("friends")
    .exec()
    .then(currentUser => {
        let entitiesAr = currentUser.friends;
        if (pageNum > entitiesAr.length / maxEntitiesperPage + 1) 
            pageNum = 1;
        let usersForUserSearch = searchUsers(entitiesAr, searchString);
        let finalUsersAr = createPartofArrayToShowOnPage(usersForUserSearch, maxEntitiesperPage, pageNum);
        let next_page = (pageNum * maxEntitiesperPage) < usersForUserSearch.length ? pageNum + 1 : 0;
        let prev_page = pageNum - 1;
        console.log(finalUsersAr.length);
        console.log(prev_page + "prev");
        console.log(next_page + "next");
        res.render("friends", {
            "next_page": next_page,
            "prev_page": prev_page,
            "search_str": searchString,
            "users" : finalUsersAr,
            "user" : req.user
        });
    })
    .catch(err => {
        console.log(err.message);
        res.status(500).render('500');
        req.next();
    }); 
});

router.get('/friends/stories', support.checkAuth, (req, res) => {
    User.getById(req.user._id) 
    .populate('friends')
    .then(currentUser => {
        let friendsStoriesArrPromise = getPopulatedStories(currentUser);
        friendsStoriesArrPromise.then(friendsStoriesArr => {
            //console.log(friendsStoriesArr);
            res.render("friendStories", {stories : friendsStoriesArr, user : req.user});
        });
        
    })
    .catch(err => console.log(err.message));
});

router.get('/friends/:id/unsubscribe', support.checkAuth, (req, res) => {
    if (support.checkID(req.params.id) || req.user._id.equals(mongoose.Types.ObjectId(req.params.id))) {
        res.status(400).render('400');    //redirect to custom 404 not found
        return;
    }
    User.getById(req.params.id)
    .then(user => {
        if (user) {
            if (!isAlreadyFriend(user._id, req.user.friends)) {
                res.status(404).render('404');    //redirect to custom 404 not found
                return;
            }
            for (let i = 0; i < req.user.friends.length; i++) {
                if  (req.user.friends[i]._id.equals(user._id)) {
                    req.user.friends.splice(i, 1);
                }
            }
            let updatedUser = new User(req.user.login, req.user.password, req.user.role,
                req.user.fullname, req.user.registeredAt, req.user.avaUrl, req.user.bio, req.user.highlights, 
                req.user.stories, req.user.friends);
            User.update(req.user._id, updatedUser);
            res.redirect('/profile/friends');
        } else 
            res.status(404).render('404');    //redirect to custom 404 not found
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

function searchStories(storiesArr, searchString) {
    let resultStoriesArr = [];
    if (!searchString) resultStoriesArr = storiesArr;
    else {
        for (let story of storiesArr) {
            if (searchSubstringInStoryFields(story, searchString))
                resultStoriesArr.push(story);
        }
    }
    return resultStoriesArr;
}

function searchSubstringInStoryFields(story, searchString) {
    searchString = searchString.toLowerCase();
    //console.log("search: [" + searchString + "]");
    return story.comment.toLowerCase().includes(searchString) 
        || story.views.toString().includes(searchString) 
        || story.showDuration.toString().includes(searchString);
}

async function getPopulatedStories(currentUser) {
    let friendsStoriesArr = [];
    for (let friendUnpublished of currentUser.friends) {
        let friend = await User.getById(friendUnpublished._id).populate('stories').exec();
            friend.stories.forEach(story => {
                friendsStoriesArr.push(story);
            });
    }
    //console.log(friendsStoriesArr);
    return friendsStoriesArr;
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