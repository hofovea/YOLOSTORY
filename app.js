console.log("YOLOSTORY");
const mongoose = require('mongoose');

const express = require('express');
const app = express();

const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const configs = require("./config.js");


//setting up
app.use(express.static('public'));
const path = require('path');
const mustache = require('mustache-express');
const viewsDir = path.join(__dirname,"/views");
app.engine('mst', mustache(path.join(viewsDir,"partials")));
app.set('views', viewsDir);
app.set('view engine', 'mst');

//const fs = require('fs-promise');
const bodyParser = require('body-parser');
const busboyBodyParser = require('busboy-body-parser');
const flash = require('connect-flash');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(busboyBodyParser({ limit: '15mb' }));

app.use(express.static('public'));

app.use(flash());
app.use(cookieParser());
app.use(session({
	secret: configs.secret,
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

//  Routers
const UserRouter = require("./routes/users_router.js");
app.use('/users', UserRouter);
console.log('router for users');


const StoryRouter = require("./routes/stories_router.js");
app.use('/stories', StoryRouter);
console.log('router for stories');

const HighlightRouter = require("./routes/highlights_router.js");
app.use('/highlights', HighlightRouter);
console.log('router for highlights');

const AuthRouter = require("./routes/auth_router.js");
app.use('/auth', AuthRouter);
console.log("router for authorization|authentication");

const DeveloperRouter = require("./routes/developer_router");
app.use('/developer/v1', DeveloperRouter);
console.log("router for developer");


const ApiRouter = require("./routes/api_router");
app.use('/api/v1', ApiRouter);
console.log("router for REST api");

const ProfileRouter = require("./routes/profile_router");
app.use('/profile', ProfileRouter);
console.log("router for profile");

app.get('/', function(req, res) {
    res.render("index", {user: req.user});
});

app.get('/about', function(req, res) {
    res.render("about", {user: req.user});
});

const dataBaseUrl = configs.DatabaseUrl;
const PORT = configs.Serverport;
const connectOptions = { 
    useNewUrlParser: true,
};


mongoose.connect(dataBaseUrl, connectOptions)
    .then(() => console.log(`Database connected: ${dataBaseUrl}`))
    .then(() => app.listen(PORT, () => console.log(`Server started: ${PORT}`)))
    .catch(err => console.log(`Start error: ${err}`));