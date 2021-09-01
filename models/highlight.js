const {Common} = require('./common.js');
const mongoose = require('mongoose');
const {Story} = require('../models/story.js')
const Schema = mongoose.Schema;

const HighlightSchema = new Schema({
    name: {type: String, default:"None"},
    stories: [{type: Schema.Types.ObjectId, ref: "Story"}],
    userRefFromHighlight: {type: Schema.Types.ObjectId, ref: 'User'}
});

const HighlightModel = mongoose.model('Highlight', HighlightSchema);

class Highlight extends Common {

    constructor (name = "Highlight 1", stories = [], userRefFromHighlight = null) {
        super();
        this.name = name;
        this.stories = stories;
        this.userRefFromHighlight = userRefFromHighlight;
    }

    static getAllCreated(){
        return this.currentModel().find().populate("stories").populate('userRefFromHighlight');
    }

    static getHighlightById(id) {
        return this.currentModel().findById(id).populate("stories").populate('userRefFromHighlight');
    }

    static update(id, entityToUpdate) {
        let _currentModel = this.currentModel();
        console.log(`${_currentModel.modelName} UPDATED`);
        return _currentModel.findOneAndUpdate(
            { _id: id}, entityToUpdate, {upsert : true});
    }
    static currentModel() {
        return HighlightModel;
    };

    static getUserHighlights(userId) {
        return this.currentModel().find({ userReference: userId });
    }

    static getAllHighlightsByStoryId(storyId) {
        return this.currentModel().find({ stories: storyId });
    }

    static removeStoryFromAllHighlights(story) {
        this.getAllHighlightsByStoryId(story)
            .then(highlightsArray => {
                let promise = Promise.resolve();
                if (highlightsArray.length !== 0) {
                    for (let highlight of highlightsArray) {
                        highlight.stories = removeEntityFromArray(highlight.stories, story);
                    }
                    // promise = promise.then(() => Highlight.update(highlightsArray));
                    promise 
                    .then(() => Highlight.update(highlightsArray));
                }
                return promise;
            });
    }
    static removeAllStoriesFromUserHighlights(highlights) {
        for(let highlight of highlights) {
            for (let story of highlight.stories) {
                Story.currentModel().findByIdAndDelete(story._id);
            }
            this.currentModel().findByIdAndDelete(highlight._id);
        }
    }
}

// some functions for routine work

function removeEntityFromArray(array, entity) {
    let index = array.indexOf(entity);
  if(index > -1){
    array.splice(index, 1);
  }
  return array;
}



module.exports = {Highlight};