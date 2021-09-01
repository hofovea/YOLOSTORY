//@ts-check/
const express = require('express');
const {User} = require('../models/user.js');
const {Story} = require('../models/story.js');
const {Highlight} = require('../models/highlight.js');
const config = require('../config.js');
const support = require('../models/session_support');
const cloudinary = require('cloudinary');
const mongoose = require('mongoose');
cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret
});

const router = express.Router();

router.get('/', support.checkAuth, function(req, res) {
    let pageNum = Number(req.query.page);
    let searchString = req.query.search;
    console.log('app.js line 69\n' + pageNum + '\n' + '['+ searchString + ']\n------------------');
    console.log(req.url);
    if (isNaN(pageNum) || pageNum < 1) {
        let query_search = !searchString ? "" : `&search=${searchString}`;
        res.redirect(`/stories?page=1${query_search}`);
        return;
    }
    const maxStoriesperPage = 3;
    //console.log(req.user.stories);
    User.getById(req.user._id)
    .populate('stories')
    .exec()
    .then(currentUser => {
        let storiesArr = currentUser.stories;
        let storiesForUserSearch = searchStories(storiesArr, searchString);
        let storiesToShowOnPage = createPartofArrayToShowOnPage(storiesForUserSearch, maxStoriesperPage, pageNum);
        let next_page = pageNum * maxStoriesperPage < storiesForUserSearch.length ? pageNum + 1 : 0;
        let prev_page = pageNum - 1;
        //console.log(storiesToShowOnPage);
        res.render('stories', {
            stories: storiesToShowOnPage,
            next_page: next_page,
            current_page: pageNum,
            prev_page: prev_page,
            search_str: searchString, 
            user: req.user
        });        
    })
    .catch(err => console.log(err.message));
});

router.get('/new', support.checkAuth, function(req, res) {
    User.getAll()
        .populate("userRef")
        .exec()
        .then(users => {
            if(!users) req.next();
            else {
                console.log('new story');
                res.render('new', {users : users, user : req.user});
            }
        })
        .catch(err => {
            console.log(err.message);
            req.next();
        });
});

router.get('/allstories', support.checkAuth, support.checkAdmin, function(req, res) {
    let pageNum = Number(req.query.page);
    let searchString = req.query.search;
    //console.log('app.js line 69\n' + pageNum + '\n' + '['+ searchString + ']\n------------------');
    console.log(req.url);
    if (isNaN(pageNum) || pageNum < 1) {
        let query_search = !searchString ? "" : `&search=${searchString}`;
        res.redirect(`/stories/allstories?page=1${query_search}`);
        return;
    }
    const maxStoriesperPage = 3;
    Story.getAll()
        .populate("userRef")
        .exec()
        .then(storiesArr => {
            let storiesForUserSearch = searchStories(storiesArr, searchString);
            let storiesToShowOnPage = createPartofArrayToShowOnPage(storiesForUserSearch, maxStoriesperPage, pageNum);
            let next_page = pageNum * maxStoriesperPage < storiesForUserSearch.length ? pageNum + 1 : 0;
            let prev_page = pageNum - 1;
            //console.log(storiesToShowOnPage);
            res.render('allstories', {
                stories: storiesToShowOnPage,
                next_page: next_page,
                current_page: pageNum,
                prev_page: prev_page,
                search_str: searchString, 
                user: req.user
            });
        })
        .catch(err => {
            console.log(err.message);
            req.next();
        });
});

router.post('/:id/update', support.checkAuth, (req, res) => {
    console.log("patch request: update story");
        Story.getById(mongoose.Types.ObjectId(req.params.id))
        .then(story => {
            console.log(story);
                let comment = req.body.comment; 
                let storyToUpdate = new Story(req.body.name, comment, story.imgUrl, story.createdAt, story.userRef);
                Story.update(story._id, storyToUpdate);
                    res.redirect(`/stories`);
            }
        )
        .catch(err => {
            console.log(req.params.id);
            console.log(`ERROR : ${err.message}`);
            res.status(404).render('404');
        });
});

router.post('/new', support.checkAuth, function(req, res) {

    console.log('Post req to add story');
    const fileObject = req.files.image;
    const fileBuffer = fileObject.data;
    let comment = req.body.comment; 
    let now = new Date();
    let now_long = now.getTime();
    cloudinary.v2.uploader.upload_stream({ resource_type: 'raw' , public_id : now_long},
            function (error, result) { 
                let storyToAdd = new Story(req.body.name, comment, result.url, now_long, mongoose.Types.ObjectId(req.user.id));
                User.getById(req.user._id)
                    .then(user => {
                        Story.insert(storyToAdd)
                            .then(newId => {
                                user.stories.push(mongoose.Types.ObjectId(newId));
                                let updatedUser = new User(user.login, user.password, user.role,
                                    user.fullname, user.registeredAt, user.avaUrl, user.bio, user.highlights, 
                                    user.stories, user.friends);
                                User.update(req.user._id, updatedUser);
                                res.redirect('/stories');                                
                            });
                    })
                    .catch(err => console.log(err.message));
        })
        .end(fileBuffer);
});

router.get('/:id', support.checkAuth, function(req, res) {  
    if (support.checkID(req.params.id)) res.redirect("/");
    Story.getById(req.params.id)
        .populate("userRef")
        .exec()
        .then(story => {
            if(!story) 
                return Promise.reject(new Error("There is no story"));
            let isOwner = story.userRef._id.equals(mongoose.Types.ObjectId(req.user._id));
            res.render('story', {story : story, user: req.user, isOwner: isOwner} );
        })
        .catch(err => console.log(err.message)); 
});

router.post('/:id', support.checkAuth, function(req, res) {
    if (support.checkID(req.params.id)) res.redirect("/");
    Story.delete(req.params.id)
        .populate("userRef")
        .exec()
        .then(() => Story.delete(req.params.id))
        .then(() => {
            // let updatedUser = new User(req.user.login, req.user.password, req.user.role,
            //     req.user.fullname, req.user.registeredAt, req.user.avaUrl, req.user.bio, req.user.highlights, 
            //     req.user.stories, req.user.friends);
            // User.update(req.user._id, updatedUser);
            res.redirect('/stories?page=1');
        })
        .catch(err => {
            console.log(err.message);
            res.status(500).render('500');
        });
});

function createPartofArrayToShowOnPage(arr, itemsPerPage, page) {
    let start = (page - 1) * itemsPerPage;
    let end = (page) * itemsPerPage;
    end = end < arr.length ? end : arr.length;
    return arr.slice(start, end);
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
        || story.name.toLowerCase().includes(searchString);
}

module.exports = router;