import mongoose from "mongoose";

const curatedMediaSchema = new mongoose.Schema({
    artMedia : [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'ArtMedia',
        }
    ],
    musicMedia : [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'MusicMedia',
        }
    ],
    filmMedia : [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'FilmMedia',
        }
    ]
});

const CuratedMedia = mongoose.model('CuratedMedia', curatedMediaSchema);

export default CuratedMedia;