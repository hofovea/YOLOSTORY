const express = require('express');
const support = require('../models/session_support.js');
const cloudinary = require('cloudinary');
const passport = require('../models/passport_config.js');
const mongoose = require('mongoose');
//connecting models:
const {User} = require('../models/user.js');
const {Highlight} = require('../models/highlight');
const {Story} = require('../models/story');

//creating router:
const router = express.Router();


//handlers:
router.get('/', (req, res) => {
    res.json(JSON.stringify());
});

router.get('/me', passport.authenticate('user-login', {session: false}), 
    (req, res) => {
        res.json(req.user);
    }
);

// <------------------USERS------------------>

router.post('/users/new',    //create
    (req, res) => {
        let username = req.body.username;
        if (User.isUniqueUsername(username)) {
            ///res.redirect('/auth/register?error=Username+already+exists');
            return;
        }
        let password = req.body.password;
        let confirmPassword = req.body.confirmPassword;
        if (password !== confirmPassword) {
            //res.redirect('/auth/register?error=Passwords+do+not+match');
            return;
        }
        let now_long = new Date().getTime();
        //const fileObject = req.files.image;
        const fileBuffer = req.files.image.data;
        cloudinary.v2.uploader.upload_stream({ resource_type: 'raw', public_id : now_long},
            function (error, result) { 
                let newUser = new User(req.body.login, support.sha512(password, support.serverSalt).passwordHash, 0, 
                    username, req.body.fullname, now_long, result.url, false, req.body.bio, null);
                User.insert(newUser)
                .then(() => {
                    newUser.password = 'undefined';
                    res.status(201).json(newUser);
                })
                .catch(err => {
                    "Insert" + console.log(err);
                    res.status(409).json(err.message());
                });
            })
            .end(fileBuffer);
    }
);

router.get('/users', passport.authenticate('admin-login', {session: false}),  //get all 
    (req, res) => {
        let pageNum = Number(req.query.page);
            if (isNaN(pageNum) || pageNum < 1) {
                pageNum = 1;
            }
            const maxEntitiesperPage = 2;
            User.getAll()
                .populate("highlights")
                .exec()
                .then(entitiesAr => {
                    for (let user of entitiesAr) {
                        user.password = "undefined";
                    }
                    if (pageNum > entitiesAr.length / maxEntitiesperPage + 1) 
                        pageNum = 1;
                        console.log("lenght is " + entitiesAr.length);
                    res.json(createPartofArrayToShowOnPage(entitiesAr, maxEntitiesperPage, pageNum));
                    })
                    .catch(err => {
                        console.log(err.message);
                        res.json(err.message);
                        req.next();
                    });        
    }
);

router.get('/users/:id', passport.authenticate('admin-login', {session: false}),  //get by id 
    (req, res) => {
        User.getById(req.params.id)
        .populate("highlights")
        .exec()
        .then(entity => {
            entity.password = 'undefined';
            if(!entity) 
                res.json(new Error("There is no such user").message);
            res.json(entity);
        })
        .catch(err => console.log(err.message)); 
});

router.patch('/users/:id/update', passport.authenticate('admin-login', {session: false}),   //update
    (req, res) => {
        console.log("patch request: update user");
        User.getById(req.params.id)
        .then(user => {
            let username = req.body.username;
            if (User.isUniqueUsername(username)) {
                res.sendStatus(409);
                return;
            }
            let password = req.body.password;
            let confirmPassword = req.body.confirmPassword;
            if (password !== confirmPassword) {
                res.sendStatus(409);
                return;
            }
            let now_long = new Date().getTime();
            //const fileObject = req.files.image;
            const fileBuffer = req.files.image.data;
            cloudinary.v2.uploader.upload_stream({ resource_type: 'raw', public_id : now_long},
                function (error, result) { 
                    let newUser = new User(req.body.login, support.sha512(password, support.serverSalt).passwordHash, user.role, 
                        username, req.body.fullname, now_long, result.url, false, req.body.bio, null);
                    User.update(req.params.id, newUser)
                    .then(newUser.password = 'undefined')
                    .then(res.status(200).json(newUser))
                    .catch(err => {
                        console.log(`ERROR : ${err.message}`);
                        res.status(404).json(err.message);
                    });
                })
                .end(fileBuffer);
        })
        .catch(err => {
            console.log(`ERROR : ${err.message}`);
            res.status(404).json(err.message);
        });
    }
);

router.delete('/users/:id', passport.authenticate('admin-login', {session: false}),    //delete
    (req, res) => {
        if (req.user.id === req.params.id ) {
            res.sendStatus(404);
        }    
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
                        .then(res.sendStatus(200))
                        .catch(err => {
                            console.log(err.message);
                            res.sendStatus(500);
                        });
                    });
                } else 
                    res.redirect('../users');
            })
            .catch(err => {
                console.log(err.message);
                res.status(404).json(err.message);
            });     
    }
);

// <------------------HIGHLIGHTS------------------>

router.post('/highlights/new', passport.authenticate('user-login', {session: false}),   //create
    (req, res) => {
        console.log("post request: new highlight");
        let name = req.body.name;
        let storiesAr = req.body.storiesAr;
        if (!name) {
            res.sendStatus(409);
            return;
        }
        if (!storiesAr) storiesAr = [];
        else if (typeof storiesAr === "string")
            storiesAr = [storiesAr];
            console.log("StoriesArray\n" + storiesAr);
        let newHighlight = new Highlight(name, storiesAr, mongoose.Types.ObjectId(req.user.id));

        User.getById(req.user.id)
            .populate("highlights")
            .populate("stories")
            .exec()
            .then(user => {
                Highlight.insert(newHighlight)
                    .then(newId => {
                        let highlightAr = user.highlights;
                        if(!mongoose.Types.ObjectId(newId))
                            highlightAr = user.highlights.push(mongoose.Types.ObjectId(newId));
                        let updatedUser = new User(user.login, user.password, user.role, user.username, 
                            user.fullname, user.registeredAt, user.avaUrl, user.isDisabled, user.bio, highlightAr, user.stories); //maybe wrong at highlightAr
                        User.update(req.user.id, updatedUser);
                        res.status(201).json(newHighlight);
                    });
            })
            .catch(err => {
                console.log(err.message);
                res.status(409).json(err.message);
            }); 
    }
);

router.get('/highlights', passport.authenticate('user-login', {session: false}),     //get all 
    (req, res) => {
        let pageNum = Number(req.query.page);
            if (isNaN(pageNum) || pageNum < 1) {
                pageNum = 1;
            }
            const maxEntitiesperPage = 2;
            Highlight.getAll()
                .populate("stories")
                .exec()
                .then(entitiesAr => {
                    if (pageNum > entitiesAr.length / maxEntitiesperPage + 1) 
                        pageNum = 1;
                        console.log("lenght is " + entitiesAr.length);
                    res.json(createPartofArrayToShowOnPage(entitiesAr, maxEntitiesperPage, pageNum));
                    })
                    .catch(err => {
                        console.log(err.message);
                        res.json(err.message);
                        req.next();
                    });        
    }
);

router.get('/highlights/:id', passport.authenticate('user-login', {session: false}),     //get by id 
    (req, res) => {
        Highlight.getById(req.params.id)
        .populate("stories")
        .exec()
        .then(entity => {
            if(!entity) 
                res.json(new Error("There is no such highlight").message);
            res.json(entity);
        })
        .catch(err => console.log(err.message)); 
});

router.patch('/highlights/:id/update', passport.authenticate('user-login', {session: false}),   //update
    (req, res) => {
        console.log("patch request: update highlight");
        let name = req.body.name;
        let storiesAr = req.body.storiesAr;
        if (!name) {
            res.sendStatus(204);
            return;
        }
        if (!storiesAr) storiesAr = [];
        else if (typeof storiesAr === "string")
            storiesAr = [storiesAr];
        console.log(storiesAr);
        let newHighlight = new Highlight(name, storiesAr);
        Highlight.update(req.params.id, newHighlight)
            .then(res.status(200).json(newHighlight))
            .catch(err => {
                console.log(`ERROR : ${err.message}`);
                res.status(404).json(err.message);
            });
    }
);

router.delete('/highlights/:id', passport.authenticate('user-login', {session: false}),    //delete
    (req, res) => {
        let id = req.params.id;
        console.log("HIGHLIGHT DELETE:" + id);
        Highlight.delete(id)
            .then(() => res.sendStatus(200)
            .catch(err => {
                console.log(`ERROR : ${err.message}`);
                res.status(404).json(err.message);
            }));
    }
);

// <------------------STORIES------------------>

router.post('/stories/new', passport.authenticate('user-login', {session : false}),  //create
    (req, res) => {
        console.log('Post req to add story');
        const fileObject = req.files.image;
        const fileBuffer = fileObject.data;
        let comment = req.body.comment; 
        let showDuration = req.body.showDuration;
        let views = req.body.views;
        let now = new Date();
        let now_long = now.getTime();
        cloudinary.v2.uploader.upload_stream({ resource_type: 'raw' , public_id : now_long},
                function (error, result) { 
                    let storyToAdd = new Story(comment, result.url, showDuration, views, now_long, mongoose.Types.ObjectId(req.user.id));
                    User.getById(req.user.id)
                        .populate("highlights")
                        .populate("stories")
                        .exec()
                        .then(user => {
                            Story.insert(storyToAdd)
                                .then(newId => {
                                    if (user.stories) {
                                        let updatedUser = new User(user.login, user.password, user.role, user.username, 
                                        user.fullname, user.registeredAt, user.avaUrl, user.isDisabled, user.bio, user.highlights, user.stories.push(mongoose.Types.ObjectId(newId)));
                                        User.update(req.user.id, updatedUser);
                                    } else {
                                        let updatedUser = new User(user.login, user.password, user.role, user.username, 
                                        user.fullname, user.registeredAt, user.avaUrl, user.isDisabled, user.bio, user.highlights, [mongoose.Types.ObjectId(newId)]);
                                        User.update(req.user.id, updatedUser);
                                    }
                                    res.status(201).json(storyToAdd);
                                });
                        })
                        .catch(err => {
                            console.log(err.message);
                            res.status(409).json(err.message);
                        });
            })
            .end(fileBuffer);
    }
);

router.get('/stories', passport.authenticate('user-login', {session: false}),    //get all 
    (req, res) => {
        let searchString = req.query.search;
                if (!searchString) searchString = '';
        let pageNum = Number(req.query.page);
            if (isNaN(pageNum) || pageNum < 1) {
                pageNum = 1;
            }
            const maxEntitiesperPage = 2;
            Story.getAll()
                .populate("userRef")
                .exec()
                .then(entitiesAr => {
                    if (pageNum > entitiesAr.length / maxEntitiesperPage + 1) 
                        pageNum = 1;
                    console.log("lenght is " + entitiesAr.length);
                    let storiesForUserSearch = searchEntities(entitiesAr, searchString);
                    res.json(createPartofArrayToShowOnPage(storiesForUserSearch, maxEntitiesperPage, pageNum));
                    })
                    .catch(err => {
                        console.log(err.message);
                        res.json(err.message);
                        req.next();
                    });        
    }
);

router.get('/stories/:id', passport.authenticate('user-login', {session: false}),    //get by id 
    (req, res) => {
        Story.getById(req.params.id)
        .populate("userRef")
        .exec()
        .then(entity => {
            if(!entity) 
                res.json(new Error("There is no such story").message);
            res.json(entity);
        })
        .catch(err => console.log(err.message)); 
});

router.patch('/stories/:id/update', passport.authenticate('user-login', {session: false}),   //update
    (req, res) => {
        console.log("patch request: update story");
        Story.getById(req.params.id)
        .then(story => {
                let comment = req.body.comment; 
                let showDuration = req.body.showDuration;
                let views = req.body.views;
                            let storyToUpdate = new Story(comment, story.imgUrl, showDuration, views, story.createdAt, story.userRef);
                Story.update(req.params.id, storyToUpdate)
                    .then(res.status(200).json(storyToUpdate))
                    .catch(err => {
                        console.log(`ERROR : ${err.message}`);
                        res.status(404).json(err.message);
                    });
            }
        )
        .catch(err => {
            console.log(`ERROR : ${err.message}`);
            res.status(404).json(err.message);
        });
    }
);

router.delete('/stories/:id', passport.authenticate('user-login', {session: false}),    //delete
    (req, res) => {
        Story.delete(req.params.id)
        .populate("userRef")
        .exec()
        .then(() => Highlight.removeStoryFromAllHighlights(req.params.id))
        .then(res.sendStatus(200))
        .catch(err => {
            console.log(`ERROR : ${err.message}`);
            res.status(404).json(err.message);
        });
    }
);

//some useful functions

function createPartofArrayToShowOnPage(arr, itemsPerPage, page) {
    let start = (page - 1) * itemsPerPage;
    let end = (page) * itemsPerPage;
    end = end < arr.length ? end : arr.length;

    return arr.slice(start, end);
}

function searchEntities(storiesArr, searchString) {
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
module.exports = router;