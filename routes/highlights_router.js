//@ts-check/
const express = require('express');
const {User} = require('../models/user.js');
const {Story} = require('../models/story.js');
const {Highlight} = require('../models/highlight');
const mongoose = require('mongoose');
const support = require('../models/session_support');


const router = express.Router();

router.get('/', support.checkAuth, function (req, res) {
    let pageNum = Number(req.query.page);
    let searchString = req.query.search;
    console.log('app.js line 69\n' + pageNum + '\n' + '['+ searchString + ']\n------------------');
    console.log(req.url);
    if (isNaN(pageNum) || pageNum < 1) {
        let query_search = !searchString ? "" : `&search=${searchString}`;
        res.redirect(`/highlights?page=1${query_search}`);
        return;
    }
    const maxStoriesperPage = 3;
    //console.log(req.user.stories);
    User.getById(req.user._id)
    .populate('highlights')
    .exec()
    .then(currentUser => {
        let highlightsArr = currentUser.highlights;
        let storiesForUserSearch = searchStories(highlightsArr, searchString);
        let highlightsToShowOnPage = createPartofArrayToShowOnPage(storiesForUserSearch, maxStoriesperPage, pageNum);
        let next_page = pageNum * maxStoriesperPage < storiesForUserSearch.length ? pageNum + 1 : 0;
        let prev_page = pageNum - 1;
        //console.log(highlightsToShowOnPage);
        res.render('highlights', {
            stories: highlightsToShowOnPage,
            next_page: next_page,
            current_page: pageNum,
            prev_page: prev_page,
            search_str: searchString, 
            user: req.user
        });        
    })
    .catch(err => console.log(err.message));
});

router.get("/new", support.checkAuth, function (req, res) {
    Story.getAll()
        .then(stories => {
            if (!stories) {
                console.log("Stories are empty");
                req.next();
            }
            else {
                //console.log(stories);
                res.render('highlight_new', {stories : stories, user : req.user});
            }
        })
        .catch(err => {
            console.log(`ERROR in GET ${req.baseUrl}: ${err.message}`);
            req.next();
        });
});

router.post("/new", support.checkAuth, function (req, res) {
    console.log("post request: new highlight");
    let name = req.body.name;
    let storiesAr = req.body.storiesAr;
    if (!name) {
        res.status(400).render('400');
        return;
    }
    if (!storiesAr) storiesAr = [];
    else if (typeof storiesAr === "string")
        storiesAr = [storiesAr];
        console.log("highlightsArray\n" + storiesAr);
    let newHighlight = new Highlight(name, storiesAr, mongoose.Types.ObjectId(req.user.id));

    User.getById(req.user._id)
        .then(user => {
            Highlight.insert(newHighlight)
                .then(newId => {
                    user.highlights.push(mongoose.Types.ObjectId(newId));
                    let updatedUser = new User(user.login, user.password, user.role, 
                        user.fullname, user.registeredAt, user.avaUrl, user.bio, user.highlights, 
                        user.stories, user.friends);
                    User.update(req.user._id, updatedUser);    

                    res.redirect('/highlights');
                });
        })
        .catch(err => console.log(err.message)); 
});

router.post("/:id/update", support.checkAuth, function (req, res) {
    //TODO: Update
    if (support.checkID(req.params.id)) res.redirect("/");
    console.log("post request: update highlight");
    let name = req.body.name;
    console.log(req.body.storiesAr);
    let storiesAr = req.body.storiesAr;
    if (!name) {
        res.status(400).render('400');
        return;
    }
    if (!storiesAr) storiesAr = [];
    else if (typeof storiesAr === "string")
        storiesAr = [storiesAr];
    console.log(storiesAr);
    let newHighlight = new Highlight(name, storiesAr, mongoose.Types.ObjectId(req.user.id));
    Highlight.update(req.params.id, newHighlight)
        .then(res.redirect('/highlights'))
        .catch(error => console.log(error.message));
});

router.get("/:id/update", support.checkAuth, function (req, res) {
    //TODO: Update
    if (support.checkID(req.params.id)) res.redirect("/");
    Promise.all([Highlight.getHighlightById(mongoose.Types.ObjectId(req.params.id)), Story.getAll()])    
    .then(([highlight, stories]) => {
        if (!stories) {
            console.log("Stories are empty");
            req.next();
        }
        else {
            res.render('highlight_update', {stories : stories, highlight : highlight, user : req.user});
        }
    })
    .catch(err => {
        console.log(`ERROR in GET ${req.baseUrl}: ${err.message}`);
        req.next();
    });
});


router.get("/:id", support.checkAuth, function (req, res) {
    let id = req.params.id;
    if (support.checkID(id)) res.redirect("/");
    //console.log(id);
    Highlight.getHighlightById(id)
    .populate('stories')
    .populate('userRefFromHighlight')
    .exec()
        .then(highlight => {
            if (!highlight)
                return Promise.reject("No such highlights");
                //console.log(highlight);
            let isOwner = highlight.userRefFromHighlight._id.equals(mongoose.Types.ObjectId(req.user._id));
            User.getById(req.user._id)
            .populate('stories')
            .populate('highlights')
            .exec()
            .then(currentUser => res.render("highlight", {highlight : highlight, user : currentUser, isOwner: isOwner}))
            .catch(err => console.log(err.message));
        })
        .catch(err => {
            console.log(`ERROR in GET ${req.baseUrl}: ${err.message}`);
            req.next();
        });
});

router.post("/:id", support.checkAuth, function (req, res) {
    let id = req.params.id;
    console.log("HIGHLIGHT DELETE:" + id);
    Highlight.delete(id)
        .then(() => res.redirect("/highlights"))
        .catch(err => {
            console.log(`ERROR : ${err.message}`);
            res.status(400).render('400');
        });
});

function createPartofArrayToShowOnPage(arr, itemsPerPage, page) {
    let start = (page - 1) * itemsPerPage;
    let end = (page) * itemsPerPage;
    end = end < arr.length ? end : arr.length;
    return arr.slice(start, end);
}

function searchStories(highlightsArr, searchString) {
    let resulthighlightsArr = [];
    if (!searchString) resulthighlightsArr = highlightsArr;
    else {
        for (let story of highlightsArr) {
            if (searchSubstringInStoryFields(story, searchString))
                resulthighlightsArr.push(story);
        }
    }
    return resulthighlightsArr;
}

function searchSubstringInStoryFields(story, searchString) {
    searchString = searchString.toLowerCase();
    //console.log("search: [" + searchString + "]");
    return story.name.toLowerCase().includes(searchString);
}


module.exports = router;