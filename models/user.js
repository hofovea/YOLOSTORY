//@ts-check/

const {Common} = require('./common.js');
const mongoose = require('mongoose');
const {Highlight} = require('./highlight.js');
const {Story} = require('./story');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    login: {type: String, required: true },
    password: {type: String, required: true},
    fullname: {type: String, default: "None" },
    role: {type: Number, required: true },
    registeredAt: {type: Date, default: Date.now },
    avaUrl: {type: String, required: true },
    bio: {type: String, default: "None" },
    highlights: [{type: Schema.Types.ObjectId, ref: 'Highlight'}],
    stories: [{type: Schema.Types.ObjectId, ref: 'Story'}],
    friends: [{type: Schema.Types.ObjectId, res: 'User'}]
});

const UserModel = mongoose.model('User', UserSchema);

class User extends Common {
    constructor(login, password, role = 0, fullname = "", registeredAt, avaUrl, bio = "", highlights = [], stories = [], friends = []) {
        super();
        this.login = login;
        this.password = password;
        this.role = role;
        this.fullname = fullname;
        this.registeredAt = registeredAt;
        this.avaUrl = avaUrl;
        this.bio = bio;
        this.highlights = highlights;
        this.stories = stories;
        this.friends = friends;
    }

    static currentModel() {
        return UserModel;
    };

    static update(id, entityToUpdate) {
        let _currentModel = this.currentModel();
        _currentModel.findOneAndUpdate({ "_id": id}, entityToUpdate, {new: true})
        .then(user => user._id);
    }
    static deleteUser(user) {
        this.removeAllUserStories(user);
        if(!this.checkString(user._id) && typeof user._id !== "object") 
            return Promise.reject(new Error(`Invalid argument: ${user._id}`));
        let _currentModel = this.currentModel();
        return _currentModel.findByIdAndRemove(user._id);
    }
    
    static getUserByLoginAndPassword(login, password) {
        if (!this.checkString(login)) {
            return Promise.reject(new Error(`Incorrect login or password in user.js line 58`));
        } else {
            return this.currentModel().findOne({ login : login, password: password});
        }
    }

    static async isUniqueLogin(loginToCheck) {
        let unique = await this.currentModel().findOne({login : loginToCheck});
        console.log(unique);
        return unique === null;
    }

    static clearUserStories(user) {
        if (user.stories && user.stories !== []) {
            for (let story of user.stories) {
                if (story) 
                    Story.currentModel().findByIdAndDelete(story._id);
            }
        }
    }

    static clearUserHighlights(user) {
        if (user.highlights && user.highlights !== []) {
            for (let highlight of user.highlights) {
                this.clearHighlight(highlight);
            }
        }
    }

    static clearHighlight(highlight) {
        if (highlight.stories && highlight.stories !== []) {
            for (let story of highlight.stories) {
                if (story) 
                    Story.currentModel().findByIdAndDelete(story._id);
            }
        }
    }

    static removeAllUserStories(user) {
        this.clearUserStories(user);
        this.clearUserHighlights(user);
    }
};



module.exports = {User};

